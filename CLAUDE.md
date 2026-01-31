# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development

- `npm run build` — TypeScript compile (`tsc`), outputs to `dist/`
- `npm run dev` — watch mode
- No test framework yet; verify with `npx tsc --noEmit` for type checking

## Architecture

lgtmit is a CLI stdout filter that makes `curl | bash` safe via AI script review.

```
npx lgtmit -- curl https://example.com/install -fsS | bash
```

**Data flow:** user command → `fetcher` executes it and captures script → `reviewer` sends script to `claude -p` via stdin → safe: output script to stdout / unsafe: output warning script (with `exit 1`) to stdout. The `| bash` on the right side of the pipe executes whatever comes out.

**stdout/stderr separation is critical:** stdout carries only the script (or warning script). All logs, progress, and review results go to stderr via `output.log()`.

### Modules (src/)

- **index.ts** — Entry point, arg parsing (`--dry-run`, `--` separator), flow control
- **fetcher.ts** — Runs the user's command via `execSync`, returns captured stdout as script string
- **reviewer.ts** — Pipes prompt + script to `claude -p` via stdin, parses JSON response, fail-safe on any error
- **output.ts** — stderr logging (`[lgtmit]` prefix), warning script builder, stdout writer

## Key Design Decisions

- **Fail-safe:** any review failure (timeout, parse error, missing CLI) → treated as unsafe
- **Zero external deps:** Node.js built-in modules only (`node:child_process`, `node:fs`, `node:os`, `node:path`)
- **ESM:** `"type": "module"` in package.json, `.js` extensions in imports
- **`claude -p` uses stdin, not file args** — file path arguments are not read as context by the CLI
- **Warning script includes `exit 1`** — so piped `bash` exits with error code
- **lgtmit itself always exits 0** — never breaks the pipe
