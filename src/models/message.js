// src/models/Message.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },

    // type of message (text, image, file)
    type: { type: String, enum: ["text", "image", "file"], default: "text" },

    // message delivery status
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },

    // quick flag for read/unread
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true } // adds createdAt & updatedAt
);

const Message = mongoose.model("Message", messageSchema);
export default Message;