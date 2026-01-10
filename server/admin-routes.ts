import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { AdminRole } from "@shared/schema";

const ADMIN_ACCESS_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const ADMIN_RATE_LIMIT_MAX = 5;
const ADMIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, "hex");
  const suppliedBuffer = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuffer, suppliedBuffer);
}

function createToken(): string {
  return randomBytes(32).toString("base64url");
}

interface AdminAuthRequest extends Request {
  adminAuth?: {
    adminId: string;
    role: AdminRole;
    tokenId: string;
  };
}

const adminLoginAttempts = new Map<string, { count: number; firstAttempt: number }>();

function checkRateLimit(email: string): { allowed: boolean; retryAfterMinutes?: number } {
  const now = Date.now();
  const attempts = adminLoginAttempts.get(email);
  
  if (!attempts) return { allowed: true };
  
  if (now - attempts.firstAttempt > ADMIN_RATE_LIMIT_WINDOW_MS) {
    adminLoginAttempts.delete(email);
    return { allowed: true };
  }
  
  if (attempts.count >= ADMIN_RATE_LIMIT_MAX) {
    const retryAfterMinutes = Math.ceil((attempts.firstAttempt + ADMIN_RATE_LIMIT_WINDOW_MS - now) / 60000);
    return { allowed: false, retryAfterMinutes };
  }
  
  return { allowed: true };
}

function recordLoginAttempt(email: string, success: boolean): void {
  if (success) {
    adminLoginAttempts.delete(email);
    return;
  }
  
  const now = Date.now();
  const attempts = adminLoginAttempts.get(email);
  
  if (!attempts || now - attempts.firstAttempt > ADMIN_RATE_LIMIT_WINDOW_MS) {
    adminLoginAttempts.set(email, { count: 1, firstAttempt: now });
  } else {
    attempts.count++;
  }
}

async function adminAuthMiddleware(req: AdminAuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const token = authHeader.slice(7);
  
  try {
    const session = await storage.getAdminSession(token);

    if (!session) {
      return res.status(401).json({ error: "Invalid token" });
    }

    if (new Date(session.expiresAt) < new Date()) {
      await storage.deleteAdminSession(token);
      return res.status(401).json({ error: "Token expired" });
    }

    req.adminAuth = {
      adminId: session.adminId,
      role: session.role,
      tokenId: token,
    };

    next();
  } catch (error) {
    console.error("Admin auth middleware error:", error);
    return res.status(500).json({ error: "Authentication error" });
  }
}

function requireAdminRoles(...allowedRoles: AdminRole[]) {
  return (req: AdminAuthRequest, res: Response, next: NextFunction) => {
    if (!req.adminAuth) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!allowedRoles.includes(req.adminAuth.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
}

async function logAuditAction(
  adminId: string | null,
  action: string,
  targetType: string | null,
  targetId: string | null,
  result: string,
  ipAddress: string | null,
  details?: string
) {
  try {
    await storage.createAdminAuditLog({
      adminId,
      action,
      targetType,
      targetId,
      result,
      ipAddress,
      details,
    });
  } catch (error) {
    console.error("Failed to log audit action:", error);
  }
}

export function registerAdminRoutes(app: Express): void {
  // ========== AUTH ROUTES ==========
  
  app.post("/api/admin/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress || null;

      if (!email || !password) {
        return res.status(400).json({ error: { code: "MISSING_FIELDS", message: "Email and password required" } });
      }

      const rateCheck = checkRateLimit(email);
      if (!rateCheck.allowed) {
        await logAuditAction(null, "ADMIN_LOGIN_RATE_LIMITED", "admin", null, "failure", ipAddress, email);
        return res.status(429).json({ 
          error: { 
            code: "RATE_LIMITED", 
            message: "Too many login attempts",
            retryAfterMinutes: rateCheck.retryAfterMinutes
          } 
        });
      }

      const admin = await storage.getAdminByEmail(email);
      if (!admin || !verifyPassword(password, admin.password)) {
        recordLoginAttempt(email, false);
        await logAuditAction(null, "ADMIN_LOGIN_FAILED", "admin", null, "failure", ipAddress, email);
        return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" } });
      }

      if (!admin.isActive) {
        await logAuditAction(admin.id, "ADMIN_LOGIN_INACTIVE", "admin", admin.id, "failure", ipAddress);
        return res.status(403).json({ error: { code: "ACCOUNT_INACTIVE", message: "Account is inactive" } });
      }

      recordLoginAttempt(email, true);

      const token = createToken();
      await storage.createAdminSession({
        token,
        adminId: admin.id,
        role: admin.role,
        ipAddress,
        userAgent: req.headers["user-agent"] || null,
        expiresAt: new Date(Date.now() + ADMIN_ACCESS_TOKEN_EXPIRY_MS),
      });

      await storage.updateAdminUser(admin.id, { lastLoginAt: new Date() });
      await logAuditAction(admin.id, "ADMIN_LOGIN", "admin", admin.id, "success", ipAddress);

      res.json({
        token,
        expiresIn: ADMIN_ACCESS_TOKEN_EXPIRY_MS / 1000,
        admin: {
          id: admin.id,
          email: admin.email,
          displayName: admin.displayName,
          role: admin.role,
        },
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.post("/api/admin/auth/logout", adminAuthMiddleware, async (req: AdminAuthRequest, res: Response) => {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress || null;
      await storage.deleteAdminSession(req.adminAuth!.tokenId);
      await logAuditAction(req.adminAuth!.adminId, "ADMIN_LOGOUT", "admin", req.adminAuth!.adminId, "success", ipAddress);
      res.json({ success: true });
    } catch (error) {
      console.error("Admin logout error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.post("/api/admin/auth/logout-all", adminAuthMiddleware, async (req: AdminAuthRequest, res: Response) => {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress || null;
      await storage.deleteAdminSessionsByAdmin(req.adminAuth!.adminId);
      await logAuditAction(req.adminAuth!.adminId, "ADMIN_LOGOUT_ALL", "admin", req.adminAuth!.adminId, "success", ipAddress);
      res.json({ success: true });
    } catch (error) {
      console.error("Admin logout-all error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.get("/api/admin/auth/me", adminAuthMiddleware, async (req: AdminAuthRequest, res: Response) => {
    try {
      const admin = await storage.getAdminUser(req.adminAuth!.adminId);
      if (!admin) {
        return res.status(404).json({ error: "Admin not found" });
      }

      res.json({
        id: admin.id,
        email: admin.email,
        displayName: admin.displayName,
        role: admin.role,
        mfaEnabled: admin.mfaEnabled,
        lastLoginAt: admin.lastLoginAt,
      });
    } catch (error) {
      console.error("Admin me error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  // ========== DASHBOARD ROUTES ==========
  
  app.get("/api/admin/dashboard/stats", adminAuthMiddleware, async (req: AdminAuthRequest, res: Response) => {
    try {
      const stats = await storage.getAdminDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  // ========== USERS ROUTES ==========
  
  app.get("/api/admin/users", adminAuthMiddleware, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { search, page = "1", limit = "20" } = req.query;
      const users = await storage.getAdminUsersList(
        search as string | undefined,
        parseInt(page as string),
        parseInt(limit as string)
      );
      res.json(users);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.get("/api/admin/users/:id", adminAuthMiddleware, async (req: AdminAuthRequest, res: Response) => {
    try {
      const user = await storage.getAdminUserDetail(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Get user detail error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.patch("/api/admin/users/:id", adminAuthMiddleware, requireAdminRoles("super_admin", "support_admin"), async (req: AdminAuthRequest, res: Response) => {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress || null;
      const { displayName, role } = req.body;
      
      await storage.updateUser(req.params.id, { displayName, role });
      await logAuditAction(req.adminAuth!.adminId, "USER_UPDATED", "user", req.params.id, "success", ipAddress, JSON.stringify({ displayName, role }));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.post("/api/admin/users/:id/reset-sessions", adminAuthMiddleware, requireAdminRoles("super_admin", "support_admin"), async (req: AdminAuthRequest, res: Response) => {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress || null;
      await storage.deleteSessionsByUser(req.params.id);
      await logAuditAction(req.adminAuth!.adminId, "USER_SESSIONS_RESET", "user", req.params.id, "success", ipAddress);
      res.json({ success: true });
    } catch (error) {
      console.error("Reset sessions error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.delete("/api/admin/users/:id", adminAuthMiddleware, requireAdminRoles("super_admin"), async (req: AdminAuthRequest, res: Response) => {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress || null;
      await storage.deleteUser(req.params.id);
      await logAuditAction(req.adminAuth!.adminId, "USER_DELETED", "user", req.params.id, "success", ipAddress);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  // ========== FAMILIES ROUTES ==========
  
  app.get("/api/admin/families", adminAuthMiddleware, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { search, page = "1", limit = "20" } = req.query;
      const families = await storage.getAdminFamiliesList(
        search as string | undefined,
        parseInt(page as string),
        parseInt(limit as string)
      );
      res.json(families);
    } catch (error) {
      console.error("Get families error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.get("/api/admin/families/:id", adminAuthMiddleware, async (req: AdminAuthRequest, res: Response) => {
    try {
      const family = await storage.getAdminFamilyDetail(req.params.id);
      if (!family) {
        return res.status(404).json({ error: "Family not found" });
      }
      res.json(family);
    } catch (error) {
      console.error("Get family detail error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.patch("/api/admin/families/:id", adminAuthMiddleware, requireAdminRoles("super_admin", "support_admin"), async (req: AdminAuthRequest, res: Response) => {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress || null;
      const { name, planType, isActive } = req.body;
      
      await storage.updateFamily(req.params.id, { name, planType, isActive });
      await logAuditAction(req.adminAuth!.adminId, "FAMILY_UPDATED", "family", req.params.id, "success", ipAddress, JSON.stringify({ name, planType, isActive }));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Update family error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.post("/api/admin/families/:id/deactivate", adminAuthMiddleware, requireAdminRoles("super_admin"), async (req: AdminAuthRequest, res: Response) => {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress || null;
      await storage.updateFamily(req.params.id, { isActive: false });
      await logAuditAction(req.adminAuth!.adminId, "FAMILY_DEACTIVATED", "family", req.params.id, "success", ipAddress);
      res.json({ success: true });
    } catch (error) {
      console.error("Deactivate family error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  // ========== TRIALS ROUTES ==========
  
  app.get("/api/admin/trials", adminAuthMiddleware, async (req: AdminAuthRequest, res: Response) => {
    try {
      const trials = await storage.getAdminTrialsList();
      res.json(trials);
    } catch (error) {
      console.error("Get trials error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.post("/api/admin/trials/:familyId/extend", adminAuthMiddleware, requireAdminRoles("super_admin", "support_admin"), async (req: AdminAuthRequest, res: Response) => {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress || null;
      const { days } = req.body;
      
      const family = await storage.getFamily(req.params.familyId);
      if (!family) {
        return res.status(404).json({ error: "Family not found" });
      }

      const currentEnd = family.trialEndDate ? new Date(family.trialEndDate) : new Date();
      const newEnd = new Date(currentEnd.getTime() + (days || 30) * 24 * 60 * 60 * 1000);
      
      await storage.updateFamily(req.params.familyId, { trialEndDate: newEnd });
      await logAuditAction(req.adminAuth!.adminId, "TRIAL_EXTENDED", "family", req.params.familyId, "success", ipAddress, JSON.stringify({ days, newEnd }));
      
      res.json({ success: true, newEndDate: newEnd });
    } catch (error) {
      console.error("Extend trial error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  // ========== DONATIONS ROUTES ==========
  
  app.get("/api/admin/donations", adminAuthMiddleware, async (req: AdminAuthRequest, res: Response) => {
    try {
      const donations = await storage.getAdminDonationsList();
      res.json(donations);
    } catch (error) {
      console.error("Get donations error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  // ========== NOTIFICATIONS ROUTES ==========
  
  app.get("/api/admin/notifications", adminAuthMiddleware, async (req: AdminAuthRequest, res: Response) => {
    try {
      const notifications = await storage.getAdminNotificationsList();
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  // ========== PLACES ROUTES ==========
  
  app.get("/api/admin/places", adminAuthMiddleware, async (req: AdminAuthRequest, res: Response) => {
    try {
      const places = await storage.getAdminPlacesList();
      res.json(places);
    } catch (error) {
      console.error("Get places error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  // ========== AI ROUTES ==========
  
  app.get("/api/admin/ai/config", adminAuthMiddleware, requireAdminRoles("super_admin"), async (req: AdminAuthRequest, res: Response) => {
    try {
      const config = await storage.getAiConfig();
      res.json(config);
    } catch (error) {
      console.error("Get AI config error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.patch("/api/admin/ai/config", adminAuthMiddleware, requireAdminRoles("super_admin"), async (req: AdminAuthRequest, res: Response) => {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress || null;
      await storage.updateAiConfig(req.body, req.adminAuth!.adminId);
      await logAuditAction(req.adminAuth!.adminId, "AI_CONFIG_UPDATED", "ai_config", null, "success", ipAddress, JSON.stringify(req.body));
      res.json({ success: true });
    } catch (error) {
      console.error("Update AI config error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.get("/api/admin/ai/logs", adminAuthMiddleware, async (req: AdminAuthRequest, res: Response) => {
    try {
      const logs = await storage.getAdminAiLogs();
      res.json(logs);
    } catch (error) {
      console.error("Get AI logs error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  // ========== AUDIT ROUTES ==========
  
  app.get("/api/admin/audit", adminAuthMiddleware, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { page = "1", limit = "50", action, adminId } = req.query;
      const logs = await storage.getAdminAuditLogs(
        parseInt(page as string),
        parseInt(limit as string),
        action as string | undefined,
        adminId as string | undefined
      );
      res.json(logs);
    } catch (error) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  // ========== SETUP FIRST ADMIN (only if no admins exist) ==========
  
  app.post("/api/admin/setup", async (req: Request, res: Response) => {
    try {
      const existingAdmins = await storage.countAdminUsers();
      if (existingAdmins > 0) {
        return res.status(403).json({ error: "Admin already exists" });
      }

      const { email, password, displayName } = req.body;
      if (!email || !password || !displayName) {
        return res.status(400).json({ error: "Email, password and display name required" });
      }

      const admin = await storage.createAdminUser({
        email,
        password: hashPassword(password),
        displayName,
        role: "super_admin",
      });

      const ipAddress = req.ip || req.socket.remoteAddress || null;
      await logAuditAction(admin.id, "ADMIN_SETUP", "admin", admin.id, "success", ipAddress);

      res.status(201).json({ 
        success: true, 
        message: "Super admin created successfully",
        admin: {
          id: admin.id,
          email: admin.email,
          displayName: admin.displayName,
          role: admin.role,
        }
      });
    } catch (error) {
      console.error("Setup admin error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });
}
