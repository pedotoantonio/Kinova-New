/**
 * API Routes Index
 * Aggregates all route modules and exports them for use in the main server
 */

import { Router } from "express";
import authRoutes from "./auth.routes";

// Export middleware for use in other modules
export * from "./middleware";
export * from "./utils";

/**
 * Create and configure the main API router
 */
export function createApiRouter(): Router {
  const router = Router();

  // Mount route modules
  router.use("/auth", authRoutes);

  // Additional routes can be added here as they are modularized:
  // router.use("/family", familyRoutes);
  // router.use("/events", eventsRoutes);
  // router.use("/tasks", tasksRoutes);
  // router.use("/shopping", shoppingRoutes);
  // router.use("/budget", budgetRoutes);
  // router.use("/notes", notesRoutes);
  // router.use("/places", placesRoutes);
  // router.use("/users", usersRoutes);
  // router.use("/notifications", notificationsRoutes);

  return router;
}

// Export individual route modules for direct access if needed
export { authRoutes };
