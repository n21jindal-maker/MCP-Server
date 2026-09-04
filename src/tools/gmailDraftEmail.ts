import { parseGmailInput } from "../validation/schemas.js";
import { googleAuthService } from "../services/googleAuthService.js";
import { gmailService } from "../services/gmailService.js";
import {
  formatErrorResponse,
  translateGoogleError,
  McpToolError,
} from "../errors/errorHandler.js";
import { logger } from "../utils/logger.js";

export const gmailDraftEmailTool = {
  name: "gmail_draft_email",
  description:
    "Create a draft email in the authenticated user's Gmail account.",
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
      const result = await gmailService.createDraft(auth, input);

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;

      if (err instanceof McpToolError) {
        logger.error("gmail_draft_email", "Failed", {
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

      // Google API or unexpected error
      const translated = translateGoogleError(err);
      logger.error("gmail_draft_email", "Failed", {
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
