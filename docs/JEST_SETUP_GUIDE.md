# Jest Testing Setup and Usage Guide

## Overview

This project uses Jest as the primary testing framework along with additional testing utilities for comprehensive test coverage.

## Testing Stack

- **Jest**: Main testing framework
- **Supertest**: HTTP assertion library for API testing
- **@types/jest**: TypeScript definitions for Jest
- **ts-jest**: TypeScript preprocessor for Jest

## Configuration

### Jest Configuration File

The Jest configuration is located in `jest.config.js`:

```javascript
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/test/**"],
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
```

### Test Setup File

The `src/test/setup.ts` file contains global test configuration and utilities.

## Running Tests

### All Tests

```bash
npm test
```

### Watch Mode (Development)

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

### Specific Test File

```bash
npm test -- AuthenticationService.test.ts
```

### Tests Matching Pattern

```bash
npm test -- --testNamePattern="login"
```

## Test Structure

### Directory Organization

```
src/
├── services/
│   ├── AuthenticationService.ts
│   └── __tests__/
│       └── AuthenticationService.test.ts
├── middleware/
│   ├── auth.ts
│   └── __tests__/
│       └── auth.test.ts
└── test/
    ├── setup.ts           # Global test setup
    ├── factories.ts       # Test data factories
    ├── integration.test.ts # Integration tests
    ├── security.test.ts   # Security tests
    └── performance.test.ts # Performance tests
```

## Writing Tests

### Basic Test Structure

```typescript
import { AuthenticationService } from "../AuthenticationService";

describe("AuthenticationService", () => {
  let authService: AuthenticationService;

  beforeEach(() => {
    authService = new AuthenticationService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("login", () => {
    it("should authenticate valid credentials", async () => {
      // Arrange
      const email = "test@example.com";
      const password = "password123";

      // Act
      const result = await authService.login(email, password);

      // Assert
      expect(result).toBeDefined();
      expect(result.token).toBeTruthy();
    });

    it("should throw error for invalid credentials", async () => {
      // Arrange
      const email = "test@example.com";
      const password = "wrongpassword";

      // Act & Assert
      await expect(authService.login(email, password)).rejects.toThrow(
        "Invalid credentials"
      );
    });
  });
});
```

### API Route Testing

```typescript
import request from "supertest";
import { app } from "../server";

describe("POST /auth/login", () => {
  it("should return token for valid credentials", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({
        email: "test@example.com",
        password: "password123",
      })
      .expect(200);

    expect(response.body.token).toBeDefined();
    expect(response.body.user).toBeDefined();
  });

  it("should return 401 for invalid credentials", async () => {
    await request(app)
      .post("/auth/login")
      .send({
        email: "test@example.com",
        password: "wrongpassword",
      })
      .expect(401);
  });
});
```

### Mocking Dependencies

```typescript
import { UserRepository } from "../../repositories/UserRepository";
import { AuthenticationService } from "../AuthenticationService";

// Mock the repository
jest.mock("../../repositories/UserRepository");
const MockedUserRepository = UserRepository as jest.MockedClass<
  typeof UserRepository
>;

describe("AuthenticationService", () => {
  let authService: AuthenticationService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepository =
      new MockedUserRepository() as jest.Mocked<UserRepository>;
    authService = new AuthenticationService(mockUserRepository);
  });

  it("should call repository with correct parameters", async () => {
    // Arrange
    mockUserRepository.findByEmail.mockResolvedValue(mockUser);

    // Act
    await authService.login("test@example.com", "password");

    // Assert
    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
      "test@example.com"
    );
  });
});
```

## Test Utilities

### Test Factories

Use the factories in `src/test/factories.ts` to create test data:

```typescript
import { createTestUser, createTestToken } from "../test/factories";

describe("User tests", () => {
  it("should work with test user", () => {
    const user = createTestUser({
      email: "custom@example.com",
    });

    expect(user.email).toBe("custom@example.com");
  });
});
```

### Database Testing

For tests that need database access:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("Database tests", () => {
  beforeEach(async () => {
    // Clean up database before each test
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should create user in database", async () => {
    const user = await prisma.user.create({
      data: {
        email: "test@example.com",
        password: "hashedpassword",
      },
    });

    expect(user.id).toBeDefined();
  });
});
```

## Best Practices

### Test Organization

- Group related tests using `describe` blocks
- Use descriptive test names that explain the expected behavior
- Follow the AAA pattern: Arrange, Act, Assert

### Mocking Guidelines

- Mock external dependencies (databases, APIs, file system)
- Don't mock the code you're testing
- Use `jest.clearAllMocks()` in `afterEach` to reset mocks

### Async Testing

- Always use `async/await` for asynchronous operations
- Use `expect().rejects.toThrow()` for testing async errors

### Coverage Goals

- Aim for 80%+ code coverage
- Focus on testing critical business logic
- Don't chase 100% coverage at the expense of test quality

## Common Jest Matchers

```typescript
// Equality
expect(value).toBe(4);
expect(object).toEqual({ name: "John" });

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();

// Numbers
expect(value).toBeGreaterThan(3);
expect(value).toBeCloseTo(0.3);

// Strings
expect("hello world").toMatch(/world/);
expect("hello world").toContain("world");

// Arrays
expect(["Alice", "Bob"]).toContain("Alice");
expect(array).toHaveLength(3);

// Exceptions
expect(() => {
  throw new Error("Wrong!");
}).toThrow("Wrong!");

// Async
await expect(promise).resolves.toBe("success");
await expect(promise).rejects.toThrow("error");
```

## Debugging Tests

### Running Single Test

```bash
npm test -- --testNamePattern="specific test name"
```

### Verbose Output

```bash
npm test -- --verbose
```

### Debug Mode

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then open Chrome DevTools and navigate to `chrome://inspect`.

## Continuous Integration

Tests run automatically in CI/CD pipelines. Ensure all tests pass before merging:

```bash
npm run test:ci
```

This command runs tests once without watch mode and generates coverage reports.
