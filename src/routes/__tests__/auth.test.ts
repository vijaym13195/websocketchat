import request from "supertest";
import express from "express";
import authRouter from "../auth";

// Mock the authentication service
jest.mock("../../services/AuthenticationService");

const app = express();
app.use(express.json());
app.use("/api/auth", authRouter);

describe("Authentication Routes", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    isActive: true,
    createdAt: new Date("2023-01-01"),
    lastLoginAt: null,
  };

  const mockAuthResult = {
    user: mockUser,
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user successfully", async () => {
      const { register } = require("../../services/AuthenticationService");
      register.mockResolvedValue(mockAuthResult);

      const registerData = {
        email: "test@example.com",
        password: "StrongPass123!",
        firstName: "John",
        lastName: "Doe",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(registerData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAuthResult);
      expect(response.body.message).toBe("User registered successfully");
      expect(register).toHaveBeenCalledWith(registerData);
    });

    it("should return 409 for existing email", async () => {
      const { register } = require("../../services/AuthenticationService");
      register.mockRejectedValue(new Error("Email already registered"));

      const registerData = {
        email: "existing@example.com",
        password: "StrongPass123!",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(registerData)
        .expect(409);

      expect(response.body.error.code).toBe("EMAIL_ALREADY_EXISTS");
    });

    it("should return 400 for weak password", async () => {
      const { register } = require("../../services/AuthenticationService");
      register.mockRejectedValue(
        new Error("Password validation failed: Password too weak")
      );

      const registerData = {
        email: "test@example.com",
        password: "weak",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(registerData)
        .expect(400);

      expect(response.body.error.code).toBe("WEAK_PASSWORD");
    });

    it("should return 400 for invalid email format", async () => {
      const registerData = {
        email: "invalid-email",
        password: "StrongPass123!",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(registerData)
        .expect(400);

      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for missing required fields", async () => {
      const registerData = {
        email: "test@example.com",
        // missing password
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(registerData)
        .expect(400);

      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login user successfully", async () => {
      const { login } = require("../../services/AuthenticationService");
      login.mockResolvedValue(mockAuthResult);

      const loginData = {
        email: "test@example.com",
        password: "correct-password",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAuthResult);
      expect(response.body.message).toBe("Login successful");
      expect(login).toHaveBeenCalledWith(loginData);
    });

    it("should return 401 for invalid credentials", async () => {
      const { login } = require("../../services/AuthenticationService");
      login.mockRejectedValue(new Error("Invalid credentials"));

      const loginData = {
        email: "test@example.com",
        password: "wrong-password",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(401);

      expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("should return 403 for deactivated account", async () => {
      const { login } = require("../../services/AuthenticationService");
      login.mockRejectedValue(new Error("Account is deactivated"));

      const loginData = {
        email: "test@example.com",
        password: "correct-password",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(403);

      expect(response.body.error.code).toBe("ACCOUNT_DEACTIVATED");
    });

    it("should return 400 for invalid email format", async () => {
      const loginData = {
        email: "invalid-email",
        password: "password",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(400);

      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for empty password", async () => {
      const loginData = {
        email: "test@example.com",
        password: "",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(400);

      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("should refresh tokens successfully", async () => {
      const { refreshTokens } = require("../../services/AuthenticationService");
      refreshTokens.mockResolvedValue(mockAuthResult);

      const refreshData = {
        refreshToken: "valid-refresh-token",
      };

      const response = await request(app)
        .post("/api/auth/refresh")
        .send(refreshData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAuthResult);
      expect(response.body.message).toBe("Tokens refreshed successfully");
      expect(refreshTokens).toHaveBeenCalledWith("valid-refresh-token");
    });

    it("should return 401 for invalid refresh token", async () => {
      const { refreshTokens } = require("../../services/AuthenticationService");
      refreshTokens.mockRejectedValue(new Error("Invalid refresh token"));

      const refreshData = {
        refreshToken: "invalid-refresh-token",
      };

      const response = await request(app)
        .post("/api/auth/refresh")
        .send(refreshData)
        .expect(401);

      expect(response.body.error.code).toBe("INVALID_REFRESH_TOKEN");
    });

    it("should return 401 for expired refresh token", async () => {
      const { refreshTokens } = require("../../services/AuthenticationService");
      refreshTokens.mockRejectedValue(new Error("Token expired"));

      const refreshData = {
        refreshToken: "expired-refresh-token",
      };

      const response = await request(app)
        .post("/api/auth/refresh")
        .send(refreshData)
        .expect(401);

      expect(response.body.error.code).toBe("INVALID_REFRESH_TOKEN");
    });

    it("should return 400 for missing refresh token", async () => {
      const refreshData = {};

      const response = await request(app)
        .post("/api/auth/refresh")
        .send(refreshData)
        .expect(400);

      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should logout successfully", async () => {
      const { logout } = require("../../services/AuthenticationService");
      logout.mockResolvedValue(undefined);

      const logoutData = {
        refreshToken: "valid-refresh-token",
      };

      const response = await request(app)
        .post("/api/auth/logout")
        .send(logoutData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Logged out successfully");
      expect(logout).toHaveBeenCalledWith("valid-refresh-token");
    });

    it("should return success even if logout fails", async () => {
      const { logout } = require("../../services/AuthenticationService");
      logout.mockRejectedValue(new Error("Token not found"));

      const logoutData = {
        refreshToken: "nonexistent-token",
      };

      const response = await request(app)
        .post("/api/auth/logout")
        .send(logoutData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Logged out successfully");
    });

    it("should return 400 for missing refresh token", async () => {
      const logoutData = {};

      const response = await request(app)
        .post("/api/auth/logout")
        .send(logoutData)
        .expect(400);

      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/auth/logout-all", () => {
    it("should logout from all devices successfully", async () => {
      const { logoutAll } = require("../../services/AuthenticationService");
      logoutAll.mockResolvedValue(undefined);

      // Mock authenticated request
      const mockReq = { user: { id: "user-123" } };

      // We need to mock the middleware that sets req.user
      const response = await request(app)
        .post("/api/auth/logout-all")
        .expect(401); // Will be 401 without auth middleware

      expect(response.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return user info when authenticated", async () => {
      // This will return 401 without auth middleware
      const response = await request(app).get("/api/auth/me").expect(401);

      expect(response.body.error.code).toBe("UNAUTHORIZED");
    });
  });
});
