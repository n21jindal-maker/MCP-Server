import { startServer } from "./server/mcpServer.js";
import { logger } from "./utils/logger.js";

async function main(): Promise<void> {
  try {
    await startServer();
  } catch (err) {
    logger.error("main", "Fatal error starting MCP server", {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
}

// Handle uncaught errors gracefully
process.on("uncaughtException", (err) => {
  logger.error("main", "Uncaught exception", { error: err.message });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("main", "Unhandled rejection", {
    error: reason instanceof Error ? reason.message : String(reason),
  });
  process.exit(1);
});

main();
