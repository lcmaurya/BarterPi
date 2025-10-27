// server.js — original simple working version

const express = require("express");
const path = require("path");
const app = express();

// Serve static files (index.html, index.js, etc.) from current directory
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// --- FRONTEND ROUTE ---
// When user opens the main URL, send index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// --- PI CALLBACK ROUTE ---
// Pi Network calls this route to confirm payment updates
app.post("/pi_callback", (req, res) => {
  const payment = req.body;
  console.log("Received Pi Callback:", payment);

  // In real app: verify signature & update Firestore
  // (but this version is only for testing / frontend demo)

  res
    .status(200)
    .json({ message: `Callback received for payment: ${payment.payment_id}` });
});

// --- START SERVER ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});