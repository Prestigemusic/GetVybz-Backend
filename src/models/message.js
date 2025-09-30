// src/routes/messages.js
import express from "express";
import protect from "../middleware/authMiddleware.js"; // default import (works with both exports)

const router = express.Router();

// GET user's conversations
router.get("/my-conversations", protect, (req, res) => {
  res.json({
    message: "Fetched conversations",
    userId: req.user?.id ?? null,
    conversations: [], // TODO: wire DB here
  });
});

// POST send message
router.post("/", protect, (req, res) => {
  const { to, text } = req.body;
  res.status(201).json({
    id: Date.now(),
    from: req.user?.id ?? null,
    to,
    text,
  });
});

export default router;
