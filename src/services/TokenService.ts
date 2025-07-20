import jwt from "jsonwebtoken";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

export interface TokenPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenData {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  isRevoked: boolean;
}

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "fallback-refresh-secret";
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export function generateAccessToken(userId: string, email: string): string {
  const payload = {
    userId,
    email,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES_IN,
    issuer: "websocketchat",
    audience: "websocketchat-users",
  } as jwt.SignOptions);
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: "websocketchat",
      audience: "websocketchat-users",
    }) as TokenPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid token");
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Token expired");
    }
    throw new Error("Token verification failed");
  }
}

export async function storeRefreshToken(
  userId: string,
  token: string
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  try {
    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  } catch (error) {
    throw new Error("Failed to store refresh token");
  }
}

export async function validateRefreshToken(
  token: string
): Promise<RefreshTokenData> {
  try {
    const refreshToken = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!refreshToken) {
      throw new Error("Refresh token not found");
    }

    if (refreshToken.isRevoked) {
      throw new Error("Refresh token has been revoked");
    }

    if (refreshToken.expiresAt < new Date()) {
      throw new Error("Refresh token has expired");
    }

    return refreshToken;
  } catch (error) {
    throw new Error("Invalid refresh token");
  }
}

export async function revokeRefreshToken(token: string): Promise<void> {
  try {
    await prisma.refreshToken.update({
      where: { token },
      data: { isRevoked: true },
    });
  } catch (error) {
    throw new Error("Failed to revoke refresh token");
  }
}

export async function rotateRefreshToken(
  oldToken: string,
  userId: string
): Promise<string> {
  try {
    // Revoke the old token
    await revokeRefreshToken(oldToken);

    // Generate and store new token
    const newToken = generateRefreshToken();
    await storeRefreshToken(userId, newToken);

    return newToken;
  } catch (error) {
    throw new Error("Failed to rotate refresh token");
  }
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  try {
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  } catch (error) {
    throw new Error("Failed to revoke all user tokens");
  }
}

export async function cleanupExpiredTokens(): Promise<void> {
  try {
    await prisma.refreshToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { isRevoked: true }],
      },
    });
  } catch (error) {
    throw new Error("Failed to cleanup expired tokens");
  }
}
