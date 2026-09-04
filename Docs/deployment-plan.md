# Railway Deployment Plan — MCP Google Workspace Server

Deploying an MCP server to a cloud provider like Railway introduces two major architectural shifts compared to running it locally on your machine: **Communication Transport** and **Authentication State**.

## ⚠️ Open Questions & Critical Decisions

> [!WARNING]
> **1. Communication Transport: Stdio vs SSE**
> Currently, the server uses **stdio** (`StdioServerTransport`), which means the MCP client (like Cursor) expects to spawn it as a local background process and communicate via `stdin/stdout`.
> 
> Railway hosts web applications over HTTP/TCP. To connect a remote MCP client (running on your laptop) to a server hosted on Railway, we MUST switch to **SSE (Server-Sent Events) Transport**. 
> - **Question:** Do you want me to update `mcpServer.ts` to use Express + SSE so it can accept remote connections over HTTP?

> [!IMPORTANT]
> **2. OAuth Authentication Flow**
> The current auth flow is interactive — it prints a URL to the console, waits for you to click it, and expects Google to redirect to `localhost:3000`. This won't work on Railway.
> - **Question:** How do you want to handle the token?
>   - **Option A (Recommended):** Generate `token.json` locally (which we just did), and modify the code to read the token directly from a Railway Environment Variable (e.g., `GOOGLE_OAUTH_TOKEN`) instead of a file.
>   - **Option B:** Attach a **Railway Persistent Volume**, upload `token.json` to it, and configure `GOOGLE_TOKEN_STORE` to point to the volume mount path.

---

## Proposed Deployment Steps

Once we align on the questions above, here is the roadmap for deploying to Railway:

### Phase 1: Code Modifications
1. **Transport Layer:** Add `express` and update `src/server/mcpServer.ts` to expose an SSE endpoint (e.g., `GET /mcp` and `POST /mcp/message`).
2. **Auth Layer:** Update `src/services/googleAuthService.ts` to parse a `GOOGLE_OAUTH_TOKEN` environment variable if present, falling back to the local `token.json` flow if not.

### Phase 2: Railway Configuration
1. **Procfile / Start Command:** Ensure Railway uses `npm run start` which triggers `node dist/index.js`.
2. **Environment Variables:** Set the following variables in the Railway dashboard:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_OAUTH_TOKEN` (The contents of your locally generated `token.json` as a string)
   - `PORT` (Provided by Railway)

### Phase 3: Client Integration
1. Update your MCP client (e.g., Cursor) to connect to the Railway URL instead of running a local command.
   ```json
   {
     "mcpServers": {
       "google-workspace-remote": {
         "type": "sse",
         "url": "https://your-railway-app.up.railway.app/mcp"
       }
     }
   }
   ```

---

## Next Steps
Please review the open questions regarding **SSE Transport** and **Token Management**. Let me know your preference, and I can start making the necessary code changes!
