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

export function buildDryRunOutput(script: string, command: string[]): string {
  const cmdStr = command.join(" ");
  return `${PREFIX} Dry-run mode: Script fetched but NOT reviewed.
${PREFIX} Please review the following script for security issues before executing.

Source command: ${cmdStr}

Review criteria:
- Malware, backdoors, data exfiltration
- Unexpected overwriting of existing files
- Suspicious changes to PATH or shell configuration
- Unnecessary use of sudo
- Unexpected network connections

--- Script content ---
${script}
--- End of script ---

If the script is safe, run the original command:
  ${cmdStr} | bash

If unsafe, do NOT execute.
`;
}

function escapeShell(s: string): string {
  return s.replace(/["\\$`!]/g, "\\$&");
}
