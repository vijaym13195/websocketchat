# Testing Guide

This document provides comprehensive testing commands and guidelines for the WebSocket Chat Authentication System.

## Table of Contents

- [Quick Start](#quick-start)
- [Basic Jest Commands](#basic-jest-commands)
- [Specific Test Commands](#specific-test-commands)
- [Advanced Jest Options](#advanced-jest-options)
- [Test Categories](#test-categories)
- [Development Workflows](#development-workflows)
- [CI/CD Commands](#cicd-commands)
- [Debugging Tests](#debugging-tests)
- [Coverage Reports](#coverage-reports)
- [Performance Testing](#performance-testing)
- [Best Practices](#best-practices)

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (for development)
npm run test:watch
```

## Basic Jest Commands

### Run All Tests

```bash
# Run all tests once
npm test

# Alternative using npx
npx jest

# Run with npm script
npm run test
```

### Watch Mode

```bash
# Watch for file changes and re-run tests
npm run test:watch

# Alternative
npx jest --watch

# Watch all files (not just tracked by git)
npx jest --watchAll
```

### Coverage Reports

```bash
# Generate test coverage report
npm run test:coverage

# Alternative
npx jest --coverage

# Coverage with HTML report
npx jest --coverage --coverageReporters=html
```

## Specific Test Commands

### Run Individual Test Files

```bash
# Run a specific test file
npm test -- PasswordService.test.ts
npx jest PasswordService.test.ts

# Run multiple specific files
npm test -- PasswordService.test.ts TokenService.test.ts
npx jest PasswordService.test.ts TokenService.test.ts

# Run test file with full path
npm test -- src/services/__tests__/PasswordService.test.ts
```

### Run Tests by Pattern

```bash
# Run all tests matching a pattern
npm test -- --testNamePattern="password"
npx jest --testNamePattern="password"

# Run tests in specific directory
npm test -- src/services
npx jest src/services

# Run tests matching file pattern
npm test -- --testPathPattern="auth"
npx jest --testPathPattern="auth"

# Run tests with multiple patterns
npm test -- --testPathPattern="auth|user"
```

### Run Tests by Suite/Describe Block

```bash
# Run specific test suite
npm test -- --testNamePattern="Authentication"

# Run specific test within suite
npm test -- --testNamePattern="should hash passwords"

# Run multiple test patterns
npm test -- --testNamePattern="password|token"
```

## Advanced Jest Options

### Verbose Output

```bash
# Show detailed test results
npm test -- --verbose
npx jest --verbose

# Show test names and results
npm test -- --verbose --reporters=default
```

### Parallel Execution

```bash
# Run tests serially (one at a time)
npm test -- --runInBand
npx jest --runInBand

# Set max worker processes
npm test -- --maxWorkers=4
npx jest --maxWorkers=4

# Use half of available cores
npm test -- --maxWorkers=50%
```

### Output Control

```bash
# Silent mode (minimal output)
npm test -- --silent

# Show only failed tests
npm test -- --onlyFailures

# Show test results in JSON format
npm test -- --json

# No coverage output
npm test -- --coverage --silent
```

### Test Selection

```bash
# Run only changed files (with git)
npm test -- --onlyChanged

# Run tests related to changed files
npm test -- --changedFilesWithAncestor

# Skip tests matching pattern
npm test -- --testPathIgnorePatterns="integration"

# Run tests that match changed files since specific commit
npm test -- --changedSince=HEAD~1
```

## Test Categories

### 1. Unit Tests

#### Service Layer Tests

```bash
# Password service tests
npm test -- src/services/__tests__/PasswordService.test.ts

# Token service tests
npm test -- src/services/__tests__/TokenService.test.ts

# Authentication service tests
npm test -- src/services/__tests__/AuthenticationService.test.ts

# All service tests
npm test -- src/services/__tests__/
```

#### Repository Layer Tests

```bash
# User repository tests
npm test -- src/repositories/__tests__/UserRepository.test.ts

# All repository tests
npm test -- src/repositories/__tests__/
```

#### Validation Tests

```bash
# Schema validation tests
npm test -- src/validation/__tests__/schemas.test.ts

# All validation tests
npm test -- src/validation/__tests__/
```

#### Error Handling Tests

```bash
# Custom error tests
npm test -- src/errors/__tests__/AuthErrors.test.ts

# All error tests
npm test -- src/errors/__tests__/
```

### 2. Middleware Tests

```bash
# Authentication middleware tests
npm test -- src/middleware/__tests__/auth.test.ts

# WebSocket authentication tests
npm test -- src/middleware/__tests__/websocketAuth.test.ts

# Security middleware tests
npm test -- src/middleware/__tests__/security.test.ts

# All middleware tests
npm test -- src/middleware/__tests__/
```

### 3. API Route Tests

```bash
# Authentication routes tests
npm test -- src/routes/__tests__/auth.test.ts

# User management routes tests
npm test -- src/routes/__tests__/users.test.ts

# All route tests
npm test -- src/routes/__tests__/
```

### 4. Integration Tests

```bash
# Full integration tests
npm test -- src/test/integration.test.ts

# Integration tests with verbose output
npm test -- src/test/integration.test.ts --verbose
```

### 5. Security Tests

```bash
# Security-focused tests
npm test -- src/test/security.test.ts

# Security tests with coverage
npm test -- src/test/security.test.ts --coverage
```

### 6. Performance Tests

```bash
# Performance benchmarks
npm test -- src/test/performance.test.ts

# Performance tests with detailed output
npm test -- src/test/performance.test.ts --verbose
```

## Development Workflows

### During Feature Development

```bash
# Watch specific feature tests
npm test -- --watch --testPathPattern="auth"

# Watch and run only changed tests
npm test -- --watch --onlyChanged

# Watch with coverage for specific files
npm test -- --watch --coverage --collectCoverageFrom="src/services/AuthenticationService.ts"
```

### Before Committing

```bash
# Run all tests with coverage
npm run test:coverage

# Run tests for changed files only
npm test -- --onlyChanged

# Run tests with lint-like output
npm test -- --verbose --coverage
```

### Code Review Testing

```bash
# Test specific PR changes
npm test -- --changedSince=main

# Run full test suite
npm test -- --coverage --verbose

# Check test performance
npm test -- src/test/performance.test.ts
```

## CI/CD Commands

### Continuous Integration

```bash
# Full test suite for CI (no watch, with coverage)
npm test -- --coverage --watchAll=false --passWithNoTests

# CI with JUnit reporter
npm test -- --reporters=default --reporters=jest-junit

# CI with multiple reporters
npm test -- --reporters=default --reporters=jest-junit --reporters=jest-html-reporters

# Fail fast on first test failure
npm test -- --bail

# Set timeout for CI environment
npm test -- --testTimeout=30000
```

### Coverage Thresholds

```bash
# Enforce coverage thresholds
npm test -- --coverage --coverageThreshold='{"global":{"branches":80,"functions":80,"lines":80,"statements":80}}'

# Coverage with specific file patterns
npm test -- --coverage --collectCoverageFrom="src/**/*.ts" --collectCoverageFrom="!src/**/*.test.ts"

# Coverage excluding specific directories
npm test -- --coverage --collectCoverageFrom="src/**/*.ts" --collectCoverageFrom="!src/test/**"
```

## Debugging Tests

### Debug Mode

```bash
# Run tests with debugging
npm test -- --detectOpenHandles

# Debug with Node.js inspector
node --inspect-brk node_modules/.bin/jest --runInBand

# Debug specific test file
node --inspect-brk node_modules/.bin/jest --runInBand src/services/__tests__/PasswordService.test.ts
```

### Troubleshooting

```bash
# Detect open handles (async operations not closed)
npm test -- --detectOpenHandles

# Force exit after tests
npm test -- --forceExit

# Clear Jest cache
npx jest --clearCache

# Run with maximum logging
npm test -- --verbose --detectOpenHandles
```

### Memory and Performance Debugging

```bash
# Run with memory leak detection
npm test -- --detectLeaks

# Expose garbage collection
npm test -- --expose-gc

# Log heap usage
npm test -- --logHeapUsage
```

## Coverage Reports

### Basic Coverage

```bash
# Generate coverage report
npm run test:coverage

# Coverage with HTML report
npm test -- --coverage --coverageReporters=html

# Coverage with multiple formats
npm test -- --coverage --coverageReporters=html --coverageReporters=text --coverageReporters=lcov
```

### Advanced Coverage

```bash
# Coverage for specific directories
npm test -- --coverage --collectCoverageFrom="src/services/**/*.ts"

# Coverage excluding test files
npm test -- --coverage --collectCoverageFrom="src/**/*.ts" --collectCoverageFrom="!src/**/*.test.ts"

# Coverage with threshold enforcement
npm test -- --coverage --coverageThreshold='{"global":{"branches":90,"functions":90,"lines":90,"statements":90}}'

# Coverage for changed files only
npm test -- --coverage --onlyChanged
```

### Coverage Output Locations

```bash
# Default coverage directory: coverage/
# HTML report: coverage/lcov-report/index.html
# LCOV report: coverage/lcov.info
# Text summary: displayed in terminal
```

## Performance Testing

### Benchmark Tests

```bash
# Run performance tests
npm test -- src/test/performance.test.ts

# Performance tests with timing details
npm test -- src/test/performance.test.ts --verbose

# Performance tests with memory profiling
npm test -- src/test/performance.test.ts --logHeapUsage
```

### Load Testing

```bash
# Run security tests (includes performance aspects)
npm test -- src/test/security.test.ts

# Integration tests (includes performance validation)
npm test -- src/test/integration.test.ts
```

## Environment Control

### Environment Variables

```bash
# Set Node environment
NODE_ENV=test npm test

# Set custom JWT secrets for testing
JWT_SECRET=test-secret JWT_REFRESH_SECRET=test-refresh npm test

# Set database URL for testing
DATABASE_URL="postgresql://test:test@localhost:5432/test_db" npm test

# Multiple environment variables
NODE_ENV=test JWT_SECRET=test-secret npm test
```

### Test Configuration

```bash
# Run with specific Jest config
npm test -- --config=jest.config.js

# Override test timeout
npm test -- --testTimeout=10000

# Set max workers based on environment
npm test -- --maxWorkers=$(nproc)
```

## Best Practices

### Daily Development

```bash
# Start development with watch mode
npm run test:watch

# Quick test run for specific feature
npm test -- --testPathPattern="auth" --watch

# Pre-commit testing
npm test -- --onlyChanged --coverage
```

### Code Quality Checks

```bash
# Full test suite with coverage
npm run test:coverage

# Security-focused testing
npm test -- src/test/security.test.ts --verbose

# Performance validation
npm test -- src/test/performance.test.ts
```

### Debugging Workflow

```bash
# 1. Run failing test in isolation
npm test -- --testNamePattern="specific failing test"

# 2. Add verbose output
npm test -- --testNamePattern="specific failing test" --verbose

# 3. Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand --testNamePattern="specific failing test"
```

## Test File Structure

```
src/
├── services/__tests__/           # Service layer unit tests
├── repositories/__tests__/       # Repository layer unit tests
├── middleware/__tests__/         # Middleware unit tests
├── routes/__tests__/             # API route integration tests
├── validation/__tests__/         # Validation schema tests
├── errors/__tests__/             # Error handling tests
└── test/                         # System-wide tests
    ├── integration.test.ts       # Full integration tests
    ├── security.test.ts          # Security-focused tests
    ├── performance.test.ts       # Performance benchmarks
    └── factories.ts              # Test utilities and factories
```

## Common Test Patterns

### Running Test Suites by Category

```bash
# All unit tests
npm test -- src/services src/repositories src/middleware src/validation src/errors

# All integration tests
npm test -- src/routes src/test/integration.test.ts

# All security tests
npm test -- src/test/security.test.ts src/middleware/__tests__/security.test.ts

# All performance tests
npm test -- src/test/performance.test.ts
```

### Continuous Testing During Development

```bash
# Watch mode with coverage for current work
npm test -- --watch --coverage --collectCoverageFrom="src/services/AuthenticationService.ts"

# Watch mode for specific feature area
npm test -- --watch --testPathPattern="auth|user"

# Watch mode with verbose output
npm test -- --watch --verbose --testNamePattern="password"
```

This comprehensive testing guide covers all aspects of testing the authentication system. Use these commands based on your specific testing needs, whether for development, debugging, or CI/CD pipelines.
