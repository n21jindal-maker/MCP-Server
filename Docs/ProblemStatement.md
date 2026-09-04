# MCP Server – Gmail & Google Docs Integration

## 1. Problem Statement

We need to build a **generic Model Context Protocol (MCP) server** that enables AI agents to interact with **Gmail** and **Google Docs** through well-defined MCP tools.

The primary goal is to provide a reusable integration layer so that **any MCP-compatible AI agent** can perform email and Google Docs operations without implementing Gmail or Google Docs APIs themselves.

The initial version of the MCP server should support two core capabilities:

1. **Gmail**

   * Draft an email
   * Send an email

2. **Google Docs**

   * Append content to an existing Google Doc

The server should be designed as a reusable, extensible MCP server rather than an agent-specific implementation.

---

# 2. Goals

## Primary Goals

* Build a standards-compliant MCP server.
* Expose Gmail and Google Docs capabilities as MCP tools.
* Allow any MCP-compatible AI agent to discover and invoke these tools.
* Implement secure Google OAuth 2.0 authentication.
* Keep the integration generic and independent of any specific AI agent.
* Provide clear tool schemas so that an LLM can understand how to use each capability.
* Provide meaningful validation and error responses.
* Design the architecture so additional Google Workspace capabilities can be added later.

## Non-Goals

The first version does **not** need to support:

* Gmail inbox/search/read operations
* Replying to or forwarding existing emails
* Email attachments
* Gmail labels
* Google Sheets
* Google Slides
* Google Calendar
* Editing arbitrary portions of Google Docs
* Creating new Google Docs
* Multi-user enterprise administration

These can be added in future versions.

---

# 3. High-Level Architecture

```text
                ┌─────────────────────┐
                │     AI Agent        │
                │                     │
                │  LLM / Agent Logic  │
                └──────────┬──────────┘
                           │
                           │ MCP
                           ▼
                ┌─────────────────────┐
                │      MCP Server     │
                │                     │
                │  Tool Discovery     │
                │  Tool Validation    │
                │  Auth Management    │
                │  Error Handling     │
                └──────────┬──────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                ▼                     ▼
       ┌─────────────────┐   ┌──────────────────┐
       │   Gmail API     │   │ Google Docs API  │
       └─────────────────┘   └──────────────────┘
                │                     │
                ▼                     ▼
          Send / Draft             Append Content
```

The AI agent should communicate **only with the MCP server**.

The MCP server is responsible for translating MCP tool calls into calls to Google APIs.

---

# 4. MCP Server Principles

The server should follow these principles:

### Generic

The MCP server must not contain assumptions about a particular AI agent.

For example, avoid logic such as:

```text
if agent == "my-agent":
    ...
```

Instead expose generic tools with clear descriptions and schemas.

### Discoverable

An MCP client should be able to discover available tools and understand:

* Tool name
* Description
* Input parameters
* Required parameters
* Optional parameters
* Expected response
* Potential errors

### Stateless where possible

The server should avoid maintaining unnecessary agent-specific state.

Authentication/session handling can be maintained separately where required.

### Extensible

Future tools should be easy to add.

For example:

```text
Gmail
 ├── gmail_draft_email
 ├── gmail_send_email
 ├── gmail_search_emails       # future
 └── gmail_get_email           # future

Google Docs
 ├── google_docs_append        # initial
 ├── google_docs_read          # future
 └── google_docs_update        # future
```

---

# 5. Functional Requirements

## 5.1 Gmail – Draft Email

The MCP server must expose a tool that allows an AI agent to create a Gmail draft.

### Proposed MCP Tool

```text
gmail_draft_email
```

### Description

Create a draft email in the authenticated user's Gmail account.

### Input Schema

```json
{
  "to": ["recipient@example.com"],
  "subject": "Email subject",
  "body": "Email body"
}
```

### Parameters

| Parameter | Type          | Required | Description                           |
| --------- | ------------- | -------: | ------------------------------------- |
| `to`      | array<string> |      Yes | One or more recipient email addresses |
| `subject` | string        |      Yes | Email subject                         |
| `body`    | string        |      Yes | Email body                            |

Potential future parameters:

```json
{
  "cc": [],
  "bcc": [],
  "replyTo": "",
  "isHtml": false,
  "attachments": []
}
```

These should not be required in the initial version.

### Expected Behavior

The MCP server should:

1. Validate the input.
2. Validate recipient email addresses.
3. Authenticate against Gmail.
4. Construct a valid RFC 2822/MIME email.
5. Create a Gmail draft using Gmail API.
6. Return the draft identifier and useful metadata.

### Example Response

```json
{
  "success": true,
  "draftId": "123456789",
  "messageId": "987654321",
  "message": "Email draft created successfully."
}
```

---

# 6. Gmail – Send Email

The MCP server must expose a tool that allows an AI agent to send an email directly through Gmail.

### Proposed MCP Tool

```text
gmail_send_email
```

### Description

Send an email using the authenticated user's Gmail account.

### Input Schema

```json
{
  "to": ["recipient@example.com"],
  "subject": "Email subject",
  "body": "Email body"
}
```

### Parameters

| Parameter | Type          | Required | Description                           |
| --------- | ------------- | -------: | ------------------------------------- |
| `to`      | array<string> |      Yes | One or more recipient email addresses |
| `subject` | string        |      Yes | Email subject                         |
| `body`    | string        |      Yes | Email body                            |

### Expected Behavior

The MCP server should:

1. Validate request parameters.
2. Validate email addresses.
3. Authenticate with Gmail.
4. Construct a valid MIME/RFC 2822 message.
5. Encode the message correctly for Gmail API.
6. Call Gmail Send API.
7. Return the Gmail message ID and status.

### Example Response

```json
{
  "success": true,
  "messageId": "987654321",
  "message": "Email sent successfully."
}
```

---

# 7. Draft vs Send Safety

Sending an email is a **side-effecting operation**.

The server should therefore keep draft and send functionality as separate tools.

The AI agent should explicitly invoke:

```text
gmail_draft_email
```

when the user asks to prepare/write/draft an email.

It should invoke:

```text
gmail_send_email
```

only when the user has explicitly requested sending.

The server should **not automatically convert a draft request into a send request**.

Example:

User:

> Draft an email to Rahul saying the meeting is postponed.

Expected tool:

```text
gmail_draft_email
```

User:

> Send an email to Rahul saying the meeting is postponed.

Expected tool:

```text
gmail_send_email
```

---

# 8. Google Docs – Append Content

The MCP server must provide a tool that allows an AI agent to append content to an existing Google Doc.

### Proposed MCP Tool

```text
google_docs_append
```

### Description

Append text to the end of an existing Google Doc.

### Input Schema

```json
{
  "documentId": "1AbCdEfGhIjKlMnOp",
  "content": "This is the content to append."
}
```

### Parameters

| Parameter    | Type   | Required | Description             |
| ------------ | ------ | -------: | ----------------------- |
| `documentId` | string |      Yes | Google Docs document ID |
| `content`    | string |      Yes | Text to append          |

### Expected Behavior

The MCP server should:

1. Validate the document ID.
2. Validate that content is not empty.
3. Authenticate using Google OAuth.
4. Fetch the document's current structure/end position if required.
5. Use the Google Docs API to append the supplied content.
6. Return success/failure information.

### Example Response

```json
{
  "success": true,
  "documentId": "1AbCdEfGhIjKlMnOp",
  "message": "Content appended successfully."
}
```

---

# 9. Formatting Support

The initial version should support plain text.

The implementation should, however, keep formatting extensible.

A future version could support:

```json
{
  "documentId": "123",
  "content": "Meeting Notes",
  "format": {
    "bold": true
  }
}
```

or structured content:

```json
{
  "documentId": "123",
  "content": [
    {
      "type": "heading",
      "text": "Meeting Notes"
    },
    {
      "type": "paragraph",
      "text": "Discussed product roadmap."
    }
  ]
}
```

Do not implement complex formatting unless required for the initial version.

---

# 10. Authentication

The MCP server must use **Google OAuth 2.0** for accessing Gmail and Google Docs.

The implementation should follow Google's recommended OAuth flow and avoid storing user passwords.

## Required OAuth Scopes

The exact scopes should be selected according to the APIs being used, with the principle of least privilege.

Likely Gmail scopes:

```text
https://www.googleapis.com/auth/gmail.compose
https://www.googleapis.com/auth/gmail.send
```

For Google Docs:

```text
https://www.googleapis.com/auth/documents
```

The implementation should use the minimum scopes necessary for the enabled operations.

## Credentials

Google OAuth client configuration should be supplied using environment variables or secure configuration.

Example:

```text
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

Do not hardcode credentials.

Do not commit credentials or tokens into source control.

---

# 11. Authentication Architecture

The implementation should separate:

```text
MCP Tool Layer
       │
       ▼
Google Auth Service
       │
       ▼
OAuth Access Token
       │
       ├── Gmail API
       │
       └── Google Docs API
```

Authentication logic should not be duplicated inside individual tools.

For example:

```text
gmail_send_email
        │
        ▼
GoogleAuthService
        │
        ▼
GmailService
```

and:

```text
google_docs_append
        │
        ▼
GoogleAuthService
        │
        ▼
GoogleDocsService
```

---

# 12. Configuration

Configuration should be environment-driven.

Example:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
GOOGLE_TOKEN_STORE
MCP_SERVER_PORT
LOG_LEVEL
```

The actual configuration mechanism can be adapted to the selected implementation language.

Provide a `.env.example` file.

Never commit the actual `.env` file containing secrets.

---

# 13. Error Handling

The MCP server must return clear, structured errors.

Examples:

### Authentication Error

```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Google authentication is required."
  }
}
```

### Invalid Email

```json
{
  "success": false,
  "error": {
    "code": "INVALID_RECIPIENT",
    "message": "One or more recipient email addresses are invalid."
  }
}
```

### Document Not Found

```json
{
  "success": false,
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "The requested Google Doc could not be found."
  }
}
```

### Permission Error

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSION",
    "message": "The authenticated user does not have permission to modify this document."
  }
}
```

### Google API Error

The server should translate raw Google API failures into useful MCP-compatible errors rather than exposing unnecessary internal details.

---

# 14. Validation

Input validation should happen before calling Google APIs.

## Gmail

Validate:

* `to` exists
* `to` contains at least one recipient
* Email addresses are syntactically valid
* `subject` is provided
* `body` is provided

## Google Docs

Validate:

* `documentId` exists
* `documentId` is non-empty
* `content` exists
* `content` is non-empty

The server should return deterministic validation errors.

---

# 15. Security Requirements

Security is a core requirement.

The implementation must:

* Never log OAuth access tokens.
* Never log OAuth refresh tokens.
* Never log client secrets.
* Never hardcode credentials.
* Store tokens securely.
* Use HTTPS in production.
* Validate all MCP tool inputs.
* Avoid exposing internal Google API errors unnecessarily.
* Follow least-privilege OAuth scopes.
* Ensure users can only access Google resources permitted by their authentication context.

Sensitive information should be redacted from application logs.

Example:

```text
GOOD:
Email send requested for recipient user@example.com

BAD:
Access token: ya29.a0AfH6...
```

---

# 16. MCP Tool Definitions

The MCP server should expose the following initial tools:

## Tool 1

```text
gmail_draft_email
```

**Purpose:** Create an email draft.

### Input

```json
{
  "to": ["string"],
  "subject": "string",
  "body": "string"
}
```

---

## Tool 2

```text
gmail_send_email
```

**Purpose:** Send an email.

### Input

```json
{
  "to": ["string"],
  "subject": "string",
  "body": "string"
}
```

---

## Tool 3

```text
google_docs_append
```

**Purpose:** Append content to an existing Google Doc.

### Input

```json
{
  "documentId": "string",
  "content": "string"
}
```

---

# 17. Tool Naming

Use predictable namespaced naming.

Recommended naming:

```text
gmail_draft_email
gmail_send_email
google_docs_append
```

Avoid agent-specific names such as:

```text
my_agent_send_mail
sales_agent_email
customer_support_send_email
```

The same MCP server should be consumable by multiple AI agents.

---

# 18. MCP Resources and Prompts

Resources and prompts are **not required for the initial implementation**.

The initial version should focus on MCP tools.

Future versions may expose reusable resources or prompts for common workflows.

Example future prompt:

```text
draft_followup_email
```

However, this is outside the initial scope.

---

# 19. Project Structure

Use a clean separation of concerns.

A recommended structure is:

```text
mcp-google-workspace/
│
├── src/
│   ├── server/
│   │   ├── mcpServer
│   │   └── toolRegistry
│   │
│   ├── tools/
│   │   ├── gmailDraftEmail
│   │   ├── gmailSendEmail
│   │   └── googleDocsAppend
│   │
│   ├── services/
│   │   ├── gmailService
│   │   ├── googleDocsService
│   │   └── googleAuthService
│   │
│   ├── validation/
│   │   └── schemas
│   │
│   ├── errors/
│   │   └── errorHandler
│   │
│   └── config/
│       └── configuration
│
├── tests/
│   ├── tools/
│   ├── services/
│   └── validation/
│
├── .env.example
├── README.md
├── package.json / requirements.txt
└── problemStatement.md
```

The exact structure can vary based on the chosen programming language.

---

# 20. Technology Choice

The implementation language can be selected based on the team's preference.

Preferred options:

* TypeScript / Node.js
* Python

The implementation should use an official or well-supported MCP SDK for the selected language.

For Google integrations, use Google's official API client libraries rather than manually constructing HTTP requests wherever practical.

---

# 21. MCP Transport

The implementation should support the MCP transport appropriate for the intended deployment.

For the initial local-development version, use the simplest supported transport that works well with MCP clients such as Cursor or other MCP-compatible agent environments.

The transport should be configurable so that the server can later be deployed remotely.

---

# 22. Observability

The server should provide basic structured logging.

Logs should include:

* Tool invoked
* Timestamp
* Success/failure
* Error category
* Google API latency where useful

Logs must not contain:

* OAuth tokens
* Client secrets
* Full email bodies unless explicitly required for debugging
* Sensitive user data

Example:

```text
INFO gmail_send_email started
INFO gmail_send_email completed
INFO google_docs_append started
ERROR google_docs_append DOCUMENT_NOT_FOUND
```

---

# 23. Testing Requirements

Unit tests should be added for:

### Gmail

* Valid email draft request
* Invalid recipient
* Missing subject
* Missing body
* Successful draft creation
* Successful email send
* Gmail authentication failure
* Gmail API failure

### Google Docs

* Valid append request
* Missing document ID
* Empty content
* Successful append
* Document not found
* Permission denied
* Google API failure

### MCP

Test that:

* Tools are discoverable
* Tool names are correct
* Input schemas are correctly exposed
* Invalid input is rejected
* Errors are returned in a predictable structure

Google API calls should preferably be mocked in unit tests.

Integration tests can be added separately for a real Google account.

---

# 24. README Requirements

The project README should explain:

1. What the MCP server does.
2. Supported MCP tools.
3. Architecture.
4. Google Cloud project setup.
5. How to enable Gmail API.
6. How to enable Google Docs API.
7. How to configure OAuth credentials.
8. How to run the MCP server locally.
9. How to connect it to an MCP client such as Cursor.
10. Example tool invocations.
11. Security considerations.
12. How to extend the server with additional tools.

Include example MCP configuration where applicable.

---

# 25. Example Agent Interaction

## Example 1 – Draft Email

User:

> Draft an email to the finance team saying the monthly report is ready.

The AI agent should determine that the appropriate MCP tool is:

```text
gmail_draft_email
```

with parameters such as:

```json
{
  "to": ["finance@example.com"],
  "subject": "Monthly Report Ready",
  "body": "Hi Team,\n\nThe monthly report is now ready.\n\nRegards"
}
```

The MCP server creates the Gmail draft and returns the result.

---

# 26. Example 2 – Send Email

User:

> Send an email to Rahul saying today's meeting is postponed to tomorrow.

The AI agent invokes:

```text
gmail_send_email
```

with:

```json
{
  "to": ["rahul@example.com"],
  "subject": "Meeting Postponed",
  "body": "Hi Rahul,\n\nToday's meeting has been postponed to tomorrow.\n\nRegards"
}
```

The MCP server sends the message using Gmail API.

---

# 27. Example 3 – Append to Google Doc

User:

> Add these meeting notes to the project document.

The AI agent invokes:

```text
google_docs_append
```

with:

```json
{
  "documentId": "1AbCdEfGhIjKlMnOp",
  "content": "Meeting Notes\n\n1. Discussed project timeline.\n2. Reviewed open issues.\n3. Next review scheduled for Friday."
}
```

The MCP server appends the content to the Google Doc.

---

# 28. Generic Agent Compatibility

The MCP server must **not assume how an AI agent reasons or decides which tool to use**.

Its responsibility is:

```text
Expose capabilities
        ↓
Accept valid MCP requests
        ↓
Validate inputs
        ↓
Authenticate
        ↓
Execute Google API operation
        ↓
Return structured result
```

The AI agent is responsible for:

```text
Understanding user intent
        ↓
Selecting the appropriate MCP tool
        ↓
Generating tool parameters
        ↓
Interpreting the tool result
```

This separation is important because the same MCP server should work with:

* Cursor
* Claude
* Custom AI agents
* Internal enterprise agents
* Other MCP-compatible clients

---

# 29. Extensibility

The architecture should make it easy to add additional tools later.

Potential future capabilities:

```text
Gmail
 ├── gmail_draft_email
 ├── gmail_send_email
 ├── gmail_search_emails
 ├── gmail_read_email
 ├── gmail_reply_email
 └── gmail_forward_email

Google Docs
 ├── google_docs_append
 ├── google_docs_read
 ├── google_docs_create
 ├── google_docs_update
 └── google_docs_replace_text

Google Sheets
 ├── google_sheets_read
 ├── google_sheets_append
 └── google_sheets_update

Google Calendar
 ├── google_calendar_create_event
 ├── google_calendar_update_event
 └── google_calendar_cancel_event
```

The initial implementation should not over-engineer for these features, but the architecture should allow them to be added without significant refactoring.

---

# 30. Definition of Done

The project is considered complete when:

### MCP

* [ ] MCP server starts successfully.
* [ ] MCP client can connect.
* [ ] MCP tools are discoverable.
* [ ] Tool schemas are correctly exposed.

### Gmail

* [ ] `gmail_draft_email` works with a real Gmail account.
* [ ] `gmail_send_email` works with a real Gmail account.
* [ ] Invalid requests are rejected.
* [ ] Authentication errors are handled cleanly.
* [ ] Google API errors are handled cleanly.

### Google Docs

* [ ] `google_docs_append` works with a real Google Doc.
* [ ] Invalid document IDs are rejected.
* [ ] Permission errors are handled.
* [ ] Content is correctly appended.

### Security

* [ ] Secrets are environment-based.
* [ ] Tokens are not logged.
* [ ] Minimum practical OAuth scopes are used.
* [ ] No credentials are committed to source control.

### Developer Experience

* [ ] README contains setup instructions.
* [ ] `.env.example` is included.
* [ ] Unit tests exist for the core functionality.
* [ ] MCP client configuration is documented.
* [ ] Project can be run locally with clear commands.

---

# 31. Implementation Guidance for Cursor / Antigravity

Build this as a **production-quality but minimal first version**.

Priorities should be:

1. Correct MCP implementation.
2. Reliable Google OAuth.
3. Working Gmail draft/send operations.
4. Working Google Docs append operation.
5. Strong input validation.
6. Clear error handling.
7. Security.
8. Unit tests.
9. Clean documentation.
10. Extensible architecture.

Do not implement unnecessary Google Workspace functionality in the first version.

The final result should be a **generic Google Workspace MCP server** whose initial capabilities are:

```text
gmail_draft_email
gmail_send_email
google_docs_append
```

The server must be usable by any MCP-compatible AI agent and must not contain business logic specific to one AI agent or application.
