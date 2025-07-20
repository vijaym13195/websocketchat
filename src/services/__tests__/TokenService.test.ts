import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  storeRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  revokeAllUserTokens,
} from "../TokenService";

// Mock Prisma
jest.mock("../../../generated/prisma", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  })),
}));

describe("TokenService", () => {
  const mockUserId = "user-123";
  const mockEmail = "test@example.com";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateAccessToken", () => {
    it("should generate a valid JWT token", () => {
      const token = generateAccessToken(mockUserId, mockEmail);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
    });

    it("should generate different tokens for different users", () => {
      const token1 = generateAccessToken("user-1", "user1@example.com");
      const token2 = generateAccessToken("user-2", "user2@example.com");

      expect(token1).not.toBe(token2);
    });
  });

  describe("generateRefreshToken", () => {
    it("should generate a random token", () => {
      const token = generateRefreshToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBe(128); // 64 bytes = 128 hex chars
    });

    it("should generate different tokens each time", () => {
      const token1 = generateRefreshToken();
      const token2 = generateRefreshToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe("verifyAccessToken", () => {
    it("should verify a valid token", async () => {
      const token = generateAccessToken(mockUserId, mockEmail);

      const payload = await verifyAccessToken(token);

      expect(payload.userId).toBe(mockUserId);
      expect(payload.email).toBe(mockEmail);
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
    });

    it("should reject invalid token", async () => {
      const invalidToken = "invalid.token.here";

      await expect(verifyAccessToken(invalidToken)).rejects.toThrow(
        "Invalid token"
      );
    });

    it("should reject malformed token", async () => {
      const malformedToken = "not-a-jwt-token";

      await expect(verifyAccessToken(malformedToken)).rejects.toThrow();
    });
  });

  describe("storeRefreshToken", () => {
    it("should store refresh token successfully", async () => {
      const mockPrisma = require("../../../generated/prisma").PrismaClient;
      const mockCreate = jest.fn().mockResolvedValue({});
      mockPrisma.mockImplementation(() => ({
        refreshToken: { create: mockCreate },
      }));

      const token = generateRefreshToken();

      await expect(storeRefreshToken(mockUserId, token)).resolves.not.toThrow();
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          token,
          userId: mockUserId,
          expiresAt: expect.any(Date),
        },
      });
    });
  });

  describe("validateRefreshToken", () => {
    it("should validate a valid refresh token", async () => {
      const mockToken = generateRefreshToken();
      const mockRefreshToken = {
        id: "token-123",
        token: mockToken,
        userId: mockUserId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        isRevoked: false,
      };

      const mockPrisma = require("../../../generated/prisma").PrismaClient;
      const mockFindUnique = jest.fn().mockResolvedValue(mockRefreshToken);
      mockPrisma.mockImplementation(() => ({
        refreshToken: { findUnique: mockFindUnique },
      }));

      const result = await validateRefreshToken(mockToken);

      expect(result).toEqual(mockRefreshToken);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { token: mockToken },
      });
    });

    it("should reject non-existent token", async () => {
      const mockPrisma = require("../../../generated/prisma").PrismaClient;
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      mockPrisma.mockImplementation(() => ({
        refreshToken: { findUnique: mockFindUnique },
      }));

      const token = generateRefreshToken();

      await expect(validateRefreshToken(token)).rejects.toThrow(
        "Invalid refresh token"
      );
    });

    it("should reject revoked token", async () => {
      const mockToken = generateRefreshToken();
      const mockRefreshToken = {
        id: "token-123",
        token: mockToken,
        userId: mockUserId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: true,
      };

      const mockPrisma = require("../../../generated/prisma").PrismaClient;
      const mockFindUnique = jest.fn().mockResolvedValue(mockRefreshToken);
      mockPrisma.mockImplementation(() => ({
        refreshToken: { findUnique: mockFindUnique },
      }));

      await expect(validateRefreshToken(mockToken)).rejects.toThrow(
        "Invalid refresh token"
      );
    });

    it("should reject expired token", async () => {
      const mockToken = generateRefreshToken();
      const mockRefreshToken = {
        id: "token-123",
        token: mockToken,
        userId: mockUserId,
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
        isRevoked: false,
      };

      const mockPrisma = require("../../../generated/prisma").PrismaClient;
      const mockFindUnique = jest.fn().mockResolvedValue(mockRefreshToken);
      mockPrisma.mockImplementation(() => ({
        refreshToken: { findUnique: mockFindUnique },
      }));

      await expect(validateRefreshToken(mockToken)).rejects.toThrow(
        "Invalid refresh token"
      );
    });
  });

  describe("revokeRefreshToken", () => {
    it("should revoke refresh token successfully", async () => {
      const mockPrisma = require("../../../generated/prisma").PrismaClient;
      const mockUpdate = jest.fn().mockResolvedValue({});
      mockPrisma.mockImplementation(() => ({
        refreshToken: { update: mockUpdate },
      }));

      const token = generateRefreshToken();

      await expect(revokeRefreshToken(token)).resolves.not.toThrow();
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { token },
        data: { isRevoked: true },
      });
    });
  });

  describe("revokeAllUserTokens", () => {
    it("should revoke all user tokens successfully", async () => {
      const mockPrisma = require("../../../generated/prisma").PrismaClient;
      const mockUpdateMany = jest.fn().mockResolvedValue({});
      mockPrisma.mockImplementation(() => ({
        refreshToken: { updateMany: mockUpdateMany },
      }));

      await expect(revokeAllUserTokens(mockUserId)).resolves.not.toThrow();
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: { isRevoked: true },
      });
    });
  });
});
