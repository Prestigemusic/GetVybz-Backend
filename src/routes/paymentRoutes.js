import express from "express";
import axios from "axios";
import User from "../models/User.js";

const router = express.Router();

// --- Initiate Payment ---
router.post("/initiate", async (req, res) => {
  const { userId, type, method } = req.body; // type: "verification" | "boost" | "subscription"
  if (!userId || !type) return res.status(400).json({ error: "Missing userId or type" });

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  // Define pricing
  let amount = 0;
  if (type === "verification") amount = 5000; // NGN
  if (type === "boost") amount = 2000;
  if (type === "subscription") amount = 10000;

  try {
    if (method === "paystack") {
      const PAYSTACK_KEY = process.env.PAYSTACK_SECRET;
      const resp = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          email: user.email,
          amount,
          metadata: { userId, type },
          callback_url: `${process.env.SERVER_URL}/api/payments/verify`,
        },
        { headers: { Authorization: `Bearer ${PAYSTACK_KEY}` } }
      );
      return res.json(resp.data);
    }

    if (method === "flutterwave") {
      const FLUTTERWAVE_KEY = process.env.FLUTTERWAVE_SECRET;
      const resp = await axios.post(
        "https://api.flutterwave.com/v3/payments",
        {
          tx_ref: `vybz_${userId}_${Date.now()}`,
          amount,
          currency: "NGN",
          redirect_url: `${process.env.SERVER_URL}/api/payments/verify`,
          customer: { email: user.email, name: user.name },
          customizations: { title: `GetVybz ${type}`, description: `${type} payment` },
          meta: { userId, type },
        },
        { headers: { Authorization: `Bearer ${FLUTTERWAVE_KEY}` } }
      );
      return res.json(resp.data);
    }

    return res.status(400).json({ error: "Invalid payment method" });
  } catch (err) {
    console.error("Payment initiation error:", err?.response?.data || err.message || err);
    return res.status(500).json({ error: "Payment initiation failed" });
  }
});

// --- Verify Payment (Webhook or callback) ---
router.post("/verify", async (req, res) => {
  const { userId, type, reference, method } = req.body;
  if (!userId || !type || !reference) return res.status(400).json({ error: "Missing parameters" });

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  try {
    let verified = false;

    if (method === "paystack") {
      const PAYSTACK_KEY = process.env.PAYSTACK_SECRET;
      const resp = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${PAYSTACK_KEY}` },
      });
      verified = resp.data?.data?.status === "success";
    }

    if (method === "flutterwave") {
      const FLUTTERWAVE_KEY = process.env.FLUTTERWAVE_SECRET;
      const resp = await axios.get(`https://api.flutterwave.com/v3/transactions/${reference}/verify`, {
        headers: { Authorization: `Bearer ${FLUTTERWAVE_KEY}` },
      });
      verified = resp.data?.status === "success";
    }

    if (verified) {
      if (type === "verification") user.isVerified = true;
      if (type === "boost") {
        user.isBoosted = true;
        user.boostExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days boost
      }
      if (type === "subscription") {
        user.subscriptionActive = true;
        user.subscriptionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days subscription
      }
      await user.save();
      return res.json({ success: true, message: `${type} completed` });
    }

    return res.status(400).json({ success: false, message: "Payment not verified" });
  } catch (err) {
    console.error("Payment verification error:", err?.response?.data || err.message || err);
    return res.status(500).json({ error: "Verification failed" });
  }
});

export default router;
