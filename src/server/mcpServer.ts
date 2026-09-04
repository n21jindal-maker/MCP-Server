import express from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { registerTools } from "./toolRegistry.js";
import { logger } from "../utils/logger.js";

/**
 * Creates and configures the MCP server instance.
 */
export function createMcpServer(): Server {
  const server = new Server(
    {
      name: "mcp-google-workspace",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register all tools
  registerTools(server);

  return server;
}

/**
 * Starts the MCP server with SSE transport over an Express HTTP server.
 */
export async function startServer(): Promise<void> {
  const server = createMcpServer();
  const app = express();
  
  app.use(cors());
  
  let transport: SSEServerTransport;

  app.get("/mcp/sse", async (req, res) => {
    logger.info("mcpServer", "New SSE connection established");
    transport = new SSEServerTransport("/mcp/message", res);
    await server.connect(transport);
  });

  app.post("/mcp/message", async (req, res) => {
    if (!transport) {
      res.status(400).send("SSE connection not established yet");
      return;
    }
    logger.debug("mcpServer", "Received POST message");
    await transport.handlePostMessage(req, res);
  });

  const port = process.env.PORT || 3000;
  
  app.listen(port, () => {
    logger.info("mcpServer", `MCP server is running with SSE transport on port ${port}`);
    logger.info("mcpServer", `Connect MCP client to: http://localhost:${port}/mcp/sse`);
  });
}
