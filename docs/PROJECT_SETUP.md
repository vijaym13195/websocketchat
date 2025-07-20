# Project Setup Guide

## Prerequisites

Before setting up this project, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **PostgreSQL** database server
- **Git** for version control

## Initial Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd <project-directory>
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit the `.env` file with your specific configuration:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="24h"

# Server Configuration
PORT=3000
NODE_ENV="development"

# Security
BCRYPT_ROUNDS=12
```

### 4. Database Setup

#### Initialize Prisma

```bash
npx prisma generate
```

#### Run Database Migrations

```bash
npx prisma migrate dev
```

#### (Optional) Seed the Database

If you have seed data:

```bash
npx prisma db seed
```

### 5. Verify Installation

Run the development server to ensure everything is working:

```bash
npm run dev
```

The server should start on `http://localhost:3000` (or your configured PORT).

## Development Workflow

### Starting the Development Server

```bash
npm run dev
```

This uses nodemon to automatically restart the server when files change.

### Building for Production

```bash
npm run build
```

### Running in Production

```bash
npm start
```

## Database Management

### View Database in Prisma Studio

```bash
npx prisma studio
```

### Reset Database (Development Only)

```bash
npx prisma migrate reset
```

### Generate Prisma Client After Schema Changes

```bash
npx prisma generate
```

## Project Structure

```
├── src/
│   ├── errors/          # Custom error classes
│   ├── middleware/      # Express middleware
│   ├── repositories/    # Data access layer
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic
│   ├── test/           # Test utilities and integration tests
│   ├── validation/     # Input validation schemas
│   └── server.ts       # Main server file
├── prisma/
│   ├── migrations/     # Database migrations
│   └── schema.prisma   # Database schema
├── docs/              # Documentation
└── examples/          # Usage examples
```

## Common Issues

### Database Connection Issues

- Ensure PostgreSQL is running
- Verify DATABASE_URL in `.env` file
- Check database credentials and permissions

### Port Already in Use

- Change the PORT in your `.env` file
- Or kill the process using the port: `lsof -ti:3000 | xargs kill`

### Prisma Client Issues

- Regenerate the client: `npx prisma generate`
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
