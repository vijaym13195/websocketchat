import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { setupSecurity } from "./middleware/security";
import {
  errorHandler,
  notFoundHandler,
  createHealthCheck,
  setupGracefulShutdown,
} from "./middleware/errorHandler";
import {
  authenticateSocket,
  optionalSocketAuth,
  requireSocketAuth,
} from "./middleware/websocketAuth";
import authRouter from "./routes/auth";
import usersRouter from "./routes/users";
import { requireAuth } from "./middleware/auth";

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
    ],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3000;

// Setup security middleware
setupSecurity(app);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", createHealthCheck());

// API routes
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);

// Protected route example
app.get("/api/protected", requireAuth, (req, res) => {
  res.json({
    success: true,
    message: "This is a protected route",
    user: req.user,
  });
});

// WebSocket authentication middleware
io.use(authenticateSocket);

// WebSocket connection handling
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.user?.email} (${socket.id})`);

  // Join user to their personal room
  if (socket.user) {
    socket.join(`user:${socket.user.id}`);
  }

  // Handle chat messages (requires authentication)
  socket.on(
    "chat:message",
    requireSocketAuth((socket, data) => {
      const { message, room } = data;

      if (!message || typeof message !== "string") {
        socket.emit("error", {
          code: "INVALID_MESSAGE",
          message: "Message is required and must be a string",
        });
        return;
      }

      // Broadcast message to room
      const messageData = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        message: message.trim(),
        user: {
          id: socket.user!.id,
          firstName: socket.user!.firstName,
          lastName: socket.user!.lastName,
        },
        timestamp: new Date().toISOString(),
      };

      if (room) {
        socket.to(room).emit("chat:message", messageData);
      } else {
        socket.broadcast.emit("chat:message", messageData);
      }

      // Send confirmation to sender
      socket.emit("chat:message:sent", {
        id: messageData.id,
        timestamp: messageData.timestamp,
      });
    })
  );

  // Handle joining rooms (requires authentication)
  socket.on(
    "chat:join",
    requireSocketAuth((socket, data) => {
      const { room } = data;

      if (!room || typeof room !== "string") {
        socket.emit("error", {
          code: "INVALID_ROOM",
          message: "Room name is required and must be a string",
        });
        return;
      }

      socket.join(room);
      socket.emit("chat:joined", { room });

      // Notify others in the room
      socket.to(room).emit("chat:user:joined", {
        user: {
          id: socket.user!.id,
          firstName: socket.user!.firstName,
          lastName: socket.user!.lastName,
        },
        room,
      });
    })
  );

  // Handle leaving rooms (requires authentication)
  socket.on(
    "chat:leave",
    requireSocketAuth((socket, data) => {
      const { room } = data;

      if (!room || typeof room !== "string") {
        socket.emit("error", {
          code: "INVALID_ROOM",
          message: "Room name is required and must be a string",
        });
        return;
      }

      socket.leave(room);
      socket.emit("chat:left", { room });

      // Notify others in the room
      socket.to(room).emit("chat:user:left", {
        user: {
          id: socket.user!.id,
          firstName: socket.user!.firstName,
          lastName: socket.user!.lastName,
        },
        room,
      });
    })
  );

  // Handle typing indicators (requires authentication)
  socket.on(
    "chat:typing",
    requireSocketAuth((socket, data) => {
      const { room, isTyping } = data;

      const typingData = {
        user: {
          id: socket.user!.id,
          firstName: socket.user!.firstName,
          lastName: socket.user!.lastName,
        },
        isTyping: Boolean(isTyping),
      };

      if (room) {
        socket.to(room).emit("chat:typing", typingData);
      } else {
        socket.broadcast.emit("chat:typing", typingData);
      }
    })
  );

  // Handle user status updates (requires authentication)
  socket.on(
    "user:status",
    requireSocketAuth((socket, data) => {
      const { status } = data;

      if (!["online", "away", "busy"].includes(status)) {
        socket.emit("error", {
          code: "INVALID_STATUS",
          message: "Status must be one of: online, away, busy",
        });
        return;
      }

      // Broadcast status update
      socket.broadcast.emit("user:status", {
        user: {
          id: socket.user!.id,
          firstName: socket.user!.firstName,
          lastName: socket.user!.lastName,
        },
        status,
      });
    })
  );

  // Handle private messages (requires authentication)
  socket.on(
    "chat:private",
    requireSocketAuth((socket, data) => {
      const { recipientId, message } = data;

      if (!recipientId || !message) {
        socket.emit("error", {
          code: "INVALID_PRIVATE_MESSAGE",
          message: "Recipient ID and message are required",
        });
        return;
      }

      const messageData = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        message: message.trim(),
        sender: {
          id: socket.user!.id,
          firstName: socket.user!.firstName,
          lastName: socket.user!.lastName,
        },
        timestamp: new Date().toISOString(),
      };

      // Send to recipient
      socket.to(`user:${recipientId}`).emit("chat:private", messageData);

      // Send confirmation to sender
      socket.emit("chat:private:sent", {
        id: messageData.id,
        recipientId,
        timestamp: messageData.timestamp,
      });
    })
  );

  // Handle disconnect
  socket.on("disconnect", (reason) => {
    console.log(
      `User disconnected: ${socket.user?.email} (${socket.id}) - ${reason}`
    );

    if (socket.user) {
      // Notify others that user went offline
      socket.broadcast.emit("user:status", {
        user: {
          id: socket.user.id,
          firstName: socket.user.firstName,
          lastName: socket.user.lastName,
        },
        status: "offline",
      });
    }
  });

  // Handle errors
  socket.on("error", (error) => {
    console.error(`Socket error for user ${socket.user?.email}:`, error);
  });
});

// Optional authentication for some WebSocket events
const publicIO = io.of("/public");
publicIO.use(optionalSocketAuth);

publicIO.on("connection", (socket) => {
  console.log(
    `Public connection: ${socket.id} (authenticated: ${socket.isAuthenticated})`
  );

  // Public chat (no authentication required)
  socket.on("public:message", (data) => {
    const { message, username } = data;

    if (!message || typeof message !== "string") {
      socket.emit("error", {
        code: "INVALID_MESSAGE",
        message: "Message is required and must be a string",
      });
      return;
    }

    const messageData = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: message.trim(),
      user: socket.isAuthenticated
        ? {
            id: socket.user!.id,
            firstName: socket.user!.firstName,
            lastName: socket.user!.lastName,
          }
        : {
            username: username || "Anonymous",
          },
      timestamp: new Date().toISOString(),
      authenticated: socket.isAuthenticated,
    };

    socket.broadcast.emit("public:message", messageData);
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`WebSocket server ready`);
});

// Setup graceful shutdown
setupGracefulShutdown(server);

export default app;
