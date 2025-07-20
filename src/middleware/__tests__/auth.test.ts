import { Request, Response, NextFunction } from "express";
import {
  requireAuth,
  optionalAuth,
  requireRole,
  requireOwnership,
  requireActiveUser,
  getCurrentUser,
  isAuthenticated,
  userOwnsResource,
} from "../auth";

// Mock the authentication service
jest.mock("../../services/AuthenticationService");

describe("Authentication Middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    isActive: true,
    createdAt: new Date("2023-01-01"),
    lastLoginAt: undefined,
  };

  beforeEach(() => {
    mockReq = {
      get: jest.fn(),
      query: {},
      cookies: {},
      params: {},
      path: "/test",
      method: "GET",
      ip: "127.0.0.1",
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe("requireAuth", () => {
    it("should authenticate user with valid Bearer token", async () => {
      const {
        validateUserToken,
      } = require("../../services/AuthenticationService");
      validateUserToken.mockResolvedValue(mockUser);

      (mockReq.get as jest.Mock).mockReturnValue("Bearer valid-token");

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(validateUserToken).toHaveBeenCalledWith("valid-token");
      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should authenticate user with token from query parameter", async () => {
      const {
        validateUserToken,
      } = require("../../services/AuthenticationService");
      validateUserToken.mockResolvedValue(mockUser);

      mockReq.query = { token: "valid-token" };

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(validateUserToken).toHaveBeenCalledWith("valid-token");
      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it("should authenticate user with token from cookie", async () => {
      const {
        validateUserToken,
      } = require("../../services/AuthenticationService");
      validateUserToken.mockResolvedValue(mockUser);

      mockReq.cookies = { accessToken: "valid-token" };

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(validateUserToken).toHaveBeenCalledWith("valid-token");
      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it("should return 401 when no token is provided", async () => {
      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: "MISSING_TOKEN",
          message: "Authentication token is required",
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 for invalid token", async () => {
      const {
        validateUserToken,
      } = require("../../services/AuthenticationService");
      validateUserToken.mockRejectedValue(new Error("Invalid token"));

      (mockReq.get as jest.Mock).mockReturnValue("Bearer invalid-token");

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or expired authentication token",
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 for expired token", async () => {
      const {
        validateUserToken,
      } = require("../../services/AuthenticationService");
      validateUserToken.mockRejectedValue(new Error("Token expired"));

      (mockReq.get as jest.Mock).mockReturnValue("Bearer expired-token");

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or expired authentication token",
        },
      });
    });

    it("should return 401 when user not found", async () => {
      const {
        validateUserToken,
      } = require("../../services/AuthenticationService");
      validateUserToken.mockRejectedValue(new Error("User not found"));

      (mockReq.get as jest.Mock).mockReturnValue("Bearer valid-token");

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: "USER_NOT_FOUND",
          message: "User associated with token not found",
        },
      });
    });

    it("should return 403 for deactivated account", async () => {
      const {
        validateUserToken,
      } = require("../../services/AuthenticationService");
      validateUserToken.mockRejectedValue(new Error("Account is deactivated"));

      (mockReq.get as jest.Mock).mockReturnValue("Bearer valid-token");

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: "ACCOUNT_DEACTIVATED",
          message: "Your account has been deactivated",
        },
      });
    });

    it("should handle malformed Authorization header", async () => {
      (mockReq.get as jest.Mock).mockReturnValue("InvalidFormat token");

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: "MISSING_TOKEN",
          message: "Authentication token is required",
        },
      });
    });
  });

  describe("optionalAuth", () => {
    it("should authenticate user when valid token is provided", async () => {
      const {
        validateUserToken,
      } = require("../../services/AuthenticationService");
      validateUserToken.mockResolvedValue(mockUser);

      (mockReq.get as jest.Mock).mockReturnValue("Bearer valid-token");

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should continue without authentication when no token is provided", async () => {
      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should continue without authentication when token is invalid", async () => {
      const {
        validateUserToken,
      } = require("../../services/AuthenticationService");
      validateUserToken.mockRejectedValue(new Error("Invalid token"));

      (mockReq.get as jest.Mock).mockReturnValue("Bearer invalid-token");

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe("requireRole", () => {
    it("should allow access for user with required role", () => {
      mockReq.user = mockUser;
      const middleware = requireRole("user");

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should allow access for user with one of multiple required roles", () => {
      mockReq.user = mockUser;
      const middleware = requireRole(["admin", "user"]);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should deny access for unauthenticated user", () => {
      const middleware = requireRole("user");

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should deny access for user without required role", () => {
      mockReq.user = mockUser;
      const middleware = requireRole("admin");

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: "INSUFFICIENT_PERMISSIONS",
          message: "Insufficient permissions to access this resource",
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("requireOwnership", () => {
    it("should allow access when user owns the resource", () => {
      mockReq.user = mockUser;
      mockReq.params = { id: "user-123" };
      const middleware = requireOwnership();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should deny access when user does not own the resource", () => {
      mockReq.user = mockUser;
      mockReq.params = { id: "other-user-456" };
      const middleware = requireOwnership();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: "ACCESS_DENIED",
          message: "You can only access your own resources",
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should deny access for unauthenticated user", () => {
      mockReq.params = { id: "user-123" };
      const middleware = requireOwnership();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should use custom parameter name", () => {
      mockReq.user = mockUser;
      mockReq.params = { userId: "user-123" };
      const middleware = requireOwnership("userId");

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe("requireActiveUser", () => {
    it("should allow access for active user", () => {
      mockReq.user = mockUser;

      requireActiveUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should deny access for inactive user", () => {
      mockReq.user = { ...mockUser, isActive: false };

      requireActiveUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: "ACCOUNT_DEACTIVATED",
          message: "Your account has been deactivated",
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should deny access for unauthenticated user", () => {
      requireActiveUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("Helper functions", () => {
    describe("getCurrentUser", () => {
      it("should return user when authenticated", () => {
        mockReq.user = mockUser;
        const result = getCurrentUser(mockReq as Request);
        expect(result).toEqual(mockUser);
      });

      it("should return null when not authenticated", () => {
        const result = getCurrentUser(mockReq as Request);
        expect(result).toBeNull();
      });
    });

    describe("isAuthenticated", () => {
      it("should return true when user is authenticated", () => {
        mockReq.user = mockUser;
        const result = isAuthenticated(mockReq as Request);
        expect(result).toBe(true);
      });

      it("should return false when user is not authenticated", () => {
        const result = isAuthenticated(mockReq as Request);
        expect(result).toBe(false);
      });
    });

    describe("userOwnsResource", () => {
      it("should return true when user owns resource", () => {
        mockReq.user = mockUser;
        const result = userOwnsResource(mockReq as Request, "user-123");
        expect(result).toBe(true);
      });

      it("should return false when user does not own resource", () => {
        mockReq.user = mockUser;
        const result = userOwnsResource(mockReq as Request, "other-user-456");
        expect(result).toBe(false);
      });

      it("should return false when user is not authenticated", () => {
        const result = userOwnsResource(mockReq as Request, "user-123");
        expect(result).toBe(false);
      });
    });
  });
});
