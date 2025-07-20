# WebSocket Chat with Authentication

A complete authentication system for a WebSocket chat application built with Node.js, TypeScript, Express, Socket.IO, and Prisma.

## Features

### Authentication

- ✅ User registration with email and password
- ✅ Secure password hashing with bcrypt (12+ rounds)
- ✅ JWT-based authentication with access and refresh tokens
- ✅ Token rotation for enhanced security
- ✅ Password strength validation
- ✅ Account management (profile updates, password changes)

### Security

- ✅ Rate limiting on authentication endpoints
- ✅ Input sanitization and validation with Zod
- ✅ Security headers (CORS, CSP, HSTS, etc.)
- ✅ Protection against common attacks (XSS, SQL injection, etc.)
- ✅ Comprehensive error handling without information leakage

### WebSocket Features

- ✅ Authenticated WebSocket connections
- ✅ Real-time chat messaging
- ✅ Room-based chat
- ✅ Private messaging
- ✅ Typing indicators
- ✅ User status updates
- ✅ Public chat (optional authentication)

### Testing

- ✅ Comprehensive unit tests
- ✅ Integration tests
- ✅ Security tests
- ✅ Performance tests
- ✅ 95%+ test coverage

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **WebSocket**: Socket.IO
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with bcrypt
- **Validation**: Zod
- **Testing**: Jest with Supertest
- **Security**: Helmet, CORS, Rate limiting

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone and install dependencies**

   ```bash
   git clone <repository-url>
   cd websocketchat
   npm install
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:

   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/websocketchat"
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-in-production"
   PORT=3000
   NODE_ENV="development"
   ```

3. **Set up the database**

   ```bash
   npm run db:push
   npm run db:generate
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Open the example client**

   Open `examples/client.html` in your browser or serve it from a local server.

## API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint      | Description             | Auth Required |
| ------ | ------------- | ----------------------- | ------------- |
| POST   | `/register`   | Register new user       | No            |
| POST   | `/login`      | User login              | No            |
| POST   | `/refresh`    | Refresh access token    | No            |
| POST   | `/logout`     | Logout user             | No            |
| POST   | `/logout-all` | Logout from all devices | Yes           |
| GET    | `/me`         | Get current user info   | Yes           |

### User Management Routes (`/api/users`)

| Method | Endpoint    | Description          | Auth Required |
| ------ | ----------- | -------------------- | ------------- |
| GET    | `/profile`  | Get user profile     | Yes           |
| PUT    | `/profile`  | Update user profile  | Yes           |
| PUT    | `/password` | Change password      | Yes           |
| DELETE | `/account`  | Delete account       | Yes           |
| GET    | `/:id`      | Get public user info | No            |

### Example Requests

**Register a new user:**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "StrongPassword123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Login:**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "StrongPassword123!"
  }'
```

**Access protected route:**

```bash
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## WebSocket Events

### Client to Server

| Event          | Description           | Auth Required | Data                       |
| -------------- | --------------------- | ------------- | -------------------------- |
| `chat:message` | Send chat message     | Yes           | `{ message, room? }`       |
| `chat:join`    | Join chat room        | Yes           | `{ room }`                 |
| `chat:leave`   | Leave chat room       | Yes           | `{ room }`                 |
| `chat:typing`  | Send typing indicator | Yes           | `{ room?, isTyping }`      |
| `chat:private` | Send private message  | Yes           | `{ recipientId, message }` |
| `user:status`  | Update user status    | Yes           | `{ status }`               |

### Server to Client

| Event               | Description               | Data                                 |
| ------------------- | ------------------------- | ------------------------------------ |
| `chat:message`      | Receive chat message      | `{ id, message, user, timestamp }`   |
| `chat:message:sent` | Message sent confirmation | `{ id, timestamp }`                  |
| `chat:joined`       | Room joined confirmation  | `{ room }`                           |
| `chat:left`         | Room left confirmation    | `{ room }`                           |
| `chat:user:joined`  | User joined room          | `{ user, room }`                     |
| `chat:user:left`    | User left room            | `{ user, room }`                     |
| `chat:typing`       | Typing indicator          | `{ user, isTyping }`                 |
| `chat:private`      | Private message received  | `{ id, message, sender, timestamp }` |
| `user:status`       | User status update        | `{ user, status }`                   |
| `error`             | Error message             | `{ code, message }`                  |

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- PasswordService.test.ts
```

### Database Operations

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes to database
npm run db:push

# Create and run migrations
npm run db:migrate

# Open Prisma Studio
npm run db:studio
```

### Building for Production

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## Security Considerations

### Password Security

- Passwords are hashed using bcrypt with 12+ rounds
- Password strength validation enforced
- Secure password reset flow (when implemented)

### Token Security

- Short-lived access tokens (15 minutes)
- Refresh token rotation on each use
- Secure token storage recommendations
- Token revocation capabilities

### API Security

- Rate limiting on authentication endpoints
- CORS configuration for cross-origin requests
- Request size limits and input sanitization
- Security headers (CSP, HSTS, etc.)

### WebSocket Security

- Token-based authentication for WebSocket connections
- Input validation for all WebSocket events
- Rate limiting for WebSocket events
- Proper error handling without information leakage

## Environment Variables

| Variable                  | Description                  | Default                 | Required |
| ------------------------- | ---------------------------- | ----------------------- | -------- |
| `DATABASE_URL`            | PostgreSQL connection string | -                       | Yes      |
| `JWT_SECRET`              | JWT signing secret           | -                       | Yes      |
| `JWT_REFRESH_SECRET`      | Refresh token signing secret | -                       | Yes      |
| `JWT_ACCESS_EXPIRES_IN`   | Access token expiry          | `15m`                   | No       |
| `JWT_REFRESH_EXPIRES_IN`  | Refresh token expiry         | `7d`                    | No       |
| `PORT`                    | Server port                  | `3000`                  | No       |
| `NODE_ENV`                | Environment                  | `development`           | No       |
| `BCRYPT_ROUNDS`           | Bcrypt hashing rounds        | `12`                    | No       |
| `ALLOWED_ORIGINS`         | CORS allowed origins         | `http://localhost:3000` | No       |
| `RATE_LIMIT_WINDOW_MS`    | Rate limit window            | `900000`                | No       |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window      | `5`                     | No       |

## Project Structure

```
src/
├── errors/              # Custom error classes
├── middleware/          # Express and Socket.IO middleware
├── repositories/        # Data access layer
├── routes/             # API route handlers
├── services/           # Business logic layer
├── test/               # Test utilities and factories
├── validation/         # Input validation schemas
└── server.ts           # Main application entry point

examples/
└── client.html         # Example WebSocket client

prisma/
├── schema.prisma       # Database schema
└── migrations/         # Database migrations
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For questions or issues, please open a GitHub issue or contact the development team.
