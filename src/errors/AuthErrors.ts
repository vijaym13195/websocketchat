// Base authentication error class
export abstract class AuthError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  public readonly timestamp: Date;
  public details?: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.details = details;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      timestamp: this.timestamp,
      details: this.details,
    };
  }
}

// Authentication-specific errors
export class InvalidCredentialsError extends AuthError {
  readonly code = "INVALID_CREDENTIALS";
  readonly statusCode = 401;

  constructor(message: string = "Invalid email or password") {
    super(message);
  }
}

export class TokenExpiredError extends AuthError {
  readonly code = "TOKEN_EXPIRED";
  readonly statusCode = 401;

  constructor(message: string = "Authentication token has expired") {
    super(message);
  }
}

export class InvalidTokenError extends AuthError {
  readonly code = "INVALID_TOKEN";
  readonly statusCode = 401;

  constructor(message: string = "Invalid authentication token") {
    super(message);
  }
}

export class MissingTokenError extends AuthError {
  readonly code = "MISSING_TOKEN";
  readonly statusCode = 401;

  constructor(message: string = "Authentication token is required") {
    super(message);
  }
}

export class AccountDeactivatedError extends AuthError {
  readonly code = "ACCOUNT_DEACTIVATED";
  readonly statusCode = 403;

  constructor(message: string = "Your account has been deactivated") {
    super(message);
  }
}

export class InsufficientPermissionsError extends AuthError {
  readonly code = "INSUFFICIENT_PERMISSIONS";
  readonly statusCode = 403;

  constructor(
    message: string = "Insufficient permissions to access this resource"
  ) {
    super(message);
  }
}

export class AccessDeniedError extends AuthError {
  readonly code = "ACCESS_DENIED";
  readonly statusCode = 403;

  constructor(message: string = "Access denied") {
    super(message);
  }
}

// User-specific errors
export class UserNotFoundError extends AuthError {
  readonly code = "USER_NOT_FOUND";
  readonly statusCode = 404;

  constructor(message: string = "User not found") {
    super(message);
  }
}

export class EmailAlreadyExistsError extends AuthError {
  readonly code = "EMAIL_ALREADY_EXISTS";
  readonly statusCode = 409;

  constructor(message: string = "An account with this email already exists") {
    super(message);
  }
}

export class WeakPasswordError extends AuthError {
  readonly code = "WEAK_PASSWORD";
  readonly statusCode = 400;

  constructor(
    message: string = "Password does not meet security requirements",
    details?: string[]
  ) {
    super(message);
    this.details = details;
  }
}

export class IncorrectPasswordError extends AuthError {
  readonly code = "INCORRECT_PASSWORD";
  readonly statusCode = 400;

  constructor(message: string = "Current password is incorrect") {
    super(message);
  }
}

// Rate limiting errors
export class RateLimitExceededError extends AuthError {
  readonly code = "RATE_LIMIT_EXCEEDED";
  readonly statusCode = 429;
  public readonly retryAfter?: number;

  constructor(
    message: string = "Too many requests, please try again later",
    retryAfter?: number
  ) {
    super(message);
    this.retryAfter = retryAfter;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

// Validation errors
export class ValidationError extends AuthError {
  readonly code = "VALIDATION_ERROR";
  readonly statusCode = 400;

  constructor(message: string = "Validation failed", details?: any) {
    super(message);
    this.details = details;
  }
}

// Server errors
export class InternalServerError extends AuthError {
  readonly code = "INTERNAL_SERVER_ERROR";
  readonly statusCode = 500;

  constructor(message: string = "Internal server error") {
    super(message);
  }
}

export class DatabaseError extends AuthError {
  readonly code = "DATABASE_ERROR";
  readonly statusCode = 500;

  constructor(message: string = "Database operation failed") {
    super(message);
  }
}

export class ServiceUnavailableError extends AuthError {
  readonly code = "SERVICE_UNAVAILABLE";
  readonly statusCode = 503;

  constructor(message: string = "Service temporarily unavailable") {
    super(message);
  }
}

// Error factory functions
export function createAuthError(
  type: string,
  message?: string,
  details?: any
): AuthError {
  switch (type) {
    case "INVALID_CREDENTIALS":
      return new InvalidCredentialsError(message);
    case "TOKEN_EXPIRED":
      return new TokenExpiredError(message);
    case "INVALID_TOKEN":
      return new InvalidTokenError(message);
    case "MISSING_TOKEN":
      return new MissingTokenError(message);
    case "ACCOUNT_DEACTIVATED":
      return new AccountDeactivatedError(message);
    case "INSUFFICIENT_PERMISSIONS":
      return new InsufficientPermissionsError(message);
    case "ACCESS_DENIED":
      return new AccessDeniedError(message);
    case "USER_NOT_FOUND":
      return new UserNotFoundError(message);
    case "EMAIL_ALREADY_EXISTS":
      return new EmailAlreadyExistsError(message);
    case "WEAK_PASSWORD":
      return new WeakPasswordError(message, details);
    case "INCORRECT_PASSWORD":
      return new IncorrectPasswordError(message);
    case "RATE_LIMIT_EXCEEDED":
      return new RateLimitExceededError(message, details);
    case "VALIDATION_ERROR":
      return new ValidationError(message, details);
    case "DATABASE_ERROR":
      return new DatabaseError(message);
    case "SERVICE_UNAVAILABLE":
      return new ServiceUnavailableError(message);
    default:
      return new InternalServerError(message);
  }
}

// Type guards
export function isAuthError(error: any): error is AuthError {
  return error instanceof AuthError;
}

export function isClientError(error: AuthError): boolean {
  return error.statusCode >= 400 && error.statusCode < 500;
}

export function isServerError(error: AuthError): boolean {
  return error.statusCode >= 500;
}

// Error severity levels
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export function getErrorSeverity(error: AuthError): ErrorSeverity {
  if (error instanceof InternalServerError || error instanceof DatabaseError) {
    return ErrorSeverity.CRITICAL;
  }

  if (error instanceof ServiceUnavailableError) {
    return ErrorSeverity.HIGH;
  }

  if (
    error instanceof RateLimitExceededError ||
    error instanceof ValidationError
  ) {
    return ErrorSeverity.LOW;
  }

  return ErrorSeverity.MEDIUM;
}
