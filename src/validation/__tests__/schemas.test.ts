import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateProfileSchema,
  userIdSchema,
  paginationSchema,
  formatZodError,
  validateEmail,
  validatePassword,
  sanitizeInput,
} from "../schemas";
import { z } from "zod";

describe("Validation Schemas", () => {
  describe("registerSchema", () => {
    it("should validate valid registration data", () => {
      const validData = {
        email: "test@example.com",
        password: "StrongPass123!",
        firstName: "John",
        lastName: "Doe",
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("test@example.com");
        expect(result.data.firstName).toBe("John");
      }
    });

    it("should reject invalid email", () => {
      const invalidData = {
        email: "invalid-email",
        password: "StrongPass123!",
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("valid email");
      }
    });

    it("should reject weak password", () => {
      const invalidData = {
        email: "test@example.com",
        password: "weak",
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it("should accept optional name fields", () => {
      const validData = {
        email: "test@example.com",
        password: "StrongPass123!",
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should trim and lowercase email", () => {
      const data = {
        email: "  TEST@EXAMPLE.COM  ",
        password: "StrongPass123!",
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("test@example.com");
      }
    });
  });

  describe("loginSchema", () => {
    it("should validate valid login data", () => {
      const validData = {
        email: "test@example.com",
        password: "any-password",
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject empty password", () => {
      const invalidData = {
        email: "test@example.com",
        password: "",
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject invalid email", () => {
      const invalidData = {
        email: "invalid-email",
        password: "password",
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("refreshTokenSchema", () => {
    it("should validate valid refresh token", () => {
      const validData = {
        refreshToken: "valid-refresh-token-string",
      };

      const result = refreshTokenSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject empty refresh token", () => {
      const invalidData = {
        refreshToken: "",
      };

      const result = refreshTokenSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject too long refresh token", () => {
      const invalidData = {
        refreshToken: "a".repeat(257),
      };

      const result = refreshTokenSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("changePasswordSchema", () => {
    it("should validate valid password change data", () => {
      const validData = {
        currentPassword: "current-password",
        newPassword: "NewStrongPass123!",
      };

      const result = changePasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject weak new password", () => {
      const invalidData = {
        currentPassword: "current-password",
        newPassword: "weak",
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject empty current password", () => {
      const invalidData = {
        currentPassword: "",
        newPassword: "NewStrongPass123!",
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("updateProfileSchema", () => {
    it("should validate valid profile update data", () => {
      const validData = {
        firstName: "John",
        lastName: "Doe",
        email: "new@example.com",
      };

      const result = updateProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept partial updates", () => {
      const validData = {
        firstName: "John",
      };

      const result = updateProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject invalid name characters", () => {
      const invalidData = {
        firstName: "John123",
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should trim name fields", () => {
      const data = {
        firstName: "  John  ",
        lastName: "  Doe  ",
      };

      const result = updateProfileSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe("John");
        expect(result.data.lastName).toBe("Doe");
      }
    });
  });

  describe("userIdSchema", () => {
    it("should validate valid user ID", () => {
      const validData = {
        id: "user-123",
      };

      const result = userIdSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject empty user ID", () => {
      const invalidData = {
        id: "",
      };

      const result = userIdSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject too long user ID", () => {
      const invalidData = {
        id: "a".repeat(51),
      };

      const result = userIdSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("paginationSchema", () => {
    it("should validate valid pagination data", () => {
      const validData = {
        page: "2",
        limit: "20",
      };

      const result = paginationSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(20);
      }
    });

    it("should use default values for missing fields", () => {
      const data = {};

      const result = paginationSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
      }
    });

    it("should reject invalid page number", () => {
      const invalidData = {
        page: "0",
      };

      const result = paginationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject limit exceeding maximum", () => {
      const invalidData = {
        limit: "101",
      };

      const result = paginationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("formatZodError", () => {
    it("should format Zod errors correctly", () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      const result = schema.safeParse({
        email: "invalid-email",
        age: 15,
      });

      if (!result.success) {
        const formatted = formatZodError(result.error);
        expect(formatted).toHaveLength(2);
        expect(formatted[0]).toHaveProperty("field");
        expect(formatted[0]).toHaveProperty("message");
      }
    });
  });

  describe("validateEmail", () => {
    it("should return true for valid email", () => {
      expect(validateEmail("test@example.com")).toBe(true);
    });

    it("should return false for invalid email", () => {
      expect(validateEmail("invalid-email")).toBe(false);
    });
  });

  describe("validatePassword", () => {
    it("should return valid result for strong password", () => {
      const result = validatePassword("StrongPass123!");
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return invalid result for weak password", () => {
      const result = validatePassword("weak");
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should return specific error messages", () => {
      const result = validatePassword("short");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Password must be at least 8 characters long"
      );
    });
  });

  describe("sanitizeInput", () => {
    it("should remove dangerous characters", () => {
      const input = '<script>alert("xss")</script>';
      const sanitized = sanitizeInput(input);
      expect(sanitized).not.toContain("<");
      expect(sanitized).not.toContain(">");
    });

    it("should trim whitespace", () => {
      const input = "  test  ";
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe("test");
    });

    it("should handle empty string", () => {
      const input = "";
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe("");
    });
  });
});
