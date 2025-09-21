import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
const router = express.Router();

// GET my conversations
router.get("/my-conversations", authMiddleware, (req, res) => {
  res.json({
    conversations: [
      { id: 1, participants: ["user1", "user2"], lastMessage: { text: "Hello", read: false } },
      { id: 2, participants: ["user1", "user3"], lastMessage: { text: "Hey!", read: true } },
    ],
  });
});

// POST send message
router.post("/", authMiddleware, (req, res) => {
  const { from, to, text } = req.body;
  res.status(201).json({ id: Date.now(), from, to, text });
});

export default router;
