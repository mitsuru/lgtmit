# Contributing to lgtmit

Thanks for your interest in contributing!

## Development setup

```bash
git clone https://github.com/mitsuru/lgtmit.git
cd lgtmit
npm install
npm run build
```

## Scripts

| Command | Description |
|---|---|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run dev` | Watch mode for development |
| `npm test` | Run unit tests |

## Code style

- TypeScript with strict mode
- ESM (`"type": "module"`)
- Zero external runtime dependencies — Node.js built-ins only
- `.js` extensions in imports (required for ESM)

## Pull requests

1. Fork the repo and create a feature branch
2. Make your changes
3. Run `npm test` and `npx tsc --noEmit` to verify
4. Submit a PR with a clear description of the change

## Reporting bugs

Open an issue on GitHub with:
- What you expected to happen
- What actually happened
- Steps to reproduce
