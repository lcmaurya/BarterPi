const express = require('express');
const path = require('path');
const app = express();

// 🚨 IMPORTANT: Serve Static Files (index.html, etc.) from the root directory
// This tells Express to look for files (like index.html) in the current directory
app.use(express.static(path.join(__dirname)));
app.use(express.json()); // Middleware to parse JSON bodies


// --- 1. FRONTEND SERVING (Serving index.html) ---
// This ensures that when the user visits the root URL, index.html is displayed
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


// --- 2. PI NETWORK CALLBACK ROUTE (Essential for Automatic Updates) ---
// Pi Network will hit this URL (e.g., YOUR_RENDER_URL/pi_callback)
app.post('/pi_callback', (req, res) => {
    const payment = req.body;
    
    console.log('Received Pi Callback:', payment);
    
    // ⚠️ Real-world application logic to verify signature and update Firestore goes here
    // In a production app, you would use firebase-admin to update the orders collection based on payment status.
    
    // Always send a 200 OK response back to Pi Network to confirm receipt
    res.status(200).json({ message: `Callback received for payment: ${payment.payment_id}` });
});


// --- START SERVER ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
