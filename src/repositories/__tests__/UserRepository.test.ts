import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  updateUserPassword,
  deleteUser,
  userExists,
  updateLastLogin,
  toPublicUser,
  getUsersCount,
  deactivateUser,
  activateUser,
} from "../UserRepository";

// Mock Prisma
jest.mock("../../../generated/prisma", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  })),
}));

describe("UserRepository", () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createUser", () => {
    it("should create a user successfully", async () => {
      const mockPrisma = require("../../../generated/prisma").PrismaClient;
      const mockCreate = jest.fn().mockResolvedValue(mockUser);
      mockPrisma.mockImplementation(() => ({
        user: { create: mockCreate },
      }));

      const userData = {
        email: "test@example.com",
        password: "hashed-password",
        firstName: "John",
        lastName: "Doe",
      };

      const result = await createUser(userData);

      expect(result).toEqual(mockUser);
      expect(mockCreate).toHaveBeenCalledWith({
        data: userData,
      });
    });

    it("should throw error for duplicate email", async () => {
      const mockPrisma = require("../../../generated/prisma").PrismaClient;
      const mockCreate = jest.fn().mockRejectedValue({
        code: "P2002",
        meta: { target: ["email"] },
      });
      mockPrisma.mockImplementation(() => ({
        user: { create: mockCreate },
      }));

      const userData = {
        email: "test@example.com",
        password: "hashed-password",
      };

      await expect(createUser(userData)).rejects.toThrow(
        "Email already exists"
      );
    });
  });

  describe("findUserByEmail", () => {
    it("should find user by email", async () => {
      const mockPrisma = require("../../../generated/prisma").PrismaClient;
      const mockFindUnique = jest.fn().mockResolvedValue(mockUser);
      mockPrisma.mockImplementation(() => ({
        user: { findUnique: mockFindUnique },
      }));

      const result = await findUserByEmail("test@example.com");

      expect(result).toEqual(mockUser);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
    });

    it("should return null if user not found", async () => {
      const mockPrisma = require("../../../generated/prisma").PrismaClient;
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      mockPrisma.mockImplementation(() => ({
        user: { findUnique: mockFindUnique },
      }));

      const result = await findUserByEmail("nonexistent@example.com");

      expect(result).toBeNull();
    });
  });

  describe("findUserById", () => {
    it("should find user by ID", async () => {
      const mockPrisma = require("../../../generated/prisma").PrismaClient;
      const mockFindUnique = jest.fn().mockResolvedValue(mockUser);
      mockPrisma.mockImplementation(() => ({
        user: { findUnique: mockFindUnique },
      }));

      const result = await findUserById("user-123");

      expect(result).toEqual(mockUser);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "user-123" },
      });
    });
  });

  describe("updateUser", () => {
    it("should update user successfully", async () => {
      const updatedUser = { ...mockUser, firstName: "Jane" };
      const mockPrisma = require("../../../generated/prisma").PrismaClient;
      const mockUpdate = jest.fn().mockResolvedValue(updatedUser);
      mockPrisma.mockImplementation(() => ({
        user: { update: mockUpdate },
      }));

      const updateData = { firstName: "Jane" };
      const result = await updateUser("user-123", updateData);

      expect(result).toEqual(updatedUser);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: updateData,
      });
    });

    it("should throw error if user not found", async () => {
      const mockPrisma = require("../../../generated/prisma").PrismaClient;
      const mockUpdate = jest.fn().mockRejectedValue({
        code: "P2025",
      });
      mockPrisma.mockImplementation(() => ({
        user: { update: mockUpdate },
      }));

      await expect(
        updateUser("nonexistent", { firstName: "Jane" })
      ).rejects.toThrow("User not found");
    });
  });

  describe("updateUserPassword", () => {
    it("should update user password successfully", async () => {
      const updatedUser = { ...mockUser, password: "new-hashed-password" };
      const mockPrisma = require("../../../generated/prisma").PrismaClient;
      const mockUpdate = jest.fn().mockResolvedValue(updatedUser);
      mockPrisma.mockImplementation(() => ({
        user: { update: mockUpdate },
      }));

      const result = await updateUserPassword(
        "user-123",
        "new-hashed-password"
      );

      expect(result).toEqual(updatedUser);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { password: "new-hashed-password" },
      });
    });
  });

  describe("deleteUser", () => {
    it("should delete user successfully", async () => {
      const mockPrisma = require("../../../generated/prisma").PrismaClient;
      const mockDelete = jest.fn().mockResolvedValue(mockUser);
      mockPrisma.mockImplementation(() => ({
        user: { delete: mockDelete },
      }));

      await expect(deleteUser("user-123")).resolves.not.toThrow();
      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: "user-123" },
      });
    });

    it("should throw error if user not found", async () => {
      const mockPrisma = require("../../../generated/prisma").PrismaClient;
      const mockDelete = jest.fn().mockRejectedValue({
        code: "P2025",
      });
      mockPrisma.mockImplementation(() => ({
        user: { delete: mockDelete },
      }));

      await expect(deleteUser("nonexistent")).rejects.toThrow("User not found");
    });
  });

  describe("userExists", () => {
    it("should return true if user exists", async () => {
      const mockPrisma = require("../../../generated/prisma").PrismaClient;
      const mockFindUnique = jest.fn().mockResolvedValue({ id: "user-123" });
      mockPrisma.mockImplementation(() => ({
        user: { findUnique: mockFindUnique },
      }));

      const result = await userExists("test@example.com");

      expect(result).toBe(true);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        select: { id: true },
      });
    });

    it("should return false if user does not exist", async () => {
      const mockPrisma = require("../../../generated/prisma").PrismaClient;
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      mockPrisma.mockImplementation(() => ({
        user: { findUnique: mockFindUnique },
      }));

      const result = await userExists("nonexistent@example.com");

      expect(result).toBe(false);
    });
  });

  describe("updateLastLogin", () => {
    it("should update last login timestamp", async () => {
      const mockPrisma = require("../../../generated/prisma").PrismaClient;
      const mockUpdate = jest.fn().mockResolvedValue(mockUser);
      mockPrisma.mockImplementation(() => ({
        user: { update: mockUpdate },
      }));

      await expect(updateLastLogin("user-123")).resolves.not.toThrow();
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { lastLoginAt: expect.any(Date) },
      });
    });
  });

  describe("toPublicUser", () => {
    it("should convert user to public user format", () => {
      const result = toPublicUser(mockUser);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        isActive: mockUser.isActive,
        createdAt: mockUser.createdAt,
        lastLoginAt: mockUser.lastLoginAt,
      });
      expect(result).not.toHaveProperty("password");
    });
  });

  describe("getUsersCount", () => {
    it("should return users count", async () => {
      const mockPrisma = require("../../../generated/prisma").PrismaClient;
      const mockCount = jest.fn().mockResolvedValue(42);
      mockPrisma.mockImplementation(() => ({
        user: { count: mockCount },
      }));

      const result = await getUsersCount();

      expect(result).toBe(42);
      expect(mockCount).toHaveBeenCalled();
    });
  });

  describe("deactivateUser", () => {
    it("should deactivate user successfully", async () => {
      const deactivatedUser = { ...mockUser, isActive: false };
      const mockPrisma = require("../../../generated/prisma").PrismaClient;
      const mockUpdate = jest.fn().mockResolvedValue(deactivatedUser);
      mockPrisma.mockImplementation(() => ({
        user: { update: mockUpdate },
      }));

      const result = await deactivateUser("user-123");

      expect(result).toEqual(deactivatedUser);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { isActive: false },
      });
    });
  });

  describe("activateUser", () => {
    it("should activate user successfully", async () => {
      const activatedUser = { ...mockUser, isActive: true };
      const mockPrisma = require("../../../generated/prisma").PrismaClient;
      const mockUpdate = jest.fn().mockResolvedValue(activatedUser);
      mockPrisma.mockImplementation(() => ({
        user: { update: mockUpdate },
      }));

      const result = await activateUser("user-123");

      expect(result).toEqual(activatedUser);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { isActive: true },
      });
    });
  });
});
