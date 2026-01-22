/**
 * Unit Tests for API Utilities
 * Tests API error handling, parsing, and utilities
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ApiRequestError,
  NetworkError,
  TimeoutError,
  parseApiError,
} from "@/lib/api";

describe("API Utils", () => {
  describe("ApiRequestError", () => {
    it("should create error with correct properties", () => {
      const apiError = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          details: { field: "email" },
        },
      };

      const error = new ApiRequestError(400, apiError);

      expect(error.name).toBe("ApiRequestError");
      expect(error.status).toBe(400);
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.message).toBe("Invalid input");
      expect(error.details).toEqual({ field: "email" });
    });

    it("should be instanceof Error", () => {
      const error = new ApiRequestError(500, {
        error: { code: "SERVER_ERROR", message: "Internal error" },
      });

      expect(error instanceof Error).toBe(true);
      expect(error instanceof ApiRequestError).toBe(true);
    });
  });

  describe("NetworkError", () => {
    it("should create error with message", () => {
      const error = new NetworkError("Connection failed");

      expect(error.name).toBe("NetworkError");
      expect(error.message).toBe("Connection failed");
    });

    it("should be instanceof Error", () => {
      const error = new NetworkError("Test");

      expect(error instanceof Error).toBe(true);
      expect(error instanceof NetworkError).toBe(true);
    });
  });

  describe("TimeoutError", () => {
    it("should create error with default message", () => {
      const error = new TimeoutError();

      expect(error.name).toBe("TimeoutError");
      expect(error.message).toBe("Request timed out");
    });

    it("should be instanceof Error", () => {
      const error = new TimeoutError();

      expect(error instanceof Error).toBe(true);
      expect(error instanceof TimeoutError).toBe(true);
    });
  });

  describe("parseApiError", () => {
    it("should parse standard API error format", () => {
      const mockResponse = {
        status: 400,
        statusText: "Bad Request",
      } as Response;

      const body = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Email is required",
        },
      };

      const result = parseApiError(mockResponse, body);

      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.message).toBe("Email is required");
    });

    it("should parse string error format", () => {
      const mockResponse = {
        status: 401,
        statusText: "Unauthorized",
      } as Response;

      const body = {
        error: "Invalid credentials",
      };

      const result = parseApiError(mockResponse, body);

      expect(result.error.code).toBe("HTTP_401");
      expect(result.error.message).toBe("Invalid credentials");
    });

    it("should handle unknown error format", () => {
      const mockResponse = {
        status: 500,
        statusText: "Internal Server Error",
      } as Response;

      const body = { unexpected: "format" };

      const result = parseApiError(mockResponse, body);

      expect(result.error.code).toBe("HTTP_500");
      expect(result.error.message).toBe("Internal Server Error");
    });

    it("should handle null body", () => {
      const mockResponse = {
        status: 503,
        statusText: "Service Unavailable",
      } as Response;

      const result = parseApiError(mockResponse, null);

      expect(result.error.code).toBe("HTTP_503");
      expect(result.error.message).toBe("Service Unavailable");
    });

    it("should handle empty statusText", () => {
      const mockResponse = {
        status: 404,
        statusText: "",
      } as Response;

      const result = parseApiError(mockResponse, {});

      expect(result.error.code).toBe("HTTP_404");
      expect(result.error.message).toBe("Unknown error");
    });
  });
});

describe("Error Differentiation", () => {
  it("should differentiate between error types", () => {
    const apiError = new ApiRequestError(400, {
      error: { code: "TEST", message: "Test" },
    });
    const networkError = new NetworkError("Test");
    const timeoutError = new TimeoutError();

    // Type guards
    expect(apiError instanceof ApiRequestError).toBe(true);
    expect(apiError instanceof NetworkError).toBe(false);
    expect(apiError instanceof TimeoutError).toBe(false);

    expect(networkError instanceof ApiRequestError).toBe(false);
    expect(networkError instanceof NetworkError).toBe(true);
    expect(networkError instanceof TimeoutError).toBe(false);

    expect(timeoutError instanceof ApiRequestError).toBe(false);
    expect(timeoutError instanceof NetworkError).toBe(false);
    expect(timeoutError instanceof TimeoutError).toBe(true);
  });

  it("should allow error handling by type", () => {
    const handleError = (error: Error): string => {
      if (error instanceof ApiRequestError) {
        return `API Error: ${error.code} - ${error.message}`;
      }
      if (error instanceof NetworkError) {
        return `Network Error: ${error.message}`;
      }
      if (error instanceof TimeoutError) {
        return "Request timed out";
      }
      return `Unknown error: ${error.message}`;
    };

    expect(
      handleError(
        new ApiRequestError(400, { error: { code: "TEST", message: "Bad request" } })
      )
    ).toBe("API Error: TEST - Bad request");

    expect(handleError(new NetworkError("Connection lost"))).toBe(
      "Network Error: Connection lost"
    );

    expect(handleError(new TimeoutError())).toBe("Request timed out");
  });
});
