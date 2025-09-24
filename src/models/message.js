import express from "express";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/messages/my-conversations - Get all conversations for logged in user
router.get("/my-conversations", protect, async (req, res) => {
  try {
    // Example: replace with actual Mongo model
    // const conversations = await Conversation.find({ participants: req.user });
    const conversations = [
      { id: 1, with: "DJ Mike", lastMessage: "See you Friday!", user: req.user },
    ];

    res.json(conversations);
  } catch (err) {
    console.error("Messages fetch error:", err);
    res.status(500).json({ msg: "Server error fetching conversations" });
  }
});

export default router;
