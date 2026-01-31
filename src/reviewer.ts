import { execSync } from "node:child_process";
import { log } from "./output.js";

export interface ReviewResult {
  safe: boolean;
  reason: string;
  details: string[];
}

const REVIEW_TIMEOUT = 60_000;

const PROMPT = `You are a security reviewer. Review the attached shell script and assess its safety based on the following criteria:

- Malware, backdoors, data exfiltration
- Unexpected overwriting of existing files
- Suspicious changes to PATH or shell configuration
- Unnecessary use of sudo
- Unexpected network connections

Respond in the following JSON format only:
{"safe": boolean, "reason": "reason for judgment", "details": ["specific finding 1", ...]}`;

export function reviewScript(tempFilePath: string): ReviewResult {
  log("Reviewing with Claude Code...");

  let stdout: string;
  try {
    stdout = execSync(`claude -p ${JSON.stringify(PROMPT)} ${tempFilePath}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: REVIEW_TIMEOUT,
    });
  } catch (err) {
    if (
      err instanceof Error &&
      "killed" in err &&
      (err as NodeJS.ErrnoException & { killed?: boolean }).killed
    ) {
      log("Review timed out");
      return failSafe("Review timed out after 60 seconds");
    }
    const message =
      err instanceof Error ? err.message : "Unknown error";
    if (message.includes("ENOENT") || message.includes("not found")) {
      log("Claude Code CLI not found. Install it: https://docs.anthropic.com/en/docs/claude-code");
      return failSafe("Claude Code CLI (claude) not found");
    }
    log(`Review failed: ${message}`);
    return failSafe(`Review process failed: ${message}`);
  }

  return parseResult(stdout);
}

function parseResult(stdout: string): ReviewResult {
  try {
    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      log("Failed to extract JSON from response");
      return failSafe("Could not extract JSON from Claude response");
    }
    const parsed = JSON.parse(jsonMatch[0]);

    if (typeof parsed.safe !== "boolean" || typeof parsed.reason !== "string") {
      log("Invalid JSON structure in response");
      return failSafe("Invalid response structure from Claude");
    }

    return {
      safe: parsed.safe,
      reason: parsed.reason,
      details: Array.isArray(parsed.details) ? parsed.details : [],
    };
  } catch {
    log("Failed to parse JSON response");
    return failSafe("Failed to parse Claude response as JSON");
  }
}

function failSafe(reason: string): ReviewResult {
  return { safe: false, reason, details: [] };
}
