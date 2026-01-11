# Kinova

## Overview

Kinova is a family coordination and connection mobile app built with React Native and Expo. It aims to help families stay organized and connected in real-time through shared calendars, tasks, and activity tracking. The app features a vibrant, colorful design based on the Kinova logo's rainbow gradient (K=Red #E53935, i=Orange #FF9800, n=Green #8BC34A, o=Cyan #00BCD4, v=Blue #2196F3, a=Purple #9C27B0), creating a joyful family-friendly experience. The application uses a monorepo structure with `client/` (React Native/Expo app), `server/` (Express.js backend), and `shared/` (TypeScript types and schemas). It includes features like shared calendars, tasks, shopping lists, expenses tracking, and an AI assistant.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React Native with Expo SDK 54, utilizing the new architecture and React 19.1.

**Navigation Pattern**: Tab-based navigation with nested stack navigators, handling authentication flow, main tabs (Home, Calendar, Lists, Profile), and nested stacks within each tab for screen hierarchies.

**State Management**: TanStack React Query for server state and data fetching, React Context for authentication, and local component state with React hooks.

**Theming System**: Automatic light/dark mode support with Kinova's rainbow color palette derived from the logo: Ruby Red (#E53935) for Home, Sunset Orange (#FF9800) for Lists, Lime Green (#8BC34A) for Budget, Teal Cyan (#00BCD4) for Assistant, Royal Blue (#2196F3) as primary for Calendar/Profile, and Violet Purple (#9C27B0) for Notes. Gradient buttons and animated interactions provide a vibrant family-friendly experience.

**Key Libraries**: `react-native-reanimated`, `react-native-gesture-handler`, `expo-haptics`, `expo-blur`, `expo-glass-effect`, and `@react-navigation/*`.

### Backend Architecture

**Framework**: Express.js with TypeScript, providing a RESTful JSON API.

**API Design**: All API endpoints are prefixed with `/api`. Key areas include authentication, family management, events, tasks, shopping, expenses, and notes.

**Authentication**: Token-based sessions stored in PostgreSQL, using scrypt for password hashing and secure random strings for tokens.

**Database Access**: Utilizes a storage abstraction layer with Drizzle ORM for PostgreSQL.

### Data Storage

**Database**: PostgreSQL with Drizzle ORM.

**Schema**: Includes tables for `families`, `users`, `sessions`, `events`, `tasks`, `shopping_items`, `expenses`, `family_invites`, `notes`, `session_logs`, `error_logs`, `admin_users`, `admin_sessions`, `admin_audit_logs`, `donation_logs`, `ai_usage_logs`, `notification_logs`, and `ai_config`. The `families` table also stores `planType`, `trialStartDate`, `trialEndDate`, and `isActive` for subscription management. Notes support polymorphic relations to link with other entities.

**Migrations**: Managed via `drizzle-kit`.

### Client-Server Communication

**API Client**: Custom fetch wrapper for automatic token injection and integration with TanStack Query.

**CORS**: Dynamic origin allowlist based on environment variables for development and production.

### Admin Console

**Architecture**: A separate PWA web application accessible at `/admin`, supporting three admin roles (`super_admin`, `support_admin`, `auditor`) with complete RBAC enforcement.

**Security**: Includes rate limiting, scrypt password hashing, session expiry, and audit logging for all mutations.

### Logging Infrastructure

**System**: Professional logging for tracking app usage and debugging with a hierarchical error code taxonomy (`KINOVA::DOMAIN::CODE`) and bilingual error messages.

**Data**: `session_logs` and `error_logs` tables capture detailed session and error information.

### AI Assistant Features

**Document Auto-Interpretation**: Automatically interprets uploaded documents (images, PDFs, text files) using Vision API and text extraction. It provides summaries and proposes actions.

**PDF Analysis**: The AI assistant can read and analyze PDF documents using `pdf-parse` for text extraction, which is then sent to GPT-4.1-mini for intelligent analysis and action proposals (expenses, events, tasks, notes).

### Role-Based Permission System

**Model**: Three user roles (`admin`, `member`, `child`) with six granular permissions (e.g., `canViewCalendar`, `canModifyItems`). Permissions are stored in the database and applied based on role.

**Enforcement**: Backend enforces permissions on all API endpoints, and the frontend adapts UI elements (e.g., hiding tabs or action buttons) based on user permissions.

## External Dependencies

### Third-Party Services

**Database**: PostgreSQL.

**Storage**: `@react-native-async-storage/async-storage` for client-side token persistence.

### Development Environment

**Build System**: Expo CLI for mobile, esbuild for server bundling, and custom build scripts.

**Environment Variables**: `DATABASE_URL`, `EXPO_PUBLIC_DOMAIN`, `REPLIT_DEV_DOMAIN`, `REPLIT_DOMAINS`.

### NPM Package Categories

**Expo Modules**: `expo-blur`, `expo-constants`, `expo-font`, `expo-haptics`, `expo-image`, `expo-linking`, `expo-splash-screen`, `expo-status-bar`, `expo-symbols`, `expo-system-ui`, `expo-web-browser`, `expo-glass-effect`.

**Navigation**: `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`, `@react-navigation/elements`.

**Database**: `drizzle-orm`, `drizzle-zod`, `pg` (node-postgres).

**Validation**: `zod`, `zod-validation-error`.

**PDF Processing**: `pdf-parse` for server-side PDF text extraction.