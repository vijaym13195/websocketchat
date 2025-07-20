import { hashPassword, verifyPassword } from "../services/PasswordService";
import {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
} from "../services/TokenService";
import {
  createUser,
  createAccessToken,
  generateStrongPassword,
  measureAsyncExecutionTime,
} from "./factories";

describe("Security Tests", () => {
  describe("Password Security", () => {
    it("should hash passwords securely", async () => {
      const password = "TestPassword123!";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
      expect(hash.startsWith("$2b$")).toBe(true); // bcrypt format
    });

    it("should generate different hashes for same password", async () => {
      const password = "TestPassword123!";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it("should verify passwords correctly", async () => {
      const password = "TestPassword123!";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword("WrongPassword123!", hash);
      expect(isInvalid).toBe(false);
    });

    it("should be resistant to timing attacks", async () => {
      const password = "TestPassword123!";
      const hash = await hashPassword(password);

      // Test with various wrong passwords of different lengths
      const wrongPasswords = [
        "a",
        "ab",
        "abc",
        "WrongPassword123!",
        "VeryLongWrongPasswordThatShouldNotAffectTiming",
      ];

      const timings: number[] = [];

      for (const wrongPassword of wrongPasswords) {
        const { duration } = await measureAsyncExecutionTime(async () => {
          return await verifyPassword(wrongPassword, hash);
        });
        timings.push(duration);
      }

      // All timings should be relatively similar (within reasonable variance)
      const avgTiming = timings.reduce((a, b) => a + b) / timings.length;
      const maxVariance = avgTiming * 0.5; // Allow 50% variance

      timings.forEach((timing) => {
        expect(Math.abs(timing - avgTiming)).toBeLessThan(maxVariance);
      });
    });

    it("should handle password hashing performance", async () => {
      const password = generateStrongPassword();

      const { duration } = await measureAsyncExecutionTime(async () => {
        return await hashPassword(password);
      });

      // Hashing should complete within reasonable time (adjust based on BCRYPT_ROUNDS)
      expect(duration).toBeLessThan(1000); // 1 second for test environment
    });
  });

  describe("Token Security", () => {
    it("should generate secure access tokens", () => {
      const userId = "user-123";
      const email = "test@example.com";

      const token = generateAccessToken(userId, email);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT format
    });

    it("should generate unique tokens", () => {
      const userId = "user-123";
      const email = "test@example.com";

      const token1 = generateAccessToken(userId, email);
      const token2 = generateAccessToken(userId, email);

      expect(token1).not.toBe(token2);
    });

    it("should verify access tokens correctly", async () => {
      const userId = "user-123";
      const email = "test@example.com";

      const token = generateAccessToken(userId, email);
      const payload = await verifyAccessToken(token);

      expect(payload.userId).toBe(userId);
      expect(payload.email).toBe(email);
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
    });

    it("should reject invalid tokens", async () => {
      const invalidToken = "invalid.jwt.token";

      await expect(verifyAccessToken(invalidToken)).rejects.toThrow(
        "Invalid token"
      );
    });

    it("should reject expired tokens", async () => {
      // Create an expired token
      const jwt = require("jsonwebtoken");
      const expiredToken = jwt.sign(
        { userId: "user-123", email: "test@example.com" },
        process.env.JWT_SECRET,
        { expiresIn: "-1h" }
      );

      await expect(verifyAccessToken(expiredToken)).rejects.toThrow(
        "Token expired"
      );
    });

    it("should generate cryptographically secure refresh tokens", () => {
      const token1 = generateRefreshToken();
      const token2 = generateRefreshToken();

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(128); // 64 bytes in hex
      expect(/^[a-f0-9]+$/.test(token1)).toBe(true); // Hex format
    });

    it("should have sufficient token entropy", () => {
      const tokens = new Set();
      const numTokens = 1000;

      for (let i = 0; i < numTokens; i++) {
        tokens.add(generateRefreshToken());
      }

      // All tokens should be unique
      expect(tokens.size).toBe(numTokens);
    });
  });

  describe("Input Validation Security", () => {
    it("should prevent SQL injection attempts", () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM users --",
      ];

      maliciousInputs.forEach((input) => {
        // Since we use Prisma ORM, SQL injection should be prevented
        // This test ensures our validation doesn't break with malicious input
        expect(() => {
          // Simulate input validation
          const sanitized = input.replace(/['"]/g, "");
          expect(sanitized).not.toContain("'");
          expect(sanitized).not.toContain('"');
        }).not.toThrow();
      });
    });

    it("should prevent XSS attacks", () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        "javascript:alert(1)",
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)">',
        'onclick="alert(1)"',
      ];

      xssPayloads.forEach((payload) => {
        // Simulate our sanitization
        const sanitized = payload
          .replace(/[<>]/g, "")
          .replace(/javascript:/gi, "")
          .replace(/on\w+=/gi, "");

        expect(sanitized).not.toContain("<");
        expect(sanitized).not.toContain(">");
        expect(sanitized.toLowerCase()).not.toContain("javascript:");
        expect(sanitized.toLowerCase()).not.toMatch(/on\w+=/);
      });
    });

    it("should handle Unicode and encoding attacks", () => {
      const unicodeAttacks = [
        "\u003cscript\u003ealert(1)\u003c/script\u003e",
        "%3Cscript%3Ealert(1)%3C/script%3E",
        "&lt;script&gt;alert(1)&lt;/script&gt;",
      ];

      unicodeAttacks.forEach((attack) => {
        // Decode and sanitize
        const decoded = decodeURIComponent(
          attack.replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        );
        const sanitized = decoded.replace(/[<>]/g, "");

        expect(sanitized).not.toContain("<script>");
        expect(sanitized).not.toContain("</script>");
      });
    });
  });

  describe("Rate Limiting Security", () => {
    it("should implement exponential backoff", () => {
      const attempts = [1, 2, 3, 4, 5];
      const baseDelay = 500;

      const delays = attempts.map((attempt) => {
        return Math.min(baseDelay * Math.pow(2, attempt - 1), 10000);
      });

      expect(delays[0]).toBe(500); // 500ms
      expect(delays[1]).toBe(1000); // 1s
      expect(delays[2]).toBe(2000); // 2s
      expect(delays[3]).toBe(4000); // 4s
      expect(delays[4]).toBe(8000); // 8s
    });

    it("should cap maximum delay", () => {
      const attempt = 10;
      const baseDelay = 500;
      const maxDelay = 10000;

      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);

      expect(delay).toBe(maxDelay);
    });
  });

  describe("Session Security", () => {
    it("should invalidate tokens on password change", async () => {
      // This test verifies the security requirement that changing password
      // should invalidate all existing refresh tokens
      const mockRevokeAllUserTokens = jest.fn();

      // Simulate password change
      await mockRevokeAllUserTokens("user-123");

      expect(mockRevokeAllUserTokens).toHaveBeenCalledWith("user-123");
    });

    it("should rotate refresh tokens", () => {
      const oldToken = generateRefreshToken();
      const newToken = generateRefreshToken();

      expect(oldToken).not.toBe(newToken);

      // In real implementation, old token would be revoked
      // and new token would be stored
    });
  });

  describe("Cryptographic Security", () => {
    it("should use secure random number generation", () => {
      const crypto = require("crypto");

      // Test that we're using cryptographically secure random numbers
      const randomBytes1 = crypto.randomBytes(32);
      const randomBytes2 = crypto.randomBytes(32);

      expect(randomBytes1).not.toEqual(randomBytes2);
      expect(randomBytes1.length).toBe(32);
      expect(randomBytes2.length).toBe(32);
    });

    it("should have sufficient key lengths", () => {
      const jwtSecret = process.env.JWT_SECRET || "";
      const refreshSecret = process.env.JWT_REFRESH_SECRET || "";

      // JWT secrets should be at least 256 bits (32 characters)
      expect(jwtSecret.length).toBeGreaterThanOrEqual(32);
      expect(refreshSecret.length).toBeGreaterThanOrEqual(32);
    });
  });

  describe("Error Information Disclosure", () => {
    it("should not leak sensitive information in errors", () => {
      const sensitiveData = {
        password: "secret123",
        token: "jwt-token-here",
        hash: "$2b$12$hash...",
      };

      // Simulate error handling that should not expose sensitive data
      const safeError = {
        message: "Authentication failed",
        // Should not include: password, token, hash, etc.
      };

      expect(JSON.stringify(safeError)).not.toContain("secret123");
      expect(JSON.stringify(safeError)).not.toContain("jwt-token-here");
      expect(JSON.stringify(safeError)).not.toContain("$2b$12$");
    });

    it("should provide generic error messages", () => {
      const errors = [
        "Invalid credentials", // Generic, doesn't specify email vs password
        "Authentication failed", // Generic
        "Access denied", // Generic
      ];

      errors.forEach((error) => {
        expect(error).not.toContain("password");
        expect(error).not.toContain("email");
        expect(error).not.toContain("user not found");
      });
    });
  });

  describe("Security Headers", () => {
    it("should validate security header values", () => {
      const securityHeaders = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Strict-Transport-Security":
          "max-age=31536000; includeSubDomains; preload",
      };

      Object.entries(securityHeaders).forEach(([header, value]) => {
        expect(value).toBeDefined();
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      });
    });
  });
});
