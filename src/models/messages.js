// backend/routes/messages.js
import express from "express";
import Message from "../models/Message.js";
import { containsContact } from "../utils/contactBlocker.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @desc Send a message
 * @route POST /api/messages
 * @access Private
 */
router.post("/", protect, async (req, res) => {
  try {
    const { receiver, content } = req.body;

    // Block phone numbers & bank accounts
    if (containsContact(content)) {
      return res.status(403).json({
        error:
          "Sharing phone numbers or bank details is disabled. Please complete a booking/payment to reveal contact.",
      });
    }

    const message = await Message.create({
      sender: req.user._id,
      receiver,
      content,
      status: "sent",
    });

    // Emit to socket.io (receiver + sender)
    if (req.io) {
      req.io.to(receiver.toString()).emit("newMessage", message);
      req.io.to(req.user._id.toString()).emit("newMessage", message);
    }

    res.json(message);
  } catch (err) {
    console.error("❌ Send message error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @desc Get conversation with another user
 * @route GET /api/messages/:otherUserId
 * @access Private
 */
router.get("/:otherUserId", protect, async (req, res) => {
  try {
    const { otherUserId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: otherUserId },
        { sender: otherUserId, receiver: req.user._id },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error("❌ Fetch conversation error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @desc Get list of my conversations (chat heads)
 * @route GET /api/messages/my-conversations
 * @access Private
 */
router.get("/my-conversations", protect, async (req, res) => {
  try {
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: req.user._id }, { receiver: req.user._id }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$sender", req.user._id] },
              "$receiver",
              "$sender",
            ],
          },
          lastMessage: { $first: "$$ROOT" },
        },
      },
    ]);

    res.json(conversations);
  } catch (err) {
    console.error("❌ Fetch conversations error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
