import { describe, it, expect, vi, beforeEach } from "vitest";
import { execSync } from "node:child_process";
import { fetchScript } from "../src/fetcher.js";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

vi.mock("../src/output.js", () => ({
  log: vi.fn(),
}));

const mockExecSync = vi.mocked(execSync);

describe("fetchScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the fetched script on success", () => {
    mockExecSync.mockReturnValue("#!/bin/bash\necho hello\n");

    const result = fetchScript(["curl", "-fsSL", "https://example.com"]);

    expect(result).toBe("#!/bin/bash\necho hello\n");
    expect(mockExecSync).toHaveBeenCalledWith(
      "curl -fsSL https://example.com",
      expect.objectContaining({
        encoding: "utf-8",
        timeout: 30_000,
      }),
    );
  });

  it("throws when command fails", () => {
    mockExecSync.mockImplementation(() => {
      throw new Error("Command not found");
    });

    expect(() => fetchScript(["bad-command"])).toThrow(
      "Command failed: Command not found",
    );
  });

  it("throws when fetched script is empty", () => {
    mockExecSync.mockReturnValue("   \n  ");

    expect(() => fetchScript(["curl", "https://example.com"])).toThrow(
      "Fetched script is empty",
    );
  });

  it("throws with generic message for non-Error exceptions", () => {
    mockExecSync.mockImplementation(() => {
      throw "string error";
    });

    expect(() => fetchScript(["curl", "https://example.com"])).toThrow(
      "Command failed: Unknown error during fetch",
    );
  });
});
