import {
  register,
  login,
  refreshTokens,
  logout,
  logoutAll,
  changePassword,
  validateUserToken,
  getUserProfile,
} from "../AuthenticationService";

// Mock all dependencies
jest.mock("../PasswordService");
jest.mock("../TokenService");
jest.mock("../../repositories/UserRepository");

describe("AuthenticationService", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    password: "hashed-password",
    firstName: "John",
    lastName: "Doe",
    isActive: true,
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-01"),
    lastLoginAt: null,
  };

  const mockPublicUser = {
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
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      const {
        validatePasswordStrength,
        hashPassword,
      } = require("../PasswordService");
      const {
        generateAccessToken,
        generateRefreshToken,
        storeRefreshToken,
      } = require("../TokenService");
      const {
        userExists,
        createUser,
        updateLastLogin,
        toPublicUser,
      } = require("../../repositories/UserRepository");

      validatePasswordStrength.mockReturnValue({ isValid: true, errors: [] });
      userExists.mockResolvedValue(false);
      hashPassword.mockResolvedValue("hashed-password");
      createUser.mockResolvedValue(mockUser);
      generateAccessToken.mockReturnValue("access-token");
      generateRefreshToken.mockReturnValue("refresh-token");
      storeRefreshToken.mockResolvedValue(undefined);
      updateLastLogin.mockResolvedValue(undefined);
      toPublicUser.mockReturnValue(mockPublicUser);

      const registerData = {
        email: "test@example.com",
        password: "StrongPassword123!",
        firstName: "John",
        lastName: "Doe",
      };

      const result = await register(registerData);

      expect(result).toEqual({
        user: mockPublicUser,
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });

      expect(validatePasswordStrength).toHaveBeenCalledWith(
        "StrongPassword123!"
      );
      expect(userExists).toHaveBeenCalledWith("test@example.com");
      expect(hashPassword).toHaveBeenCalledWith("StrongPassword123!");
      expect(createUser).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "hashed-password",
        firstName: "John",
        lastName: "Doe",
      });
    });

    it("should throw error for weak password", async () => {
      const { validatePasswordStrength } = require("../PasswordService");

      validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ["Password too weak"],
      });

      const registerData = {
        email: "test@example.com",
        password: "weak",
      };

      await expect(register(registerData)).rejects.toThrow(
        "Password validation failed"
      );
    });

    it("should throw error for existing email", async () => {
      const { validatePasswordStrength } = require("../PasswordService");
      const { userExists } = require("../../repositories/UserRepository");

      validatePasswordStrength.mockReturnValue({ isValid: true, errors: [] });
      userExists.mockResolvedValue(true);

      const registerData = {
        email: "existing@example.com",
        password: "StrongPassword123!",
      };

      await expect(register(registerData)).rejects.toThrow(
        "Email already registered"
      );
    });
  });

  describe("login", () => {
    it("should login user successfully", async () => {
      const { verifyPassword } = require("../PasswordService");
      const {
        generateAccessToken,
        generateRefreshToken,
        storeRefreshToken,
      } = require("../TokenService");
      const {
        findUserByEmail,
        updateLastLogin,
        toPublicUser,
      } = require("../../repositories/UserRepository");

      findUserByEmail.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(true);
      generateAccessToken.mockReturnValue("access-token");
      generateRefreshToken.mockReturnValue("refresh-token");
      storeRefreshToken.mockResolvedValue(undefined);
      updateLastLogin.mockResolvedValue(undefined);
      toPublicUser.mockReturnValue(mockPublicUser);

      const loginData = {
        email: "test@example.com",
        password: "correct-password",
      };

      const result = await login(loginData);

      expect(result).toEqual({
        user: mockPublicUser,
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });

      expect(findUserByEmail).toHaveBeenCalledWith("test@example.com");
      expect(verifyPassword).toHaveBeenCalledWith(
        "correct-password",
        "hashed-password"
      );
    });

    it("should throw error for non-existent user", async () => {
      const { findUserByEmail } = require("../../repositories/UserRepository");

      findUserByEmail.mockResolvedValue(null);

      const loginData = {
        email: "nonexistent@example.com",
        password: "password",
      };

      await expect(login(loginData)).rejects.toThrow("Invalid credentials");
    });

    it("should throw error for incorrect password", async () => {
      const { verifyPassword } = require("../PasswordService");
      const { findUserByEmail } = require("../../repositories/UserRepository");

      findUserByEmail.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(false);

      const loginData = {
        email: "test@example.com",
        password: "wrong-password",
      };

      await expect(login(loginData)).rejects.toThrow("Invalid credentials");
    });

    it("should throw error for deactivated user", async () => {
      const { findUserByEmail } = require("../../repositories/UserRepository");

      const deactivatedUser = { ...mockUser, isActive: false };
      findUserByEmail.mockResolvedValue(deactivatedUser);

      const loginData = {
        email: "test@example.com",
        password: "correct-password",
      };

      await expect(login(loginData)).rejects.toThrow("Account is deactivated");
    });
  });

  describe("refreshTokens", () => {
    it("should refresh tokens successfully", async () => {
      const {
        validateRefreshToken,
        rotateRefreshToken,
        generateAccessToken,
      } = require("../TokenService");
      const {
        findUserById,
        toPublicUser,
      } = require("../../repositories/UserRepository");

      const tokenData = {
        id: "token-123",
        token: "old-refresh-token",
        userId: "user-123",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: false,
      };

      validateRefreshToken.mockResolvedValue(tokenData);
      findUserById.mockResolvedValue(mockUser);
      generateAccessToken.mockReturnValue("new-access-token");
      rotateRefreshToken.mockResolvedValue("new-refresh-token");
      toPublicUser.mockReturnValue(mockPublicUser);

      const result = await refreshTokens("old-refresh-token");

      expect(result).toEqual({
        user: mockPublicUser,
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      });

      expect(validateRefreshToken).toHaveBeenCalledWith("old-refresh-token");
      expect(rotateRefreshToken).toHaveBeenCalledWith(
        "old-refresh-token",
        "user-123"
      );
    });

    it("should throw error for invalid refresh token", async () => {
      const { validateRefreshToken } = require("../TokenService");

      validateRefreshToken.mockRejectedValue(
        new Error("Invalid refresh token")
      );

      await expect(refreshTokens("invalid-token")).rejects.toThrow(
        "Invalid refresh token"
      );
    });
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      const { revokeRefreshToken } = require("../TokenService");

      revokeRefreshToken.mockResolvedValue(undefined);

      await expect(logout("refresh-token")).resolves.not.toThrow();
      expect(revokeRefreshToken).toHaveBeenCalledWith("refresh-token");
    });

    it("should not throw error if token does not exist", async () => {
      const { revokeRefreshToken } = require("../TokenService");

      revokeRefreshToken.mockRejectedValue(new Error("Token not found"));

      await expect(logout("nonexistent-token")).resolves.not.toThrow();
    });
  });

  describe("logoutAll", () => {
    it("should revoke all user tokens", async () => {
      const { revokeAllUserTokens } = require("../TokenService");

      revokeAllUserTokens.mockResolvedValue(undefined);

      await expect(logoutAll("user-123")).resolves.not.toThrow();
      expect(revokeAllUserTokens).toHaveBeenCalledWith("user-123");
    });
  });

  describe("changePassword", () => {
    it("should change password successfully", async () => {
      const {
        verifyPassword,
        validatePasswordStrength,
        hashPassword,
      } = require("../PasswordService");
      const { revokeAllUserTokens } = require("../TokenService");
      const { findUserById } = require("../../repositories/UserRepository");

      findUserById.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(true);
      validatePasswordStrength.mockReturnValue({ isValid: true, errors: [] });
      hashPassword.mockResolvedValue("new-hashed-password");
      revokeAllUserTokens.mockResolvedValue(undefined);

      // Mock the dynamic import
      const mockUpdateUserPassword = jest.fn().mockResolvedValue(undefined);
      jest.doMock("../../repositories/UserRepository", () => ({
        ...jest.requireActual("../../repositories/UserRepository"),
        updateUserPassword: mockUpdateUserPassword,
      }));

      await expect(
        changePassword("user-123", "current-password", "NewPassword123!")
      ).resolves.not.toThrow();

      expect(verifyPassword).toHaveBeenCalledWith(
        "current-password",
        "hashed-password"
      );
      expect(validatePasswordStrength).toHaveBeenCalledWith("NewPassword123!");
      expect(hashPassword).toHaveBeenCalledWith("NewPassword123!");
      expect(revokeAllUserTokens).toHaveBeenCalledWith("user-123");
    });

    it("should throw error for incorrect current password", async () => {
      const { verifyPassword } = require("../PasswordService");
      const { findUserById } = require("../../repositories/UserRepository");

      findUserById.mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(false);

      await expect(
        changePassword("user-123", "wrong-password", "NewPassword123!")
      ).rejects.toThrow("Current password is incorrect");
    });
  });

  describe("validateUserToken", () => {
    it("should validate token and return user", async () => {
      const {
        findUserById,
        toPublicUser,
      } = require("../../repositories/UserRepository");

      // Mock the dynamic import
      jest.doMock("../TokenService", () => ({
        ...jest.requireActual("../TokenService"),
        verifyAccessToken: jest.fn().mockResolvedValue({
          userId: "user-123",
          email: "test@example.com",
          iat: 1234567890,
          exp: 1234567890,
        }),
      }));

      findUserById.mockResolvedValue(mockUser);
      toPublicUser.mockReturnValue(mockPublicUser);

      const result = await validateUserToken("valid-token");

      expect(result).toEqual(mockPublicUser);
    });
  });

  describe("getUserProfile", () => {
    it("should return user profile", async () => {
      const {
        findUserById,
        toPublicUser,
      } = require("../../repositories/UserRepository");

      findUserById.mockResolvedValue(mockUser);
      toPublicUser.mockReturnValue(mockPublicUser);

      const result = await getUserProfile("user-123");

      expect(result).toEqual(mockPublicUser);
      expect(findUserById).toHaveBeenCalledWith("user-123");
    });

    it("should throw error if user not found", async () => {
      const { findUserById } = require("../../repositories/UserRepository");

      findUserById.mockResolvedValue(null);

      await expect(getUserProfile("nonexistent")).rejects.toThrow(
        "User not found"
      );
    });
  });
});
