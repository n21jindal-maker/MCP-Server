import { z } from "zod";
import { McpToolError } from "../errors/errorHandler.js";
import { ErrorCode } from "../errors/errorCodes.js";

// ---------- Gmail Input Schema ----------

export const gmailInputSchema = z.object({
  to: z
    .array(z.string().email("Invalid email address format."))
    .min(1, "At least one recipient email address is required."),
  subject: z.string().min(1, "Email subject is required."),
  body: z.string().min(1, "Email body is required."),
});

export type GmailInput = z.infer<typeof gmailInputSchema>;

// ---------- Google Docs Input Schema ----------

export const googleDocsInputSchema = z.object({
  documentId: z.string().min(1, "Document ID is required."),
  content: z.string().min(1, "Content to append is required."),
});

export type GoogleDocsInput = z.infer<typeof googleDocsInputSchema>;

// ---------- Parse helpers ----------

/**
 * Parses and validates Gmail tool input.
 * Throws McpToolError with appropriate code on failure.
 */
export function parseGmailInput(data: unknown): GmailInput {
  const result = gmailInputSchema.safeParse(data);

  if (!result.success) {
    const issues = result.error.issues;

    // Check if any issue is specifically about email format
    const hasEmailFormatError = issues.some(
      (issue) =>
        issue.path.includes("to") &&
        issue.code === "invalid_string" &&
        issue.validation === "email"
    );

    if (hasEmailFormatError) {
      throw new McpToolError(
        ErrorCode.INVALID_RECIPIENT,
        "One or more recipient email addresses are invalid."
      );
    }

    // General validation error
    const messages = issues.map((issue) => issue.message).join("; ");
    throw new McpToolError(ErrorCode.VALIDATION_ERROR, messages);
  }

  return result.data;
}

/**
 * Parses and validates Google Docs tool input.
 * Throws McpToolError with appropriate code on failure.
 */
export function parseGoogleDocsInput(data: unknown): GoogleDocsInput {
  const result = googleDocsInputSchema.safeParse(data);

  if (!result.success) {
    const messages = result.error.issues.map((issue) => issue.message).join("; ");
    throw new McpToolError(ErrorCode.VALIDATION_ERROR, messages);
  }

  return result.data;
}
