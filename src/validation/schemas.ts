import { z } from "zod";

// Password validation schema with comprehensive rules
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(128, "Password must not exceed 128 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    "Password must contain at least one special character"
  )
  .refine((password) => !/(.)\1{2,}/.test(password), {
    message: "Password must not contain repeated characters",
  })
  .refine((password) => !/123|abc|qwe|password|admin/i.test(password), {
    message: "Password must not contain common patterns",
  });

// Email validation schema
const emailSchema = z
  .string()
  .email("Please provide a valid email address")
  .min(1, "Email is required")
  .max(254, "Email must not exceed 254 characters")
  .toLowerCase()
  .trim();

// Name validation schema
const nameSchema = z
  .string()
  .min(1, "Name must not be empty")
  .max(50, "Name must not exceed 50 characters")
  .regex(
    /^[a-zA-Z\s'-]+$/,
    "Name can only contain letters, spaces, hyphens, and apostrophes"
  )
  .trim();

// Registration request schema
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
});

// Login request schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

// Refresh token request schema
export const refreshTokenSchema = z.object({
  refreshToken: z
    .string()
    .min(1, "Refresh token is required")
    .max(256, "Invalid refresh token format"),
});

// Change password request schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

// Update profile request schema
export const updateProfileSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  email: emailSchema.optional(),
});

// User ID parameter schema
export const userIdSchema = z.object({
  id: z
    .string()
    .min(1, "User ID is required")
    .max(50, "Invalid user ID format"),
});

// Query parameters for pagination
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, "Page must be a positive number"),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => val > 0 && val <= 100, "Limit must be between 1 and 100"),
});

// Password reset request schema
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

// Password reset confirmation schema
export const passwordResetConfirmSchema = z.object({
  token: z
    .string()
    .min(1, "Reset token is required")
    .max(256, "Invalid reset token format"),
  newPassword: passwordSchema,
});

// Email verification schema
export const emailVerificationSchema = z.object({
  token: z
    .string()
    .min(1, "Verification token is required")
    .max(256, "Invalid verification token format"),
});

// Search query schema
export const searchSchema = z.object({
  q: z
    .string()
    .min(1, "Search query is required")
    .max(100, "Search query must not exceed 100 characters")
    .trim(),
});

// Type exports for TypeScript
export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;
export type UserIdParams = z.infer<typeof userIdSchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirm = z.infer<typeof passwordResetConfirmSchema>;
export type EmailVerification = z.infer<typeof emailVerificationSchema>;
export type SearchQuery = z.infer<typeof searchSchema>;

// Validation error formatter
export interface ValidationError {
  field: string;
  message: string;
}

export function formatZodError(error: z.ZodError): ValidationError[] {
  return error.errors.map((err) => ({
    field: err.path.join("."),
    message: err.message,
  }));
}

// Custom validation functions
export function validateEmail(email: string): boolean {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
}

export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  try {
    passwordSchema.parse(password);
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map((err) => err.message),
      };
    }
    return { isValid: false, errors: ["Invalid password"] };
  }
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, "");
}

// Common validation patterns
export const commonPatterns = {
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  cuid: /^c[a-z0-9]{24}$/,
  phoneNumber: /^\+?[1-9]\d{1,14}$/,
  url: /^https?:\/\/.+/,
  ipAddress:
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
};
