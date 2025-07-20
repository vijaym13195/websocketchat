import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from "../PasswordService";

describe("PasswordService", () => {
  describe("hashPassword", () => {
    it("should hash a password successfully", async () => {
      const password = "TestPassword123!";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it("should generate different hashes for the same password", async () => {
      const password = "TestPassword123!";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("verifyPassword", () => {
    it("should verify correct password", async () => {
      const password = "TestPassword123!";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const password = "TestPassword123!";
      const wrongPassword = "WrongPassword123!";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it("should handle timing-safe comparison", async () => {
      const password = "TestPassword123!";
      const hash = await hashPassword(password);

      // Test with various wrong passwords to ensure timing consistency
      const wrongPasswords = ["a", "ab", "abc", "WrongPassword123!"];

      for (const wrongPassword of wrongPasswords) {
        const isValid = await verifyPassword(wrongPassword, hash);
        expect(isValid).toBe(false);
      }
    });
  });

  describe("validatePasswordStrength", () => {
    it("should accept strong password", () => {
      const result = validatePasswordStrength("StrongPass123!");
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject password too short", () => {
      const result = validatePasswordStrength("Short1!");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Password must be at least 8 characters long"
      );
    });

    it("should reject password too long", () => {
      const longPassword = "A".repeat(129) + "1!";
      const result = validatePasswordStrength(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Password must not exceed 128 characters"
      );
    });

    it("should reject password without lowercase", () => {
      const result = validatePasswordStrength("UPPERCASE123!");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one lowercase letter"
      );
    });

    it("should reject password without uppercase", () => {
      const result = validatePasswordStrength("lowercase123!");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one uppercase letter"
      );
    });

    it("should reject password without numbers", () => {
      const result = validatePasswordStrength("NoNumbers!");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one number"
      );
    });

    it("should reject password without special characters", () => {
      const result = validatePasswordStrength("NoSpecial123");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one special character"
      );
    });

    it("should reject password with repeated characters", () => {
      const result = validatePasswordStrength("Passsword123!");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Password must not contain repeated characters"
      );
    });

    it("should reject password with common patterns", () => {
      const commonPasswords = ["Password123!", "Admin123!", "Qwerty123!"];

      commonPasswords.forEach((password) => {
        const result = validatePasswordStrength(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "Password must not contain common patterns"
        );
      });
    });

    it("should return multiple errors for weak password", () => {
      const result = validatePasswordStrength("weak");
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
