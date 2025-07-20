import {
  AuthError,
  InvalidCredentialsError,
  TokenExpiredError,
  InvalidTokenError,
  MissingTokenError,
  AccountDeactivatedError,
  InsufficientPermissionsError,
  AccessDeniedError,
  UserNotFoundError,
  EmailAlreadyExistsError,
  WeakPasswordError,
  IncorrectPasswordError,
  RateLimitExceededError,
  ValidationError,
  InternalServerError,
  DatabaseError,
  ServiceUnavailableError,
  createAuthError,
  isAuthError,
  isClientError,
  isServerError,
  getErrorSeverity,
  ErrorSeverity,
} from "../AuthErrors";

describe("AuthErrors", () => {
  describe("Base AuthError class", () => {
    class TestAuthError extends AuthError {
      readonly code = "TEST_ERROR";
      readonly statusCode = 400;
    }

    it("should create error with message and details", () => {
      const error = new TestAuthError("Test message", { key: "value" });

      expect(error.message).toBe("Test message");
      expect(error.code).toBe("TEST_ERROR");
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ key: "value" });
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it("should serialize to JSON correctly", () => {
      const error = new TestAuthError("Test message", { key: "value" });
      const json = error.toJSON();

      expect(json).toEqual({
        code: "TEST_ERROR",
        message: "Test message",
        timestamp: error.timestamp,
        details: { key: "value" },
      });
    });

    it("should maintain proper prototype chain", () => {
      const error = new TestAuthError("Test message");

      expect(error instanceof AuthError).toBe(true);
      expect(error instanceof TestAuthError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });
  });

  describe("Specific error classes", () => {
    it("should create InvalidCredentialsError correctly", () => {
      const error = new InvalidCredentialsError();

      expect(error.code).toBe("INVALID_CREDENTIALS");
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Invalid email or password");
    });

    it("should create TokenExpiredError correctly", () => {
      const error = new TokenExpiredError("Custom message");

      expect(error.code).toBe("TOKEN_EXPIRED");
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Custom message");
    });

    it("should create InvalidTokenError correctly", () => {
      const error = new InvalidTokenError();

      expect(error.code).toBe("INVALID_TOKEN");
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Invalid authentication token");
    });

    it("should create MissingTokenError correctly", () => {
      const error = new MissingTokenError();

      expect(error.code).toBe("MISSING_TOKEN");
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Authentication token is required");
    });

    it("should create AccountDeactivatedError correctly", () => {
      const error = new AccountDeactivatedError();

      expect(error.code).toBe("ACCOUNT_DEACTIVATED");
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe("Your account has been deactivated");
    });

    it("should create InsufficientPermissionsError correctly", () => {
      const error = new InsufficientPermissionsError();

      expect(error.code).toBe("INSUFFICIENT_PERMISSIONS");
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe(
        "Insufficient permissions to access this resource"
      );
    });

    it("should create AccessDeniedError correctly", () => {
      const error = new AccessDeniedError();

      expect(error.code).toBe("ACCESS_DENIED");
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe("Access denied");
    });

    it("should create UserNotFoundError correctly", () => {
      const error = new UserNotFoundError();

      expect(error.code).toBe("USER_NOT_FOUND");
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("User not found");
    });

    it("should create EmailAlreadyExistsError correctly", () => {
      const error = new EmailAlreadyExistsError();

      expect(error.code).toBe("EMAIL_ALREADY_EXISTS");
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe("An account with this email already exists");
    });

    it("should create WeakPasswordError correctly", () => {
      const details = ["Too short", "No special characters"];
      const error = new WeakPasswordError("Custom message", details);

      expect(error.code).toBe("WEAK_PASSWORD");
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Custom message");
      expect(error.details).toEqual(details);
    });

    it("should create IncorrectPasswordError correctly", () => {
      const error = new IncorrectPasswordError();

      expect(error.code).toBe("INCORRECT_PASSWORD");
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Current password is incorrect");
    });

    it("should create RateLimitExceededError correctly", () => {
      const error = new RateLimitExceededError("Custom message", 60);

      expect(error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(error.statusCode).toBe(429);
      expect(error.message).toBe("Custom message");
      expect(error.retryAfter).toBe(60);
    });

    it("should create ValidationError correctly", () => {
      const details = { field: "email", message: "Invalid format" };
      const error = new ValidationError("Custom message", details);

      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Custom message");
      expect(error.details).toEqual(details);
    });

    it("should create InternalServerError correctly", () => {
      const error = new InternalServerError();

      expect(error.code).toBe("INTERNAL_SERVER_ERROR");
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe("Internal server error");
    });

    it("should create DatabaseError correctly", () => {
      const error = new DatabaseError();

      expect(error.code).toBe("DATABASE_ERROR");
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe("Database operation failed");
    });

    it("should create ServiceUnavailableError correctly", () => {
      const error = new ServiceUnavailableError();

      expect(error.code).toBe("SERVICE_UNAVAILABLE");
      expect(error.statusCode).toBe(503);
      expect(error.message).toBe("Service temporarily unavailable");
    });
  });

  describe("RateLimitExceededError JSON serialization", () => {
    it("should include retryAfter in JSON", () => {
      const error = new RateLimitExceededError("Rate limited", 120);
      const json = error.toJSON();

      expect(json).toEqual({
        code: "RATE_LIMIT_EXCEEDED",
        message: "Rate limited",
        timestamp: error.timestamp,
        details: undefined,
        retryAfter: 120,
      });
    });
  });

  describe("createAuthError factory", () => {
    it("should create correct error types", () => {
      const testCases = [
        { type: "INVALID_CREDENTIALS", expectedClass: InvalidCredentialsError },
        { type: "TOKEN_EXPIRED", expectedClass: TokenExpiredError },
        { type: "INVALID_TOKEN", expectedClass: InvalidTokenError },
        { type: "MISSING_TOKEN", expectedClass: MissingTokenError },
        { type: "ACCOUNT_DEACTIVATED", expectedClass: AccountDeactivatedError },
        {
          type: "INSUFFICIENT_PERMISSIONS",
          expectedClass: InsufficientPermissionsError,
        },
        { type: "ACCESS_DENIED", expectedClass: AccessDeniedError },
        { type: "USER_NOT_FOUND", expectedClass: UserNotFoundError },
        {
          type: "EMAIL_ALREADY_EXISTS",
          expectedClass: EmailAlreadyExistsError,
        },
        { type: "WEAK_PASSWORD", expectedClass: WeakPasswordError },
        { type: "INCORRECT_PASSWORD", expectedClass: IncorrectPasswordError },
        { type: "RATE_LIMIT_EXCEEDED", expectedClass: RateLimitExceededError },
        { type: "VALIDATION_ERROR", expectedClass: ValidationError },
        { type: "DATABASE_ERROR", expectedClass: DatabaseError },
        { type: "SERVICE_UNAVAILABLE", expectedClass: ServiceUnavailableError },
      ];

      testCases.forEach(({ type, expectedClass }) => {
        const error = createAuthError(type, "Custom message");
        expect(error).toBeInstanceOf(expectedClass);
        expect(error.message).toBe("Custom message");
      });
    });

    it("should create InternalServerError for unknown types", () => {
      const error = createAuthError("UNKNOWN_TYPE", "Custom message");

      expect(error).toBeInstanceOf(InternalServerError);
      expect(error.message).toBe("Custom message");
    });

    it("should pass details to appropriate error types", () => {
      const details = ["Error 1", "Error 2"];
      const error = createAuthError("WEAK_PASSWORD", "Weak password", details);

      expect(error).toBeInstanceOf(WeakPasswordError);
      expect(error.details).toEqual(details);
    });
  });

  describe("Type guards", () => {
    it("should identify AuthError instances", () => {
      const authError = new InvalidCredentialsError();
      const regularError = new Error("Regular error");

      expect(isAuthError(authError)).toBe(true);
      expect(isAuthError(regularError)).toBe(false);
      expect(isAuthError(null)).toBe(false);
      expect(isAuthError(undefined)).toBe(false);
    });

    it("should identify client errors", () => {
      const clientError = new InvalidCredentialsError(); // 401
      const serverError = new InternalServerError(); // 500

      expect(isClientError(clientError)).toBe(true);
      expect(isClientError(serverError)).toBe(false);
    });

    it("should identify server errors", () => {
      const clientError = new InvalidCredentialsError(); // 401
      const serverError = new InternalServerError(); // 500

      expect(isServerError(clientError)).toBe(false);
      expect(isServerError(serverError)).toBe(true);
    });
  });

  describe("Error severity", () => {
    it("should return CRITICAL for critical errors", () => {
      const internalError = new InternalServerError();
      const databaseError = new DatabaseError();

      expect(getErrorSeverity(internalError)).toBe(ErrorSeverity.CRITICAL);
      expect(getErrorSeverity(databaseError)).toBe(ErrorSeverity.CRITICAL);
    });

    it("should return HIGH for high severity errors", () => {
      const serviceError = new ServiceUnavailableError();

      expect(getErrorSeverity(serviceError)).toBe(ErrorSeverity.HIGH);
    });

    it("should return LOW for low severity errors", () => {
      const rateLimitError = new RateLimitExceededError();
      const validationError = new ValidationError();

      expect(getErrorSeverity(rateLimitError)).toBe(ErrorSeverity.LOW);
      expect(getErrorSeverity(validationError)).toBe(ErrorSeverity.LOW);
    });

    it("should return MEDIUM for medium severity errors", () => {
      const authError = new InvalidCredentialsError();
      const userError = new UserNotFoundError();

      expect(getErrorSeverity(authError)).toBe(ErrorSeverity.MEDIUM);
      expect(getErrorSeverity(userError)).toBe(ErrorSeverity.MEDIUM);
    });
  });
});
