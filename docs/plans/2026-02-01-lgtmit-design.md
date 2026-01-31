# lgtmit - Design Document

## Overview

`lgtmit` is a CLI tool that makes `curl | bash` style installations safe by having a coding agent review the script before execution.

```bash
npx lgtmit -- curl https://cursor.com/install -fsS | bash
```

The tool acts as a stdout filter: it intercepts the script, has an AI agent review it, and either outputs the original script (safe) or a warning script (unsafe). The `| bash` part of the pipeline works as-is.

## Architecture

```
┌─────────────────────────────────────────────┐
│ lgtmit                                      │
│                                             │
│  1. Execute the given command (curl ...)     │
│     → Capture the script content             │
│                                             │
│  2. Write script to a temp file              │
│                                             │
│  3. Send review request to Claude Code CLI   │
│     claude -p "..." /tmp/lgtmit-xxxxx.sh    │
│     → Receive JSON result                    │
│                                             │
│  4a. safe → output script to stdout          │
│  4b. unsafe → output warning script to stdout│
│                                             │
│  * Review progress is output to stderr       │
└─────────────────────────────────────────────┘
         │ stdout
         ▼
       bash (piped as usual)
```

## CLI Interface

### MVP (auto-judgment mode)

```bash
npx lgtmit -- curl https://example.com/install -fsS | bash
```

### Dry-run mode (for AI agents)

```bash
# Fetch and output script without review (AI agent reviews it itself)
npx lgtmit --dry-run -- curl https://example.com/install -fsS
```

### Future modes

```bash
# Interactive confirmation mode
npx lgtmit --interactive -- curl https://example.com/install -fsS | bash

# Report-only mode
npx lgtmit --report-only -- curl https://example.com/install -fsS | bash
```

## Review Criteria

The agent reviews scripts for the following risks:

- Malware download, backdoor installation, data exfiltration
- Unexpected overwriting of existing files
- Suspicious changes to PATH or shell configuration
- Unnecessary use of sudo
- Unexpected network connections or port opening

## Claude Code Integration

### Invocation

```bash
claude -p "<prompt>" /tmp/lgtmit-xxxxx.sh
```

Uses `-p` flag for non-interactive mode. The script is written to a temp file and its path is passed to Claude Code.

### Prompt (English)

```
You are a security reviewer. Review the attached shell script and assess its safety based on the following criteria:

- Malware, backdoors, data exfiltration
- Unexpected overwriting of existing files
- Suspicious changes to PATH or shell configuration
- Unnecessary use of sudo
- Unexpected network connections

Respond in the following JSON format only:
{"safe": boolean, "reason": "reason for judgment", "details": ["specific finding 1", ...]}
```

### Result Parsing

- Parse Claude Code's stdout as JSON
- Parse failure → treat as **unsafe** (fail-safe)
- Timeout (60s) → treat as **unsafe**

## Output Behavior

### safe

Script is output to stdout as-is. Piped `bash` executes it normally.

### unsafe

A warning script is output to stdout:

```bash
echo "[lgtmit] This script may not be safe"
echo "[lgtmit] Reason: ..."
echo "[lgtmit] Check stderr output for details"
exit 1
```

`exit 1` ensures downstream commands chained with `&&` do not proceed.

### stderr

```
[lgtmit] Script fetched (2.3KB)
[lgtmit] Reviewing with Claude Code...
[lgtmit] Review complete: ✓ safe / ✗ unsafe
[lgtmit] Reason: ...
```

### Exit codes

- `lgtmit` itself always exits with 0 (does not break the pipe)
- The warning script output to stdout contains `exit 1` so that `bash` exits with error

## Project Structure

```
lgtmit/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # Entry point (bin)
│   ├── fetcher.ts        # Execute command and capture script
│   ├── reviewer.ts       # Claude Code CLI invocation and result parsing
│   └── output.ts         # stdout/stderr output control
└── tests/
    ├── fetcher.test.ts
    ├── reviewer.test.ts
    └── output.test.ts
```

### Module Responsibilities

- **index.ts** — Argument parsing, overall flow control, extract command after `--`
- **fetcher.ts** — Execute received command via `child_process`, capture stdout as script content, write to temp file
- **reviewer.ts** — Run `claude -p "..." /tmp/lgtmit-xxxxx.sh` as subprocess, parse JSON result, handle timeout and parse failure with fail-safe
- **output.ts** — Build stdout output based on safe/unsafe result, stderr logging helpers

### Dependencies

- Zero external dependencies for MVP
- Node.js built-in modules only: `child_process`, `fs`, `os`, `path`

### package.json bin

```json
{
  "name": "lgtmit",
  "bin": {
    "lgtmit": "./dist/index.js"
  }
}
```

## Error Handling

| Case | Response | stdout | stderr |
|------|----------|--------|--------|
| Command execution failure (curl 404 etc.) | Treat as unsafe | Warning script + exit 1 | Show error details |
| `claude` CLI not found | Error exit | Warning script + exit 1 | Show install instructions |
| Claude response is invalid JSON | Treat as unsafe (fail-safe) | Warning script + exit 1 | Show parse failure |
| Timeout (60s) | Treat as unsafe | Warning script + exit 1 | Show timeout message |
| Script is empty | Treat as unsafe | Warning script + exit 1 | Show empty script message |
| `--` not specified | Show help and exit | None | Show usage |

### Principles

- **When in doubt, treat as unsafe** — fail-safe by default
- **Always clean up temp files** — cleanup on process exit
- **Never break the pipe** — lgtmit itself always exits 0; bash exit code is controlled by the warning script's `exit 1`

## Dry-run Mode (for AI Agents)

AI software engineers (e.g. Devin) may want to review scripts themselves rather than delegating to Claude Code. The `--dry-run` flag supports this use case.

### Usage

```bash
# AI agent fetches the script via lgtmit
npx lgtmit --dry-run -- curl https://cursor.com/install -fsS

# Agent reads the output, reviews the script with its own judgment

# If deemed safe, agent executes the original command directly
curl https://cursor.com/install -fsS | bash
```

### Behavior

- Executes the given command and captures the script content
- Outputs the raw script to stdout (no review, no modification)
- Review progress/metadata is output to stderr (script size, source URL, etc.)
- No Claude Code CLI dependency required in this mode

### Design Rationale

- `lgtmit`'s responsibility in dry-run mode is limited to **safe script fetching**
- Review criteria are the agent's responsibility — agents can define their own criteria in their prompts or system configuration
- This keeps lgtmit focused and avoids hardcoding review criteria that may not suit every agent

## Future Considerations

- Multi-LLM support (OpenAI, local LLMs)
- Two-stage review (review first, then separate safe/unsafe judgment)
- Interactive confirmation mode
- Report-only mode
