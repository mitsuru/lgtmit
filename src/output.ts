const PREFIX = "[lgtmit]";

export function log(message: string): void {
  process.stderr.write(`${PREFIX} ${message}\n`);
}

export function buildWarningScript(reason: string, details: string[]): string {
  const lines = [
    `echo "${PREFIX} This script may not be safe"`,
    `echo "${PREFIX} Reason: ${escapeShell(reason)}"`,
  ];
  for (const detail of details) {
    lines.push(`echo "${PREFIX}   - ${escapeShell(detail)}"`);
  }
  lines.push(`echo "${PREFIX} Check stderr output for details"`);
  lines.push("exit 1");
  return lines.join("\n") + "\n";
}

export function outputScript(script: string): void {
  process.stdout.write(script);
}

function escapeShell(s: string): string {
  return s.replace(/["\\$`!]/g, "\\$&");
}
