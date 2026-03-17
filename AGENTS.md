# UnionConnect - Agent Guide

## Project Overview

UnionConnect (also referred to as UnionHub) is a comprehensive union management platform for airline workers, specifically designed for CISL (Confederazione Italiana Sindacati Lavoratori) - an Italian trade union. The platform manages union members, documents, communications, and provides a payslip calculator for aviation workers.

The project consists of two main components:
- **Backend API**: NestJS 11 + TypeORM 0.3 + PostgreSQL
- **Frontend Mobile App**: Expo 52 + React Native 0.83

### Key Features
- Member management with role-based access (SuperAdmin, Admin, User)
- Document generation with PDF templates and AI translation (Ollama integration)
- CLA (Collective Labor Agreement) contract management
- Payslip calculator for pilots and cabin crew with Italian tax calculations (INPS/IRPEF)
- Push notifications via Expo
- Biometric authentication support
- Multi-language support (English/Italian)

---

## Project Structure

```
/
├── api/                    # NestJS backend
│   ├── src/
│   │   ├── auth/          # JWT authentication module
│   │   ├── users/         # Users/members CRUD
│   │   ├── bases/         # Operational bases (FCO, MXP, etc.)
│   │   ├── contracts/     # Contract types CRUD
│   │   ├── grades/        # Professional grades/qualifications
│   │   ├── cla-contracts/ # CLA contracts with versioning
│   │   ├── documents/     # Document management + PDF generation
│   │   ├── notifications/ # Push notifications (Expo)
│   │   ├── ollama/        # AI integration for translations
│   │   ├── database/      # Migrations & seeds
│   │   └── config/        # Configuration
│   ├── test/              # E2E tests (currently empty)
│   └── uploads/           # Uploaded files storage
│
├── app/                    # Expo React Native frontend
│   ├── src/
│   │   ├── api/           # API client & services
│   │   ├── components/    # Reusable UI components
│   │   ├── navigation/    # React Navigation setup
│   │   ├── providers/     # Context providers
│   │   ├── screens/       # Screen components
│   │   ├── payslip/       # Payslip calculator module
│   │   ├── store/         # Zustand state management
│   │   ├── theme/         # Colors, typography, spacing
│   │   ├── i18n/          # Internationalization (en/it)
│   │   ├── hooks/         # Custom React hooks
│   │   └── types/         # TypeScript types
│   └── assets/            # Images, icons, splash screen
│
└── docs/                   # Project documentation
    ├── 01-ux-design.md
    ├── 02-use-cases.md
    ├── 03-frontend-architecture.md
    ├── 04-backend-architecture.md
    ├── PAYROLL_CALCULATOR_SPEC.md
    └── PAYSLIP_CALCULATOR_EXPO_SPEC.md
```

---

## Technology Stack

### Backend
| Component | Technology | Version |
|-----------|------------|---------|
| Framework | NestJS | 11.x |
| ORM | TypeORM | 0.3.x |
| Database | PostgreSQL | 15+ |
| Auth | Passport.js + JWT | - |
| Validation | class-validator | - |
| PDF Generation | pdf-lib, puppeteer-core | - |
| AI Integration | Ollama (local/cloud) | - |
| Excel Processing | xlsx | - |

### Frontend
| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Expo | 52.x |
| React Native | - | 0.83.x |
| React | - | 19.2.x |
| Navigation | React Navigation | v7 |
| State (Client) | Zustand | 5.x |
| State (Server) | TanStack Query | 5.x |
| Forms | React Hook Form | 7.x |
| Icons | lucide-react-native | - |
| Storage | AsyncStorage (via Zustand persist) | - |
| i18n | i18next + react-i18next | - |
| PDF Viewer | react-native-pdf | - |

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+ running locally
- (Optional) Ollama for AI features
- (Optional) Chrome/Chromium for PDF generation

### Backend Setup

```bash
cd api
npm install

# Create .env file (see .env.example)
cp ../.env.example .env
# Edit .env with your database credentials

# Database setup
npm run migration:run
npm run seed

# Start development server
npm run start:dev
```

API Base URL: `http://localhost:3000/api/v1`

Default credentials after seed:
- **SuperAdmin**: `SUPERADMIN` / `changeme` (must change on first login)
- **Admin Piloti**: `ADMINPILOT` / `password`
- **Admin Cabin Crew**: `ADMINCC` / `password`
- **Test Pilots**: `PIL0001`-`PIL0100` / `password`
- **Test Cabin Crew**: `CC0001`-`CC0100` / `password`

### Frontend Setup

```bash
cd app
npm install

# Start Expo development server
npx expo start

# Or run directly on platform
npx expo start --android
npx expo start --ios
```

---

## Build Commands

### Backend
```bash
npm run build          # Build for production
npm run start:dev      # Development with hot reload
npm run start:prod     # Production mode
npm run format         # Format with Prettier
npm run lint           # ESLint with auto-fix
```

### Database
```bash
npm run migration:generate -- -n MigrationName  # Generate migration
npm run migration:run                           # Run pending migrations
npm run migration:revert                        # Revert last migration
npm run seed                                    # Run database seeds
```

### Frontend
```bash
npm start              # Start Expo development server
npm run android        # Run on Android
npm run ios            # Run on iOS
npm run web            # Run on web
npm run lint           # ESLint check
```

---

## Testing

### Backend
```bash
npm run test           # Unit tests
npm run test:watch     # Watch mode
npm run test:cov       # Coverage report
npm run test:e2e       # E2E tests
```

**Note**: The `api/test/` directory is currently empty. Tests need to be implemented.

### Frontend
```bash
npm test               # Run Jest tests
```

---

## Code Style Guidelines

### TypeScript
- Strict mode enabled
- Use path aliases (`@/*`, `@api/*`, `@components/*`, etc.)
- Prefer interfaces over types for object shapes
- Use enums for fixed sets of values

### Backend Conventions
- Follow NestJS module pattern (controller, service, module, entity, dto)
- Use dependency injection
- Implement DTOs with class-validator decorators
- Use TypeORM entities with proper relations
- Migrations: NEVER use `synchronize: true` in production

### Frontend Conventions
- Use React Hook Form for all forms
- Use TanStack Query for server state
- Use Zustand for client state
- Follow existing component patterns (functional components with hooks)
- Use theme constants from `@theme/*`
- Keep screens in separate directories with index exports

### Naming Conventions
- Files: kebab-case for services, PascalCase for components/classes
- Classes: PascalCase
- Interfaces: PascalCase (prefix with `I` optional)
- Enums: PascalCase
- Variables/functions: camelCase
- Constants: UPPER_SNAKE_CASE

---

## Database Schema

### Core Tables
- `users` - Unified auth + member data (crewcode is the login field)
- `bases` - Operational bases (BRI, BGY, BLQ, FCO, MXP, etc.)
- `contracts` - Contract types (MAY-PI, AFA, MAY-CC, etc.)
- `grades` - Professional grades by role (pilot/cabin_crew)
- `cla_contracts` - Collective Labor Agreement data with versioning
- `cla_contract_history` - Audit trail for CLA changes
- `documents` - Union communications with AI translation
- `refresh_tokens` - Token blacklisting
- `device_tokens` - Push notification tokens

### Key Enums
```typescript
UserRole: 'superadmin' | 'admin' | 'user'
Ruolo: 'pilot' | 'cabin_crew'
DocumentStatus: 'draft' | 'reviewing' | 'approved' | 'verified' | 'published'
UnionType: 'fit-cisl' | 'joint'
```

---

## Authentication Flow

1. User logs in with `crewcode` + `password`
2. Server returns `accessToken` (15min) + `refreshToken` (30 days)
3. Client stores tokens in AsyncStorage via Zustand persist
4. Axios interceptor adds `Authorization: Bearer <token>` header
5. On 401, client attempts token refresh automatically
6. On refresh failure, user is logged out
7. Biometric auth can be enabled to store credentials securely

---

## API Endpoints

### Authentication
- `POST /auth/login` - Login with crewcode/password
- `POST /auth/logout` - Logout (requires refresh token)
- `POST /auth/logout-all` - Logout from all devices
- `POST /auth/refresh` - Refresh access token
- `POST /auth/change-password` - Change password
- `POST /auth/force-change-password` - Force password change
- `GET /auth/me` - Get current user profile

### Users
- `GET /users` - List users (role-scoped: Admin only sees same ruolo)
- `GET /users/:id` - Get user by ID
- `POST /users` - Create user (Admin+)
- `PATCH /users/:id` - Update user (Admin+)
- `DELETE /users/:id` - Delete/deactivate user (Admin+)

### Reference Data
- `GET /bases` - List bases
- `GET /contracts` - List contracts
- `GET /grades` - List grades

### CLA Contracts
- `GET /cla-contracts` - List contracts
- `GET /cla-contracts/:id` - Get contract by ID
- `POST /cla-contracts` - Create contract (Admin+)
- `PATCH /cla-contracts/:id` - Update contract
- `DELETE /cla-contracts/:id` - Deactivate contract
- `POST /cla-contracts/:id/clone` - Clone for new year
- `POST /cla-contracts/:id/close` - Close contract

### Documents
- `GET /documents` - List documents
- `GET /documents/public` - Public documents (no auth)
- `POST /documents` - Create document
- `POST /documents/:id/translate` - AI translate to English
- `GET /documents/:id/pdf` - Generate PDF

---

## Security Considerations

### Authentication & Authorization
- JWT tokens with short access token lifetime (15 minutes)
- Refresh tokens stored in database for revocation
- Password hashing with bcrypt (10 rounds)
- Role-based access control (RBAC) with role scoping
- Force password change on first login for new users

### Data Protection
- GDPR compliance: User data serialization based on role
- Sensitive fields (note, itud, rsa) only visible to Admin/SuperAdmin
- Soft delete for users (deactivatedAt timestamp)
- Status history tracking for audit trails

### API Security
- CORS configured via environment variable
- Input validation via class-validator
- Request payload limits (50mb for JSON)
- Rate limiting should be implemented for production

### Environment Variables
Sensitive configuration in `.env`:
- `JWT_SECRET` - Must be at least 32 characters
- `DB_PASSWORD` - Database password
- `OLLAMA_API_KEY` - If using cloud Ollama

---

## Key Features Implementation

### PDF Generation
- Custom letterhead templates in `api/templates/`
- pdf-lib for template-based generation
- Puppeteer fallback for HTML-based generation
- QR code embedding for WhatsApp group
- Bilingual support (Italian + English)

### AI Integration (Ollama)
- Local or cloud Ollama instance
- Model: configurable (mistral, llama3.2, etc.)
- Features: Document rewriting, English translation
- Health check endpoint for monitoring

### Payslip Calculator
- Complex Italian tax calculations (INPS/IRPEF)
- Role-specific calculations (pilot vs cabin_crew)
- CLA contract data with versioning
- Configurable corrections system
- Real-time calculation in React Native

### Push Notifications
- Expo Push API integration
- Device token management
- Broadcast and targeted notifications
- Automatic token cleanup on invalid responses

---

## Troubleshooting

### Backend Issues
```bash
# Check if PostgreSQL is running
pg_isready

# Reset database (DEVELOPMENT ONLY)
dropdb unionhub && createdb unionhub
npm run migration:run
npm run seed

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Frontend Issues
```bash
# Clear Expo cache
npx expo start --clear

# Reset Metro bundler
npx expo start --reset-cache

# Clean node_modules (if native module issues)
rm -rf node_modules && npm install
```

### Database Issues
- Check `.env` configuration matches your PostgreSQL setup
- Ensure migrations are run after schema changes
- Never enable `synchronize: true` in production

---

## Development Notes

### Adding a New Module
1. Backend: Create module folder in `api/src/` with entity, service, controller, module, DTOs
2. Add module to `AppModule` imports
3. Generate migration if schema changes: `npm run migration:generate -- -n Name`
4. Frontend: Add API service in `app/src/api/`
5. Add types to `app/src/types/`
6. Create screens/components as needed

### Code Comments
- Primary language for comments: **English**
- API messages: **English**
- User-facing text: Uses i18n (English/Italian)

### Git Workflow
- Do not commit `node_modules/`, `dist/`, `.env`, or `uploads/`
- Database migrations should be committed
- Seed files should be committed

---

## Brand Colors

```typescript
const colors = {
  primary: '#177246',      // CISL Green
  primaryDark: '#125a38',
  primaryLight: '#1d8f57',
  
  secondary: '#DA0E32',    // CISL Red
  secondaryDark: '#b00b29',
  
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
};
```

---

## Additional Resources

- Documentation in `docs/` folder contains detailed specifications
- Backend architecture: `docs/04-backend-architecture.md`
- Frontend architecture: `docs/03-frontend-architecture.md`
- Payslip calculator spec: `docs/PAYSLIP_CALCULATOR_EXPO_SPEC.md`
