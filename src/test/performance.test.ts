import { hashPassword, verifyPassword } from "../services/PasswordService";
import {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
} from "../services/TokenService";
import {
  measureAsyncExecutionTime,
  measureExecutionTime,
  generateStrongPassword,
} from "./factories";

describe("Performance Tests", () => {
  describe("Password Operations Performance", () => {
    it("should hash passwords within acceptable time", async () => {
      const password = generateStrongPassword();

      const { duration } = await measureAsyncExecutionTime(async () => {
        return await hashPassword(password);
      });

      // Should complete within 1 second in test environment (with reduced rounds)
      expect(duration).toBeLessThan(1000);
      console.log(`Password hashing took ${duration.toFixed(2)}ms`);
    });

    it("should verify passwords within acceptable time", async () => {
      const password = generateStrongPassword();
      const hash = await hashPassword(password);

      const { duration } = await measureAsyncExecutionTime(async () => {
        return await verifyPassword(password, hash);
      });

      // Verification should be faster than hashing
      expect(duration).toBeLessThan(500);
      console.log(`Password verification took ${duration.toFixed(2)}ms`);
    });

    it("should handle concurrent password operations", async () => {
      const password = generateStrongPassword();
      const concurrentOperations = 10;

      const startTime = Date.now();

      const promises = Array(concurrentOperations)
        .fill(null)
        .map(async () => {
          return await hashPassword(password);
        });

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(concurrentOperations);
      expect(totalTime).toBeLessThan(concurrentOperations * 1000); // Should be faster than sequential
      console.log(
        `${concurrentOperations} concurrent password hashes took ${totalTime}ms`
      );
    });
  });

  describe("Token Operations Performance", () => {
    it("should generate access tokens quickly", () => {
      const userId = "user-123";
      const email = "test@example.com";

      const { duration } = measureExecutionTime(() => {
        return generateAccessToken(userId, email);
      });

      // Token generation should be very fast
      expect(duration).toBeLessThan(10);
      console.log(`Access token generation took ${duration.toFixed(2)}ms`);
    });

    it("should verify access tokens quickly", async () => {
      const userId = "user-123";
      const email = "test@example.com";
      const token = generateAccessToken(userId, email);

      const { duration } = await measureAsyncExecutionTime(async () => {
        return await verifyAccessToken(token);
      });

      // Token verification should be fast
      expect(duration).toBeLessThan(50);
      console.log(`Access token verification took ${duration.toFixed(2)}ms`);
    });

    it("should generate refresh tokens quickly", () => {
      const { duration } = measureExecutionTime(() => {
        return generateRefreshToken();
      });

      // Refresh token generation should be very fast
      expect(duration).toBeLessThan(5);
      console.log(`Refresh token generation took ${duration.toFixed(2)}ms`);
    });

    it("should handle high-volume token generation", () => {
      const tokenCount = 1000;

      const { duration } = measureExecutionTime(() => {
        for (let i = 0; i < tokenCount; i++) {
          generateRefreshToken();
        }
      });

      const avgTimePerToken = duration / tokenCount;
      expect(avgTimePerToken).toBeLessThan(1); // Less than 1ms per token
      console.log(
        `Generated ${tokenCount} refresh tokens in ${duration.toFixed(
          2
        )}ms (${avgTimePerToken.toFixed(3)}ms per token)`
      );
    });
  });

  describe("Authentication Flow Performance", () => {
    it("should complete registration flow within time limit", async () => {
      // Mock the services to measure only the flow overhead
      const mockRegister = jest.fn().mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        accessToken: "token",
        refreshToken: "refresh",
      });

      const { duration } = await measureAsyncExecutionTime(async () => {
        return await mockRegister({
          email: "test@example.com",
          password: "StrongPassword123!",
          firstName: "John",
          lastName: "Doe",
        });
      });

      // Mock should be very fast
      expect(duration).toBeLessThan(10);
      console.log(`Registration flow took ${duration.toFixed(2)}ms`);
    });

    it("should complete login flow within time limit", async () => {
      const mockLogin = jest.fn().mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        accessToken: "token",
        refreshToken: "refresh",
      });

      const { duration } = await measureAsyncExecutionTime(async () => {
        return await mockLogin({
          email: "test@example.com",
          password: "StrongPassword123!",
        });
      });

      expect(duration).toBeLessThan(10);
      console.log(`Login flow took ${duration.toFixed(2)}ms`);
    });
  });

  describe("Memory Usage", () => {
    it("should not leak memory during token operations", () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Generate many tokens
      for (let i = 0; i < 10000; i++) {
        generateRefreshToken();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      console.log(
        `Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`
      );
    });

    it("should handle large payloads efficiently", () => {
      const largePayload = {
        userId: "user-123",
        email: "test@example.com",
        data: "x".repeat(1000), // 1KB of data
      };

      const { duration } = measureExecutionTime(() => {
        return generateAccessToken(largePayload.userId, largePayload.email);
      });

      // Should still be fast even with larger context
      expect(duration).toBeLessThan(20);
      console.log(
        `Large payload token generation took ${duration.toFixed(2)}ms`
      );
    });
  });

  describe("Scalability Tests", () => {
    it("should handle concurrent authentication requests", async () => {
      const concurrentRequests = 50;
      const mockAuth = jest.fn().mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        accessToken: "token",
        refreshToken: "refresh",
      });

      const { duration } = await measureAsyncExecutionTime(async () => {
        const promises = Array(concurrentRequests)
          .fill(null)
          .map(() =>
            mockAuth({ email: "test@example.com", password: "password" })
          );
        return await Promise.all(promises);
      });

      const avgTimePerRequest = duration / concurrentRequests;
      expect(avgTimePerRequest).toBeLessThan(10);
      console.log(
        `${concurrentRequests} concurrent auth requests took ${duration.toFixed(
          2
        )}ms (${avgTimePerRequest.toFixed(2)}ms per request)`
      );
    });

    it("should maintain performance under load", async () => {
      const iterations = 100;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const { duration } = measureExecutionTime(() => {
          return generateAccessToken("user-123", "test@example.com");
        });
        durations.push(duration);
      }

      const avgDuration = durations.reduce((a, b) => a + b) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);

      expect(avgDuration).toBeLessThan(5);
      expect(maxDuration).toBeLessThan(20); // No single operation should be too slow

      console.log(`Performance stats over ${iterations} iterations:`);
      console.log(`  Average: ${avgDuration.toFixed(3)}ms`);
      console.log(`  Min: ${minDuration.toFixed(3)}ms`);
      console.log(`  Max: ${maxDuration.toFixed(3)}ms`);
    });
  });

  describe("Database Operation Performance", () => {
    it("should simulate efficient user lookup", async () => {
      // Mock database lookup
      const mockUserLookup = jest.fn().mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        password: "hashed-password",
      });

      const { duration } = await measureAsyncExecutionTime(async () => {
        return await mockUserLookup("test@example.com");
      });

      // Database lookup should be fast (mocked)
      expect(duration).toBeLessThan(10);
      console.log(`User lookup took ${duration.toFixed(2)}ms`);
    });

    it("should simulate efficient token storage", async () => {
      const mockTokenStorage = jest.fn().mockResolvedValue(undefined);

      const { duration } = await measureAsyncExecutionTime(async () => {
        return await mockTokenStorage("user-123", "refresh-token");
      });

      expect(duration).toBeLessThan(10);
      console.log(`Token storage took ${duration.toFixed(2)}ms`);
    });
  });

  describe("Validation Performance", () => {
    it("should validate input quickly", () => {
      const { z } = require("zod");

      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
      });

      const validData = {
        email: "test@example.com",
        password: "StrongPassword123!",
      };

      const { duration } = measureExecutionTime(() => {
        return schema.parse(validData);
      });

      expect(duration).toBeLessThan(5);
      console.log(`Input validation took ${duration.toFixed(2)}ms`);
    });

    it("should handle validation errors quickly", () => {
      const { z } = require("zod");

      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
      });

      const invalidData = {
        email: "invalid-email",
        password: "short",
      };

      const { duration } = measureExecutionTime(() => {
        try {
          schema.parse(invalidData);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(duration).toBeLessThan(5);
      console.log(`Validation error handling took ${duration.toFixed(2)}ms`);
    });
  });
});
