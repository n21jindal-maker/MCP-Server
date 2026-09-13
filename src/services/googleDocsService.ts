import { google } from "googleapis";
import { OAuth2Client } from "googleapis-common";
import { logger } from "../utils/logger.js";

export interface AppendResult {
  success: true;
  documentId: string;
  message: string;
}

/**
 * Service encapsulating all Google Docs API interactions.
 * Tools call this service — they never call the Docs API directly.
 */
export class GoogleDocsService {
  /**
   * Appends text content to the end of an existing Google Doc.
   *
   * Fetches the document to determine the current end index,
   * then inserts the text at that position.
   */
  async appendContent(
    auth: OAuth2Client,
    params: { documentId: string; content: string }
  ): Promise<AppendResult> {
    const docs = google.docs({ version: "v1", auth });

    logger.info("google_docs_append", "Appending content", {
      documentId: params.documentId,
      contentLength: params.content.length,
    });

    const startTime = Date.now();

    await docs.documents.batchUpdate({
      documentId: params.documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              endOfSegmentLocation: {
                segmentId: "", // Empty string for the document body
              },
              text: params.content,
            },
          },
        ],
      },
    });

    const durationMs = Date.now() - startTime;

    logger.info("google_docs_append", "Content appended", {
      documentId: params.documentId,
      durationMs,
    });

    return {
      success: true,
      documentId: params.documentId,
      message: "Content appended successfully.",
    };
  }
}

export const googleDocsService = new GoogleDocsService();
