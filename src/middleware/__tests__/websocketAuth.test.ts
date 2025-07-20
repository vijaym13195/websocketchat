import { Socket } from "socket.io";
import {
  authenticateSocket,
  optionalSocketAuth,
  requireSocketAuth,
  requireSocketOwnership,
  rateLimitSocket,
  getSocketUser,
  isSocketAuthenticated,
} from "../websocketAuth";

// Mock the authentication service
jest.mock("../../services/AuthenticationService");

describe("WebSocket Authentication Middleware", () => {
  let mockSocket: Partial<Socket>;
  let mockNext: jest.Mock;

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
    mockSocket = {
      id: "socket-123",
      handshake: {
        auth: {},
        query: {},
        headers: {},
        time: "",
        address: "",
        xdomain: false,
        secure: false,
        issued: 0,
        url: "",
      } as any,
      emit: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe("authenticateSocket", () => {
    it("should authenticate socket with valid token from auth", async () => {
      const {
        validateUserToken,
      } = require("../../services/AuthenticationService");
      validateUserToken.mockResolvedValue(mockUser);

      mockSocket.handshake!.auth = { token: "valid-token" };

      await authenticateSocket(mockSocket as Socket, mockNext);

      expect(validateUserToken).toHaveBeenCalledWith("valid-token");
      expect(mockSocket.user).toEqual(mockUser);
      expect(mockSocket.isAuthenticated).toBe(true);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should authenticate socket with valid token from query", async () => {
      const {
        validateUserToken,
      } = require("../../services/AuthenticationService");
      validateUserToken.mockResolvedValue(mockUser);

      mockSocket.handshake!.query = { token: "valid-token" };

      await authenticateSocket(mockSocket as Socket, mockNext);

      expect(validateUserToken).toHaveBeenCalledWith("valid-token");
      expect(mockSocket.user).toEqual(mockUser);
      expect(mockSocket.isAuthenticated).toBe(true);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should authenticate socket with Bearer token from headers", async () => {
      const {
        validateUserToken,
      } = require("../../services/AuthenticationService");
      validateUserToken.mockResolvedValue(mockUser);

      mockSocket.handshake!.headers = { authorization: "Bearer valid-token" };

      await authenticateSocket(mockSocket as Socket, mockNext);

      expect(validateUserToken).toHaveBeenCalledWith("valid-token");
      expect(mockSocket.user).toEqual(mockUser);
      expect(mockSocket.isAuthenticated).toBe(true);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should authenticate socket with token from cookies", async () => {
      const {
        validateUserToken,
      } = require("../../services/AuthenticationService");
      validateUserToken.mockResolvedValue(mockUser);

      mockSocket.handshake!.headers = {
        cookie: "accessToken=valid-token; other=value",
      };

      await authenticateSocket(mockSocket as Socket, mockNext);

      expect(validateUserToken).toHaveBeenCalledWith("valid-token");
      expect(mockSocket.user).toEqual(mockUser);
      expect(mockSocket.isAuthenticated).toBe(true);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should reject socket without token", async () => {
      await authenticateSocket(mockSocket as Socket, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Authentication token required",
          data: { code: "MISSING_TOKEN" },
        })
      );
      expect(mockSocket.user).toBeUndefined();
      expect(mockSocket.isAuthenticated).toBeUndefined();
    });

    it("should reject socket with invalid token", async () => {
      const {
        validateUserToken,
      } = require("../../services/AuthenticationService");
      validateUserToken.mockRejectedValue(new Error("Invalid token"));

      mockSocket.handshake!.auth = { token: "invalid-token" };

      await authenticateSocket(mockSocket as Socket, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Invalid or expired token",
          data: { code: "INVALID_TOKEN" },
        })
      );
      expect(mockSocket.user).toBeUndefined();
    });

    it("should reject socket with expired token", async () => {
      const {
        validateUserToken,
      } = require("../../services/AuthenticationService");
      validateUserToken.mockRejectedValue(new Error("Token expired"));

      mockSocket.handshake!.auth = { token: "expired-token" };

      await authenticateSocket(mockSocket as Socket, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Invalid or expired token",
          data: { code: "INVALID_TOKEN" },
        })
      );
    });

    it("should reject socket when user not found", async () => {
      const {
        validateUserToken,
      } = require("../../services/AuthenticationService");
      validateUserToken.mockRejectedValue(new Error("User not found"));

      mockSocket.handshake!.auth = { token: "valid-token" };

      await authenticateSocket(mockSocket as Socket, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "User not found",
          data: { code: "USER_NOT_FOUND" },
        })
      );
    });

    it("should reject socket for deactivated account", async () => {
      const {
        validateUserToken,
      } = require("../../services/AuthenticationService");
      validateUserToken.mockRejectedValue(new Error("Account is deactivated"));

      mockSocket.handshake!.auth = { token: "valid-token" };

      await authenticateSocket(mockSocket as Socket, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Account deactivated",
          data: { code: "ACCOUNT_DEACTIVATED" },
        })
      );
    });

    it("should handle malformed Authorization header", async () => {
      mockSocket.handshake!.headers = { authorization: "InvalidFormat token" };

      await authenticateSocket(mockSocket as Socket, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Authentication token required",
          data: { code: "MISSING_TOKEN" },
        })
      );
    });
  });

  describe("optionalSocketAuth", () => {
    it("should authenticate socket when valid token is provided", async () => {
      const {
        validateUserToken,
      } = require("../../services/AuthenticationService");
      validateUserToken.mockResolvedValue(mockUser);

      mockSocket.handshake!.auth = { token: "valid-token" };

      await optionalSocketAuth(mockSocket as Socket, mockNext);

      expect(mockSocket.user).toEqual(mockUser);
      expect(mockSocket.isAuthenticated).toBe(true);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should continue without authentication when no token is provided", async () => {
      await optionalSocketAuth(mockSocket as Socket, mockNext);

      expect(mockSocket.user).toBeUndefined();
      expect(mockSocket.isAuthenticated).toBe(false);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should continue without authentication when token is invalid", async () => {
      const {
        validateUserToken,
      } = require("../../services/AuthenticationService");
      validateUserToken.mockRejectedValue(new Error("Invalid token"));

      mockSocket.handshake!.auth = { token: "invalid-token" };

      await optionalSocketAuth(mockSocket as Socket, mockNext);

      expect(mockSocket.user).toBeUndefined();
      expect(mockSocket.isAuthenticated).toBe(false);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe("requireSocketAuth", () => {
    it("should call event handler for authenticated socket", () => {
      mockSocket.isAuthenticated = true;
      mockSocket.user = mockUser;

      const mockHandler = jest.fn();
      const wrappedHandler = requireSocketAuth(mockHandler);

      wrappedHandler(mockSocket as Socket, "arg1", "arg2");

      expect(mockHandler).toHaveBeenCalledWith(mockSocket, "arg1", "arg2");
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it("should emit error for unauthenticated socket", () => {
      mockSocket.isAuthenticated = false;

      const mockHandler = jest.fn();
      const wrappedHandler = requireSocketAuth(mockHandler);

      wrappedHandler(mockSocket as Socket, "arg1", "arg2");

      expect(mockHandler).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith("error", {
        code: "UNAUTHORIZED",
        message: "Authentication required for this action",
      });
    });

    it("should emit error when user is missing", () => {
      mockSocket.isAuthenticated = true;
      // mockSocket.user is undefined

      const mockHandler = jest.fn();
      const wrappedHandler = requireSocketAuth(mockHandler);

      wrappedHandler(mockSocket as Socket, "arg1", "arg2");

      expect(mockHandler).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith("error", {
        code: "UNAUTHORIZED",
        message: "Authentication required for this action",
      });
    });
  });

  describe("requireSocketOwnership", () => {
    it("should call event handler when user owns resource", () => {
      mockSocket.isAuthenticated = true;
      mockSocket.user = mockUser;

      const getUserId = jest.fn().mockReturnValue("user-123");
      const mockHandler = jest.fn();
      const wrappedHandler = requireSocketOwnership(getUserId)(mockHandler);

      wrappedHandler(mockSocket as Socket, "arg1", "arg2");

      expect(getUserId).toHaveBeenCalledWith(mockSocket, "arg1", "arg2");
      expect(mockHandler).toHaveBeenCalledWith(mockSocket, "arg1", "arg2");
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it("should emit error when user does not own resource", () => {
      mockSocket.isAuthenticated = true;
      mockSocket.user = mockUser;

      const getUserId = jest.fn().mockReturnValue("other-user-456");
      const mockHandler = jest.fn();
      const wrappedHandler = requireSocketOwnership(getUserId)(mockHandler);

      wrappedHandler(mockSocket as Socket, "arg1", "arg2");

      expect(mockHandler).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith("error", {
        code: "ACCESS_DENIED",
        message: "You can only access your own resources",
      });
    });

    it("should emit error for unauthenticated socket", () => {
      mockSocket.isAuthenticated = false;

      const getUserId = jest.fn();
      const mockHandler = jest.fn();
      const wrappedHandler = requireSocketOwnership(getUserId)(mockHandler);

      wrappedHandler(mockSocket as Socket, "arg1", "arg2");

      expect(getUserId).not.toHaveBeenCalled();
      expect(mockHandler).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith("error", {
        code: "UNAUTHORIZED",
        message: "Authentication required for this action",
      });
    });
  });

  describe("rateLimitSocket", () => {
    it("should allow events within rate limit", () => {
      const mockHandler = jest.fn();
      const wrappedHandler = rateLimitSocket(5, 60000)(mockHandler);

      // Call handler 5 times (within limit)
      for (let i = 0; i < 5; i++) {
        wrappedHandler(mockSocket as Socket, `arg${i}`);
      }

      expect(mockHandler).toHaveBeenCalledTimes(5);
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it("should block events exceeding rate limit", () => {
      const mockHandler = jest.fn();
      const wrappedHandler = rateLimitSocket(2, 60000)(mockHandler);

      // Call handler 3 times (exceeding limit of 2)
      wrappedHandler(mockSocket as Socket, "arg1");
      wrappedHandler(mockSocket as Socket, "arg2");
      wrappedHandler(mockSocket as Socket, "arg3");

      expect(mockHandler).toHaveBeenCalledTimes(2);
      expect(mockSocket.emit).toHaveBeenCalledWith("error", {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many events, please slow down",
        retryAfter: expect.any(Number),
      });
    });
  });

  describe("Helper functions", () => {
    describe("getSocketUser", () => {
      it("should return user when socket is authenticated", () => {
        mockSocket.user = mockUser;
        const result = getSocketUser(mockSocket as Socket);
        expect(result).toEqual(mockUser);
      });

      it("should return null when socket is not authenticated", () => {
        const result = getSocketUser(mockSocket as Socket);
        expect(result).toBeNull();
      });
    });

    describe("isSocketAuthenticated", () => {
      it("should return true when socket is authenticated", () => {
        mockSocket.isAuthenticated = true;
        mockSocket.user = mockUser;
        const result = isSocketAuthenticated(mockSocket as Socket);
        expect(result).toBe(true);
      });

      it("should return false when socket is not authenticated", () => {
        mockSocket.isAuthenticated = false;
        const result = isSocketAuthenticated(mockSocket as Socket);
        expect(result).toBe(false);
      });

      it("should return false when user is missing", () => {
        mockSocket.isAuthenticated = true;
        // mockSocket.user is undefined
        const result = isSocketAuthenticated(mockSocket as Socket);
        expect(result).toBe(false);
      });
    });
  });
});
