import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("Starting MCP test client...");

  // Initialize the transport to run our built server
  const transport = new StdioClientTransport({
    command: "node",
    args: [path.join(__dirname, "dist", "index.js")],
  });

  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    console.log("Connecting to MCP server...");
    await client.connect(transport);
    console.log("✅ Successfully connected and initialized!");

    // List tools to verify discovery works
    console.log("Requesting available tools...");
    const toolsResult = await client.listTools();
    
    console.log(`✅ Found ${toolsResult.tools.length} tools:`);
    toolsResult.tools.forEach((tool: any) => {
      console.log(`  - ${tool.name}: ${tool.description?.split('\n')[0]}`);
    });

    console.log("\nServer is working perfectly!");
  } catch (error) {
    console.error("❌ Failed to communicate with the MCP server:", error);
    process.exit(1);
  } finally {
    // Cleanly close the connection
    await transport.close();
  }
}

main().catch(console.error);
