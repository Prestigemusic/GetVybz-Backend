import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Get user's conversations
router.get("/my-conversations", authMiddleware, (req, res) => {
  res.json({
    message: "Fetched conversations",
    userId: req.user.id,
    conversations: [], // Replace with DB later
  });
});

// ✅ Send message
router.post("/", authMiddleware, (req, res) => {
  const { to, text } = req.body;
  res.status(201).json({
    id: Date.now(),
    from: req.user.id,
    to,
    text,
  });
});

export default router;
