import { google } from "googleapis";
import { OAuth2Client } from "googleapis-common";
import fs from "fs/promises";
import path from "path";
import http from "http";
import url from "url";
import { loadConfig } from "../config/config.js";
import { McpToolError } from "../errors/errorHandler.js";
import { ErrorCode } from "../errors/errorCodes.js";
import { logger } from "../utils/logger.js";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/documents",
];

interface StoredTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expiry_date?: number;
}

/**
 * Singleton service managing Google OAuth 2.0 authentication.
 * All MCP tools request an authenticated client through this service.
 */
class GoogleAuthService {
  private oauth2Client: OAuth2Client | null = null;
  private tokenStorePath: string;

  constructor() {
    const config = loadConfig();
    this.tokenStorePath = config.googleTokenStore;
    this.oauth2Client = new google.auth.OAuth2(
      config.googleClientId,
      config.googleClientSecret,
      config.googleRedirectUri
    );
  }

  /**
   * Returns an authenticated OAuth2Client.
   * Loads saved tokens if available, refreshes if expired,
   * or initiates interactive consent flow if no tokens exist.
   */
  async getAuthenticatedClient(): Promise<OAuth2Client> {
    if (!this.oauth2Client) {
      throw new McpToolError(
        ErrorCode.AUTHENTICATION_REQUIRED,
        "OAuth2 client not initialized."
      );
    }

    // Try loading saved tokens
    const tokens = await this.loadTokens();

    if (tokens) {
      this.oauth2Client.setCredentials(tokens);

      // Check if token needs refresh
      if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
        logger.info("auth", "Token expired, refreshing...");
        try {
          const { credentials } = await this.oauth2Client.refreshAccessToken();
          this.oauth2Client.setCredentials(credentials);
          await this.saveTokens(credentials as StoredTokens);
          logger.info("auth", "Token refreshed successfully.");
        } catch {
          logger.warn(
            "auth",
            "Token refresh failed, initiating new consent flow."
          );
          await this.initiateConsentFlow();
        }
      }

      return this.oauth2Client;
    }

    // No saved tokens — need interactive consent
    logger.info("auth", "No saved tokens found, initiating consent flow.");
    await this.initiateConsentFlow();
    return this.oauth2Client;
  }

  /**
   * Starts a local HTTP server to handle the OAuth callback,
   * opens the consent URL, and waits for the authorization code.
   */
  private async initiateConsentFlow(): Promise<void> {
    if (!this.oauth2Client) {
      throw new McpToolError(
        ErrorCode.AUTHENTICATION_REQUIRED,
        "OAuth2 client not initialized."
      );
    }

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
    });

    logger.info("auth", "Authorization required. Please visit this URL:");
    // Output to stderr so it doesn't interfere with MCP stdio transport
    console.error(`\n🔐 Open this URL in your browser to authorize:\n\n${authUrl}\n`);

    // Start a temporary local server to receive the callback
    const code = await this.waitForAuthCode();

    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    await this.saveTokens(tokens as StoredTokens);
    logger.info("auth", "Authentication successful. Tokens saved.");
  }

  /**
   * Starts a temporary HTTP server on the redirect URI port
   * and waits for Google to send the authorization code.
   */
  private waitForAuthCode(): Promise<string> {
    return new Promise((resolve, reject) => {
      const config = loadConfig();
      const redirectUrl = new URL(config.googleRedirectUri);
      const port = parseInt(redirectUrl.port) || 3000;

      const server = http.createServer(async (req, res) => {
        try {
          const reqUrl = new URL(req.url || "", `http://localhost:${port}`);
          const code = reqUrl.searchParams.get("code");

          if (code) {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(
              "<html><body><h1>✅ Authorization successful!</h1><p>You can close this tab and return to the terminal.</p></body></html>"
            );
            server.close();
            resolve(code);
          } else {
            const error = reqUrl.searchParams.get("error");
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end(
              `<html><body><h1>❌ Authorization failed</h1><p>${error || "Unknown error"}</p></body></html>`
            );
            server.close();
            reject(
              new McpToolError(
                ErrorCode.AUTHENTICATION_REQUIRED,
                `Authorization failed: ${error || "Unknown error"}`
              )
            );
          }
        } catch (err) {
          server.close();
          reject(err);
        }
      });

      server.on("error", (err: Error & { code?: string }) => {
        logger.error("auth", `Local auth server error: ${err.message}`);
        if (err.code === "EADDRINUSE") {
          reject(
            new McpToolError(
              ErrorCode.AUTHENTICATION_REQUIRED,
              `Port ${port} is already in use. Cannot start interactive consent flow. Please generate tokens locally and provide them via GOOGLE_OAUTH_TOKEN.`
            )
          );
        } else {
          reject(
            new McpToolError(
              ErrorCode.AUTHENTICATION_REQUIRED,
              `Failed to start local auth server: ${err.message}`
            )
          );
        }
      });

      server.listen(port, () => {
        logger.info("auth", `Waiting for OAuth callback on port ${port}...`);
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        server.close();
        reject(
          new McpToolError(
            ErrorCode.AUTHENTICATION_REQUIRED,
            "Authorization timed out. Please try again."
          )
        );
      }, 5 * 60 * 1000);
    });
  }

  private async loadTokens(): Promise<StoredTokens | null> {
    if (process.env.GOOGLE_OAUTH_TOKEN) {
      try {
        logger.debug("auth", "Loading tokens from GOOGLE_OAUTH_TOKEN environment variable");
        return JSON.parse(process.env.GOOGLE_OAUTH_TOKEN) as StoredTokens;
      } catch (err) {
        logger.error("auth", "Failed to parse GOOGLE_OAUTH_TOKEN", { error: err instanceof Error ? err.message : String(err) });
        throw new McpToolError(
          ErrorCode.AUTHENTICATION_REQUIRED,
          `Invalid GOOGLE_OAUTH_TOKEN format. It must be valid JSON: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    try {
      const tokenPath = path.resolve(this.tokenStorePath);
      const data = await fs.readFile(tokenPath, "utf-8");
      return JSON.parse(data) as StoredTokens;
    } catch (err) {
      logger.debug("auth", "No saved tokens found in file.");
      return null;
    }
  }

  private async saveTokens(tokens: StoredTokens): Promise<void> {
    try {
      const tokenPath = path.resolve(this.tokenStorePath);
      await fs.writeFile(tokenPath, JSON.stringify(tokens, null, 2), "utf-8");
      logger.debug("auth", "Tokens saved", { path: tokenPath });
    } catch (err) {
      logger.error("auth", "Failed to save tokens", {
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }
}

// Export singleton instance
export const googleAuthService = new GoogleAuthService();
