#!/usr/bin/env node

import { fetchScript } from "./fetcher.js";
import { reviewScript } from "./reviewer.js";
import { log, buildWarningScript, outputScript } from "./output.js";

function printUsage(): void {
  log("Usage: lgtmit [--dry-run] -- <command...>");
  log("");
  log("Examples:");
  log("  npx lgtmit -- curl https://example.com/install -fsS | bash");
  log("  npx lgtmit --dry-run -- curl https://example.com/install -fsS");
  log("");
  log("Options:");
  log("  --dry-run  Fetch and output script without review");
}

function parseArgs(argv: string[]): {
  dryRun: boolean;
  command: string[];
} | null {
  const args = argv.slice(2);
  let dryRun = false;
  let dashDashIndex = -1;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--") {
      dashDashIndex = i;
      break;
    }
    if (args[i] === "--dry-run") {
      dryRun = true;
    }
  }

  if (dashDashIndex === -1 || dashDashIndex === args.length - 1) {
    return null;
  }

  const command = args.slice(dashDashIndex + 1);
  return { dryRun, command };
}

function main(): void {
  const parsed = parseArgs(process.argv);

  if (!parsed) {
    printUsage();
    process.exit(0);
  }

  const { dryRun, command } = parsed;

  let script: string;

  try {
    script = fetchScript(command);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    log(message);
    outputScript(buildWarningScript(message, []));
    return;
  }

  if (dryRun) {
    log("Dry-run mode: outputting script without review");
    outputScript(script);
    return;
  }

  const result = reviewScript(script);

  if (result.safe) {
    log(`Review complete: safe`);
    log(`Reason: ${result.reason}`);
    outputScript(script);
  } else {
    log(`Review complete: unsafe`);
    log(`Reason: ${result.reason}`);
    for (const detail of result.details) {
      log(`  - ${detail}`);
    }
    outputScript(buildWarningScript(result.reason, result.details));
  }
}

main();
