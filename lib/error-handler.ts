import { NextResponse } from "next/server";
import { logger } from "./logger";

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed") {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Access denied") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests") {
    super(message, 429);
  }
}

export function handleApiError(error: unknown): NextResponse {
  // Log the error
  logger.error("API Error:", error);

  // Handle known errors
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }

  // Handle validation errors from Zod
  if (error && typeof error === "object" && "issues" in error) {
    return NextResponse.json(
      { error: "Validation failed", details: error },
      { status: 400 }
    );
  }

  // Handle unknown errors
  const isDevelopment = process.env.NODE_ENV !== "production";
  const message = isDevelopment
    ? error instanceof Error
      ? error.message
      : "An unexpected error occurred"
    : "Internal server error";

  return NextResponse.json({ error: message }, { status: 500 });
}

// Async error wrapper for API routes
export function asyncHandler(
  handler: (req: any, context?: any) => Promise<NextResponse>
) {
  return async (req: any, context?: any): Promise<NextResponse> => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
