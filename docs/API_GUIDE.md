# API Documentation - WebSocket Chat Application

## Base URL

```
http://localhost:3000
```

## Overview

This API provides authentication and user management functionality for a WebSocket-based chat application. All endpoints return JSON responses with a consistent structure.

## Response Format

All API responses follow this structure:

### Success Response

```json
{
  "success": true,
  "data": {
    /* response data */
  },
  "message": "Operation successful"
}
```

### Error Response

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

## Authentication

Most endpoints require authentication using JWT tokens. Include the access token in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

## Endpoints

### Health Check

#### GET /health

Check if the API is running.

**Request:**

```bash
curl -X GET http://localhost:3000/health
```

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

---

## Authentication Endpoints

### Register User

#### POST /api/auth/register

Create a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Password Requirements:**

- At least 8 characters long
- Contains uppercase and lowercase letters
- Contains at least one number
- Contains at least one special character
- No repeated characters (more than 2 in a row)
- No common patterns (123, abc, password, etc.)

**Postman Example:**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "MySecure123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "createdAt": "2025-01-20T10:30:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "refresh_token_here"
    }
  },
  "message": "User registered successfully"
}
```

**Error Responses:**

- `409` - Email already exists
- `400` - Weak password or validation error

---

### Login User

#### POST /api/auth/login

Authenticate a user and receive tokens.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Postman Example:**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "MySecure123!"
  }'
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "refresh_token_here"
    }
  },
  "message": "Login successful"
}
```

**Error Responses:**

- `401` - Invalid credentials
- `403` - Account deactivated

---

### Refresh Tokens

#### POST /api/auth/refresh

Get new access and refresh tokens using a valid refresh token.

**Request Body:**

```json
{
  "refreshToken": "your_refresh_token_here"
}
```

**Postman Example:**

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "refresh_token_here"
  }'
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "new_access_token",
      "refreshToken": "new_refresh_token"
    }
  },
  "message": "Tokens refreshed successfully"
}
```

---

### Logout

#### POST /api/auth/logout

Logout from current session (invalidates refresh token).

**Request Body:**

```json
{
  "refreshToken": "your_refresh_token_here"
}
```

**Postman Example:**

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "refresh_token_here"
  }'
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Logout All Devices

#### POST /api/auth/logout-all

Logout from all devices (requires authentication).

**Headers:**

```
Authorization: Bearer <access_token>
```

**Postman Example:**

```bash
curl -X POST http://localhost:3000/api/auth/logout-all \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Logged out from all devices successfully"
}
```

---

### Get Current User Info

#### GET /api/auth/me

Get information about the currently authenticated user.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Postman Example:**

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "createdAt": "2025-01-20T10:30:00.000Z"
    }
  },
  "message": "User information retrieved successfully"
}
```

---

## User Management Endpoints

### Get User Profile

#### GET /api/users/profile

Get the current user's profile (requires authentication).

**Headers:**

```
Authorization: Bearer <access_token>
```

**Postman Example:**

```bash
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "createdAt": "2025-01-20T10:30:00.000Z",
      "updatedAt": "2025-01-20T10:30:00.000Z"
    }
  },
  "message": "Profile retrieved successfully"
}
```

---

### Update User Profile

#### PUT /api/users/profile

Update the current user's profile (requires authentication).

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com"
}
```

**Postman Example:**

```bash
curl -X PUT http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith"
  }'
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "john.doe@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "updatedAt": "2025-01-20T11:00:00.000Z"
    }
  },
  "message": "Profile updated successfully"
}
```

---

### Change Password

#### PUT /api/users/password

Change the current user's password (requires authentication).

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewSecurePass456!"
}
```

**Postman Example:**

```bash
curl -X PUT http://localhost:3000/api/users/password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "MySecure123!",
    "newPassword": "NewSecure456!"
  }'
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Responses:**

- `400` - Incorrect current password or weak new password

---

### Delete Account

#### DELETE /api/users/account

Delete the current user's account (requires authentication).

**Headers:**

```
Authorization: Bearer <access_token>
```

**Postman Example:**

```bash
curl -X DELETE http://localhost:3000/api/users/account \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

---

### Get User by ID

#### GET /api/users/:id

Get public information about a user by their ID.

**Postman Example:**

```bash
curl -X GET http://localhost:3000/api/users/user_123
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "firstName": "John",
      "lastName": "Doe",
      "createdAt": "2025-01-20T10:30:00.000Z"
    }
  },
  "message": "User information retrieved successfully"
}
```

---

## Protected Route Example

#### GET /api/protected

Example of a protected route that requires authentication.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Postman Example:**

```bash
curl -X GET http://localhost:3000/api/protected \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "This is a protected route",
  "user": {
    "id": "user_123",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

---

## WebSocket Connection

### Connection URL

```
ws://localhost:3000
```

### Authentication

WebSocket connections require authentication. Include the access token in the connection:

**JavaScript Example:**

```javascript
const socket = io("http://localhost:3000", {
  auth: {
    token: "your_access_token_here",
  },
});
```

### WebSocket Events

#### Chat Messages

```javascript
// Send a message
socket.emit("chat:message", {
  message: "Hello everyone!",
  room: "general", // optional
});

// Listen for messages
socket.on("chat:message", (data) => {
  console.log("New message:", data);
});
```

#### Join/Leave Rooms

```javascript
// Join a room
socket.emit("chat:join", { room: "general" });

// Leave a room
socket.emit("chat:leave", { room: "general" });
```

#### Private Messages

```javascript
// Send private message
socket.emit("chat:private", {
  recipientId: "user_456",
  message: "Hello there!",
});

// Listen for private messages
socket.on("chat:private", (data) => {
  console.log("Private message:", data);
});
```

---

## Error Codes

| Code                    | Description                                 |
| ----------------------- | ------------------------------------------- |
| `EMAIL_ALREADY_EXISTS`  | Email address is already registered         |
| `WEAK_PASSWORD`         | Password doesn't meet security requirements |
| `INVALID_CREDENTIALS`   | Email or password is incorrect              |
| `ACCOUNT_DEACTIVATED`   | User account has been deactivated           |
| `INVALID_REFRESH_TOKEN` | Refresh token is invalid or expired         |
| `UNAUTHORIZED`          | Authentication required                     |
| `ACCESS_DENIED`         | Insufficient permissions                    |
| `USER_NOT_FOUND`        | User does not exist                         |
| `VALIDATION_ERROR`      | Request data validation failed              |

---

## Postman Collection Setup

### Environment Variables

Create a Postman environment with these variables:

- `base_url`: `http://localhost:3000`
- `access_token`: (will be set automatically after login)
- `refresh_token`: (will be set automatically after login)

### Pre-request Script for Authentication

Add this to requests that need authentication:

```javascript
pm.request.headers.add({
  key: "Authorization",
  value: "Bearer " + pm.environment.get("access_token"),
});
```

### Post-response Script for Login/Register

Add this to login and register requests to save tokens:

```javascript
if (pm.response.code === 200 || pm.response.code === 201) {
  const response = pm.response.json();
  if (response.data && response.data.tokens) {
    pm.environment.set("access_token", response.data.tokens.accessToken);
    pm.environment.set("refresh_token", response.data.tokens.refreshToken);
  }
}
```

---

## Testing with curl

### Complete Authentication Flow

1. **Register a new user:**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

2. **Login (save the tokens from response):**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

3. **Use protected endpoints:**

```bash
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

---

## Rate Limiting

The API includes rate limiting to prevent abuse. If you exceed the rate limit, you'll receive a `429 Too Many Requests` response.

## CORS

The API supports CORS for web applications. By default, it allows requests from `http://localhost:3000`. Configure the `ALLOWED_ORIGINS` environment variable to add more origins.

## Environment Variables

Create a `.env` file with these variables:

```env
PORT=3000
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
DATABASE_URL="your-database-connection-string"
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```
