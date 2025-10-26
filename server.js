const express = require('express');
const app = express();
const admin = require('firebase-admin');

// 🚨 महत्वपूर्ण: Pi Network Callback को सुरक्षित रूप से हैंडल करने के लिए JSON पार्सर ज़रूरी है
app.use(express.json());

// 💡 Firebase Admin Initialization 
// (NOTE: In a real app, use Render Environment Variables for credentials)
// Since this is a demo, we are skipping service account setup, 
// but you MUST use a Service Account JSON in production!
console.log("Firebase Admin initialization skipped for simplicity. Use Service Account in production.");


// --- 1. RENDER HEALTH CHECK ---
// Render requires a simple route for health checking
app.get('/', (req, res) => {
    res.send('BarterPi Pro Backend is running. Frontend is served by index.html.');
});


// --- 2. PI NETWORK CALLBACK ROUTE (Essential for Automatic Updates) ---
// Pi Network will hit this URL when a payment status changes
app.post('/pi_callback', (req, res) => {
    const payment = req.body;
    
    console.log('Received Pi Callback:', payment);
    
    // Pi Network Verification (MUST be implemented securely in production)
    // For now, we trust the callback, but Pi requires signature verification here.
    
    const paymentId = payment.payment_id;
    const status = payment.status; // e.g., 'AWAITING_PAYMENT', 'APPROVED', 'COMPLETED', 'CANCELLED'
    const memo = payment.memo; 
    
    // ⚠️ यहाँ वह जगह है जहाँ डेटाबेस (Firestore) अपडेट होगा:
    
    console.log(`Updating Payment ${paymentId} to status: ${status}`);
    
    // --- Firestore Logic Placeholder (MUST be implemented) ---
    /*
    const db = admin.firestore();
    db.collection('orders').doc(paymentId).update({
        status: status,
        updatedAt: new Date().toISOString()
    }).then(() => {
        console.log("Firestore updated successfully.");
        // If status is 'COMPLETED', mark the corresponding listing as 'SOLD'
    });
    */
    // -----------------------------------------------------------
    
    // Send a 200 OK response back to Pi Network to confirm receipt
    res.status(200).json({ message: `Callback received for payment: ${paymentId}` });
});


// --- START SERVER ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Pi Callback URL: YOUR_RENDER_URL/pi_callback`);
});
