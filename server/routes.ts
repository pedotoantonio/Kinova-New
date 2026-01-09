import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { UserRole } from "@shared/schema";

const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

function createToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  if (stored.includes(":")) {
    const [salt, hash] = stored.split(":");
    const testHash = scryptSync(password, salt, 64).toString("hex");
    return timingSafeEqual(Buffer.from(hash), Buffer.from(testHash));
  }
  return Buffer.from(password).toString("base64") === stored;
}

function generateInviteCode(): string {
  return randomBytes(6).toString("base64url").toUpperCase().slice(0, 8);
}

let lastCleanupTime = 0;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

async function maybeCleanupExpiredSessions() {
  const now = Date.now();
  if (now - lastCleanupTime > CLEANUP_INTERVAL_MS) {
    lastCleanupTime = now;
    try {
      const cleaned = await storage.cleanExpiredSessions();
      if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} expired sessions`);
      }
    } catch (error) {
      console.error("Session cleanup error:", error);
    }
  }
}

async function issueTokens(userId: string, familyId: string, role: UserRole): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const accessToken = createToken();
  const refreshToken = createToken();
  const now = Date.now();

  await storage.createSession({
    token: accessToken,
    userId,
    familyId,
    role,
    type: "access",
    expiresAt: new Date(now + ACCESS_TOKEN_EXPIRY_MS),
  });

  await storage.createSession({
    token: refreshToken,
    userId,
    familyId,
    role,
    type: "refresh",
    expiresAt: new Date(now + REFRESH_TOKEN_EXPIRY_MS),
  });

  maybeCleanupExpiredSessions();

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY_MS / 1000,
  };
}

interface AuthRequest extends Request {
  auth?: {
    userId: string;
    familyId: string;
    role: UserRole;
    tokenId: string;
  };
}

async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const token = authHeader.slice(7);
  
  try {
    const session = await storage.getSession(token);

    if (!session) {
      return res.status(401).json({ error: "Invalid token" });
    }

    if (new Date(session.expiresAt) < new Date()) {
      await storage.deleteSession(token);
      return res.status(401).json({ error: "Token expired" });
    }

    if (session.type !== "access") {
      return res.status(401).json({ error: "Invalid token type" });
    }

    req.auth = {
      userId: session.userId,
      familyId: session.familyId,
      role: session.role,
      tokenId: token,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Authentication error" });
  }
}

function requireRoles(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, password, displayName, familyName } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ error: "Username already exists" });
      }

      const family = await storage.createFamily({ name: familyName || `${username}'s Family` });

      const user = await storage.createUser({
        username,
        password: hashPassword(password),
        displayName: displayName || username,
        familyId: family.id,
        role: "admin",
      });

      const tokenData = await issueTokens(user.id, user.familyId, user.role);

      res.status(201).json({
        ...tokenData,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          familyId: user.familyId,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user || !verifyPassword(password, user.password)) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const tokenData = await issueTokens(user.id, user.familyId, user.role);

      res.json({
        ...tokenData,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          familyId: user.familyId,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/guest", async (req: Request, res: Response) => {
    try {
      const guestId = randomUUID().slice(0, 8);
      const username = `guest_${guestId}`;

      const family = await storage.createFamily({ name: `Guest Family ${guestId}` });

      const user = await storage.createUser({
        username,
        password: hashPassword(guestId),
        displayName: `Guest ${guestId}`,
        familyId: family.id,
        role: "admin",
      });

      const tokenData = await issueTokens(user.id, user.familyId, user.role);

      res.status(201).json({
        ...tokenData,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          familyId: user.familyId,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Guest login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/refresh", async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: "Refresh token required" });
      }

      const session = await storage.getSession(refreshToken);

      if (!session) {
        return res.status(401).json({ error: "Invalid refresh token" });
      }

      if (session.type !== "refresh") {
        return res.status(401).json({ error: "Invalid token type" });
      }

      if (new Date(session.expiresAt) < new Date()) {
        await storage.deleteSession(refreshToken);
        return res.status(401).json({ error: "Refresh token expired" });
      }

      await storage.deleteSession(refreshToken);

      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const newTokens = await issueTokens(user.id, user.familyId, user.role);

      res.json({
        ...newTokens,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          familyId: user.familyId,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Refresh error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        await storage.deleteSession(token);
      }

      const { refreshToken } = req.body;
      if (refreshToken) {
        await storage.deleteSession(refreshToken);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Logout error:", error);
      res.json({ success: true });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.auth!.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      res.json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        familyId: user.familyId,
        role: user.role,
        avatarUrl: user.avatarUrl,
      });
    } catch (error) {
      console.error("Get me error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/family", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const family = await storage.getFamily(req.auth!.familyId);
      if (!family) {
        return res.status(404).json({ error: "Family not found" });
      }

      res.json(family);
    } catch (error) {
      console.error("Get family error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/family", authMiddleware, requireRoles("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { name, city, cityLat, cityLon } = req.body;

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (city !== undefined) updateData.city = city;
      if (cityLat !== undefined) updateData.cityLat = cityLat;
      if (cityLon !== undefined) updateData.cityLon = cityLon;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      const updated = await storage.updateFamily(req.auth!.familyId, updateData as any);
      if (!updated) {
        return res.status(404).json({ error: "Family not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Update family error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/family/members", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const members = await storage.getFamilyMembers(req.auth!.familyId);

      res.json(
        members.map((m) => ({
          id: m.id,
          username: m.username,
          displayName: m.displayName,
          avatarUrl: m.avatarUrl,
          role: m.role,
        }))
      );
    } catch (error) {
      console.error("Get family members error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/family/invite", authMiddleware, requireRoles("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { role = "member", email } = req.body;

      if (!["member", "child"].includes(role)) {
        return res.status(400).json({ error: "Invalid role. Must be 'member' or 'child'" });
      }

      const code = generateInviteCode();
      const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);

      const invite = await storage.createInvite({
        familyId: req.auth!.familyId,
        code,
        role: role as UserRole,
        expiresAt,
        createdBy: req.auth!.userId,
        email,
      });

      res.status(201).json({
        id: invite.id,
        code: invite.code,
        role: invite.role,
        expiresAt: invite.expiresAt,
      });
    } catch (error) {
      console.error("Create invite error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/family/invites", authMiddleware, requireRoles("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const invites = await storage.getActiveInvitesByFamily(req.auth!.familyId);

      res.json(
        invites.map((i) => ({
          id: i.id,
          code: i.code,
          role: i.role,
          email: i.email,
          expiresAt: i.expiresAt,
          createdAt: i.createdAt,
        }))
      );
    } catch (error) {
      console.error("Get invites error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/family/join", async (req: Request, res: Response) => {
    try {
      const { code, username, password, displayName } = req.body;

      if (!code) {
        return res.status(400).json({ error: "Invite code required" });
      }

      const invite = await storage.getInviteByCode(code);
      if (!invite) {
        return res.status(404).json({ error: "Invalid or expired invite code" });
      }

      if (invite.expiresAt < new Date()) {
        return res.status(410).json({ error: "Invite code has expired" });
      }

      if (invite.acceptedAt) {
        return res.status(410).json({ error: "Invite code has already been used" });
      }

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ error: "Username already exists" });
      }

      const user = await storage.createUser({
        username,
        password: hashPassword(password),
        displayName: displayName || username,
        familyId: invite.familyId,
        role: invite.role,
      });

      await storage.acceptInvite(invite.id, user.id);

      const tokenData = await issueTokens(user.id, user.familyId, user.role);

      res.status(201).json({
        ...tokenData,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          familyId: user.familyId,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Join family error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/family/members/:memberId", authMiddleware, requireRoles("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { memberId } = req.params;

      if (memberId === req.auth!.userId) {
        return res.status(400).json({ error: { code: "SELF_REMOVAL", message: "Cannot remove yourself" } });
      }

      const member = await storage.getUser(memberId);
      if (!member) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Member not found" } });
      }

      if (member.familyId !== req.auth!.familyId) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Member does not belong to your family" } });
      }

      const guestFamily = await storage.createFamily({ name: `${member.username}'s Family` });
      await storage.updateUser(memberId, { familyId: guestFamily.id, role: "admin" });

      res.json({ success: true });
    } catch (error) {
      console.error("Remove member error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.get("/api/events", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { from, to, category, assignedTo } = req.query;
      const fromDate = from ? new Date(from as string) : undefined;
      const toDate = to ? new Date(to as string) : undefined;
      const filters: { category?: "family" | "course" | "shift" | "vacation" | "holiday" | "other"; assignedTo?: string } = {};
      if (category && ["family", "course", "shift", "vacation", "holiday", "other"].includes(category as string)) {
        filters.category = category as "family" | "course" | "shift" | "vacation" | "holiday" | "other";
      }
      if (assignedTo) {
        filters.assignedTo = assignedTo as string;
      }
      
      const events = await storage.getEvents(req.auth!.familyId, fromDate, toDate, Object.keys(filters).length > 0 ? filters : undefined);
      
      const eventsWithRecurrence = await Promise.all(events.map(async (e) => {
        const recurrence = await storage.getEventRecurrence(e.id);
        return {
          id: e.id,
          familyId: e.familyId,
          title: e.title,
          shortCode: e.shortCode,
          description: e.description,
          startDate: e.startDate.toISOString(),
          endDate: e.endDate?.toISOString() || null,
          allDay: e.allDay,
          color: e.color,
          category: e.category,
          assignedTo: e.assignedTo,
          isHoliday: e.isHoliday,
          createdBy: e.createdBy,
          createdAt: e.createdAt.toISOString(),
          updatedAt: e.updatedAt.toISOString(),
          recurrence: recurrence ? {
            frequency: recurrence.frequency,
            interval: recurrence.interval,
            endDate: recurrence.endDate?.toISOString() || null,
            byWeekday: recurrence.byWeekday,
          } : null,
        };
      }));
      
      res.json(eventsWithRecurrence);
    } catch (error) {
      console.error("Get events error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.post("/api/events", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { title, shortCode, description, startDate, endDate, allDay, color, category, assignedTo, isHoliday, recurrence } = req.body;
      
      if (!title || !startDate) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Title and startDate are required" } });
      }
      
      const validCategories = ["family", "course", "shift", "vacation", "holiday", "other"];
      const eventCategory = validCategories.includes(category) ? category : "family";
      
      const event = await storage.createEvent({
        familyId: req.auth!.familyId,
        title,
        shortCode: shortCode || null,
        description: description || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        allDay: allDay ?? false,
        color: color || null,
        category: eventCategory,
        assignedTo: assignedTo || null,
        isHoliday: isHoliday ?? false,
        createdBy: req.auth!.userId,
      });
      
      let eventRecurrence = null;
      if (recurrence && recurrence.frequency) {
        const validFrequencies = ["daily", "weekly", "monthly"];
        if (validFrequencies.includes(recurrence.frequency)) {
          eventRecurrence = await storage.createEventRecurrence({
            eventId: event.id,
            frequency: recurrence.frequency,
            interval: recurrence.interval || 1,
            endDate: recurrence.endDate ? new Date(recurrence.endDate) : null,
            byWeekday: recurrence.byWeekday || null,
          });
        }
      }
      
      res.status(201).json({
        id: event.id,
        familyId: event.familyId,
        title: event.title,
        shortCode: event.shortCode,
        description: event.description,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate?.toISOString() || null,
        allDay: event.allDay,
        color: event.color,
        category: event.category,
        assignedTo: event.assignedTo,
        isHoliday: event.isHoliday,
        createdBy: event.createdBy,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
        recurrence: eventRecurrence ? {
          frequency: eventRecurrence.frequency,
          interval: eventRecurrence.interval,
          endDate: eventRecurrence.endDate?.toISOString() || null,
          byWeekday: eventRecurrence.byWeekday,
        } : null,
      });
    } catch (error) {
      console.error("Create event error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.put("/api/events/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { title, shortCode, description, startDate, endDate, allDay, color, category, assignedTo, isHoliday, recurrence } = req.body;
      
      const existing = await storage.getEvent(id, req.auth!.familyId);
      if (!existing) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Event not found" } });
      }
      
      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates.title = title;
      if (shortCode !== undefined) updates.shortCode = shortCode || null;
      if (description !== undefined) updates.description = description;
      if (startDate !== undefined) updates.startDate = new Date(startDate);
      if (endDate !== undefined) updates.endDate = endDate ? new Date(endDate) : null;
      if (allDay !== undefined) updates.allDay = allDay;
      if (color !== undefined) updates.color = color;
      if (category !== undefined) {
        const validCategories = ["family", "course", "shift", "vacation", "holiday", "other"];
        updates.category = validCategories.includes(category) ? category : "family";
      }
      if (assignedTo !== undefined) updates.assignedTo = assignedTo || null;
      if (isHoliday !== undefined) updates.isHoliday = isHoliday;
      
      const event = await storage.updateEvent(id, req.auth!.familyId, updates);
      if (!event) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Event not found" } });
      }
      
      let eventRecurrence = await storage.getEventRecurrence(id);
      if (recurrence !== undefined) {
        if (recurrence === null) {
          await storage.deleteEventRecurrence(id);
          eventRecurrence = undefined;
        } else if (recurrence.frequency) {
          const validFrequencies = ["daily", "weekly", "monthly"];
          if (validFrequencies.includes(recurrence.frequency)) {
            if (eventRecurrence) {
              eventRecurrence = await storage.updateEventRecurrence(id, {
                frequency: recurrence.frequency,
                interval: recurrence.interval || 1,
                endDate: recurrence.endDate ? new Date(recurrence.endDate) : null,
                byWeekday: recurrence.byWeekday || null,
              });
            } else {
              eventRecurrence = await storage.createEventRecurrence({
                eventId: id,
                frequency: recurrence.frequency,
                interval: recurrence.interval || 1,
                endDate: recurrence.endDate ? new Date(recurrence.endDate) : null,
                byWeekday: recurrence.byWeekday || null,
              });
            }
          }
        }
      }
      
      res.json({
        id: event.id,
        familyId: event.familyId,
        title: event.title,
        shortCode: event.shortCode,
        description: event.description,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate?.toISOString() || null,
        allDay: event.allDay,
        color: event.color,
        category: event.category,
        assignedTo: event.assignedTo,
        isHoliday: event.isHoliday,
        createdBy: event.createdBy,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
        recurrence: eventRecurrence ? {
          frequency: eventRecurrence.frequency,
          interval: eventRecurrence.interval,
          endDate: eventRecurrence.endDate?.toISOString() || null,
          byWeekday: eventRecurrence.byWeekday,
        } : null,
      });
    } catch (error) {
      console.error("Update event error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.delete("/api/events/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      const existing = await storage.getEvent(id, req.auth!.familyId);
      if (!existing) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Event not found" } });
      }
      
      await storage.deleteEvent(id, req.auth!.familyId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete event error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.get("/api/tasks", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { completed, assignedTo } = req.query;
      const filters: { completed?: boolean; assignedTo?: string } = {};
      if (completed !== undefined) filters.completed = completed === "true";
      if (assignedTo) filters.assignedTo = assignedTo as string;
      
      const tasks = await storage.getTasks(req.auth!.familyId, filters);
      res.json(tasks.map(t => ({
        id: t.id,
        familyId: t.familyId,
        title: t.title,
        description: t.description,
        completed: t.completed,
        dueDate: t.dueDate?.toISOString() || null,
        assignedTo: t.assignedTo,
        priority: t.priority,
        createdBy: t.createdBy,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })));
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.post("/api/tasks", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { title, description, dueDate, assignedTo, priority } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Title is required" } });
      }
      
      const task = await storage.createTask({
        familyId: req.auth!.familyId,
        title,
        description: description || null,
        completed: false,
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedTo: assignedTo || null,
        priority: priority || "medium",
        createdBy: req.auth!.userId,
      });
      
      res.status(201).json({
        id: task.id,
        familyId: task.familyId,
        title: task.title,
        description: task.description,
        completed: task.completed,
        dueDate: task.dueDate?.toISOString() || null,
        assignedTo: task.assignedTo,
        priority: task.priority,
        createdBy: task.createdBy,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Create task error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.put("/api/tasks/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { title, description, completed, dueDate, assignedTo, priority } = req.body;
      
      const existing = await storage.getTask(id, req.auth!.familyId);
      if (!existing) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Task not found" } });
      }
      
      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (completed !== undefined) updates.completed = completed;
      if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;
      if (assignedTo !== undefined) updates.assignedTo = assignedTo;
      if (priority !== undefined) updates.priority = priority;
      
      const task = await storage.updateTask(id, req.auth!.familyId, updates);
      if (!task) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Task not found" } });
      }
      
      res.json({
        id: task.id,
        familyId: task.familyId,
        title: task.title,
        description: task.description,
        completed: task.completed,
        dueDate: task.dueDate?.toISOString() || null,
        assignedTo: task.assignedTo,
        priority: task.priority,
        createdBy: task.createdBy,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Update task error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.delete("/api/tasks/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      const existing = await storage.getTask(id, req.auth!.familyId);
      if (!existing) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Task not found" } });
      }
      
      await storage.deleteTask(id, req.auth!.familyId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.get("/api/shopping", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { purchased, category } = req.query;
      const filters: { purchased?: boolean; category?: string } = {};
      if (purchased !== undefined) filters.purchased = purchased === "true";
      if (category) filters.category = category as string;
      
      const items = await storage.getShoppingItems(req.auth!.familyId, filters);
      res.json(items.map(i => ({
        id: i.id,
        familyId: i.familyId,
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        category: i.category,
        purchased: i.purchased,
        createdBy: i.createdBy,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
      })));
    } catch (error) {
      console.error("Get shopping items error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.post("/api/shopping", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { name, quantity, unit, category } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Name is required" } });
      }
      
      const item = await storage.createShoppingItem({
        familyId: req.auth!.familyId,
        name,
        quantity: quantity ?? 1,
        unit: unit || null,
        category: category || null,
        purchased: false,
        createdBy: req.auth!.userId,
      });
      
      res.status(201).json({
        id: item.id,
        familyId: item.familyId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        purchased: item.purchased,
        createdBy: item.createdBy,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Create shopping item error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.put("/api/shopping/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { name, quantity, unit, category, purchased } = req.body;
      
      const existing = await storage.getShoppingItem(id, req.auth!.familyId);
      if (!existing) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Shopping item not found" } });
      }
      
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (quantity !== undefined) updates.quantity = quantity;
      if (unit !== undefined) updates.unit = unit;
      if (category !== undefined) updates.category = category;
      if (purchased !== undefined) updates.purchased = purchased;
      
      const item = await storage.updateShoppingItem(id, req.auth!.familyId, updates);
      if (!item) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Shopping item not found" } });
      }
      
      res.json({
        id: item.id,
        familyId: item.familyId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        purchased: item.purchased,
        createdBy: item.createdBy,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Update shopping item error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.delete("/api/shopping/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      const existing = await storage.getShoppingItem(id, req.auth!.familyId);
      if (!existing) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Shopping item not found" } });
      }
      
      await storage.deleteShoppingItem(id, req.auth!.familyId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete shopping item error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.get("/api/expenses", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { from, to, category, paidBy } = req.query;
      const filters: { from?: Date; to?: Date; category?: string; paidBy?: string } = {};
      if (from) filters.from = new Date(from as string);
      if (to) filters.to = new Date(to as string);
      if (category) filters.category = category as string;
      if (paidBy) filters.paidBy = paidBy as string;
      
      const expenses = await storage.getExpenses(req.auth!.familyId, filters);
      res.json(expenses.map(e => ({
        id: e.id,
        familyId: e.familyId,
        amount: parseFloat(e.amount),
        description: e.description,
        category: e.category,
        paidBy: e.paidBy,
        date: e.date.toISOString(),
        createdBy: e.createdBy,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })));
    } catch (error) {
      console.error("Get expenses error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.post("/api/expenses", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { amount, description, category, paidBy, date } = req.body;
      
      if (amount === undefined || !description || !paidBy || !date) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Amount, description, paidBy, and date are required" } });
      }
      
      const expense = await storage.createExpense({
        familyId: req.auth!.familyId,
        amount: amount.toString(),
        description,
        category: category || null,
        paidBy,
        date: new Date(date),
        createdBy: req.auth!.userId,
      });
      
      res.status(201).json({
        id: expense.id,
        familyId: expense.familyId,
        amount: parseFloat(expense.amount),
        description: expense.description,
        category: expense.category,
        paidBy: expense.paidBy,
        date: expense.date.toISOString(),
        createdBy: expense.createdBy,
        createdAt: expense.createdAt.toISOString(),
        updatedAt: expense.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Create expense error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.put("/api/expenses/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { amount, description, category, paidBy, date } = req.body;
      
      const existing = await storage.getExpense(id, req.auth!.familyId);
      if (!existing) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Expense not found" } });
      }
      
      const updates: Record<string, unknown> = {};
      if (amount !== undefined) updates.amount = amount.toString();
      if (description !== undefined) updates.description = description;
      if (category !== undefined) updates.category = category;
      if (paidBy !== undefined) updates.paidBy = paidBy;
      if (date !== undefined) updates.date = new Date(date);
      
      const expense = await storage.updateExpense(id, req.auth!.familyId, updates);
      if (!expense) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Expense not found" } });
      }
      
      res.json({
        id: expense.id,
        familyId: expense.familyId,
        amount: parseFloat(expense.amount),
        description: expense.description,
        category: expense.category,
        paidBy: expense.paidBy,
        date: expense.date.toISOString(),
        createdBy: expense.createdBy,
        createdAt: expense.createdAt.toISOString(),
        updatedAt: expense.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Update expense error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.delete("/api/expenses/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      const existing = await storage.getExpense(id, req.auth!.familyId);
      if (!existing) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Expense not found" } });
      }
      
      await storage.deleteExpense(id, req.auth!.familyId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete expense error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.post("/api/assistant", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Message is required" } });
      }
      
      res.json({
        message: "AI Assistant is not yet implemented. This is a placeholder response.",
        suggestions: ["Create a task", "Add an event", "Check shopping list"],
      });
    } catch (error) {
      console.error("Assistant error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
