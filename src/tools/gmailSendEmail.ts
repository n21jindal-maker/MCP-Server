import { parseGmailInput } from "../validation/schemas.js";
import { googleAuthService } from "../services/googleAuthService.js";
import { gmailService } from "../services/gmailService.js";
import {
  formatErrorResponse,
  translateGoogleError,
  McpToolError,
} from "../errors/errorHandler.js";
import { logger } from "../utils/logger.js";

export const gmailSendEmailTool = {
  name: "gmail_send_email",
  description:
    "Send an email using the authenticated user's Gmail account. This is a side-effecting operation — use gmail_draft_email if the user only wants to prepare a draft.",
  inputSchema: {
    type: "object" as const,
    properties: {
      to: {
        type: "array",
        items: { type: "string", format: "email" },
        description: "One or more recipient email addresses.",
        minItems: 1,
      },
      subject: {
        type: "string",
        description: "Email subject line.",
      },
      body: {
        type: "string",
        description: "Email body content (plain text).",
      },
    },
    required: ["to", "subject", "body"],
  },

  async handler(params: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }> {
    const startTime = Date.now();
    try {
      // Validate
      const input = parseGmailInput(params);

      // Authenticate
      const auth = await googleAuthService.getAuthenticatedClient();

      // Execute
      const result = await gmailService.sendEmail(auth, input);

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;

      if (err instanceof McpToolError) {
        logger.error("gmail_send_email", "Failed", {
          code: err.code,
          durationMs,
        });
        const errorResponse = formatErrorResponse(err);
        return {
          content: [
            { type: "text", text: JSON.stringify(errorResponse, null, 2) },
          ],
          isError: true,
        };
      }

      const translated = translateGoogleError(err);
      logger.error("gmail_send_email", "Failed", {
        code: translated.code,
        durationMs,
      });
      const errorResponse = formatErrorResponse(translated);
      return {
        content: [
          { type: "text", text: JSON.stringify(errorResponse, null, 2) },
        ],
        isError: true,
      };
    }
  },
};
