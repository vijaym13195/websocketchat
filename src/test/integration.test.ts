import request from "supertest";
import express from "express";
import { setupSecurity } from "../middleware/security";
import { errorHandler, notFoundHandler } from "../middleware/errorHandler";
import authRouter from "../routes/auth";
import usersRouter from "../routes/users";
import { requireAuth } from "../middleware/auth";

// Mock all services
jest.mock("../services/AuthenticationService");
jest.mock("../services/PasswordService");
jest.mock("../services/TokenService");
jest.mock("../repositories/UserRepository");

describe("Authentication Integration Tests", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();

    // Setup middleware
    setupSecurity(app);
    app.use(express.json());

    // Setup routes
    app.use("/api/auth", authRouter);
    app.use("/api/users", usersRouter);

    // Setup error handling
    app.use(notFoundHandler);
    app.use(errorHandler);

    jest.clearAllMocks();
  });

  describe("Complete Authentication Flow", () => {
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

    it("should complete full registration and login flow", async () => {
      const { register, login } = require("../services/AuthenticationService");
      register.mockResolvedValue(mockAuthResult);
      login.mockResolvedValue(mockAuthResult);

      // Step 1: Register
      const registerResponse = await request(app)
        .post("/api/auth/register")
        .send({
          email: "test@example.com",
          password: "StrongPassword123!",
          firstName: "John",
          lastName: "Doe",
        })
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data).toEqual(mockAuthResult);

      // Step 2: Login
      const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "StrongPassword123!",
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data).toEqual(mockAuthResult);
    });

    it("should handle token refresh flow", async () => {
      const { refreshTokens } = require("../services/AuthenticationService");
      refreshTokens.mockResolvedValue(mockAuthResult);

      const refreshResponse = await request(app)
        .post("/api/auth/refresh")
        .send({
          refreshToken: "valid-refresh-token",
        })
        .expect(200);

      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data).toEqual(mockAuthResult);
    });

    it("should handle logout flow", async () => {
      const { logout } = require("../services/AuthenticationService");
      logout.mockResolvedValue(undefined);

      const logoutResponse = await request(app)
        .post("/api/auth/logout")
        .send({
          refreshToken: "valid-refresh-token",
        })
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);
    });
  });

  describe("Protected Routes", () => {
    beforeEach(() => {
      // Mock auth middleware to simulate authenticated user
      const { requireAuth } = require("../middleware/auth");
      requireAuth.mockImplementation((req: any, res: any, next: any) => {
        req.user = {
          id: "user-123",
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
          isActive: true,
          createdAt: new Date("2023-01-01"),
          lastLoginAt: null,
        };
        next();
      });
    });

    it("should access protected user profile endpoint", async () => {
      const { getUserProfile } = require("../services/AuthenticationService");
      getUserProfile.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        isActive: true,
        createdAt: new Date("2023-01-01"),
        lastLoginAt: null,
      });

      const response = await request(app).get("/api/users/profile").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe("test@example.com");
    });

    it("should update user profile", async () => {
      const {
        updateUser,
        toPublicUser,
      } = require("../repositories/UserRepository");
      const updatedUser = {
        id: "user-123",
        email: "test@example.com",
        firstName: "Jane",
        lastName: "Smith",
        isActive: true,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      updateUser.mockResolvedValue(updatedUser);
      toPublicUser.mockReturnValue(updatedUser);

      const response = await request(app)
        .put("/api/users/profile")
        .send({
          firstName: "Jane",
          lastName: "Smith",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.firstName).toBe("Jane");
      expect(response.body.data.user.lastName).toBe("Smith");
    });

    it("should change user password", async () => {
      const { changePassword } = require("../services/AuthenticationService");
      changePassword.mockResolvedValue(undefined);

      const response = await request(app)
        .put("/api/users/password")
        .send({
          currentPassword: "CurrentPassword123!",
          newPassword: "NewPassword123!",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Password changed successfully");
    });
  });

  describe("Error Handling", () => {
    it("should handle validation errors", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "invalid-email",
          password: "weak",
        })
        .expect(400);

      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      expect(response.body.error.details).toBeDefined();
    });

    it("should handle authentication errors", async () => {
      const { login } = require("../services/AuthenticationService");
      login.mockRejectedValue(new Error("Invalid credentials"));

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "wrong-password",
        })
        .expect(401);

      expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("should handle 404 for non-existent routes", async () => {
      const response = await request(app).get("/api/non-existent").expect(404);

      expect(response.body.error.code).toBe("ROUTE_NOT_FOUND");
    });
  });

  describe("Security Features", () => {
    it("should set security headers", async () => {
      const response = await request(app).get("/api/auth/me").expect(401);

      expect(response.headers["x-content-type-options"]).toBe("nosniff");
      expect(response.headers["x-frame-options"]).toBe("DENY");
      expect(response.headers["x-xss-protection"]).toBe("1; mode=block");
    });

    it("should handle CORS preflight requests", async () => {
      const response = await request(app)
        .options("/api/auth/login")
        .set("Origin", "http://localhost:3000")
        .set("Access-Control-Request-Method", "POST")
        .expect(204);

      expect(response.headers["access-control-allow-origin"]).toBe(
        "http://localhost:3000"
      );
      expect(response.headers["access-control-allow-methods"]).toContain(
        "POST"
      );
    });

    it("should reject requests with unsupported content type", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .set("Content-Type", "text/plain")
        .send("invalid data")
        .expect(415);

      expect(response.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    });
  });

  describe("Rate Limiting", () => {
    it("should apply rate limiting to authentication endpoints", async () => {
      const { login } = require("../services/AuthenticationService");
      login.mockRejectedValue(new Error("Invalid credentials"));

      // Make multiple failed login attempts
      const promises = Array(10)
        .fill(null)
        .map(() =>
          request(app).post("/api/auth/login").send({
            email: "test@example.com",
            password: "wrong-password",
          })
        );

      const responses = await Promise.all(promises);

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(
        (res) => res.status === 429
      );
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe("Input Sanitization", () => {
    it("should sanitize malicious input", async () => {
      const { register } = require("../services/AuthenticationService");
      register.mockImplementation((data: any) => {
        // Verify that malicious content has been sanitized
        expect(data.firstName).not.toContain("<script>");
        expect(data.firstName).not.toContain("javascript:");
        return Promise.resolve({
          user: { id: "user-123", email: data.email },
          accessToken: "token",
          refreshToken: "refresh",
        });
      });

      await request(app)
        .post("/api/auth/register")
        .send({
          email: "test@example.com",
          password: "StrongPassword123!",
          firstName: '<script>alert("xss")</script>John',
          lastName: "javascript:alert(1)",
        })
        .expect(201);

      expect(register).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "John",
          lastName: "",
        })
      );
    });
  });

  describe("Performance", () => {
    it("should respond to authentication requests within acceptable time", async () => {
      const { login } = require("../services/AuthenticationService");
      login.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        accessToken: "token",
        refreshToken: "refresh",
      });

      const start = Date.now();

      await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "password",
        })
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});
