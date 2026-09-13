import { describe, it, expect, vi, beforeEach } from "vitest";
import { GoogleDocsService } from "../../src/services/googleDocsService.js";

// Mock googleapis
vi.mock("googleapis", () => {
  const mockDocsGet = vi.fn();
  const mockDocsBatchUpdate = vi.fn();

  return {
    google: {
      docs: () => ({
        documents: {
          get: mockDocsGet,
          batchUpdate: mockDocsBatchUpdate,
        },
      }),
    },
    __mockDocsGet: mockDocsGet,
    __mockDocsBatchUpdate: mockDocsBatchUpdate,
  };
});

import * as googleapis from "googleapis";
const mockDocsGet = (googleapis as any).__mockDocsGet;
const mockDocsBatchUpdate = (googleapis as any).__mockDocsBatchUpdate;

describe("GoogleDocsService", () => {
  let service: GoogleDocsService;
  const mockAuth = {} as any;

  beforeEach(() => {
    service = new GoogleDocsService();
    vi.clearAllMocks();
  });

  describe("appendContent", () => {
    it("should append content using endOfSegmentLocation", async () => {
      mockDocsBatchUpdate.mockResolvedValueOnce({});

      const result = await service.appendContent(mockAuth, {
        documentId: "doc-123",
        content: "Appended text",
      });

      expect(result.success).toBe(true);
      expect(result.documentId).toBe("doc-123");
      expect(result.message).toBe("Content appended successfully.");

      // Should insert at endOfSegmentLocation
      expect(mockDocsBatchUpdate).toHaveBeenCalledWith({
        documentId: "doc-123",
        requestBody: {
          requests: [
            {
              insertText: {
                endOfSegmentLocation: { segmentId: "" },
                text: "Appended text",
              },
            },
          ],
        },
      });
    });

    it("should throw on document not found (404) during batchUpdate", async () => {
      mockDocsBatchUpdate.mockRejectedValueOnce({
        code: 404,
        message: "Requested entity was not found.",
      });

      await expect(
        service.appendContent(mockAuth, {
          documentId: "nonexistent-doc",
          content: "Hello",
        })
      ).rejects.toEqual({
        code: 404,
        message: "Requested entity was not found.",
      });
    });

    it("should throw on permission denied (403) during batchUpdate", async () => {
      mockDocsBatchUpdate.mockRejectedValueOnce({
        code: 403,
        message: "The caller does not have permission.",
      });

      await expect(
        service.appendContent(mockAuth, {
          documentId: "private-doc",
          content: "Hello",
        })
      ).rejects.toEqual({
        code: 403,
        message: "The caller does not have permission.",
      });
    });
  });
});
