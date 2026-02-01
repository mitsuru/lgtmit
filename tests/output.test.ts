import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  log,
  buildWarningScript,
  buildDryRunOutput,
  outputScript,
} from "../src/output.js";

describe("log", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("writes to stderr with [lgtmit] prefix", () => {
    const spy = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    log("test message");

    expect(spy).toHaveBeenCalledWith("[lgtmit] test message\n");
  });
});

describe("outputScript", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("writes script to stdout", () => {
    const spy = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    outputScript("#!/bin/bash\necho hello\n");

    expect(spy).toHaveBeenCalledWith("#!/bin/bash\necho hello\n");
  });
});

describe("buildWarningScript", () => {
  it("includes reason and exit 1", () => {
    const script = buildWarningScript("Dangerous script", []);

    expect(script).toContain("This script may not be safe");
    expect(script).toContain("Dangerous script");
    expect(script).toContain("exit 1");
  });

  it("includes details as list items", () => {
    const script = buildWarningScript("Unsafe", [
      "Downloads malware",
      "Deletes files",
    ]);

    expect(script).toContain("Downloads malware");
    expect(script).toContain("Deletes files");
  });

  it("escapes shell special characters in reason", () => {
    const script = buildWarningScript('Has "quotes" and $vars', []);

    expect(script).toContain('\\"quotes\\"');
    expect(script).toContain("\\$vars");
  });

  it("escapes shell special characters in details", () => {
    const script = buildWarningScript("reason", ['detail with "quotes"']);

    expect(script).toContain('\\"quotes\\"');
  });
});

describe("buildDryRunOutput", () => {
  it("includes script content and command", () => {
    const output = buildDryRunOutput("echo hello", ["curl", "-fsSL", "https://example.com"]);

    expect(output).toContain("Dry-run mode");
    expect(output).toContain("echo hello");
    expect(output).toContain("curl -fsSL https://example.com");
  });

  it("includes review criteria", () => {
    const output = buildDryRunOutput("echo hello", ["curl", "https://example.com"]);

    expect(output).toContain("Malware");
    expect(output).toContain("sudo");
  });
});
