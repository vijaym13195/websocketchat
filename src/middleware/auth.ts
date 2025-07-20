import { Request, Response, NextFunction } from "express";
import { validateUserToken } from "../services/AuthenticationService";
import { PublicUser } from "../repositories/UserRepository";

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

// Extract token from Authorization header
function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  // Check for Bearer token format
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1];
}

// Extract token from various sources (header, query, cookie)
function extractToken(req: Request): string | null {
  // Try Authorization header first (preferred method)
  let token = extractTokenFromHeader(req.get("Authorization"));

  if (token) {
    return token;
  }

  // Try query parameter (for WebSocket connections)
  if (req.query.token && typeof req.query.token === "string") {
    return req.query.token;
  }

  // Try cookie (if using cookie-based auth)
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
}

// Required authentication middleware
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      res.status(401).json({
        error: {
          code: "MISSING_TOKEN",
          message: "Authentication token is required",
        },
      });
      return;
    }

    // Validate token and get user
    const user = await validateUserToken(token);

    // Attach user to request object
    req.user = user;

    next();
  } catch (error: any) {
    if (
      error.message.includes("Invalid token") ||
      error.message.includes("Token expired")
    ) {
      res.status(401).json({
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or expired authentication token",
        },
      });
      return;
    }

    if (error.message.includes("User not found")) {
      res.status(401).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "User associated with token not found",
        },
      });
      return;
    }

    if (error.message.includes("Account is deactivated")) {
      res.status(403).json({
        error: {
          code: "ACCOUNT_DEACTIVATED",
          message: "Your account has been deactivated",
        },
      });
      return;
    }

    console.error("Authentication middleware error:", error);
    res.status(500).json({
      error: {
        code: "AUTH_ERROR",
        message: "Authentication failed",
      },
    });
  }
}

// Optional authentication middleware
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      // No token provided, continue without authentication
      next();
      return;
    }

    // Try to validate token and get user
    try {
      const user = await validateUserToken(token);
      req.user = user;
    } catch (error) {
      // Token is invalid, but we continue without authentication
      // This allows endpoints to work for both authenticated and unauthenticated users
    }

    next();
  } catch (error: any) {
    console.error("Optional authentication middleware error:", error);
    // Continue without authentication even if there's an error
    next();
  }
}

// Role-based authorization middleware
export function requireRole(roles: string | string[]) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    // For now, we don't have roles in our user model
    // This is a placeholder for future role-based access control
    const userRole = "user"; // Default role

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: {
          code: "INSUFFICIENT_PERMISSIONS",
          message: "Insufficient permissions to access this resource",
        },
      });
    }

    next();
  };
}

// User ownership middleware (ensure user can only access their own resources)
export function requireOwnership(userIdParam: string = "id") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    const resourceUserId = req.params[userIdParam];

    if (req.user.id !== resourceUserId) {
      return res.status(403).json({
        error: {
          code: "ACCESS_DENIED",
          message: "You can only access your own resources",
        },
      });
    }

    next();
  };
}

// Rate limiting by user
export function rateLimitByUser(
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000
) {
  const userRequests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(); // Skip rate limiting for unauthenticated requests
    }

    const userId = req.user.id;
    const now = Date.now();
    const userLimit = userRequests.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      // Reset or initialize user limit
      userRequests.set(userId, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (userLimit.count >= maxRequests) {
      return res.status(429).json({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests, please try again later",
          retryAfter: Math.ceil((userLimit.resetTime - now) / 1000),
        },
      });
    }

    userLimit.count++;
    next();
  };
}

// Middleware to check if user is active
export function requireActiveUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    });
  }

  if (!req.user.isActive) {
    return res.status(403).json({
      error: {
        code: "ACCOUNT_DEACTIVATED",
        message: "Your account has been deactivated",
      },
    });
  }

  next();
}

// Middleware to log authentication events
export function logAuthEvents(req: Request, res: Response, next: NextFunction) {
  const originalSend = res.send;

  res.send = function (data) {
    // Log authentication events
    if (req.user) {
      console.log(
        `Authenticated request: ${req.method} ${req.path} - User: ${req.user.id} (${req.user.email})`
      );
    } else if (req.path.includes("/auth/")) {
      console.log(
        `Authentication attempt: ${req.method} ${req.path} - IP: ${req.ip}`
      );
    }

    return originalSend.call(this, data);
  };

  next();
}

// Helper function to get current user from request
export function getCurrentUser(req: Request): PublicUser | null {
  return req.user || null;
}

// Helper function to check if request is authenticated
export function isAuthenticated(req: Request): boolean {
  return !!req.user;
}

// Helper function to check if user owns resource
export function userOwnsResource(
  req: Request,
  resourceUserId: string
): boolean {
  return req.user?.id === resourceUserId;
}
