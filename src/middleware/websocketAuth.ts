import { Socket } from "socket.io";
import { validateUserToken } from "../services/AuthenticationService";
import { PublicUser } from "../repositories/UserRepository";

// Extend Socket interface to include user
declare module "socket.io" {
  interface Socket {
    user?: PublicUser;
    isAuthenticated?: boolean;
  }
}

// Extract token from various sources for WebSocket connections
function extractTokenFromSocket(socket: Socket): string | null {
  // Try handshake auth token first
  if (socket.handshake.auth?.token) {
    return socket.handshake.auth.token;
  }

  // Try query parameter
  if (
    socket.handshake.query?.token &&
    typeof socket.handshake.query.token === "string"
  ) {
    return socket.handshake.query.token;
  }

  // Try Authorization header
  const authHeader = socket.handshake.headers.authorization;
  if (authHeader && typeof authHeader === "string") {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      return parts[1];
    }
  }

  // Try cookies
  if (socket.handshake.headers.cookie) {
    const cookies = parseCookies(socket.handshake.headers.cookie);
    if (cookies.accessToken) {
      return cookies.accessToken;
    }
  }

  return null;
}

// Simple cookie parser
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  cookieHeader.split(";").forEach((cookie) => {
    const [name, value] = cookie.trim().split("=");
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });

  return cookies;
}

// WebSocket authentication middleware
export async function authenticateSocket(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    const token = extractTokenFromSocket(socket);

    if (!token) {
      const error = new Error("Authentication token required");
      (error as any).data = { code: "MISSING_TOKEN" };
      return next(error);
    }

    // Validate token and get user
    const user = await validateUserToken(token);

    // Attach user to socket
    socket.user = user;
    socket.isAuthenticated = true;

    console.log(`WebSocket authenticated: ${user.email} (${user.id})`);
    next();
  } catch (error: any) {
    console.error("WebSocket authentication error:", error.message);

    let authError: Error & { data?: any };

    if (
      error.message.includes("Invalid token") ||
      error.message.includes("Token expired")
    ) {
      authError = new Error("Invalid or expired token");
      authError.data = { code: "INVALID_TOKEN" };
    } else if (error.message.includes("User not found")) {
      authError = new Error("User not found");
      authError.data = { code: "USER_NOT_FOUND" };
    } else if (error.message.includes("Account is deactivated")) {
      authError = new Error("Account deactivated");
      authError.data = { code: "ACCOUNT_DEACTIVATED" };
    } else {
      authError = new Error("Authentication failed");
      authError.data = { code: "AUTH_ERROR" };
    }

    next(authError);
  }
}

// Optional WebSocket authentication middleware
export async function optionalSocketAuth(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    const token = extractTokenFromSocket(socket);

    if (!token) {
      // No token provided, continue without authentication
      socket.isAuthenticated = false;
      return next();
    }

    try {
      // Try to validate token and get user
      const user = await validateUserToken(token);
      socket.user = user;
      socket.isAuthenticated = true;
      console.log(
        `WebSocket optionally authenticated: ${user.email} (${user.id})`
      );
    } catch (error) {
      // Token is invalid, but we continue without authentication
      socket.isAuthenticated = false;
      console.log(
        "WebSocket optional auth failed, continuing without authentication"
      );
    }

    next();
  } catch (error: any) {
    console.error("WebSocket optional authentication error:", error);
    // Continue without authentication even if there's an error
    socket.isAuthenticated = false;
    next();
  }
}

// Middleware to require authentication for specific events
export function requireSocketAuth(
  eventHandler: (socket: Socket, ...args: any[]) => void
) {
  return (socket: Socket, ...args: any[]) => {
    if (!socket.isAuthenticated || !socket.user) {
      socket.emit("error", {
        code: "UNAUTHORIZED",
        message: "Authentication required for this action",
      });
      return;
    }

    eventHandler(socket, ...args);
  };
}

// Middleware to check user ownership for socket events
export function requireSocketOwnership(
  getUserId: (socket: Socket, ...args: any[]) => string
) {
  return (eventHandler: (socket: Socket, ...args: any[]) => void) => {
    return (socket: Socket, ...args: any[]) => {
      if (!socket.isAuthenticated || !socket.user) {
        socket.emit("error", {
          code: "UNAUTHORIZED",
          message: "Authentication required for this action",
        });
        return;
      }

      const resourceUserId = getUserId(socket, ...args);

      if (socket.user.id !== resourceUserId) {
        socket.emit("error", {
          code: "ACCESS_DENIED",
          message: "You can only access your own resources",
        });
        return;
      }

      eventHandler(socket, ...args);
    };
  };
}

// Rate limiting for WebSocket events
export function rateLimitSocket(
  maxEvents: number = 100,
  windowMs: number = 60000
) {
  const socketLimits = new Map<string, { count: number; resetTime: number }>();

  return (eventHandler: (socket: Socket, ...args: any[]) => void) => {
    return (socket: Socket, ...args: any[]) => {
      const socketId = socket.id;
      const now = Date.now();
      const limit = socketLimits.get(socketId);

      if (!limit || now > limit.resetTime) {
        // Reset or initialize limit
        socketLimits.set(socketId, {
          count: 1,
          resetTime: now + windowMs,
        });
        return eventHandler(socket, ...args);
      }

      if (limit.count >= maxEvents) {
        socket.emit("error", {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many events, please slow down",
          retryAfter: Math.ceil((limit.resetTime - now) / 1000),
        });
        return;
      }

      limit.count++;
      eventHandler(socket, ...args);
    };
  };
}

// Helper to get current user from socket
export function getSocketUser(socket: Socket): PublicUser | null {
  return socket.user || null;
}

// Helper to check if socket is authenticated
export function isSocketAuthenticated(socket: Socket): boolean {
  return socket.isAuthenticated === true && !!socket.user;
}

// Helper to broadcast to authenticated users only
export function broadcastToAuthenticated(io: any, event: string, data: any) {
  io.sockets.sockets.forEach((socket: Socket) => {
    if (isSocketAuthenticated(socket)) {
      socket.emit(event, data);
    }
  });
}

// Helper to broadcast to specific user
export function broadcastToUser(
  io: any,
  userId: string,
  event: string,
  data: any
) {
  io.sockets.sockets.forEach((socket: Socket) => {
    if (socket.user?.id === userId) {
      socket.emit(event, data);
    }
  });
}

// Helper to get all authenticated sockets for a user
export function getUserSockets(io: any, userId: string): Socket[] {
  const userSockets: Socket[] = [];

  io.sockets.sockets.forEach((socket: Socket) => {
    if (socket.user?.id === userId) {
      userSockets.push(socket);
    }
  });

  return userSockets;
}

// Cleanup function to remove socket limits when socket disconnects
export function cleanupSocketLimits(socket: Socket) {
  // This would be called in the disconnect handler
  // Implementation depends on how you store the rate limiting data
}

// Middleware to log socket authentication events
export function logSocketAuth(socket: Socket, next: (err?: Error) => void) {
  const originalNext = next;

  next = (err?: Error) => {
    if (err) {
      console.log(`WebSocket auth failed: ${socket.id} - ${err.message}`);
    } else if (socket.user) {
      console.log(
        `WebSocket auth success: ${socket.id} - ${socket.user.email}`
      );
    } else {
      console.log(`WebSocket connected without auth: ${socket.id}`);
    }

    originalNext(err);
  };

  next();
}
