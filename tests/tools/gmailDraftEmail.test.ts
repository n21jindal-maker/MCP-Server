import { describe, it, expect, vi, beforeEach } from "vitest";
import { gmailDraftEmailTool } from "../../src/tools/gmailDraftEmail.js";

// Mock the auth service
vi.mock("../../src/services/googleAuthService.js", () => ({
  googleAuthService: {
    getAuthenticatedClient: vi.fn(),
  },
}));

// Mock the gmail service
vi.mock("../../src/services/gmailService.js", () => ({
  gmailService: {
    createDraft: vi.fn(),
  },
}));

import { googleAuthService } from "../../src/services/googleAuthService.js";
import { gmailService } from "../../src/services/gmailService.js";

describe("gmailDraftEmail Tool", () => {
  const mockAuth = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (googleAuthService.getAuthenticatedClient as any).mockResolvedValue(
      mockAuth
    );
  });

  it("should have correct tool metadata", () => {
    expect(gmailDraftEmailTool.name).toBe("gmail_draft_email");
    expect(gmailDraftEmailTool.description).toContain("draft");
    expect(gmailDraftEmailTool.inputSchema.required).toEqual([
      "to",
      "subject",
      "body",
    ]);
  });

  it("should create a draft successfully", async () => {
    (gmailService.createDraft as any).mockResolvedValueOnce({
      success: true,
      draftId: "draft-123",
      messageId: "msg-456",
      message: "Email draft created successfully.",
    });

    const result = await gmailDraftEmailTool.handler({
      to: ["test@example.com"],
      subject: "Test",
      body: "Hello",
    });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.draftId).toBe("draft-123");
  });

  it("should return validation error for invalid email", async () => {
    const result = await gmailDraftEmailTool.handler({
      to: ["not-an-email"],
      subject: "Test",
      body: "Hello",
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error.code).toBe("INVALID_RECIPIENT");
  });

  it("should return validation error for missing subject", async () => {
    const result = await gmailDraftEmailTool.handler({
      to: ["test@example.com"],
      body: "Hello",
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error.code).toBe("VALIDATION_ERROR");
  });

  it("should return validation error for missing body", async () => {
    const result = await gmailDraftEmailTool.handler({
      to: ["test@example.com"],
      subject: "Test",
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error.code).toBe("VALIDATION_ERROR");
  });

  it("should handle Gmail API failure", async () => {
    (gmailService.createDraft as any).mockRejectedValueOnce({
      code: 401,
      message: "Invalid credentials",
    });

    const result = await gmailDraftEmailTool.handler({
      to: ["test@example.com"],
      subject: "Test",
      body: "Hello",
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("should handle auth service failure", async () => {
    (googleAuthService.getAuthenticatedClient as any).mockRejectedValueOnce(
      new Error("Auth failed")
    );

    const result = await gmailDraftEmailTool.handler({
      to: ["test@example.com"],
      subject: "Test",
      body: "Hello",
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
  });
});
