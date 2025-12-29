import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { ChatMessage } from "../models/chatMessage.model.js";
import { User } from "../models/user.model.js";

let io;

// ✅ Track online users: userId -> socketId
const onlineUsers = new Map();

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
    const userId = socket.userId;
    console.log(`✅ User connected: ${userId}, Socket ID: ${socket.id}`);

    // ✅ ADD USER TO ONLINE MAP
    onlineUsers.set(userId.toString(), socket.id);

    // Join user's personal room
    socket.join(userId);

    // ✅ BROADCAST TO ALL USERS THAT THIS USER IS ONLINE
    io.emit("userOnline", {
      userId: userId.toString(),
      socketId: socket.id
    });

    console.log(`🟢 User ${userId} is now online`);
    console.log(`📊 Total online users: ${onlineUsers.size}`);

    // ✅ SEND CURRENT ONLINE USERS LIST TO THE NEWLY CONNECTED USER
    socket.emit("onlineUsersList", {
      users: Array.from(onlineUsers.keys())
    });

    // ✅ GET ONLINE USERS REQUEST
    socket.on("getOnlineUsers", () => {
      const onlineUsersList = Array.from(onlineUsers.keys());
      socket.emit("onlineUsersList", { users: onlineUsersList });
      console.log(`📋 Sent online users list to ${userId}: ${onlineUsersList.length} users`);
    });

    // Join thread room
    socket.on("joinThread", (threadId) => {
      socket.join(threadId);
      console.log(`🔗 User ${userId} joined thread ${threadId}`);
    });

    // Leave thread room
    socket.on("leaveThread", (threadId) => {
      socket.leave(threadId);
      console.log(`🔓 User ${userId} left thread ${threadId}`);
    });

    // ✅ HANDLE EXPLICIT ONLINE EVENT
    socket.on("userOnline", (data) => {
      const targetUserId = data.userId || userId;
      onlineUsers.set(targetUserId.toString(), socket.id);
      io.emit("userOnline", {
        userId: targetUserId.toString(),
        socketId: socket.id
      });
      console.log(`🟢 User explicitly marked as online: ${targetUserId}`);
    });

    // ✅ HANDLE EXPLICIT OFFLINE EVENT
    socket.on("userOffline", (data) => {
      const targetUserId = data.userId || userId;
      onlineUsers.delete(targetUserId.toString());
      io.emit("userOffline", {
        userId: targetUserId.toString()
      });
      console.log(`⚫ User explicitly marked as offline: ${targetUserId}`);
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

    // ============================================
    // NEW MESSAGE SENDING (FIXED - PROPER FORMAT)
    // ============================================

    socket.on("sendMessage", async (messageData) => {
      try {
        console.log(`📨 Socket message received from ${socket.userId}:`, messageData);

        // Fetch sender's user info
        const senderUser = await User.findById(socket.userId).select('firstName lastName username profilePicture avatar');

        // Format message to match your frontend expectations
        const formattedMessage = {
          threadId: messageData.threadId,
          message: {
            _id: messageData.messageId, // Use the ID from database
            text: messageData.content,
            senderId: {
              _id: socket.userId,
              firstName: senderUser?.firstName,
              lastName: senderUser?.lastName,
              username: senderUser?.username,
              profilePicture: senderUser?.profilePicture,
              avatar: senderUser?.avatar,
            },
            createdAt: messageData.timestamp || new Date(),
            status: "sent",
          },
        };

        // Send the message to the receiver in real-time
        io.to(messageData.receiverId).emit("newMessage", formattedMessage);

        console.log(`✅ Message sent to ${messageData.receiverId} via socket`);

        // Also send back to sender for confirmation (optional)
        socket.emit("messageSent", {
          messageId: messageData.messageId,
          status: "sent",
          timestamp: new Date(),
        });

      } catch (error) {
        console.error("❌ Error sending message via socket:", error);
        socket.emit("messageError", {
          error: "Failed to send message",
          details: error.message,
        });
      }
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
        console.error("❌ Message delivery error:", error);
      }
    });

    // ============================================
    // VOICE/VIDEO CALL SIGNALING (FIXED)
    // ============================================

    // Initiate call - User A calls User B
    socket.on("initiateCall", async ({ recipientId, threadId, callType = "voice" }) => {
      console.log(`📞 ${callType} call initiated by ${socket.userId} to ${recipientId}, thread: ${threadId}`);

      try {
        // Check if recipient is connected
        const recipientSockets = await io.in(recipientId).allSockets();
        if (recipientSockets.size === 0) {
          // Recipient is offline
          socket.emit("callFailed", {
            recipientId,
            reason: "User is offline",
          });
          return;
        }

        // Fetch caller's user info to send with the notification
        const callerUser = await User.findById(socket.userId).select('firstName lastName username profilePicture avatar');

        // Send incoming call notification to recipient with caller info
        io.to(recipientId).emit("incomingCall", {
          callerId: socket.userId,
          threadId: threadId,
          callType: callType, // ✅ FIXED: Now includes callType
          callerInfo: {
            name: callerUser?.firstName || callerUser?.lastName || callerUser?.username || "Unknown User",
            avatar: callerUser?.profilePicture || callerUser?.avatar || "👤",
          },
          timestamp: new Date(),
        });

        console.log(`✅ ${callType} call notification sent with caller info:`, {
          name: callerUser?.firstName || callerUser?.username,
          avatar: callerUser?.profilePicture || "👤"
        });
      } catch (error) {
        console.error("❌ Error initiating call:", error);
        socket.emit("callFailed", {
          recipientId,
          reason: "Internal server error",
        });
      }
    });

    // Accept call - User B accepts the incoming call
    socket.on("acceptCall", ({ callerId, threadId }) => {
      console.log(`✅ Call accepted by ${socket.userId} from ${callerId}, thread: ${threadId}`);

      // Notify the caller that call was accepted
      io.to(callerId).emit("callAccepted", {
        receiverId: socket.userId,
        threadId: threadId,
      });
    });

    // Reject call - User B rejects the incoming call
    socket.on("rejectCall", ({ callerId, threadId }) => {
      console.log(`❌ Call rejected by ${socket.userId} from ${callerId}, thread: ${threadId}`);

      // Notify the caller that call was rejected
      io.to(callerId).emit("callRejected", {
        receiverId: socket.userId,
        threadId: threadId,
      });
    });

    // End call - Either party ends the active call
    socket.on("endCall", ({ recipientId, threadId }) => {
      console.log(`📴 Call ended by ${socket.userId} with ${recipientId}, thread: ${threadId}`);

      // Notify the other party that call ended
      io.to(recipientId).emit("callEnded", {
        userId: socket.userId,
        threadId: threadId,
        endedAt: new Date(),
      });
    });

    // ============================================
    // WEBRTC SIGNALING (SDP Offer/Answer/ICE)
    // ============================================

    // WebRTC offer - Send WebRTC offer for peer connection
    socket.on("offer", ({ recipientId, offer }) => {
      console.log(`📤 WebRTC offer sent from ${socket.userId} to ${recipientId}`);

      io.to(recipientId).emit("offer", {
        callerId: socket.userId,
        offer: offer,
      });
    });

    // WebRTC answer - Send WebRTC answer back to caller
    socket.on("answer", ({ callerId, answer }) => {
      console.log(`📥 WebRTC answer sent from ${socket.userId} to ${callerId}`);

      io.to(callerId).emit("answer", {
        receiverId: socket.userId,
        answer: answer,
      });
    });

    // ICE candidate exchange for WebRTC connection
    socket.on("iceCandidate", ({ recipientId, candidate }) => {
      console.log(`🧊 ICE candidate sent from ${socket.userId} to ${recipientId}`);

      io.to(recipientId).emit("iceCandidate", {
        senderId: socket.userId,
        candidate: candidate,
      });
    });

    // ✅ USER DISCONNECT (tab close, internet loss, logout, etc.)
    socket.on("disconnect", (reason) => {
      console.log(`❌ User disconnected: ${userId}, Socket ID: ${socket.id}, Reason: ${reason}`);

      // ✅ REMOVE USER FROM ONLINE MAP
      onlineUsers.delete(userId.toString());

      // ✅ BROADCAST TO ALL USERS THAT THIS USER IS OFFLINE
      io.emit("userOffline", {
        userId: userId.toString()
      });

      console.log(`⚫ User ${userId} is now offline`);
      console.log(`📊 Total online users: ${onlineUsers.size}`);
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

// ✅ HELPER FUNCTION: Check if a user is online
export const isUserOnline = (userId) => {
  return onlineUsers.has(userId.toString());
};

// ✅ HELPER FUNCTION: Get all online users
export const getOnlineUsers = () => {
  return Array.from(onlineUsers.keys());
};

// ✅ HELPER FUNCTION: Get online users count
export const getOnlineUsersCount = () => {
  return onlineUsers.size;
};

export default {
  initializeSocket,
  getIO,
  isUserOnline,
  getOnlineUsers,
  getOnlineUsersCount,
};