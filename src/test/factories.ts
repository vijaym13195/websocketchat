import { User } from "../generated/prisma";
import { hashPassword } from "../services/PasswordService";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../services/TokenService";

// User factory
export interface UserFactoryOptions {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

export function createUserData(
  options: UserFactoryOptions = {}
): Omit<User, "id" | "createdAt" | "updatedAt"> {
  return {
    email: options.email || `test${Date.now()}@example.com`,
    password: options.password || "hashedPassword123",
    firstName: options.firstName || "John",
    lastName: options.lastName || "Doe",
    isActive: options.isActive !== undefined ? options.isActive : true,
    lastLoginAt: null,
  };
}

export function createUser(options: UserFactoryOptions = {}): User {
  const userData = createUserData(options);
  return {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...userData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function createUserWithHashedPassword(
  options: UserFactoryOptions = {}
): Promise<User> {
  const plainPassword = options.password || "TestPassword123!";
  const hashedPasswordValue = await hashPassword(plainPassword);

  return createUser({
    ...options,
    password: hashedPasswordValue,
  });
}

// Token factory
export interface TokenFactoryOptions {
  userId?: string;
  email?: string;
  expiresIn?: string;
}

export function createAccessToken(options: TokenFactoryOptions = {}): string {
  const userId = options.userId || "test-user-id";
  const email = options.email || "test@example.com";

  return generateAccessToken(userId, email);
}

export function createRefreshTokenData() {
  return {
    id: `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    token: generateRefreshToken(),
    userId: "test-user-id",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    createdAt: new Date(),
    isRevoked: false,
  };
}

// Authentication result factory
export function createAuthResult(user?: User) {
  const testUser = user || createUser();

  return {
    user: {
      id: testUser.id,
      email: testUser.email,
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      isActive: testUser.isActive,
      createdAt: testUser.createdAt,
      lastLoginAt: testUser.lastLoginAt,
    },
    accessToken: createAccessToken({
      userId: testUser.id,
      email: testUser.email,
    }),
    refreshToken: generateRefreshToken(),
  };
}

// Request factory
export interface RequestFactoryOptions {
  method?: string;
  url?: string;
  body?: any;
  headers?: Record<string, string>;
  user?: User;
}

export function createMockRequest(options: RequestFactoryOptions = {}) {
  return {
    method: options.method || "GET",
    url: options.url || "/test",
    path: options.url || "/test",
    body: options.body || {},
    query: {},
    params: {},
    headers: options.headers || {},
    get: jest.fn((header: string) => options.headers?.[header.toLowerCase()]),
    user: options.user,
    ip: "127.0.0.1",
    connection: { remoteAddress: "127.0.0.1" },
  };
}

export function createMockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    removeHeader: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    headersSent: false,
    on: jest.fn(),
  };

  return res;
}

// Validation error factory
export function createValidationError(field: string, message: string) {
  return {
    field,
    message,
  };
}

// Database mock helpers
export function createPrismaMock() {
  return {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

// Test data generators
export function generateRandomEmail(): string {
  return `test${Date.now()}${Math.random()
    .toString(36)
    .substr(2, 5)}@example.com`;
}

export function generateRandomString(length: number = 10): string {
  return Math.random().toString(36).substr(2, length);
}

export function generateStrongPassword(): string {
  return "TestPassword123!";
}

export function generateWeakPassword(): string {
  return "weak";
}

// Test utilities
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function expectToThrowAsync(
  fn: () => Promise<any>,
  errorMessage?: string
): Promise<void> {
  return expect(fn()).rejects.toThrow(errorMessage);
}

export function createExpiredToken(): string {
  // Create a token that's already expired
  const jwt = require("jsonwebtoken");
  return jwt.sign(
    { userId: "test-user", email: "test@example.com" },
    process.env.JWT_SECRET,
    { expiresIn: "-1h" } // Expired 1 hour ago
  );
}

export function createInvalidToken(): string {
  return "invalid.jwt.token";
}

// Mock implementations
export function mockSuccessfulAuth() {
  return {
    user: createUser(),
    accessToken: createAccessToken(),
    refreshToken: generateRefreshToken(),
  };
}

export function mockFailedAuth(errorMessage: string = "Authentication failed") {
  throw new Error(errorMessage);
}

// Test environment helpers
export function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === "test";
}

export function skipInCI(testFn: () => void): void {
  if (process.env.CI) {
    test.skip("Skipped in CI environment", testFn);
  } else {
    testFn();
  }
}

// Performance testing helpers
export function measureExecutionTime<T>(fn: () => T): {
  result: T;
  duration: number;
} {
  const start = process.hrtime.bigint();
  const result = fn();
  const end = process.hrtime.bigint();
  const duration = Number(end - start) / 1000000; // Convert to milliseconds

  return { result, duration };
}

export async function measureAsyncExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = process.hrtime.bigint();
  const result = await fn();
  const end = process.hrtime.bigint();
  const duration = Number(end - start) / 1000000; // Convert to milliseconds

  return { result, duration };
}
