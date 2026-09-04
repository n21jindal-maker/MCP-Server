import { describe, it, expect, vi, beforeEach } from "vitest";
import { googleDocsAppendTool } from "../../src/tools/googleDocsAppend.js";

// Mock the auth service
vi.mock("../../src/services/googleAuthService.js", () => ({
  googleAuthService: {
    getAuthenticatedClient: vi.fn(),
  },
}));

// Mock the docs service
vi.mock("../../src/services/googleDocsService.js", () => ({
  googleDocsService: {
    appendContent: vi.fn(),
  },
}));

import { googleAuthService } from "../../src/services/googleAuthService.js";
import { googleDocsService } from "../../src/services/googleDocsService.js";

describe("googleDocsAppend Tool", () => {
  const mockAuth = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (googleAuthService.getAuthenticatedClient as any).mockResolvedValue(
      mockAuth
    );
  });

  it("should have correct tool metadata", () => {
    expect(googleDocsAppendTool.name).toBe("google_docs_append");
    expect(googleDocsAppendTool.description).toContain("Append");
    expect(googleDocsAppendTool.inputSchema.required).toEqual([
      "documentId",
      "content",
    ]);
  });

  it("should append content successfully", async () => {
    (googleDocsService.appendContent as any).mockResolvedValueOnce({
      success: true,
      documentId: "doc-123",
      message: "Content appended successfully.",
    });

    const result = await googleDocsAppendTool.handler({
      documentId: "doc-123",
      content: "New content here",
    });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.documentId).toBe("doc-123");
  });

  it("should return validation error for missing documentId", async () => {
    const result = await googleDocsAppendTool.handler({
      content: "Hello",
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error.code).toBe("VALIDATION_ERROR");
  });

  it("should return validation error for empty content", async () => {
    const result = await googleDocsAppendTool.handler({
      documentId: "doc-123",
      content: "",
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error.code).toBe("VALIDATION_ERROR");
  });

  it("should handle document not found (404)", async () => {
    (googleDocsService.appendContent as any).mockRejectedValueOnce({
      code: 404,
      message: "Requested entity was not found.",
    });

    const result = await googleDocsAppendTool.handler({
      documentId: "nonexistent-doc",
      content: "Hello",
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error.code).toBe("DOCUMENT_NOT_FOUND");
  });

  it("should handle permission denied (403)", async () => {
    (googleDocsService.appendContent as any).mockRejectedValueOnce({
      code: 403,
      message: "The caller does not have permission.",
    });

    const result = await googleDocsAppendTool.handler({
      documentId: "private-doc",
      content: "Hello",
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error.code).toBe("INSUFFICIENT_PERMISSION");
  });

  it("should handle auth failure", async () => {
    (googleAuthService.getAuthenticatedClient as any).mockRejectedValueOnce(
      new Error("Auth failed")
    );

    const result = await googleDocsAppendTool.handler({
      documentId: "doc-123",
      content: "Hello",
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
  });
});
