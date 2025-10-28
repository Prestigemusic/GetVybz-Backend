// src/config/socket.js
import { Server } from "socket.io";
import logger from "../utils/logger.js";

let io = null;

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    const { userId } = socket.handshake.query;
    if (userId) {
      socket.join(userId.toString());
      logger.info(`🔌 User ${userId} connected to socket`);
    }

    socket.on("disconnect", () => {
      logger.info(`❌ User ${userId || "unknown"} disconnected`);
    });
  });

  logger.info("✅ Socket.IO initialized");
  return io;
}

export { io };
