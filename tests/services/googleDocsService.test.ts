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
    it("should append content to a non-empty document", async () => {
      mockDocsGet.mockResolvedValueOnce({
        data: {
          body: {
            content: [
              { endIndex: 1 },
              { endIndex: 50 },
            ],
          },
        },
      });
      mockDocsBatchUpdate.mockResolvedValueOnce({});

      const result = await service.appendContent(mockAuth, {
        documentId: "doc-123",
        content: "Appended text",
      });

      expect(result.success).toBe(true);
      expect(result.documentId).toBe("doc-123");
      expect(result.message).toBe("Content appended successfully.");

      // Should insert at endIndex - 1 of last element
      expect(mockDocsBatchUpdate).toHaveBeenCalledWith({
        documentId: "doc-123",
        requestBody: {
          requests: [
            {
              insertText: {
                location: { index: 49 },
                text: "Appended text",
              },
            },
          ],
        },
      });
    });

    it("should handle empty document body", async () => {
      mockDocsGet.mockResolvedValueOnce({
        data: {
          body: null,
        },
      });
      mockDocsBatchUpdate.mockResolvedValueOnce({});

      const result = await service.appendContent(mockAuth, {
        documentId: "empty-doc",
        content: "First content",
      });

      expect(result.success).toBe(true);

      // Should insert at index 1 for empty doc
      expect(mockDocsBatchUpdate).toHaveBeenCalledWith({
        documentId: "empty-doc",
        requestBody: {
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: "First content",
              },
            },
          ],
        },
      });
    });

    it("should throw on document not found (404)", async () => {
      mockDocsGet.mockRejectedValueOnce({
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

    it("should throw on permission denied (403)", async () => {
      mockDocsGet.mockRejectedValueOnce({
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
