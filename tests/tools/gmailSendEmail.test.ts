import { describe, it, expect, vi, beforeEach } from "vitest";
import { gmailSendEmailTool } from "../../src/tools/gmailSendEmail.js";

// Mock the auth service
vi.mock("../../src/services/googleAuthService.js", () => ({
  googleAuthService: {
    getAuthenticatedClient: vi.fn(),
  },
}));

// Mock the gmail service
vi.mock("../../src/services/gmailService.js", () => ({
  gmailService: {
    sendEmail: vi.fn(),
  },
}));

import { googleAuthService } from "../../src/services/googleAuthService.js";
import { gmailService } from "../../src/services/gmailService.js";

describe("gmailSendEmail Tool", () => {
  const mockAuth = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (googleAuthService.getAuthenticatedClient as any).mockResolvedValue(
      mockAuth
    );
  });

  it("should have correct tool metadata", () => {
    expect(gmailSendEmailTool.name).toBe("gmail_send_email");
    expect(gmailSendEmailTool.description).toContain("Send");
    expect(gmailSendEmailTool.description).toContain("side-effecting");
    expect(gmailSendEmailTool.inputSchema.required).toEqual([
      "to",
      "subject",
      "body",
    ]);
  });

  it("should send an email successfully", async () => {
    (gmailService.sendEmail as any).mockResolvedValueOnce({
      success: true,
      messageId: "sent-msg-123",
      message: "Email sent successfully.",
    });

    const result = await gmailSendEmailTool.handler({
      to: ["recipient@example.com"],
      subject: "Important",
      body: "This is important.",
    });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.messageId).toBe("sent-msg-123");
  });

  it("should return validation error for invalid email", async () => {
    const result = await gmailSendEmailTool.handler({
      to: ["bad-email"],
      subject: "Test",
      body: "Hello",
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error.code).toBe("INVALID_RECIPIENT");
  });

  it("should return validation error for empty to array", async () => {
    const result = await gmailSendEmailTool.handler({
      to: [],
      subject: "Test",
      body: "Hello",
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error.code).toBe("VALIDATION_ERROR");
  });

  it("should handle Gmail API 403 error", async () => {
    (gmailService.sendEmail as any).mockRejectedValueOnce({
      code: 403,
      message: "Insufficient permission",
    });

    const result = await gmailSendEmailTool.handler({
      to: ["test@example.com"],
      subject: "Test",
      body: "Hello",
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error.code).toBe("INSUFFICIENT_PERMISSION");
  });
});
