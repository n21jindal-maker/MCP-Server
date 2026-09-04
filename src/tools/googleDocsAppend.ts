import { parseGoogleDocsInput } from "../validation/schemas.js";
import { googleAuthService } from "../services/googleAuthService.js";
import { googleDocsService } from "../services/googleDocsService.js";
import {
  formatErrorResponse,
  translateGoogleError,
  McpToolError,
} from "../errors/errorHandler.js";
import { logger } from "../utils/logger.js";

export const googleDocsAppendTool = {
  name: "google_docs_append",
  description: "Append text to the end of an existing Google Doc.",
  inputSchema: {
    type: "object" as const,
    properties: {
      documentId: {
        type: "string",
        description: "The Google Docs document ID.",
      },
      content: {
        type: "string",
        description: "Text content to append to the document.",
        minLength: 1,
      },
    },
    required: ["documentId", "content"],
  },

  async handler(params: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }> {
    const startTime = Date.now();
    try {
      // Validate
      const input = parseGoogleDocsInput(params);

      // Authenticate
      const auth = await googleAuthService.getAuthenticatedClient();

      // Execute
      const result = await googleDocsService.appendContent(auth, input);

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;

      if (err instanceof McpToolError) {
        logger.error("google_docs_append", "Failed", {
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
      logger.error("google_docs_append", "Failed", {
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
