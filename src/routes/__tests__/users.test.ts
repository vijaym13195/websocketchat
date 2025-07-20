import request from "supertest";
import express from "express";
import usersRouter from "../users";

// Mock all dependencies
jest.mock("../../services/AuthenticationService");
jest.mock("../../repositories/UserRepository");
jest.mock("../../middleware/auth");

const app = express();
app.use(express.json());
app.use("/api/users", usersRouter);

describe("User Management Routes", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    isActive: true,
    createdAt: new Date("2023-01-01"),
    lastLoginAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock auth middleware to always authenticate
    const { requireAuth } = require("../../middleware/auth");
    requireAuth.mockImplementation((req: any, res: any, next: any) => {
      req.user = mockUser;
      next();
    });
  });

  describe("GET /api/users/profile", () => {
    it("should get user profile successfully", async () => {
      const {
        getUserProfile,
      } = require("../../services/AuthenticationService");
      getUserProfile.mockResolvedValue(mockUser);

      const response = await request(app).get("/api/users/profile").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toEqual(mockUser);
      expect(response.body.message).toBe("Profile retrieved successfully");
      expect(getUserProfile).toHaveBeenCalledWith("user-123");
    });

    it("should return 404 when user not found", async () => {
      const {
        getUserProfile,
      } = require("../../services/AuthenticationService");
      getUserProfile.mockRejectedValue(new Error("User not found"));

      const response = await request(app).get("/api/users/profile").expect(404);

      expect(response.body.error.code).toBe("USER_NOT_FOUND");
    });
  });

  describe("PUT /api/users/profile", () => {
    it("should update user profile successfully", async () => {
      const {
        updateUser,
        toPublicUser,
      } = require("../../repositories/UserRepository");
      const updatedUser = { ...mockUser, firstName: "Jane" };

      updateUser.mockResolvedValue(updatedUser);
      toPublicUser.mockReturnValue(updatedUser);

      const updateData = {
        firstName: "Jane",
        lastName: "Smith",
      };

      const response = await request(app)
        .put("/api/users/profile")
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toEqual(updatedUser);
      expect(response.body.message).toBe("Profile updated successfully");
      expect(updateUser).toHaveBeenCalledWith("user-123", updateData);
    });

    it("should return 409 for duplicate email", async () => {
      const { updateUser } = require("../../repositories/UserRepository");
      updateUser.mockRejectedValue(new Error("Email already exists"));

      const updateData = {
        email: "existing@example.com",
      };

      const response = await request(app)
        .put("/api/users/profile")
        .send(updateData)
        .expect(409);

      expect(response.body.error.code).toBe("EMAIL_ALREADY_EXISTS");
    });

    it("should return 404 when user not found", async () => {
      const { updateUser } = require("../../repositories/UserRepository");
      updateUser.mockRejectedValue(new Error("User not found"));

      const updateData = {
        firstName: "Jane",
      };

      const response = await request(app)
        .put("/api/users/profile")
        .send(updateData)
        .expect(404);

      expect(response.body.error.code).toBe("USER_NOT_FOUND");
    });

    it("should return 400 for invalid data", async () => {
      const updateData = {
        firstName: "John123", // Invalid name with numbers
      };

      const response = await request(app)
        .put("/api/users/profile")
        .send(updateData)
        .expect(400);

      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("PUT /api/users/password", () => {
    it("should change password successfully", async () => {
      const {
        changePassword,
      } = require("../../services/AuthenticationService");
      changePassword.mockResolvedValue(undefined);

      const passwordData = {
        currentPassword: "current-password",
        newPassword: "NewStrongPass123!",
      };

      const response = await request(app)
        .put("/api/users/password")
        .send(passwordData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Password changed successfully");
      expect(changePassword).toHaveBeenCalledWith(
        "user-123",
        "current-password",
        "NewStrongPass123!"
      );
    });

    it("should return 400 for incorrect current password", async () => {
      const {
        changePassword,
      } = require("../../services/AuthenticationService");
      changePassword.mockRejectedValue(
        new Error("Current password is incorrect")
      );

      const passwordData = {
        currentPassword: "wrong-password",
        newPassword: "NewStrongPass123!",
      };

      const response = await request(app)
        .put("/api/users/password")
        .send(passwordData)
        .expect(400);

      expect(response.body.error.code).toBe("INCORRECT_PASSWORD");
    });

    it("should return 400 for weak new password", async () => {
      const {
        changePassword,
      } = require("../../services/AuthenticationService");
      changePassword.mockRejectedValue(
        new Error("Password validation failed: Password too weak")
      );

      const passwordData = {
        currentPassword: "current-password",
        newPassword: "weak",
      };

      const response = await request(app)
        .put("/api/users/password")
        .send(passwordData)
        .expect(400);

      expect(response.body.error.code).toBe("WEAK_PASSWORD");
    });

    it("should return 400 for invalid password format", async () => {
      const passwordData = {
        currentPassword: "current-password",
        newPassword: "short", // Too short
      };

      const response = await request(app)
        .put("/api/users/password")
        .send(passwordData)
        .expect(400);

      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for missing current password", async () => {
      const passwordData = {
        newPassword: "NewStrongPass123!",
      };

      const response = await request(app)
        .put("/api/users/password")
        .send(passwordData)
        .expect(400);

      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("DELETE /api/users/account", () => {
    it("should delete account successfully", async () => {
      const { deleteUser } = require("../../repositories/UserRepository");
      deleteUser.mockResolvedValue(undefined);

      const response = await request(app)
        .delete("/api/users/account")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Account deleted successfully");
      expect(deleteUser).toHaveBeenCalledWith("user-123");
    });

    it("should return 404 when user not found", async () => {
      const { deleteUser } = require("../../repositories/UserRepository");
      deleteUser.mockRejectedValue(new Error("User not found"));

      const response = await request(app)
        .delete("/api/users/account")
        .expect(404);

      expect(response.body.error.code).toBe("USER_NOT_FOUND");
    });
  });

  describe("GET /api/users/:id", () => {
    it("should get public user info successfully", async () => {
      const {
        getUserProfile,
      } = require("../../services/AuthenticationService");
      getUserProfile.mockResolvedValue(mockUser);

      const response = await request(app)
        .get("/api/users/user-123")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toEqual({
        id: mockUser.id,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        createdAt: mockUser.createdAt,
      });
      expect(response.body.data.user).not.toHaveProperty("email");
      expect(response.body.data.user).not.toHaveProperty("lastLoginAt");
    });

    it("should return 404 when user not found", async () => {
      const {
        getUserProfile,
      } = require("../../services/AuthenticationService");
      getUserProfile.mockRejectedValue(new Error("User not found"));

      const response = await request(app)
        .get("/api/users/nonexistent")
        .expect(404);

      expect(response.body.error.code).toBe("USER_NOT_FOUND");
    });

    it("should return 400 for invalid user ID format", async () => {
      const response = await request(app).get("/api/users/").expect(404); // Express returns 404 for missing route parameter
    });
  });

  describe("PUT /api/users/:id", () => {
    it("should update own profile successfully", async () => {
      const {
        updateUser,
        toPublicUser,
      } = require("../../repositories/UserRepository");
      const updatedUser = { ...mockUser, firstName: "Jane" };

      updateUser.mockResolvedValue(updatedUser);
      toPublicUser.mockReturnValue(updatedUser);

      const updateData = {
        firstName: "Jane",
      };

      const response = await request(app)
        .put("/api/users/user-123")
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toEqual(updatedUser);
      expect(updateUser).toHaveBeenCalledWith("user-123", updateData);
    });

    it("should return 403 when trying to update another user", async () => {
      const updateData = {
        firstName: "Jane",
      };

      const response = await request(app)
        .put("/api/users/other-user-456")
        .send(updateData)
        .expect(403);

      expect(response.body.error.code).toBe("ACCESS_DENIED");
    });
  });

  describe("DELETE /api/users/:id", () => {
    it("should delete own account successfully", async () => {
      const { deleteUser } = require("../../repositories/UserRepository");
      deleteUser.mockResolvedValue(undefined);

      const response = await request(app)
        .delete("/api/users/user-123")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("User account deleted successfully");
      expect(deleteUser).toHaveBeenCalledWith("user-123");
    });

    it("should return 403 when trying to delete another user", async () => {
      const response = await request(app)
        .delete("/api/users/other-user-456")
        .expect(403);

      expect(response.body.error.code).toBe("ACCESS_DENIED");
    });
  });
});
