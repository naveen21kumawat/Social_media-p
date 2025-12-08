import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { ChatMessage } from "../models/chatMessage.model.js";

let io;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // Authentication middleware for socket
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(" ")[1];
      
      if (!token) {
        return next(new Error("Authentication error: Token missing"));
      }

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      socket.userId = decoded._id;
      next();
    } catch (error) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join user's personal room
    socket.join(socket.userId);

    // Join thread room
    socket.on("joinThread", (threadId) => {
      socket.join(threadId);
      console.log(`User ${socket.userId} joined thread ${threadId}`);
    });

    // Leave thread room
    socket.on("leaveThread", (threadId) => {
      socket.leave(threadId);
      console.log(`User ${socket.userId} left thread ${threadId}`);
    });

    // Typing indicator
    socket.on("typing", ({ threadId, receiverId }) => {
      socket.to(receiverId).emit("userTyping", {
        threadId,
        userId: socket.userId,
        isTyping: true,
      });
    });

    socket.on("stopTyping", ({ threadId, receiverId }) => {
      socket.to(receiverId).emit("userTyping", {
        threadId,
        userId: socket.userId,
        isTyping: false,
      });
    });

    // Message delivery acknowledgment
    socket.on("messageDelivered", async ({ messageId }) => {
      try {
        const message = await ChatMessage.findById(messageId);
        if (message && message.receiverId.toString() === socket.userId) {
          message.status = "delivered";
          message.deliveredAt = new Date();
          await message.save();

          // Notify sender
          io.to(message.senderId.toString()).emit("messageStatus", {
            messageId,
            status: "delivered",
            deliveredAt: message.deliveredAt,
          });
        }
      } catch (error) {
        console.error("Message delivery error:", error);
      }
    });

    // WebRTC signaling for voice/video calls
    socket.on("callOffer", ({ callId, receiverId, offer, encryptionKey }) => {
      io.to(receiverId).emit("callOffer", {
        callId,
        callerId: socket.userId,
        offer,
        encryptionKey,
      });
    });

    socket.on("callAnswer", ({ callId, callerId, answer }) => {
      io.to(callerId).emit("callAnswer", {
        callId,
        receiverId: socket.userId,
        answer,
      });
    });

    socket.on("iceCandidate", ({ callId, receiverId, candidate }) => {
      io.to(receiverId).emit("iceCandidate", {
        callId,
        senderId: socket.userId,
        candidate,
      });
    });

    socket.on("callRejected", ({ callId, callerId, reason }) => {
      io.to(callerId).emit("callRejected", {
        callId,
        receiverId: socket.userId,
        reason: reason || "declined",
      });
    });

    socket.on("callAccepted", ({ callId, callerId }) => {
      io.to(callerId).emit("callAccepted", {
        callId,
        receiverId: socket.userId,
      });
    });

    // User disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

export default {
  initializeSocket,
  getIO,
};
