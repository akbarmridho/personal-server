import type { ApiResponse } from "./types";

// API Base URL from environment
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Custom API Error
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Base fetch wrapper with error handling
export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(
        response.status,
        errorText || `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    const data = await response.json();

    // Handle ApiResponse wrapper format
    if ("success" in data) {
      const apiResponse = data as ApiResponse<T>;
      if (!apiResponse.success) {
        throw new ApiError(500, apiResponse.error || "API request failed");
      }
      return apiResponse.data as T;
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof TypeError) {
      throw new ApiError(0, "Network error: Unable to connect to server");
    }

    throw new ApiError(500, `Unexpected error: ${(error as Error).message}`);
  }
}

// GET request helper
export async function apiGet<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const queryString = params
    ? `?${new URLSearchParams(
        Object.entries(params)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)]),
      )}`
    : "";

  return apiFetch<T>(`${endpoint}${queryString}`, {
    method: "GET",
  });
}

// POST request helper
export async function apiPost<T>(endpoint: string, body?: unknown): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}
