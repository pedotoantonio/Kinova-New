import type { UserPermissions } from "@shared/types";

export type UserRole = "admin" | "member" | "child";

export function getDefaultPermissionsForRole(role: UserRole): UserPermissions {
  switch (role) {
    case "admin":
      return {
        canViewCalendar: true,
        canViewTasks: true,
        canViewShopping: true,
        canViewBudget: true,
        canViewPlaces: true,
        canModifyItems: true,
      };
    case "member":
      return {
        canViewCalendar: true,
        canViewTasks: true,
        canViewShopping: true,
        canViewBudget: false,
        canViewPlaces: true,
        canModifyItems: true,
      };
    case "child":
      return {
        canViewCalendar: true,
        canViewTasks: true,
        canViewShopping: false,
        canViewBudget: false,
        canViewPlaces: true,
        canModifyItems: false,
      };
    default:
      return {
        canViewCalendar: true,
        canViewTasks: true,
        canViewShopping: true,
        canViewBudget: false,
        canViewPlaces: true,
        canModifyItems: true,
      };
  }
}

export function extractPermissions(user: {
  canViewCalendar: boolean;
  canViewTasks: boolean;
  canViewShopping: boolean;
  canViewBudget: boolean;
  canViewPlaces: boolean;
  canModifyItems: boolean;
}): UserPermissions {
  return {
    canViewCalendar: user.canViewCalendar,
    canViewTasks: user.canViewTasks,
    canViewShopping: user.canViewShopping,
    canViewBudget: user.canViewBudget,
    canViewPlaces: user.canViewPlaces,
    canModifyItems: user.canModifyItems,
  };
}

export function canAccessResource(
  permissions: UserPermissions,
  resource: "calendar" | "tasks" | "shopping" | "budget" | "places"
): boolean {
  switch (resource) {
    case "calendar":
      return permissions.canViewCalendar;
    case "tasks":
      return permissions.canViewTasks;
    case "shopping":
      return permissions.canViewShopping;
    case "budget":
      return permissions.canViewBudget;
    case "places":
      return permissions.canViewPlaces;
    default:
      return false;
  }
}

export function canModify(permissions: UserPermissions): boolean {
  return permissions.canModifyItems;
}
