import { describe, it, expect, vi, beforeEach } from "vitest";
import { execSync } from "node:child_process";
import { reviewScript } from "../src/reviewer.js";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

vi.mock("../src/output.js", () => ({
  log: vi.fn(),
}));

const mockExecSync = vi.mocked(execSync);

describe("reviewScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns safe result for valid safe response", () => {
    mockExecSync.mockReturnValue(
      JSON.stringify({
        safe: true,
        reason: "Script is harmless",
        details: [],
      }),
    );

    const result = reviewScript("echo hello");

    expect(result).toEqual({
      safe: true,
      reason: "Script is harmless",
      details: [],
    });
  });

  it("returns unsafe result for valid unsafe response", () => {
    mockExecSync.mockReturnValue(
      JSON.stringify({
        safe: false,
        reason: "Contains rm -rf /",
        details: ["Deletes entire filesystem"],
      }),
    );

    const result = reviewScript("rm -rf /");

    expect(result).toEqual({
      safe: false,
      reason: "Contains rm -rf /",
      details: ["Deletes entire filesystem"],
    });
  });

  it("extracts JSON embedded in surrounding text", () => {
    mockExecSync.mockReturnValue(
      'Here is my analysis:\n{"safe": true, "reason": "Looks good", "details": []}\nEnd of review.',
    );

    const result = reviewScript("echo hello");

    expect(result).toEqual({
      safe: true,
      reason: "Looks good",
      details: [],
    });
  });

  it("returns failSafe when JSON has no safe field", () => {
    mockExecSync.mockReturnValue(
      JSON.stringify({ reason: "Missing safe field" }),
    );

    const result = reviewScript("echo hello");

    expect(result.safe).toBe(false);
    expect(result.reason).toContain("Invalid response structure");
  });

  it("returns failSafe when JSON has no reason field", () => {
    mockExecSync.mockReturnValue(JSON.stringify({ safe: true }));

    const result = reviewScript("echo hello");

    expect(result.safe).toBe(false);
    expect(result.reason).toContain("Invalid response structure");
  });

  it("returns failSafe when response contains no JSON", () => {
    mockExecSync.mockReturnValue("This is just plain text with no JSON");

    const result = reviewScript("echo hello");

    expect(result.safe).toBe(false);
    expect(result.reason).toContain("Could not extract JSON");
  });

  it("returns failSafe when response is malformed JSON", () => {
    mockExecSync.mockReturnValue("{broken json{");

    const result = reviewScript("echo hello");

    expect(result.safe).toBe(false);
  });

  it("returns failSafe on timeout", () => {
    const err = new Error("TIMEOUT") as Error & { killed: boolean };
    err.killed = true;
    mockExecSync.mockImplementation(() => {
      throw err;
    });

    const result = reviewScript("echo hello");

    expect(result.safe).toBe(false);
    expect(result.reason).toContain("timed out");
  });

  it("returns failSafe when claude CLI is not found (ENOENT)", () => {
    mockExecSync.mockImplementation(() => {
      throw new Error("ENOENT: no such file or directory");
    });

    const result = reviewScript("echo hello");

    expect(result.safe).toBe(false);
    expect(result.reason).toContain("not found");
  });

  it("returns failSafe when claude CLI is not found (not found message)", () => {
    mockExecSync.mockImplementation(() => {
      throw new Error("claude: not found");
    });

    const result = reviewScript("echo hello");

    expect(result.safe).toBe(false);
    expect(result.reason).toContain("not found");
  });

  it("returns failSafe on generic execution error", () => {
    mockExecSync.mockImplementation(() => {
      throw new Error("Something went wrong");
    });

    const result = reviewScript("echo hello");

    expect(result.safe).toBe(false);
    expect(result.reason).toContain("Review process failed");
  });

  it("treats non-array details as empty array", () => {
    mockExecSync.mockReturnValue(
      JSON.stringify({
        safe: true,
        reason: "OK",
        details: "not an array",
      }),
    );

    const result = reviewScript("echo hello");

    expect(result.details).toEqual([]);
  });
});
