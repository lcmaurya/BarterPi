// server.js — production-ready with relaxed CSP for Pi Browser
require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const admin = require('firebase-admin');

const app = express();

/**
 * ---------- FIREBASE ADMIN INIT ----------
 * Preferred: set GOOGLE_APPLICATION_CREDENTIALS in hosting environment.
 * Alternative: set FIREBASE_SERVICE_ACCOUNT_BASE64 to base64(service-account.json).
 */
try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp();
    console.log('Firebase admin initialized via Application Default Credentials');
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const saJson = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(saJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase admin initialized via FIREBASE_SERVICE_ACCOUNT_BASE64');
  } else {
    console.warn('No Firebase credentials found. Firebase not initialized.');
  }
} catch (err) {
  console.error('Firebase init error:', err);
}

const db = admin.apps.length ? admin.firestore() : null;

/**
 * ---------- SECURITY & MIDDLEWARE ----------
 *
 * NOTE: contentSecurityPolicy is disabled below to avoid blocking Pi Browser
 * or other webviews from loading required external scripts/styles.
 * This relaxes CSP only — other Helmet protections remain active.
 */
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// Configure CORS - tighten this in production to your frontend domain
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
  })
);

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Basic rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
});
app.use(limiter);

// JSON body parsing with a reasonable limit
app.use(express.json({ limit: '100kb' }));

// Serve static files from repo root (kept as-is per your structure)
app.use(express.static(path.join(__dirname)));

/**
 * ---------- HMAC Signature VERIFICATION (generic placeholder)
 * Replace/adjust according to Pi Network's official callback verification method.
 * Uses env var: PI_CALLBACK_SECRET
 */
function verifySignature(req, res, next) {
  const secret = process.env.PI_CALLBACK_SECRET;
  if (!secret) {
    console.warn('PI_CALLBACK_SECRET not set — skipping signature verification (dev mode)');
    return next();
  }

  const sig = req.get('x-signature') || req.get('x-pi-signature') || '';
  if (!sig) return res.status(400).json({ error: 'Missing signature header' });

  try {
    const payload = JSON.stringify(req.body || {});
    const computed = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const a = Buffer.from(computed, 'utf8');
    const b = Buffer.from(sig, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    return next();
  } catch (err) {
    console.error('Signature verification error', err);
    return res.status(500).json({ error: 'Signature verification failed' });
  }
}

/**
 * ---------- ROUTES ----------
 */

// Health check
app.get('/healthz', (req, res) => res.status(200).json({ status: 'ok' }));

// Serve index (fallback)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * PI callback endpoint
 * - verifies signature (if secret set)
 * - validates payload minimally
 * - attempts to update Firestore (if initialized)
 */
app.post('/pi_callback', verifySignature, async (req, res) => {
  try {
    const payload = req.body;
    console.log('Received /pi_callback payload:', payload);

    if (!payload || !payload.payment_id) {
      return res.status(400).json({ error: 'Invalid payload, missing payment_id' });
    }

    // Idempotent write: use payment_id as doc id to avoid duplicates
    if (db) {
      try {
        const orders = db.collection('orders');
        await orders.doc(String(payload.payment_id)).set(
          {
            status: payload.status || 'unknown',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            raw: payload,
          },
          { merge: true }
        );
        console.log('Firestore updated for payment:', payload.payment_id);
      } catch (err) {
        console.error('Failed to update Firestore:', err);
        // Log, but do not block callback acknowledgement
      }
    } else {
      console.warn('Firestore not available — skipping DB update');
    }

    return res.status(200).json({ message: 'Callback received', payment_id: payload.payment_id });
  } catch (err) {
    console.error('pi_callback error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Global error handler
 */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

/**
 * START SERVER
 */
const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.info('SIGINT received: shutting down');
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  console.info('SIGTERM received: shutting down');
  server.close(() => process.exit(0));
});