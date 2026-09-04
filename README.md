# MCP Google Workspace Server

A generic Model Context Protocol (MCP) server that enables AI agents to interact with Gmail and Google Docs through well-defined MCP tools. 

The primary goal of this project is to provide a reusable integration layer so that any MCP-compatible AI agent can perform email and Google Docs operations without implementing Gmail or Google Docs APIs themselves.

## Features

The server currently supports the following capabilities exposed as MCP tools:

### Gmail
- `gmail_draft_email`: Draft an email in the authenticated user's Gmail account.
- `gmail_send_email`: Send an email directly using the authenticated user's Gmail account.

### Google Docs
- `google_docs_append`: Append text content to the end of an existing Google Doc.

## Prerequisites

- Node.js (v18 or higher recommended)
- Google Cloud Platform account
- Gmail API and Google Docs API enabled in your GCP project
- OAuth 2.0 Client credentials (Desktop application type)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/n21jindal-maker/MCP-Server.git
   cd MCP-Server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Configuration & Authentication

The server uses Google OAuth 2.0 for authentication. You need to set up your credentials before running the server.

1. Obtain your OAuth 2.0 Client ID and Secret from the [Google Cloud Console](https://console.cloud.google.com/).
2. Save your credentials as `Credentials.json` in the root directory, or configure the environment variables as shown in `.env.example`.
3. Generate the OAuth token:
   ```bash
   npx tsx generate-token.ts
   ```
   Follow the prompts to authorize the application. This will generate a `token.json` file.

## Running the Server

Start the server using:

```bash
npm start
```

Or for development (with automatic TypeScript compilation):

```bash
npm run dev
```

## Using with an MCP Client

Configure your MCP client to start this server. The server communicates over `stdio`. 

Example configuration for Claude Desktop or similar MCP clients:

```json
{
  "mcpServers": {
    "google-workspace": {
      "command": "node",
      "args": ["/absolute/path/to/MCP-Server/dist/index.js"]
    }
  }
}
```

## Available Tools

### `gmail_draft_email`
Drafts an email but does not send it.
- **Parameters:**
  - `to` (string[]): One or more recipient email addresses.
  - `subject` (string): Email subject.
  - `body` (string): Email body.

### `gmail_send_email`
Sends an email immediately.
- **Parameters:**
  - `to` (string[]): One or more recipient email addresses.
  - `subject` (string): Email subject.
  - `body` (string): Email body.

### `google_docs_append`
Appends content to a Google Doc.
- **Parameters:**
  - `documentId` (string): The ID of the Google Doc (found in the URL).
  - `content` (string): Text content to append.

## License

MIT
