# lgtmit

Make `curl | bash` installations safe with AI-powered script review.

## What is this?

`lgtmit` is a CLI stdout filter that sits between `curl` and `bash`, using Claude to review installation scripts before execution.

```bash
npx lgtmit -- curl https://example.com/install -fsS | bash
```

**Without lgtmit:** You blindly pipe remote scripts into your shell.

**With lgtmit:** Claude reviews the script first. If it's safe, the script passes through. If not, a warning script with `exit 1` is output instead — so `bash` never runs anything dangerous.

## How it works

```
user command → lgtmit fetches script → Claude reviews it
  → safe:   original script → stdout → bash executes it
  → unsafe: warning script (exit 1) → stdout → bash exits safely
```

All logs go to stderr. Only the script (or warning) goes to stdout. This keeps the pipe clean.

## Install

```bash
npm install -g lgtmit
```

Requires [Claude CLI](https://docs.anthropic.com/en/docs/claude-cli) (`claude`) to be installed and authenticated.

## Usage

```bash
# Review and execute an install script
npx lgtmit -- curl https://example.com/install -fsS | bash

# Dry-run: fetch and display the script without review
npx lgtmit --dry-run -- curl https://example.com/install -fsS
```

### Options

| Option | Description |
|---|---|
| `--dry-run` | Fetch and output script without review |
| `--` | Separator between lgtmit options and the fetch command |

## Requirements

- Node.js 18+
- [Claude CLI](https://docs.anthropic.com/en/docs/claude-cli) installed and authenticated

## Design principles

- **Fail-safe:** Any review failure (timeout, parse error, missing CLI) is treated as unsafe
- **Zero external deps:** Node.js built-in modules only
- **stdout/stderr separation:** stdout carries only the script; all logs go to stderr
- **lgtmit always exits 0:** Never breaks the pipe — safety is communicated through the output script

## License

[MIT](LICENSE)
