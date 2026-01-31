import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { log } from "./output.js";

export interface FetchResult {
  script: string;
  tempFilePath: string;
}

const tempFiles: string[] = [];

function cleanup(): void {
  for (const f of tempFiles) {
    try {
      unlinkSync(f);
    } catch {
      // ignore
    }
  }
}

process.on("exit", cleanup);
process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});
process.on("SIGTERM", () => {
  cleanup();
  process.exit(143);
});

export function fetchScript(command: string[]): FetchResult {
  const cmdStr = command.join(" ");
  log(`Executing: ${cmdStr}`);

  let script: string;
  try {
    script = execSync(cmdStr, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30_000,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error during fetch";
    throw new Error(`Command failed: ${message}`);
  }

  if (!script.trim()) {
    throw new Error("Fetched script is empty");
  }

  const sizeKB = (Buffer.byteLength(script, "utf-8") / 1024).toFixed(1);
  log(`Script fetched (${sizeKB}KB)`);

  const dir = mkdtempSync(join(tmpdir(), "lgtmit-"));
  const tempFilePath = join(dir, "script.sh");
  writeFileSync(tempFilePath, script, "utf-8");
  tempFiles.push(tempFilePath);

  return { script, tempFilePath };
}
