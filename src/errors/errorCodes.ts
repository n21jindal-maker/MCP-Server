/**
 * Structured error codes returned by the MCP server.
 * Maps to the error taxonomy defined in the architecture doc.
 */
export enum ErrorCode {
  /** Missing or invalid input parameters */
  VALIDATION_ERROR = "VALIDATION_ERROR",

  /** Email address fails format validation */
  INVALID_RECIPIENT = "INVALID_RECIPIENT",

  /** No valid OAuth token available */
  AUTHENTICATION_REQUIRED = "AUTHENTICATION_REQUIRED",

  /** User lacks access to the requested resource */
  INSUFFICIENT_PERMISSION = "INSUFFICIENT_PERMISSION",

  /** Google Doc ID does not resolve to a document */
  DOCUMENT_NOT_FOUND = "DOCUMENT_NOT_FOUND",

  /** Upstream Google API failure */
  GOOGLE_API_ERROR = "GOOGLE_API_ERROR",

  /** Unexpected internal server error */
  INTERNAL_ERROR = "INTERNAL_ERROR",
}
