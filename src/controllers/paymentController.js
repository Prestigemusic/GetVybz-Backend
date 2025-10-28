import User from "../models/User.js";
import axios from "axios";

// --- Initiate Payment ---
export const initiatePayment = async (req, res) => {
  const { userId, type, amount, paymentMethod } = req.body;

  if (!userId || !type || !amount || !paymentMethod) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Save pending subscription in DB
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const subscription = {
      type,
      amount,
      paymentMethod,
      status: "pending",
      startDate: new Date(),
    };

    user.subscriptions.push(subscription);
    await user.save();

    let paymentData = {};

    // --- Payment provider integration ---
    switch (paymentMethod) {
      case "paystack":
        paymentData = await initiatePaystackPayment(user, subscription);
        break;
      case "flutterwave":
        paymentData = await initiateFlutterwavePayment(user, subscription);
        break;
      case "card":
        paymentData = { message: "Card payment integration placeholder" };
        break;
      case "bank_transfer":
        paymentData = { message: "Bank transfer integration placeholder" };
        break;
      default:
        return res.status(400).json({ error: "Unsupported payment method" });
    }

    return res.json({ subscription, paymentData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// --- Verify Payment ---
export const verifyPayment = async (req, res) => {
  const { userId, reference, paymentMethod } = req.body;
  if (!userId || !reference || !paymentMethod)
    return res.status(400).json({ error: "Missing required fields" });

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const subscription = user.subscriptions.find(
      (s) => s.reference === reference && s.paymentMethod === paymentMethod
    );
    if (!subscription) return res.status(404).json({ error: "Subscription not found" });

    let isPaid = false;

    switch (paymentMethod) {
      case "paystack":
        isPaid = await verifyPaystackPayment(reference);
        break;
      case "flutterwave":
        isPaid = await verifyFlutterwavePayment(reference);
        break;
      case "card":
        isPaid = true; // Placeholder: Assume card paid if handled on frontend
        break;
      case "bank_transfer":
        isPaid = true; // Placeholder: Bank transfer verified manually/admin
        break;
    }

    subscription.status = isPaid ? "completed" : "failed";

    // Update pro features based on subscription type
    if (isPaid) {
      if (subscription.type === "verification") user.isVerified = true;
      if (subscription.type === "boost") {
        user.isBoosted = true;
        user.boostExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days boost
      }
    }

    await user.save();
    return res.json({ success: isPaid, subscription });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// --- Get subscriptions ---
export const getSubscriptions = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ subscriptions: user.subscriptions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

/////////////////////////
// --- Payment Helpers ---
/////////////////////////

// Paystack
const initiatePaystackPayment = async (user, subscription) => {
  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
  const payload = {
    email: user.email,
    amount: subscription.amount * 100, // in kobo
    reference: `vybz-${Date.now()}`,
    currency: "NGN",
  };

  const resp = await axios.post("https://api.paystack.co/transaction/initialize", payload, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
  });

  // Save the reference
  subscription.reference = resp.data.data.reference;
  await user.save();
  return resp.data.data;
};

const verifyPaystackPayment = async (reference) => {
  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
  const resp = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
  });
  return resp.data.data.status === "success";
};

// Flutterwave
const initiateFlutterwavePayment = async (user, subscription) => {
  const FLW_SECRET = process.env.FLW_SECRET_KEY;
  const payload = {
    tx_ref: `vybz-${Date.now()}`,
    amount: subscription.amount,
    currency: "NGN",
    payment_options: "card,bank,ussd",
    redirect_url: "https://yourdomain.com/payment-callback",
    customer: { email: user.email, name: user.name },
  };

  const resp = await axios.post("https://api.flutterwave.com/v3/payments", payload, {
    headers: { Authorization: `Bearer ${FLW_SECRET}` },
  });

  subscription.reference = resp.data.data.tx_ref;
  await user.save();
  return resp.data.data;
};

const verifyFlutterwavePayment = async (reference) => {
  const FLW_SECRET = process.env.FLW_SECRET_KEY;
  const resp = await axios.get(`https://api.flutterwave.com/v3/transactions/${reference}/verify`, {
    headers: { Authorization: `Bearer ${FLW_SECRET}` },
  });
  return resp.data.data.status === "successful";
};