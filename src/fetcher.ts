import { execSync } from "node:child_process";
import { log } from "./output.js";

export function fetchScript(command: string[]): string {
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

  return script;
}
