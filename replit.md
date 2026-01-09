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
- Main tab navigator with 4 tabs: Home, Calendar, Tasks, Profile
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
- `users` table: id (UUID), username (unique), password, displayName, avatarUrl, familyId (FK), role, createdAt
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