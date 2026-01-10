import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export const PASSWORD_MIN_LENGTH = 8;
export const RATE_LIMIT_MAX_ATTEMPTS = 5;
export const RATE_LIMIT_WINDOW_MINUTES = 15;
export const EMAIL_VERIFICATION_EXPIRY_HOURS = 24;
export const PASSWORD_RESET_EXPIRY_MINUTES = 30;

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: "weak" | "fair" | "good" | "strong";
  score: number;
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push("min_length");
  } else {
    score += 1;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("uppercase");
  } else {
    score += 1;
  }

  if (!/[a-z]/.test(password)) {
    errors.push("lowercase");
  } else {
    score += 1;
  }

  if (!/[0-9]/.test(password)) {
    errors.push("number");
  } else {
    score += 1;
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    errors.push("symbol");
  } else {
    score += 1;
  }

  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  let strength: "weak" | "fair" | "good" | "strong";
  if (score <= 2) strength = "weak";
  else if (score <= 4) strength = "fair";
  else if (score <= 5) strength = "good";
  else strength = "strong";

  return {
    valid: errors.length === 0,
    errors,
    strength,
    score,
  };
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (stored.includes(":")) {
    const [salt, hash] = stored.split(":");
    const testHash = scryptSync(password, salt, 64).toString("hex");
    return timingSafeEqual(Buffer.from(hash), Buffer.from(testHash));
  }
  return Buffer.from(password).toString("base64") === stored;
}

export function generateSecureToken(): string {
  return randomBytes(32).toString("base64url");
}

export function generateShortCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}
