import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { gmailDraftEmailTool } from "../tools/gmailDraftEmail.js";
import { gmailSendEmailTool } from "../tools/gmailSendEmail.js";
import { googleDocsAppendTool } from "../tools/googleDocsAppend.js";
import { logger } from "../utils/logger.js";

/**
 * All registered MCP tools.
 * To add a new tool, import it and add it to this array.
 */
const tools = [gmailDraftEmailTool, gmailSendEmailTool, googleDocsAppendTool];

/**
 * Registers all tools with the MCP server.
 * Handles tools/list (discovery) and tools/call (invocation).
 */
export function registerTools(server: Server): void {
  // Handle tool discovery — tools/list
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.info("toolRegistry", "tools/list requested");

    return {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  // Handle tool invocation — tools/call
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    logger.info("toolRegistry", `tools/call: ${name}`);

    const tool = tools.find((t) => t.name === name);

    if (!tool) {
      logger.error("toolRegistry", `Unknown tool: ${name}`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: {
                code: "UNKNOWN_TOOL",
                message: `Tool "${name}" is not registered.`,
              },
            }),
          },
        ],
        isError: true,
      };
    }

    return tool.handler(args || {});
  });

  logger.info(
    "toolRegistry",
    `Registered ${tools.length} tools: ${tools.map((t) => t.name).join(", ")}`
  );
}
