# Kinova

## Overview

Kinova is a family coordination and connection mobile app built with React Native and Expo. It helps families stay organized and connected in real-time through shared calendars, tasks, and activity tracking. The app follows an organic/natural design aesthetic with a distinctive teal-green color palette (#2F7F6D) that creates a calming, trustworthy presence.

The application uses a monorepo structure with three main directories:
- `client/` - React Native/Expo mobile application
- `server/` - Express.js backend API
- `shared/` - Shared TypeScript types and database schemas

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React Native with Expo SDK 54, using the new architecture and React 19.1

**Navigation Pattern**: Tab-based navigation with nested stack navigators
- Root stack navigator handles auth flow (Login vs Main app)
- Main tab navigator with 4 tabs: Home, Calendar, Lists, Profile
- Lists tab combines Shopping and Tasks with tabbed interface and filters
- Each tab has its own stack navigator for screen hierarchy

**State Management**:
- TanStack React Query for server state and data fetching
- React Context for authentication state (`AuthProvider`)
- Local component state with React hooks

**Theming System**:
- Automatic light/dark mode support via `useColorScheme`
- Centralized theme constants in `client/constants/theme.ts`
- Kinova brand colors: Primary teal (#2F7F6D), Secondary (#6FB7A8)

**Key Libraries**:
- `react-native-reanimated` for animations
- `react-native-gesture-handler` for touch interactions
- `expo-haptics` for tactile feedback
- `expo-blur` and `expo-glass-effect` for visual effects
- `@react-navigation/*` for navigation

### Backend Architecture

**Framework**: Express.js with TypeScript

**API Design**: RESTful JSON API with `/api` prefix
- Authentication endpoints: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- Family endpoints: `/api/family`, `/api/family/members`

**Authentication**: Token-based sessions stored in PostgreSQL database (persists across server restarts). Tokens are secure random strings using `randomBytes(32).toString("base64url")`. Password hashing uses scrypt with random salt.

**Database Access**: Storage abstraction layer (`IStorage` interface) with `DatabaseStorage` implementation using Drizzle ORM.

### Data Storage

**Database**: PostgreSQL with Drizzle ORM

**Schema** (defined in `shared/schema.ts`):
- `families` table: id (UUID), name, createdAt
- `users` table: id (UUID), username (unique), password, displayName, avatarUrl, familyId (FK), role, createdAt, canViewCalendar, canViewTasks, canViewShopping, canViewBudget, canViewPlaces, canModifyItems (permission flags)
- `sessions` table: id (UUID), token (unique), userId (FK), familyId (FK), role, type (access/refresh), expiresAt, createdAt
- `events` table: id (UUID), familyId (FK), title, description, startDate, endDate, allDay, color, createdBy (FK), createdAt, updatedAt
- `tasks` table: id (UUID), familyId (FK), title, description, completed, dueDate, assignedTo (FK), priority, createdBy (FK), createdAt, updatedAt
- `shopping_items` table: id (UUID), familyId (FK), name, quantity, unit, category, purchased, createdBy (FK), createdAt, updatedAt
- `expenses` table: id (UUID), familyId (FK), amount, description, category, paidBy (FK), date, createdBy (FK), createdAt, updatedAt
- `family_invites` table: id (UUID), familyId (FK), code (unique), role, email, expiresAt, acceptedAt, acceptedBy (FK), createdBy (FK), createdAt

**Migrations**: Managed via `drizzle-kit` with output to `./migrations` directory

### Client-Server Communication

**API Client**: Custom fetch wrapper in `client/lib/query-client.ts`
- Automatic token injection from AsyncStorage
- Base URL derived from `EXPO_PUBLIC_DOMAIN` environment variable
- Integrated with TanStack Query for caching and refetching

**CORS**: Dynamic origin allowlist based on Replit environment variables, plus localhost support for development

## External Dependencies

### Third-Party Services

**Database**: PostgreSQL (connection via `DATABASE_URL` environment variable)

**Storage**: `@react-native-async-storage/async-storage` for persisting auth tokens on device

### Development Environment

**Build System**: 
- Expo CLI for mobile development
- esbuild for server bundling
- Custom build script (`scripts/build.js`) for static exports

**Environment Variables**:
- `DATABASE_URL` - PostgreSQL connection string (required)
- `EXPO_PUBLIC_DOMAIN` - API server domain for client requests
- `REPLIT_DEV_DOMAIN` - Development domain (Replit-specific)
- `REPLIT_DOMAINS` - Production domains for CORS (Replit-specific)

### NPM Package Categories

**Expo Modules**: expo-blur, expo-constants, expo-font, expo-haptics, expo-image, expo-linking, expo-splash-screen, expo-status-bar, expo-symbols, expo-system-ui, expo-web-browser, expo-glass-effect

**Navigation**: @react-navigation/native, @react-navigation/native-stack, @react-navigation/bottom-tabs, @react-navigation/elements

**Database**: drizzle-orm, drizzle-zod, pg (node-postgres)

**Validation**: zod, zod-validation-error

## Recent Changes

### GATE 1 BIS - Role-Based Permission System (January 2026)

**Permission Model**:
- Three user roles: `admin`, `member`, `child`
- Six granular permissions: canViewCalendar, canViewTasks, canViewShopping, canViewBudget, canViewPlaces, canModifyItems
- Permissions stored in database, applied at user creation based on role

**Role Defaults**:
- **Admin**: All permissions true
- **Member**: All permissions true except canViewBudget=false
- **Child**: canViewCalendar/Tasks/Places=true, canViewShopping/Budget=false, canModifyItems=false

**Backend Enforcement**:
- All shopping/expenses/tasks mutation endpoints check canModifyItems
- Budget endpoints (expenses) check canViewBudget
- Shopping endpoints check canViewShopping
- Child role automatically filters events/tasks to only show assignedTo items
- All unauthorized attempts return 403 FORBIDDEN

**Frontend Adaptation**:
- MainTabNavigator hides Budget tab if canViewBudget=false
- MainTabNavigator hides Lists tab if both canViewShopping and canViewTasks are false
- ListsScreen hides add input and delete buttons if canModifyItems=false
- Tab selector hidden when user only has access to one list type

**Key Files**:
- `server/permissions.ts`: Role defaults and permission utilities
- `shared/types.ts`: UserPermissions interface
- `client/lib/auth.tsx`: AuthContext with permissions

### GATE 8 - Admin Console (January 2026)

**Architecture**:
- Separate PWA web application at `/admin` route
- Three admin roles: `super_admin`, `support_admin`, `auditor`
- Complete RBAC enforcement on all admin endpoints
- i18n support (Italian/English) based on browser language

**Admin Database Schema** (in `shared/schema.ts`):
- `admin_users` table: Admin accounts with MFA support
- `admin_sessions` table: Admin session tokens (1 hour expiry)
- `admin_audit_logs` table: All admin actions tracked
- `donation_logs` table: Donation/payment tracking
- `ai_usage_logs` table: AI assistant usage metrics
- `notification_logs` table: Push notification delivery logs
- `ai_config` table: Global AI configuration

**Trial/Plan Management** (added to `families` table):
- `planType`: 'trial' | 'free' | 'premium' | 'enterprise'
- `trialStartDate`, `trialEndDate`: Trial period tracking
- `isActive`: Family account status

**Admin API Endpoints** (`/api/admin/*`):
- Auth: login, logout, logout-all, me
- Dashboard: stats (totals, actives, trials, donations)
- Users: list, detail, update, reset-sessions, delete
- Families: list, detail, update, deactivate
- Trials: list, extend
- Donations: list
- Audit: logs with pagination
- AI: config get/update, usage logs
- Setup: first super_admin creation (one-time)

**Security**:
- Rate limiting: 5 login attempts per 15 minutes per email
- Password hashing: scrypt with random salt
- Session expiry: 1 hour for admin tokens
- All mutations logged to audit trail

**Key Files**:
- `server/admin-routes.ts`: Admin API endpoints and RBAC middleware
- `server/admin/index.html`: Admin PWA entry point
- `server/admin/app.js`: Admin React SPA

### Logging Infrastructure (January 2026)

**Session & Error Logging System**:
- Professional logging infrastructure for tracking app usage and debugging
- Hierarchical error code taxonomy: `KINOVA::DOMAIN::CODE` pattern
- Bilingual error messages (Italian default, English option)

**Database Schema**:
- `session_logs` table: userId, familyId, deviceId, platform, appVersion, osVersion, locale, status (started/ended/crashed), startedAt, endedAt, terminationReason
- `error_logs` table: sessionId, userId, familyId, requestId, category, severity (info/warning/error/critical), code, message, userMessage, component, stackTrace, context, resolved, resolvedAt, resolvedBy

**Error Code Categories**:
- AUTH: Authentication and authorization errors
- NETWORK: Connection and timeout errors
- PAYMENT: Stripe and payment processing errors
- ASSISTANT: AI assistant errors
- CALENDAR, TASKS, SHOPPING, BUDGET: Feature-specific errors
- FAMILY: Family management errors
- GENERAL: Fallback and validation errors

**API Endpoints** (`/api/logs/*`):
- `POST /api/logs/session/start`: Start session tracking
- `POST /api/logs/session/end`: End session tracking
- `POST /api/logs/session/crash`: Log app crash
- `POST /api/logs/error`: Log structured error with code and context
- `GET /api/logs/error-codes`: Get available error codes and messages

**Admin Endpoints** (`/api/admin/logs/*`):
- `GET /api/admin/logs/sessions`: List session logs with filtering
- `GET /api/admin/logs/errors`: List error logs with filtering
- `GET /api/admin/logs/errors/stats`: Error statistics (total, unresolved, today)
- `POST /api/admin/logs/errors/:id/resolve`: Mark error as resolved (super_admin, support_admin)

**Client-Side Logging** (`client/lib/logging.ts`):
- `startSession()`: Initialize session tracking
- `endSession()`: End current session
- `logSessionCrash()`: Report app crash
- `logError()`: Log structured error with automatic locale detection
- `getErrorMessage()`: Get localized error message for code

**Key Files**:
- `server/logging-routes.ts`: Logging API endpoints and error taxonomy
- `client/lib/logging.ts`: Client-side logging utility
- `server/admin/app.js`: Admin panel with Logs section