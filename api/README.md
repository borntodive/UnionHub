# UnionHub Backend API

Backend API for UnionHub - CISL Aviation Union Member Management System.

## Stack

- **Framework:** NestJS 11.x
- **Language:** TypeScript 5.x
- **Database:** PostgreSQL 15+
- **ORM:** TypeORM 0.3.x
- **Authentication:** JWT (Access + Refresh tokens)
- **Password Hashing:** bcrypt
- **Validation:** class-validator

## Architecture

### Project Structure

```
src/
├── auth/                    # Authentication module
│   ├── dto/                 # Data Transfer Objects
│   ├── guards/              # JWT and Roles guards
│   ├── strategies/          # Passport JWT strategy
│   ├── auth.controller.ts   # Auth endpoints
│   ├── auth.service.ts      # Auth business logic
│   └── auth.module.ts       # Auth module definition
├── users/                   # Users/Members module
│   ├── dto/
│   ├── entities/
│   │   └── user.entity.ts   # Unified User=Member entity
│   ├── users.controller.ts
│   ├── users.service.ts     # With role scoping
│   └── users.module.ts
├── bases/                   # Airport bases CRUD
├── contracts/               # Employment contracts CRUD
├── grades/                  # Professional grades CRUD
├── refresh-tokens/          # Refresh token entity
├── common/                  # Shared resources
│   ├── enums/               # UserRole, Ruolo enums
│   └── decorators/          # @Roles() decorator
├── config/                  # Configuration files
│   └── database.config.ts
├── database/
│   ├── migrations/
│   └── seeds/               # Initial data seeding
├── app.module.ts
└── main.ts
```

### Key Features

1. **Single User=Member Table**: Unified table for authentication and member data
2. **Role-Based Access Control**:
   - SuperAdmin: Full access
   - Admin: Scoped to own professional role (pilot/cabin_crew)
   - User: Own profile only
3. **JWT Authentication**:
   - Access tokens (15 min)
   - Refresh tokens (30 days)
   - Secure token rotation
4. **Admin Scoping**: Admins see only members of their own professional role

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations (if not using synchronize)
npm run migration:run

# Seed initial data
npm run seed

# Start development server
npm run start:dev
```

### Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=unionconnect

# JWT
JWT_SECRET=your-super-secret-key
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=30d

# Default Admin
DEFAULT_ADMIN_CREWCODE=SUPERADMIN
DEFAULT_ADMIN_PASSWORD=changeme

# Server
PORT=3000
NODE_ENV=development
```

## API Endpoints

### Authentication

| Method | Endpoint                             | Description                         | Auth   |
| ------ | ------------------------------------ | ----------------------------------- | ------ |
| POST   | `/api/v1/auth/login`                 | Login with crewcode + password      | Public |
| POST   | `/api/v1/auth/refresh`               | Refresh access token                | Public |
| POST   | `/api/v1/auth/logout`                | Logout (revoke refresh token)       | JWT    |
| POST   | `/api/v1/auth/logout-all`            | Logout from all devices             | JWT    |
| POST   | `/api/v1/auth/change-password`       | Change password                     | JWT    |
| POST   | `/api/v1/auth/force-change-password` | Force password change (first login) | JWT    |
| GET    | `/api/v1/auth/me`                    | Get current user profile            | JWT    |

### Users (Members)

| Method | Endpoint               | Description                 | Roles                   |
| ------ | ---------------------- | --------------------------- | ----------------------- |
| GET    | `/api/v1/users`        | List users (scoped by role) | Admin, SuperAdmin       |
| GET    | `/api/v1/users/:id`    | Get user by ID              | Any (with restrictions) |
| POST   | `/api/v1/users`        | Create new member           | Admin, SuperAdmin       |
| PUT    | `/api/v1/users/:id`    | Update member               | Admin, SuperAdmin       |
| DELETE | `/api/v1/users/:id`    | Deactivate member           | Admin, SuperAdmin       |
| GET    | `/api/v1/users/recent` | Get recently added users    | Admin, SuperAdmin       |

### Bases (SuperAdmin only)

| Method | Endpoint            | Description    |
| ------ | ------------------- | -------------- |
| GET    | `/api/v1/bases`     | List all bases |
| GET    | `/api/v1/bases/:id` | Get base by ID |
| POST   | `/api/v1/bases`     | Create base    |
| PUT    | `/api/v1/bases/:id` | Update base    |
| DELETE | `/api/v1/bases/:id` | Delete base    |

### Contracts (SuperAdmin only)

| Method | Endpoint                | Description        |
| ------ | ----------------------- | ------------------ |
| GET    | `/api/v1/contracts`     | List all contracts |
| POST   | `/api/v1/contracts`     | Create contract    |
| PUT    | `/api/v1/contracts/:id` | Update contract    |
| DELETE | `/api/v1/contracts/:id` | Delete contract    |

### Grades

| Method | Endpoint             | Description                   | Roles      |
| ------ | -------------------- | ----------------------------- | ---------- |
| GET    | `/api/v1/grades`     | List grades (filter by ruolo) | Any        |
| POST   | `/api/v1/grades`     | Create grade                  | SuperAdmin |
| PUT    | `/api/v1/grades/:id` | Update grade                  | SuperAdmin |
| DELETE | `/api/v1/grades/:id` | Delete grade                  | SuperAdmin |

## Authentication Flow

### Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "crewcode": "SUPERADMIN",
    "password": "changeme"
  }'
```

Response:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900,
  "user": {
    "id": "...",
    "crewcode": "SUPERADMIN",
    "role": "superadmin",
    "nome": "Super",
    "cognome": "Admin",
    "mustChangePassword": true
  }
}
```

### Using Access Token

```bash
curl http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Refresh Token

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }'
```

## Default Data

After running `npm run seed`, the following data is created:

### Bases

- FCO - Roma Fiumicino
- MXP - Milano Malpensa
- VCE - Venezia Marco Polo
- NAP - Napoli Capodichino
- BLQ - Bologna Guglielmo Marconi
- CTA - Catania Fontanarossa

### Contracts

- AZ-PI - ITA Airways - Pilots
- AZ-CC - ITA Airways - Cabin Crew
- RY-PI - Ryanair - Pilots
- RY-CC - Ryanair - Cabin Crew

### Grades

**Pilots:**

- CMD - Commander
- FO - First Officer
- SO - Second Officer
- ALL - Cadet

**Cabin Crew:**

- RDC - Cabin Manager
- SEN - Senior Cabin Crew
- ADV - Flight Attendant

### SuperAdmin User

- **Crewcode:** SUPERADMIN (or from env)
- **Password:** changeme (or from env)
- **Must change password on first login:** true

## Scripts

```bash
# Development
npm run start:dev        # Start with hot reload
npm run start:debug      # Start with debugger

# Build
npm run build            # Build for production
npm run start:prod       # Run production build

# Testing
npm run test             # Run unit tests
npm run test:e2e         # Run end-to-end tests
npm run test:cov         # Generate coverage report

# Database
npm run migration:generate -- src/database/migrations/MigrationName
npm run migration:run
npm run migration:revert
npm run seed             # Seed initial data

# Linting
npm run lint             # Run ESLint
npm run format           # Format with Prettier
```

## Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens with expiration
- Refresh tokens stored in database with IP and user agent tracking
- Role-based access control
- Field-level serialization based on role (GDPR compliance)
- Admin scoping by professional role

## License

Private - CISL
