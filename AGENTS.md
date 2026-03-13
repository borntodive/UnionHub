# CISL UnionConnect - Agent Guide

## Project Overview

CISL UnionConnect is a union management platform for airline workers, consisting of:

- **Backend**: NestJS 11 + TypeORM 0.3 + PostgreSQL (port 3000)
- **Frontend**: Expo 52 + React Native 0.76 (port 8081)

## Quick Start

### Backend (api/)

```bash
cd api
npm install

# Database setup (requires PostgreSQL running)
npm run migration:run
npm run seed

# Start development server
npm run start:dev
```

API Base URL: `http://localhost:3000/api/v1`

Default SuperAdmin credentials:
- Crewcode: `SUPERADMIN`
- Password: `changeme` (must change on first login)

### Frontend (app/)

```bash
cd app
npm install

# Start Expo development server
npx expo start

# Or run directly on platform
npx expo start --android
npx expo start --ios
```

## Project Structure

```
/
├── api/                    # NestJS backend
│   ├── src/
│   │   ├── auth/          # Authentication module
│   │   ├── users/         # Users CRUD
│   │   ├── bases/         # Bases CRUD
│   │   ├── contracts/     # Contracts CRUD
│   │   ├── grades/        # Grades/Qualifications CRUD
│   │   ├── database/      # Migrations & seeds
│   │   └── config/        # Configuration
│   └── test/              # E2E tests
│
├── app/                    # Expo React Native frontend
│   ├── src/
│   │   ├── api/           # API client & services
│   │   ├── components/    # Reusable UI components
│   │   ├── navigation/    # React Navigation setup
│   │   ├── providers/     # Context providers
│   │   ├── screens/       # Screen components
│   │   ├── store/         # Zustand state management
│   │   ├── theme/         # Colors, typography, spacing
│   │   └── types/         # TypeScript types
│   └── App.tsx            # App entry point
│
└── docs/                   # Project documentation
```

## Tech Stack

### Backend
- **Framework**: NestJS 11
- **ORM**: TypeORM 0.3.x
- **Database**: PostgreSQL 15+
- **Auth**: JWT (access + refresh tokens)
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI at `/api/docs`

### Frontend
- **Framework**: Expo 52 + React Native 0.76
- **State**: Zustand (client), TanStack Query (server)
- **Navigation**: React Navigation v6
- **Styling**: StyleSheet (no external UI library)
- **Icons**: lucide-react-native
- **Storage**: AsyncStorage (Zustand persist)

## Brand Colors

```typescript
const colors = {
  primary: '#177246',      // CISL Green
  primaryDark: '#0f5735',
  secondary: '#DA0E32',    // CISL Red
  secondaryDark: '#b00b29',
  background: '#f5f5f5',
  surface: '#ffffff',
  text: '#1a1a1a',
  textSecondary: '#666666',
  success: '#22c55e',
  error: '#ef4444',
};
```

## API Endpoints

### Authentication
- `POST /auth/login` - Login with crewcode/password
- `POST /auth/logout` - Logout (requires refresh token)
- `POST /auth/refresh` - Refresh access token
- `POST /auth/change-password` - Change password

### Users
- `GET /users` - List users (role-scoped)
- `GET /users/me` - Get current user
- `PATCH /users/me` - Update current user
- `GET /users/:id` - Get user by ID
- `POST /users` - Create user (Admin+)
- `PATCH /users/:id` - Update user (Admin+)
- `DELETE /users/:id` - Delete user (Admin+)

### Reference Data
- `GET /bases` - List bases
- `GET /contracts` - List contracts
- `GET /grades` - List grades

## Auth Flow

1. User logs in with `crewcode` + `password`
2. Server returns `accessToken` (15min) + `refreshToken` (30 days)
3. Client stores tokens in AsyncStorage via Zustand persist
4. Axios interceptor adds `Authorization: Bearer <token>` header
5. On 401, client attempts token refresh automatically
6. On refresh failure, user is logged out

## Database Schema

### Tables
- `users` - Unified auth + member data
- `bases` - Operational bases (FCO, MXP, etc.)
- `contracts` - Contract types
- `grades` - Professional grades/qualifications
- `refresh_tokens` - Token blacklisting

### Key Fields (users table)
- `crewcode` - Unique identifier (login)
- `password` - Hashed password
- `role` - superadmin | admin | user
- `ruolo` - pilot | cabin_crew
- `must_change_password` - Force password change flag
- `note`, `itud`, `rsa` - Union-specific fields

## State Management

### Zustand (authStore.ts)
```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (data) => void;
  logout: () => void;
}
```

### TanStack Query
- Server state caching
- Automatic refetching
- Mutation handling

## Development Guidelines

### Backend
- Use migrations for schema changes (`npm run migration:generate`)
- NEVER enable `synchronize: true` in production
- All endpoints require JWT except `/auth/login`
- Role scoping: Admin only sees same `ruolo` users

### Frontend
- Use React Hook Form for forms
- Follow existing component patterns
- Use theme constants for colors/spacing
- Keep screens in separate directories
- Export components from index files

## Testing

```bash
# Backend E2E tests
cd api && npm run test:e2e

# Frontend (Expo Go)
cd app && npx expo start
```

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running
- Verify `.env` configuration
- Check port 3000 is free: `lsof -ti:3000 | xargs kill -9`

### Frontend issues
- Clear cache: `npx expo start --clear`
- Reset bundler: `npx expo start --reset-cache`
- Metro config issues: Check `metro.config.js`

### Database issues
- Reset database: `dropdb unionconnect && createdb unionconnect`
- Re-run migrations: `npm run migration:run`
- Re-seed: `npm run seed`

## Environment Variables

### Backend (.env)
```
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=unionconnect

# JWT
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=30d

# Server
PORT=3000
```

### Frontend
No .env file needed for local development (uses localhost:3000).
