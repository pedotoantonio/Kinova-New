import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { randomUUID } from "crypto";

const sessions = new Map<string, { userId: string; familyId: string | null }>();

function createToken(): string {
  return randomUUID();
}

function hashPassword(password: string): string {
  return Buffer.from(password).toString("base64");
}

function verifyPassword(password: string, hash: string): boolean {
  return Buffer.from(password).toString("base64") === hash;
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
      });

      const token = createToken();
      sessions.set(token, { userId: user.id, familyId: user.familyId });

      res.status(201).json({
        accessToken: token,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          familyId: user.familyId,
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

      const token = createToken();
      sessions.set(token, { userId: user.id, familyId: user.familyId });

      res.json({
        accessToken: token,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          familyId: user.familyId,
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
      });

      const token = createToken();
      sessions.set(token, { userId: user.id, familyId: user.familyId });

      res.status(201).json({
        accessToken: token,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          familyId: user.familyId,
        },
      });
    } catch (error) {
      console.error("Guest login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      sessions.delete(token);
    }
    res.json({ success: true });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const token = authHeader.slice(7);
      const session = sessions.get(token);
      if (!session) {
        return res.status(401).json({ error: "Invalid session" });
      }

      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      res.json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        familyId: user.familyId,
        avatarUrl: user.avatarUrl,
      });
    } catch (error) {
      console.error("Get me error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/family", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const token = authHeader.slice(7);
      const session = sessions.get(token);
      if (!session) {
        return res.status(401).json({ error: "Invalid session" });
      }

      if (!session.familyId) {
        return res.status(404).json({ error: "No family associated" });
      }

      const family = await storage.getFamily(session.familyId);
      if (!family) {
        return res.status(404).json({ error: "Family not found" });
      }

      res.json(family);
    } catch (error) {
      console.error("Get family error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/family/members", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const token = authHeader.slice(7);
      const session = sessions.get(token);
      if (!session) {
        return res.status(401).json({ error: "Invalid session" });
      }

      if (!session.familyId) {
        return res.status(404).json({ error: "No family associated" });
      }

      const members = await storage.getFamilyMembers(session.familyId);

      res.json(
        members.map((m) => ({
          id: m.id,
          username: m.username,
          displayName: m.displayName,
          avatarUrl: m.avatarUrl,
        }))
      );
    } catch (error) {
      console.error("Get family members error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
