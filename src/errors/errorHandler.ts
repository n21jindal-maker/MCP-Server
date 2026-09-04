import { ErrorCode } from "./errorCodes.js";
import { logger } from "../utils/logger.js";

/**
 * Custom error class for MCP tool errors.
 * Carries a structured error code alongside a human-readable message.
 */
export class McpToolError extends Error {
  public readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "McpToolError";
    this.code = code;
  }
}

/**
 * Translates a raw Google API error into a structured McpToolError.
 * Strips internal details so they are never exposed to the MCP client.
 */
export function translateGoogleError(err: unknown): McpToolError {
  // googleapis errors typically have a `code` (HTTP status) and `message`
  if (err && typeof err === "object" && "code" in err) {
    const googleErr = err as { code: number; message?: string };

    switch (googleErr.code) {
      case 401:
        return new McpToolError(
          ErrorCode.AUTHENTICATION_REQUIRED,
          "Google authentication is required. Please re-authenticate."
        );
      case 403:
        return new McpToolError(
          ErrorCode.INSUFFICIENT_PERMISSION,
          "The authenticated user does not have permission to perform this operation."
        );
      case 404:
        return new McpToolError(
          ErrorCode.DOCUMENT_NOT_FOUND,
          "The requested Google resource could not be found."
        );
      default:
        return new McpToolError(
          ErrorCode.GOOGLE_API_ERROR,
          `Google API error (HTTP ${googleErr.code}): ${googleErr.message || "Unknown error"}`
        );
    }
  }

  return new McpToolError(
    ErrorCode.INTERNAL_ERROR,
    "An unexpected internal error occurred."
  );
}

/**
 * Formats an error into a structured MCP tool response.
 */
export function formatErrorResponse(err: unknown): {
  success: false;
  error: { code: string; message: string };
} {
  if (err instanceof McpToolError) {
    return {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };
  }

  // Unknown errors get wrapped as INTERNAL_ERROR
  const message =
    err instanceof Error ? err.message : "An unexpected error occurred.";

  logger.error("errorHandler", "Unhandled error", {
    error: message,
  });

  return {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: "An unexpected internal error occurred.",
    },
  };
}
