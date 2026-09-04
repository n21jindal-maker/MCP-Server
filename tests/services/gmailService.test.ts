import { describe, it, expect, vi, beforeEach } from "vitest";
import { GmailService } from "../../src/services/gmailService.js";

// Mock googleapis
vi.mock("googleapis", () => {
  const mockDraftsCreate = vi.fn();
  const mockMessagesSend = vi.fn();

  return {
    google: {
      gmail: () => ({
        users: {
          drafts: { create: mockDraftsCreate },
          messages: { send: mockMessagesSend },
        },
      }),
    },
    __mockDraftsCreate: mockDraftsCreate,
    __mockMessagesSend: mockMessagesSend,
  };
});

// Access the mock functions
import * as googleapis from "googleapis";
const mockDraftsCreate = (googleapis as any).__mockDraftsCreate;
const mockMessagesSend = (googleapis as any).__mockMessagesSend;

describe("GmailService", () => {
  let service: GmailService;
  const mockAuth = {} as any; // Mock OAuth2Client

  beforeEach(() => {
    service = new GmailService();
    vi.clearAllMocks();
  });

  describe("createDraft", () => {
    it("should create a draft successfully", async () => {
      mockDraftsCreate.mockResolvedValueOnce({
        data: {
          id: "draft-123",
          message: { id: "msg-456" },
        },
      });

      const result = await service.createDraft(mockAuth, {
        to: ["test@example.com"],
        subject: "Test Subject",
        body: "Test Body",
      });

      expect(result.success).toBe(true);
      expect(result.draftId).toBe("draft-123");
      expect(result.messageId).toBe("msg-456");
      expect(result.message).toBe("Email draft created successfully.");
      expect(mockDraftsCreate).toHaveBeenCalledOnce();
    });

    it("should handle draft creation with multiple recipients", async () => {
      mockDraftsCreate.mockResolvedValueOnce({
        data: {
          id: "draft-789",
          message: { id: "msg-012" },
        },
      });

      const result = await service.createDraft(mockAuth, {
        to: ["alice@example.com", "bob@example.com"],
        subject: "Group Email",
        body: "Hello everyone",
      });

      expect(result.success).toBe(true);
      expect(result.draftId).toBe("draft-789");
    });

    it("should throw on Gmail API error", async () => {
      mockDraftsCreate.mockRejectedValueOnce({
        code: 401,
        message: "Invalid credentials",
      });

      await expect(
        service.createDraft(mockAuth, {
          to: ["test@example.com"],
          subject: "Test",
          body: "Body",
        })
      ).rejects.toEqual({
        code: 401,
        message: "Invalid credentials",
      });
    });
  });

  describe("sendEmail", () => {
    it("should send an email successfully", async () => {
      mockMessagesSend.mockResolvedValueOnce({
        data: { id: "sent-msg-123" },
      });

      const result = await service.sendEmail(mockAuth, {
        to: ["recipient@example.com"],
        subject: "Important",
        body: "This is important.",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("sent-msg-123");
      expect(result.message).toBe("Email sent successfully.");
      expect(mockMessagesSend).toHaveBeenCalledOnce();
    });

    it("should throw on Gmail API error", async () => {
      mockMessagesSend.mockRejectedValueOnce({
        code: 403,
        message: "Insufficient permission",
      });

      await expect(
        service.sendEmail(mockAuth, {
          to: ["test@example.com"],
          subject: "Test",
          body: "Body",
        })
      ).rejects.toEqual({
        code: 403,
        message: "Insufficient permission",
      });
    });
  });
});
