import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { UserRole } from "@shared/schema";

const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

interface TokenData {
  userId: string;
  familyId: string;
  role: UserRole;
  type: "access" | "refresh";
  expiresAt: number;
}

const tokens = new Map<string, TokenData>();

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

function issueTokens(userId: string, familyId: string, role: UserRole): { accessToken: string; refreshToken: string; expiresIn: number } {
  const accessToken = createToken();
  const refreshToken = createToken();
  const now = Date.now();

  tokens.set(accessToken, {
    userId,
    familyId,
    role,
    type: "access",
    expiresAt: now + ACCESS_TOKEN_EXPIRY_MS,
  });

  tokens.set(refreshToken, {
    userId,
    familyId,
    role,
    type: "refresh",
    expiresAt: now + REFRESH_TOKEN_EXPIRY_MS,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY_MS / 1000,
  };
}

function cleanExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of tokens.entries()) {
    if (data.expiresAt < now) {
      tokens.delete(token);
    }
  }
}

interface AuthRequest extends Request {
  auth?: {
    userId: string;
    familyId: string;
    role: UserRole;
    tokenId: string;
  };
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  cleanExpiredTokens();

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const token = authHeader.slice(7);
  const tokenData = tokens.get(token);

  if (!tokenData) {
    return res.status(401).json({ error: "Invalid token" });
  }

  if (tokenData.expiresAt < Date.now()) {
    tokens.delete(token);
    return res.status(401).json({ error: "Token expired" });
  }

  if (tokenData.type !== "access") {
    return res.status(401).json({ error: "Invalid token type" });
  }

  req.auth = {
    userId: tokenData.userId,
    familyId: tokenData.familyId,
    role: tokenData.role,
    tokenId: token,
  };

  next();
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

      const tokenData = issueTokens(user.id, user.familyId, user.role);

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

      const tokenData = issueTokens(user.id, user.familyId, user.role);

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

      const tokenData = issueTokens(user.id, user.familyId, user.role);

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

      const tokenData = tokens.get(refreshToken);

      if (!tokenData) {
        return res.status(401).json({ error: "Invalid refresh token" });
      }

      if (tokenData.type !== "refresh") {
        return res.status(401).json({ error: "Invalid token type" });
      }

      if (tokenData.expiresAt < Date.now()) {
        tokens.delete(refreshToken);
        return res.status(401).json({ error: "Refresh token expired" });
      }

      tokens.delete(refreshToken);

      const user = await storage.getUser(tokenData.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const newTokens = issueTokens(user.id, user.familyId, user.role);

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
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      tokens.delete(token);
    }

    const { refreshToken } = req.body;
    if (refreshToken) {
      tokens.delete(refreshToken);
    }

    res.json({ success: true });
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

      const tokenData = issueTokens(user.id, user.familyId, user.role);

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
        return res.status(400).json({ error: "Cannot remove yourself" });
      }

      const member = await storage.getUser(memberId);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      if (member.familyId !== req.auth!.familyId) {
        return res.status(403).json({ error: "Member does not belong to your family" });
      }

      const guestFamily = await storage.createFamily({ name: `${member.username}'s Family` });
      await storage.updateUser(memberId, { familyId: guestFamily.id, role: "admin" });

      res.json({ success: true });
    } catch (error) {
      console.error("Remove member error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
