import dotenv from "dotenv";

dotenv.config();

export interface Config {
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUri: string;
  googleTokenStore: string;
  logLevel: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env and fill in the values.`
    );
  }
  return value;
}

export function loadConfig(): Config {
  return {
    googleClientId: requireEnv("GOOGLE_CLIENT_ID"),
    googleClientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
    googleRedirectUri:
      process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/oauth/callback",
    googleTokenStore: process.env.GOOGLE_TOKEN_STORE || "./tokens.json",
    logLevel: process.env.LOG_LEVEL || "info",
  };
}
