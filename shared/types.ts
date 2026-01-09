import type { User, Family, FamilyInvite, UserRole } from "./schema";

export type { User, Family, FamilyInvite, UserRole };

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiResponse<T> {
  data: T;
}

export interface AuthUser {
  id: string;
  username: string;
  displayName: string | null;
  familyId: string;
  role: UserRole;
  avatarUrl?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse extends AuthTokens {
  user: AuthUser;
}

export interface FamilyMember {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
}

export interface FamilyInviteResponse {
  id: string;
  code: string;
  role: UserRole;
  email?: string | null;
  expiresAt: string;
  createdAt?: string;
}

export type EventCategory = "family" | "course" | "shift" | "vacation" | "holiday" | "other";
export type RecurrenceFrequency = "daily" | "weekly" | "monthly";

export interface EventRecurrence {
  frequency: RecurrenceFrequency;
  interval: number;
  endDate?: string | null;
  byWeekday?: string | null;
}

export interface Event {
  id: string;
  familyId: string;
  title: string;
  shortCode?: string | null;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  allDay: boolean;
  color?: string | null;
  category: EventCategory;
  assignedTo?: string | null;
  isHoliday: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  recurrence?: EventRecurrence | null;
}

export interface CreateEventRequest {
  title: string;
  shortCode?: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay?: boolean;
  color?: string;
  category?: EventCategory;
  assignedTo?: string;
  isHoliday?: boolean;
  recurrence?: EventRecurrence;
}

export interface UpdateEventRequest {
  title?: string;
  shortCode?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  allDay?: boolean;
  color?: string;
  category?: EventCategory;
  assignedTo?: string;
  isHoliday?: boolean;
  recurrence?: EventRecurrence | null;
}

export interface Task {
  id: string;
  familyId: string;
  title: string;
  description?: string | null;
  completed: boolean;
  dueDate?: string | null;
  assignedTo?: string | null;
  priority: "low" | "medium" | "high";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  dueDate?: string;
  assignedTo?: string;
  priority?: "low" | "medium" | "high";
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  completed?: boolean;
  dueDate?: string;
  assignedTo?: string;
  priority?: "low" | "medium" | "high";
}

export interface ShoppingItem {
  id: string;
  familyId: string;
  name: string;
  quantity: number;
  unit?: string | null;
  category?: string | null;
  purchased: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShoppingItemRequest {
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
}

export interface UpdateShoppingItemRequest {
  name?: string;
  quantity?: number;
  unit?: string;
  category?: string;
  purchased?: boolean;
}

export interface Expense {
  id: string;
  familyId: string;
  amount: number;
  description: string;
  category?: string | null;
  paidBy: string;
  date: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseRequest {
  amount: number;
  description: string;
  category?: string;
  paidBy: string;
  date: string;
}

export interface UpdateExpenseRequest {
  amount?: number;
  description?: string;
  category?: string;
  paidBy?: string;
  date?: string;
}

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface AssistantRequest {
  message: string;
  context?: {
    events?: Event[];
    tasks?: Task[];
    shoppingItems?: ShoppingItem[];
  };
}

export interface AssistantResponse {
  message: string;
  suggestions?: string[];
}

export type EventsListParams = {
  from?: string;
  to?: string;
};

export type TasksListParams = {
  completed?: boolean;
  assignedTo?: string;
};

export type ShoppingListParams = {
  purchased?: boolean;
  category?: string;
};

export type ExpensesListParams = {
  from?: string;
  to?: string;
  category?: string;
  paidBy?: string;
};
