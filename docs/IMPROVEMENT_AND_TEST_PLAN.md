# Piano di Miglioramento e Test - Kinova NewStile

> Documento creato: Gennaio 2026
> Versione: 1.0

---

## Indice

1. [Executive Summary](#executive-summary)
2. [Piano di Miglioramento del Codice](#piano-di-miglioramento-del-codice)
3. [Piano di Test](#piano-di-test)
4. [Prioritizzazione](#prioritizzazione)
5. [Metriche di Successo](#metriche-di-successo)

---

## Executive Summary

Il progetto Kinova NewStile presenta una solida base architetturale ma necessita di:
- **Refactoring**: Suddivisione di file troppo grandi
- **Testing**: Nessun test presente attualmente
- **Documentazione**: Miglioramento della documentazione del codice
- **Ottimizzazioni**: Performance e gestione memoria

---

## Piano di Miglioramento del Codice

### 1. Refactoring Architetturale

#### 1.1 Suddivisione `server/routes.ts` (~87KB)

**Problema**: File monolitico difficile da mantenere.

**Soluzione**: Creare moduli separati:

```
server/
├── routes/
│   ├── index.ts          # Router principale
│   ├── auth.routes.ts    # Login, register, password reset
│   ├── family.routes.ts  # Gestione famiglia e inviti
│   ├── events.routes.ts  # Calendario ed eventi
│   ├── tasks.routes.ts   # Task management
│   ├── shopping.routes.ts # Lista spesa
│   ├── budget.routes.ts  # Spese e budget
│   ├── notes.routes.ts   # Note
│   ├── places.routes.ts  # Luoghi
│   └── users.routes.ts   # Profili utenti
```

**Esempio di struttura per `auth.routes.ts`**:

```typescript
import { Router } from "express";
import { storage } from "../storage";
import { validateRequest } from "../middleware/validation";
import { loginSchema, registerSchema } from "../schemas/auth";

const router = Router();

router.post("/login", validateRequest(loginSchema), async (req, res) => {
  // logica di login
});

router.post("/register", validateRequest(registerSchema), async (req, res) => {
  // logica di registrazione
});

export default router;
```

#### 1.2 Suddivisione `server/storage.ts` (~60KB)

**Soluzione**: Separare per dominio:

```
server/
├── storage/
│   ├── index.ts           # Export aggregato
│   ├── base.storage.ts    # Classe base astratta
│   ├── user.storage.ts    # Operazioni utenti
│   ├── family.storage.ts  # Operazioni famiglia
│   ├── event.storage.ts   # Operazioni eventi
│   ├── task.storage.ts    # Operazioni task
│   └── ...
```

#### 1.3 Refactoring `server/assistant.ts` (~61KB)

**Soluzione**: Separare concerns:

```
server/
├── assistant/
│   ├── index.ts           # Entry point
│   ├── context.ts         # Costruzione contesto AI
│   ├── tools.ts           # Definizione strumenti AI
│   ├── handlers/
│   │   ├── calendar.ts    # Handler eventi
│   │   ├── tasks.ts       # Handler task
│   │   ├── budget.ts      # Handler budget
│   │   └── shopping.ts    # Handler spesa
│   └── prompts/
│       ├── system.ts      # Prompt di sistema
│       └── templates.ts   # Template risposta
```

---

### 2. Miglioramenti Qualità Codice

#### 2.1 Type Safety - Eliminare `any`

**File da correggere**:

| File | Linea | Problema |
|------|-------|----------|
| `client/screens/HomeScreen.tsx` | 81 | `(navigation as any)` |
| `client/lib/auth.tsx` | Vari | Type casting non sicuri |

**Soluzione**: Definire tipi di navigazione:

```typescript
// client/navigation/types.ts
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { CompositeNavigationProp } from "@react-navigation/native";

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Notifications: undefined;
  NoteDetail: { noteId: string };
  // ... altre routes
};

export type MainTabParamList = {
  Home: undefined;
  Calendar: undefined;
  Lists: undefined;
  Notes: undefined;
  Budget: undefined;
  Assistant: undefined;
  Profile: undefined;
};

export type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Home">,
  NativeStackNavigationProp<RootStackParamList>
>;
```

#### 2.2 Gestione Errori Migliorata

**Problema**: Errori silenziati in `client/lib/auth.tsx:304-306`

**Soluzione**:

```typescript
// Prima (problematico)
} catch {
  // ignore logout errors
}

// Dopo (migliorato)
} catch (error) {
  console.warn("[Auth] Logout error (non-critical):", error);
  // Opzionalmente loggare al server
  logClientError({
    category: "auth",
    severity: "warning",
    message: "Logout failed",
    error: error instanceof Error ? error.message : String(error),
  });
}
```

#### 2.3 Memory Leak - Timer non cancellati

**Problema in `client/lib/api.ts:102-106`**

**Soluzione**:

```typescript
function createTimeoutSignal(ms: number): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  };
}

// Utilizzo
async function apiRequest<T>(endpoint: string, options?: RequestOptions): Promise<T> {
  const { signal, cleanup } = createTimeoutSignal(options?.timeout ?? 30000);

  try {
    const response = await fetch(url, { ...options, signal });
    // ...
    return result;
  } finally {
    cleanup(); // Sempre pulire il timer
  }
}
```

#### 2.4 Variabili Globali nel Server

**Problema**: Cleanup con variabile globale

**Soluzione**: Usare un job scheduler:

```typescript
// server/jobs/cleanup.ts
import { CronJob } from "cron";
import { storage } from "../storage";

export function setupCleanupJobs() {
  // Pulizia sessioni scadute ogni 5 minuti
  new CronJob("*/5 * * * *", async () => {
    try {
      await storage.cleanupExpiredSessions();
      console.log("[Cleanup] Sessions cleaned");
    } catch (error) {
      console.error("[Cleanup] Failed:", error);
    }
  }).start();

  // Pulizia token scaduti ogni ora
  new CronJob("0 * * * *", async () => {
    await storage.cleanupExpiredTokens();
  }).start();
}
```

---

### 3. Miglioramenti Performance

#### 3.1 Query Optimization

**Implementare indici mancanti**:

```typescript
// shared/schema.ts - Aggiungere indici
export const events = pgTable("events", {
  // ... campi esistenti
}, (table) => ({
  familyIdIdx: index("events_family_id_idx").on(table.familyId),
  startDateIdx: index("events_start_date_idx").on(table.startDate),
  assignedToIdx: index("events_assigned_to_idx").on(table.assignedTo),
}));

export const tasks = pgTable("tasks", {
  // ... campi esistenti
}, (table) => ({
  familyIdIdx: index("tasks_family_id_idx").on(table.familyId),
  dueDateIdx: index("tasks_due_date_idx").on(table.dueDate),
  completedIdx: index("tasks_completed_idx").on(table.completed),
}));
```

#### 3.2 Caching Layer

```typescript
// server/cache/index.ts
import NodeCache from "node-cache";

const cache = new NodeCache({
  stdTTL: 300, // 5 minuti default
  checkperiod: 60,
});

export const cacheMiddleware = (ttl: number = 300) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.method}:${req.originalUrl}:${req.user?.familyId}`;
    const cached = cache.get(key);

    if (cached) {
      return res.json(cached);
    }

    const originalJson = res.json.bind(res);
    res.json = (data) => {
      cache.set(key, data, ttl);
      return originalJson(data);
    };

    next();
  };
};
```

#### 3.3 React Query Optimization

```typescript
// client/lib/query-client.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minuti
      gcTime: 30 * 60 * 1000,   // 30 minuti (era cacheTime)
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

---

### 4. Miglioramenti Sicurezza

#### 4.1 Input Sanitization

```typescript
// server/middleware/sanitize.ts
import { z } from "zod";

export const sanitizeString = (str: string): string => {
  return str
    .trim()
    .replace(/[<>]/g, "") // Rimuovi potenziali tag HTML
    .slice(0, 10000);      // Limita lunghezza
};

export const createSanitizedSchema = <T extends z.ZodObject<any>>(schema: T) => {
  return schema.transform((data) => {
    const sanitized = { ...data };
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === "string") {
        sanitized[key] = sanitizeString(value);
      }
    }
    return sanitized;
  });
};
```

#### 4.2 Rate Limiting Avanzato

```typescript
// server/middleware/rate-limit.ts
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 100,
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ora
  max: 5,
  message: { error: "Too many login attempts, please try again later" },
  skipSuccessfulRequests: true,
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10,
  message: { error: "AI rate limit exceeded" },
});
```

---

## Piano di Test

### 1. Setup Framework di Test

#### 1.1 Dipendenze da Installare

```bash
# Test runner e utilities
npm install -D vitest @vitest/coverage-v8 @vitest/ui

# Testing React/React Native
npm install -D @testing-library/react-native @testing-library/jest-native
npm install -D react-test-renderer

# Testing API/Server
npm install -D supertest @types/supertest

# Mocking
npm install -D msw

# E2E Testing
npm install -D detox jest-circus
```

#### 1.2 Configurazione Vitest

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "server_dist"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules",
        "**/*.test.ts",
        "**/*.spec.ts",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});
```

#### 1.3 Setup File

```typescript
// tests/setup.ts
import { beforeAll, afterAll, afterEach } from "vitest";
import { server } from "./mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

### 2. Unit Tests

#### 2.1 Test Utilities e Helpers

```typescript
// tests/unit/utils/date.test.ts
import { describe, it, expect } from "vitest";
import { formatEventTime, isEventOnToday } from "@/screens/HomeScreen";

describe("formatEventTime", () => {
  it("should return empty string for all-day events", () => {
    const event = { allDay: true, startDate: "2026-01-22T10:00:00Z" };
    expect(formatEventTime(event)).toBe("");
  });

  it("should format time correctly for timed events", () => {
    const event = {
      allDay: false,
      startDate: "2026-01-22T14:30:00Z"
    };
    const result = formatEventTime(event);
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

describe("isEventOnToday", () => {
  it("should return true for events starting today", () => {
    const today = new Date();
    const event = {
      allDay: false,
      startDate: today.toISOString(),
      endDate: today.toISOString(),
    };
    expect(isEventOnToday(event)).toBe(true);
  });

  it("should return false for past events", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const event = {
      allDay: false,
      startDate: yesterday.toISOString(),
      endDate: yesterday.toISOString(),
    };
    expect(isEventOnToday(event)).toBe(false);
  });
});
```

#### 2.2 Test Schema Validation

```typescript
// tests/unit/schema/user.test.ts
import { describe, it, expect } from "vitest";
import { insertUserSchema } from "@shared/schema";

describe("insertUserSchema", () => {
  it("should validate a correct user object", () => {
    const validUser = {
      email: "test@example.com",
      username: "testuser",
      password: "SecurePass123!",
      familyId: "family-uuid",
    };

    const result = insertUserSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it("should reject invalid email", () => {
    const invalidUser = {
      email: "not-an-email",
      username: "testuser",
      password: "SecurePass123!",
      familyId: "family-uuid",
    };

    const result = insertUserSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
  });

  it("should reject short password", () => {
    const invalidUser = {
      email: "test@example.com",
      username: "testuser",
      password: "short",
      familyId: "family-uuid",
    };

    const result = insertUserSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
  });
});
```

#### 2.3 Test Auth Utilities

```typescript
// tests/unit/auth/password.test.ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, generateToken } from "@/server/auth-utils";

describe("hashPassword", () => {
  it("should hash password with salt", async () => {
    const password = "SecurePassword123!";
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash).toContain(".");  // salt.hash format
  });

  it("should generate different hashes for same password", async () => {
    const password = "SecurePassword123!";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);
  });
});

describe("verifyPassword", () => {
  it("should verify correct password", async () => {
    const password = "SecurePassword123!";
    const hash = await hashPassword(password);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it("should reject incorrect password", async () => {
    const password = "SecurePassword123!";
    const hash = await hashPassword(password);

    const isValid = await verifyPassword("WrongPassword", hash);
    expect(isValid).toBe(false);
  });
});

describe("generateToken", () => {
  it("should generate token of specified length", () => {
    const token = generateToken(32);
    expect(token).toHaveLength(64); // hex encoding doubles length
  });

  it("should generate unique tokens", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateToken(16)));
    expect(tokens.size).toBe(100);
  });
});
```

---

### 3. Integration Tests

#### 3.1 Test API Endpoints

```typescript
// tests/integration/api/auth.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "@/server";
import { db } from "@/server/db";
import { users, families } from "@shared/schema";

describe("Auth API", () => {
  let testFamilyId: string;

  beforeAll(async () => {
    // Setup: create test family
    const [family] = await db.insert(families).values({
      name: "Test Family",
    }).returning();
    testFamilyId = family.id;
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(users).where(eq(users.familyId, testFamilyId));
    await db.delete(families).where(eq(families.id, testFamilyId));
  });

  describe("POST /api/register", () => {
    it("should register a new user", async () => {
      const response = await request(app)
        .post("/api/register")
        .send({
          email: "newuser@test.com",
          username: "newuser",
          password: "SecurePass123!",
          familyName: "New Family",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("refreshToken");
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user.email).toBe("newuser@test.com");
    });

    it("should reject duplicate email", async () => {
      // First registration
      await request(app)
        .post("/api/register")
        .send({
          email: "duplicate@test.com",
          username: "user1",
          password: "SecurePass123!",
          familyName: "Family 1",
        });

      // Second registration with same email
      const response = await request(app)
        .post("/api/register")
        .send({
          email: "duplicate@test.com",
          username: "user2",
          password: "SecurePass123!",
          familyName: "Family 2",
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain("email");
    });

    it("should reject weak password", async () => {
      const response = await request(app)
        .post("/api/register")
        .send({
          email: "weakpass@test.com",
          username: "weakpassuser",
          password: "123",
          familyName: "Weak Family",
        });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/login", () => {
    beforeAll(async () => {
      // Create test user
      await request(app)
        .post("/api/register")
        .send({
          email: "logintest@test.com",
          username: "logintest",
          password: "SecurePass123!",
          familyName: "Login Test Family",
        });
    });

    it("should login with correct credentials", async () => {
      const response = await request(app)
        .post("/api/login")
        .send({
          email: "logintest@test.com",
          password: "SecurePass123!",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("refreshToken");
    });

    it("should reject incorrect password", async () => {
      const response = await request(app)
        .post("/api/login")
        .send({
          email: "logintest@test.com",
          password: "WrongPassword",
        });

      expect(response.status).toBe(401);
    });

    it("should reject non-existent user", async () => {
      const response = await request(app)
        .post("/api/login")
        .send({
          email: "nonexistent@test.com",
          password: "SomePassword123!",
        });

      expect(response.status).toBe(401);
    });
  });
});
```

#### 3.2 Test CRUD Operations

```typescript
// tests/integration/api/events.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "@/server";
import { createTestUser, cleanupTestUser, getAuthToken } from "../helpers";

describe("Events API", () => {
  let authToken: string;
  let userId: string;
  let familyId: string;

  beforeAll(async () => {
    const { user, token } = await createTestUser();
    authToken = token;
    userId = user.id;
    familyId = user.familyId;
  });

  afterAll(async () => {
    await cleanupTestUser(userId);
  });

  describe("POST /api/events", () => {
    it("should create a new event", async () => {
      const eventData = {
        title: "Test Event",
        description: "Test Description",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 3600000).toISOString(),
        allDay: false,
        category: "family",
      };

      const response = await request(app)
        .post("/api/events")
        .set("Authorization", `Bearer ${authToken}`)
        .send(eventData);

      expect(response.status).toBe(201);
      expect(response.body.title).toBe("Test Event");
      expect(response.body.familyId).toBe(familyId);
      expect(response.body.createdBy).toBe(userId);
    });

    it("should reject event without title", async () => {
      const response = await request(app)
        .post("/api/events")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          startDate: new Date().toISOString(),
        });

      expect(response.status).toBe(400);
    });

    it("should reject unauthorized request", async () => {
      const response = await request(app)
        .post("/api/events")
        .send({
          title: "Unauthorized Event",
          startDate: new Date().toISOString(),
        });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/events", () => {
    let eventId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post("/api/events")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Event to Fetch",
          startDate: new Date().toISOString(),
        });
      eventId = res.body.id;
    });

    it("should get events for date range", async () => {
      const from = new Date();
      from.setDate(from.getDate() - 1);
      const to = new Date();
      to.setDate(to.getDate() + 1);

      const response = await request(app)
        .get("/api/events")
        .set("Authorization", `Bearer ${authToken}`)
        .query({
          from: from.toISOString(),
          to: to.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.some((e: any) => e.id === eventId)).toBe(true);
    });
  });

  describe("PUT /api/events/:id", () => {
    let eventId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post("/api/events")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Event to Update",
          startDate: new Date().toISOString(),
        });
      eventId = res.body.id;
    });

    it("should update event", async () => {
      const response = await request(app)
        .put(`/api/events/${eventId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Updated Event Title",
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe("Updated Event Title");
    });
  });

  describe("DELETE /api/events/:id", () => {
    let eventId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post("/api/events")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Event to Delete",
          startDate: new Date().toISOString(),
        });
      eventId = res.body.id;
    });

    it("should delete event", async () => {
      const response = await request(app)
        .delete(`/api/events/${eventId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(204);

      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/events/${eventId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });
  });
});
```

#### 3.3 Test Storage Layer

```typescript
// tests/integration/storage/user.storage.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { storage } from "@/server/storage";
import { db } from "@/server/db";
import { families } from "@shared/schema";

describe("UserStorage", () => {
  let testFamilyId: string;

  beforeAll(async () => {
    const [family] = await db.insert(families).values({
      name: "Storage Test Family",
    }).returning();
    testFamilyId = family.id;
  });

  afterAll(async () => {
    await db.delete(families).where(eq(families.id, testFamilyId));
  });

  describe("createUser", () => {
    it("should create user with hashed password", async () => {
      const user = await storage.createUser({
        email: "storage@test.com",
        username: "storagetest",
        password: "PlainPassword123!",
        familyId: testFamilyId,
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe("storage@test.com");
      expect(user.password).not.toBe("PlainPassword123!");

      // Cleanup
      await storage.deleteUser(user.id);
    });
  });

  describe("getUserByEmail", () => {
    it("should find user by email", async () => {
      const created = await storage.createUser({
        email: "findme@test.com",
        username: "findme",
        password: "Password123!",
        familyId: testFamilyId,
      });

      const found = await storage.getUserByEmail("findme@test.com");
      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);

      await storage.deleteUser(created.id);
    });

    it("should return null for non-existent email", async () => {
      const found = await storage.getUserByEmail("notfound@test.com");
      expect(found).toBeNull();
    });
  });
});
```

---

### 4. Component Tests (React Native)

#### 4.1 Setup React Native Testing

```typescript
// tests/setup-rn.ts
import "@testing-library/jest-native/extend-expect";
import { jest } from "@jest/globals";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Mock Expo modules
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: "test-token" })),
}));
```

#### 4.2 Test Components

```typescript
// tests/components/Button.test.tsx
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Button } from "@/components/Button";

describe("Button", () => {
  it("should render with title", () => {
    const { getByText } = render(<Button title="Click Me" onPress={() => {}} />);
    expect(getByText("Click Me")).toBeTruthy();
  });

  it("should call onPress when pressed", () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Click Me" onPress={onPress} />);

    fireEvent.press(getByText("Click Me"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("should be disabled when loading", () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button title="Loading" onPress={onPress} loading />
    );

    fireEvent.press(getByText("Loading"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("should show loading indicator when loading", () => {
    const { getByTestId } = render(
      <Button title="Loading" onPress={() => {}} loading testID="button" />
    );

    expect(getByTestId("button-loading")).toBeTruthy();
  });
});
```

#### 4.3 Test Screens

```typescript
// tests/screens/LoginScreen.test.tsx
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { LoginScreen } from "@/screens/LoginScreen";
import { AuthProvider } from "@/lib/auth";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <AuthProvider>{children}</AuthProvider>
  </QueryClientProvider>
);

describe("LoginScreen", () => {
  it("should render login form", () => {
    const { getByPlaceholderText, getByText } = render(
      <LoginScreen />,
      { wrapper }
    );

    expect(getByPlaceholderText("Email")).toBeTruthy();
    expect(getByPlaceholderText("Password")).toBeTruthy();
    expect(getByText("Accedi")).toBeTruthy();
  });

  it("should show validation error for empty fields", async () => {
    const { getByText, findByText } = render(
      <LoginScreen />,
      { wrapper }
    );

    fireEvent.press(getByText("Accedi"));

    await waitFor(() => {
      expect(findByText(/email.*richiesta/i)).toBeTruthy();
    });
  });

  it("should show error for invalid email format", async () => {
    const { getByPlaceholderText, getByText, findByText } = render(
      <LoginScreen />,
      { wrapper }
    );

    fireEvent.changeText(getByPlaceholderText("Email"), "invalid-email");
    fireEvent.changeText(getByPlaceholderText("Password"), "password123");
    fireEvent.press(getByText("Accedi"));

    await waitFor(() => {
      expect(findByText(/email.*valida/i)).toBeTruthy();
    });
  });
});
```

---

### 5. E2E Tests con Detox

#### 5.1 Configurazione Detox

```javascript
// .detoxrc.js
module.exports = {
  testRunner: {
    args: {
      $0: "jest",
      config: "e2e/jest.config.js",
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    "ios.debug": {
      type: "ios.app",
      binaryPath: "ios/build/Build/Products/Debug-iphonesimulator/KinovaNewStile.app",
      build: "xcodebuild -workspace ios/KinovaNewStile.xcworkspace -scheme KinovaNewStile -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build",
    },
    "android.debug": {
      type: "android.apk",
      binaryPath: "android/app/build/outputs/apk/debug/app-debug.apk",
      build: "cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug",
    },
  },
  devices: {
    simulator: {
      type: "ios.simulator",
      device: { type: "iPhone 15" },
    },
    emulator: {
      type: "android.emulator",
      device: { avdName: "Pixel_5_API_33" },
    },
  },
  configurations: {
    "ios.sim.debug": {
      device: "simulator",
      app: "ios.debug",
    },
    "android.emu.debug": {
      device: "emulator",
      app: "android.debug",
    },
  },
};
```

#### 5.2 Test E2E

```typescript
// e2e/auth.e2e.ts
import { device, element, by, expect } from "detox";

describe("Authentication Flow", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it("should show login screen on first launch", async () => {
    await expect(element(by.id("login-screen"))).toBeVisible();
    await expect(element(by.id("email-input"))).toBeVisible();
    await expect(element(by.id("password-input"))).toBeVisible();
  });

  it("should login with valid credentials", async () => {
    await element(by.id("email-input")).typeText("test@example.com");
    await element(by.id("password-input")).typeText("Password123!");
    await element(by.id("login-button")).tap();

    // Wait for home screen
    await waitFor(element(by.id("home-screen")))
      .toBeVisible()
      .withTimeout(5000);

    await expect(element(by.id("home-screen"))).toBeVisible();
  });

  it("should show error for invalid credentials", async () => {
    await element(by.id("email-input")).typeText("wrong@example.com");
    await element(by.id("password-input")).typeText("wrongpassword");
    await element(by.id("login-button")).tap();

    await waitFor(element(by.text(/credenziali.*errate/i)))
      .toBeVisible()
      .withTimeout(3000);
  });

  it("should navigate to register screen", async () => {
    await element(by.id("register-link")).tap();
    await expect(element(by.id("register-screen"))).toBeVisible();
  });
});
```

```typescript
// e2e/events.e2e.ts
import { device, element, by, expect, waitFor } from "detox";

describe("Events Flow", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    // Login
    await element(by.id("email-input")).typeText("test@example.com");
    await element(by.id("password-input")).typeText("Password123!");
    await element(by.id("login-button")).tap();
    await waitFor(element(by.id("home-screen"))).toBeVisible().withTimeout(5000);
  });

  it("should navigate to calendar", async () => {
    await element(by.id("tab-calendar")).tap();
    await expect(element(by.id("calendar-screen"))).toBeVisible();
  });

  it("should create new event", async () => {
    await element(by.id("add-event-button")).tap();

    await element(by.id("event-title-input")).typeText("Test Event");
    await element(by.id("event-description-input")).typeText("Test Description");

    // Select date
    await element(by.id("date-picker")).tap();
    await element(by.id("confirm-date")).tap();

    await element(by.id("save-event-button")).tap();

    // Verify event appears
    await waitFor(element(by.text("Test Event")))
      .toBeVisible()
      .withTimeout(3000);
  });

  it("should edit existing event", async () => {
    await element(by.text("Test Event")).tap();
    await element(by.id("edit-event-button")).tap();

    await element(by.id("event-title-input")).clearText();
    await element(by.id("event-title-input")).typeText("Updated Event");

    await element(by.id("save-event-button")).tap();

    await waitFor(element(by.text("Updated Event")))
      .toBeVisible()
      .withTimeout(3000);
  });

  it("should delete event", async () => {
    await element(by.text("Updated Event")).tap();
    await element(by.id("delete-event-button")).tap();
    await element(by.id("confirm-delete")).tap();

    await waitFor(element(by.text("Updated Event")))
      .not.toBeVisible()
      .withTimeout(3000);
  });
});
```

---

### 6. Scripts NPM per Test

```json
// Aggiunte a package.json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:unit": "vitest --testPathPattern=tests/unit",
    "test:integration": "vitest --testPathPattern=tests/integration",
    "test:e2e:ios": "detox test --configuration ios.sim.debug",
    "test:e2e:android": "detox test --configuration android.emu.debug",
    "test:e2e:build:ios": "detox build --configuration ios.sim.debug",
    "test:e2e:build:android": "detox build --configuration android.emu.debug",
    "test:ci": "vitest --coverage --reporter=junit --outputFile=test-results.xml"
  }
}
```

---

## Prioritizzazione

### Fase 1: Fondamenta (1-2 settimane)

| Priorità | Task | Impatto |
|----------|------|---------|
| 1 | Setup framework test (Vitest) | Alto |
| 2 | Unit test per utilities critiche | Alto |
| 3 | Integration test per auth API | Alto |
| 4 | Refactoring routes.ts | Medio |

### Fase 2: Stabilizzazione (2-3 settimane)

| Priorità | Task | Impatto |
|----------|------|---------|
| 5 | Integration test per tutte le API | Alto |
| 6 | Component test per UI critica | Medio |
| 7 | Refactoring storage.ts | Medio |
| 8 | Implementare caching layer | Medio |

### Fase 3: Maturità (3-4 settimane)

| Priorità | Task | Impatto |
|----------|------|---------|
| 9 | Setup E2E con Detox | Alto |
| 10 | E2E test flussi critici | Alto |
| 11 | Refactoring assistant.ts | Medio |
| 12 | Documentazione API completa | Basso |

### Fase 4: Eccellenza (Ongoing)

| Priorità | Task | Impatto |
|----------|------|---------|
| 13 | CI/CD pipeline con test | Alto |
| 14 | Performance monitoring | Medio |
| 15 | Security audit automatizzato | Alto |
| 16 | Test coverage > 80% | Medio |

---

## Metriche di Successo

### Coverage Target

| Area | Target Minimo | Target Ideale |
|------|---------------|---------------|
| Unit Tests | 70% | 85% |
| Integration Tests | 60% | 75% |
| E2E Tests | Flussi critici | Tutti i flussi |
| Overall | 65% | 80% |

### Quality Gates

```yaml
# .github/workflows/quality.yml
quality-gates:
  coverage-threshold: 70%
  max-critical-issues: 0
  max-major-issues: 5
  test-pass-rate: 100%
  build-success: required
  type-check: required
  lint-pass: required
```

### KPI da Monitorare

| Metrica | Obiettivo |
|---------|-----------|
| Test Pass Rate | 100% |
| Code Coverage | > 70% |
| Build Time | < 5 min |
| E2E Test Time | < 15 min |
| Bug Escape Rate | < 5% |
| Technical Debt Ratio | < 5% |

---

## Struttura Directory Test Finale

```
tests/
├── setup.ts                    # Setup globale
├── setup-rn.ts                 # Setup React Native
├── helpers/
│   ├── index.ts
│   ├── auth.ts                 # Helper autenticazione test
│   ├── db.ts                   # Helper database test
│   └── fixtures.ts             # Dati di test
├── mocks/
│   ├── server.ts               # MSW server
│   ├── handlers/
│   │   ├── auth.ts
│   │   ├── events.ts
│   │   └── ...
│   └── data/
│       ├── users.ts
│       ├── events.ts
│       └── ...
├── unit/
│   ├── utils/
│   ├── schema/
│   ├── auth/
│   └── components/
├── integration/
│   ├── api/
│   └── storage/
└── e2e/
    ├── jest.config.js
    ├── auth.e2e.ts
    ├── events.e2e.ts
    ├── tasks.e2e.ts
    └── shopping.e2e.ts
```

---

## Conclusione

Questo piano fornisce una roadmap completa per migliorare la qualità del codice e implementare una suite di test robusta per Kinova NewStile. L'implementazione graduale permette di mantenere la velocità di sviluppo mentre si costruisce una base solida per la manutenibilità a lungo termine.
