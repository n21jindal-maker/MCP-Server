import { google } from "googleapis";
import { OAuth2Client } from "googleapis-common";
import { logger } from "../utils/logger.js";

export interface DraftResult {
  success: true;
  draftId: string;
  messageId: string;
  message: string;
}

export interface SendResult {
  success: true;
  messageId: string;
  message: string;
}

/**
 * Constructs a base64url-encoded RFC 2822 MIME email message.
 */
function buildMimeMessage(
  to: string[],
  subject: string,
  body: string
): string {
  const messageParts = [
    `To: ${to.join(", ")}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    body,
  ];

  const rawMessage = messageParts.join("\r\n");

  // Gmail API requires base64url encoding
  return Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Service encapsulating all Gmail API interactions.
 * Tools call this service — they never call the Gmail API directly.
 */
export class GmailService {
  /**
   * Creates a draft email in the authenticated user's Gmail account.
   */
  async createDraft(
    auth: OAuth2Client,
    params: { to: string[]; subject: string; body: string }
  ): Promise<DraftResult> {
    const gmail = google.gmail({ version: "v1", auth });
    const raw = buildMimeMessage(params.to, params.subject, params.body);

    logger.info("gmail_draft_email", "Creating draft", {
      recipient_count: params.to.length,
    });

    const startTime = Date.now();

    const response = await gmail.users.drafts.create({
      userId: "me",
      requestBody: {
        message: { raw },
      },
    });

    const durationMs = Date.now() - startTime;

    const draftId = response.data.id || "";
    const messageId = response.data.message?.id || "";

    logger.info("gmail_draft_email", "Draft created", {
      draftId,
      messageId,
      durationMs,
    });

    return {
      success: true,
      draftId,
      messageId,
      message: "Email draft created successfully.",
    };
  }

  /**
   * Sends an email using the authenticated user's Gmail account.
   */
  async sendEmail(
    auth: OAuth2Client,
    params: { to: string[]; subject: string; body: string }
  ): Promise<SendResult> {
    const gmail = google.gmail({ version: "v1", auth });
    const raw = buildMimeMessage(params.to, params.subject, params.body);

    logger.info("gmail_send_email", "Sending email", {
      recipient_count: params.to.length,
    });

    const startTime = Date.now();

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    const durationMs = Date.now() - startTime;

    const messageId = response.data.id || "";

    logger.info("gmail_send_email", "Email sent", {
      messageId,
      durationMs,
    });

    return {
      success: true,
      messageId,
      message: "Email sent successfully.",
    };
  }
}

export const gmailService = new GmailService();
