import { describe, it, expect } from "vitest";
import {
  parseGmailInput,
  parseGoogleDocsInput,
} from "../../src/validation/schemas.js";
import { McpToolError } from "../../src/errors/errorHandler.js";
import { ErrorCode } from "../../src/errors/errorCodes.js";

describe("Gmail Input Schema", () => {
  it("should accept valid input", () => {
    const input = {
      to: ["test@example.com"],
      subject: "Test Subject",
      body: "Test Body",
    };
    const result = parseGmailInput(input);
    expect(result).toEqual(input);
  });

  it("should accept multiple recipients", () => {
    const input = {
      to: ["alice@example.com", "bob@example.com"],
      subject: "Test",
      body: "Hello",
    };
    const result = parseGmailInput(input);
    expect(result.to).toHaveLength(2);
  });

  it("should reject missing 'to' field", () => {
    expect(() =>
      parseGmailInput({ subject: "Test", body: "Body" })
    ).toThrow(McpToolError);
  });

  it("should reject empty 'to' array", () => {
    try {
      parseGmailInput({ to: [], subject: "Test", body: "Body" });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(McpToolError);
      expect((err as McpToolError).code).toBe(ErrorCode.VALIDATION_ERROR);
    }
  });

  it("should reject invalid email address with INVALID_RECIPIENT code", () => {
    try {
      parseGmailInput({ to: ["not-an-email"], subject: "Test", body: "Body" });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(McpToolError);
      expect((err as McpToolError).code).toBe(ErrorCode.INVALID_RECIPIENT);
    }
  });

  it("should reject missing subject", () => {
    try {
      parseGmailInput({ to: ["test@example.com"], body: "Body" });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(McpToolError);
      expect((err as McpToolError).code).toBe(ErrorCode.VALIDATION_ERROR);
    }
  });

  it("should reject empty subject", () => {
    try {
      parseGmailInput({ to: ["test@example.com"], subject: "", body: "Body" });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(McpToolError);
      expect((err as McpToolError).code).toBe(ErrorCode.VALIDATION_ERROR);
    }
  });

  it("should reject missing body", () => {
    try {
      parseGmailInput({ to: ["test@example.com"], subject: "Test" });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(McpToolError);
      expect((err as McpToolError).code).toBe(ErrorCode.VALIDATION_ERROR);
    }
  });

  it("should reject empty body", () => {
    try {
      parseGmailInput({
        to: ["test@example.com"],
        subject: "Test",
        body: "",
      });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(McpToolError);
      expect((err as McpToolError).code).toBe(ErrorCode.VALIDATION_ERROR);
    }
  });
});

describe("Google Docs Input Schema", () => {
  it("should accept valid input", () => {
    const input = {
      documentId: "1AbCdEfGhIjKlMnOp",
      content: "Hello, world!",
    };
    const result = parseGoogleDocsInput(input);
    expect(result).toEqual(input);
  });

  it("should reject missing documentId", () => {
    try {
      parseGoogleDocsInput({ content: "Hello" });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(McpToolError);
      expect((err as McpToolError).code).toBe(ErrorCode.VALIDATION_ERROR);
    }
  });

  it("should reject empty documentId", () => {
    try {
      parseGoogleDocsInput({ documentId: "", content: "Hello" });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(McpToolError);
      expect((err as McpToolError).code).toBe(ErrorCode.VALIDATION_ERROR);
    }
  });

  it("should reject missing content", () => {
    try {
      parseGoogleDocsInput({ documentId: "abc123" });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(McpToolError);
      expect((err as McpToolError).code).toBe(ErrorCode.VALIDATION_ERROR);
    }
  });

  it("should reject empty content", () => {
    try {
      parseGoogleDocsInput({ documentId: "abc123", content: "" });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(McpToolError);
      expect((err as McpToolError).code).toBe(ErrorCode.VALIDATION_ERROR);
    }
  });
});
