// src/controllers/messageController.js
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";

// -------------------------------
// Send a message
// -------------------------------
export async function sendMessage(req, res) {
  try {
    const { recipientId, text } = req.body;
    const senderId = req.user._id;

    // Find or create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, recipientId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, recipientId],
      });
    }

    // Create message
    const message = await Message.create({
      sender: senderId,
      recipient: recipientId,
      text,
      conversationId: conversation._id,
    });

    // Update conversation's last message
    conversation.lastMessage = message._id;
    await conversation.save();

    // Emit real-time event
    req.io.to(conversation._id.toString()).emit("newMessage", message);

    res.json({ message, conversation });
  } catch (err) {
    console.error("❌ sendMessage error", err);
    res.status(500).json({ error: "Server error" });
  }
}

// -------------------------------
// Get all messages inside a conversation
// -------------------------------
export async function getConversationMessages(req, res) {
  try {
    const { conversationId } = req.params;

    const messages = await Message.find({ conversationId })
      .populate("sender", "name profilePicture")
      .populate("recipient", "name profilePicture")
      .sort({ createdAt: 1 });

    res.json({ messages });
  } catch (err) {
    console.error("❌ getConversationMessages error", err);
    res.status(500).json({ error: "Server error" });
  }
}

// -------------------------------
// Get my conversations
// -------------------------------
export async function getMyConversations(req, res) {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "name profilePicture")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "name profilePicture" },
      })
      .sort({ updatedAt: -1 });

    res.json({ conversations });
  } catch (err) {
    console.error("❌ getMyConversations error", err);
    res.status(500).json({ error: "Server error" });
  }
}