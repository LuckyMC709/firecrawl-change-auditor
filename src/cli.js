#!/usr/bin/env node
import FirecrawlApp from "@mendable/firecrawl-js";
import { Command } from "commander";
import { writeFile } from "node:fs/promises";
import { compareSnapshots, loadSnapshot, reportMarkdown, saveSnapshot, scrapeSnapshot } from "./auditor.js";

const program = new Command()
  .name("firecrawl-audit")
  .description("Create a baseline or audit a web page for risky content changes")
  .argument("<url>", "page to audit")
  .option("-s, --snapshot <file>", "snapshot file", ".firecrawl-audit/snapshot.json")
  .option("-r, --report <file>", "Markdown report file", "audit-report.md")
  .option("--fail-on <level>", "exit non-zero at low, medium or high risk", "high")
  .parse();

const options = program.opts();
const [url] = program.args;
if (!process.env.FIRECRAWL_API_KEY) throw new Error("Set FIRECRAWL_API_KEY before running the auditor.");

const client = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
const previous = await loadSnapshot(options.snapshot);
const current = await scrapeSnapshot(url, client);
const comparison = previous ? compareSnapshots(previous, current) : null;
await saveSnapshot(options.snapshot, current);
await writeFile(options.report, reportMarkdown(current, comparison));

if (!comparison) console.log(`Baseline saved to ${options.snapshot}`);
else console.log(`Risk: ${comparison.risk.level} (${comparison.risk.score}/10). Report: ${options.report}`);

const levels = { none: 0, low: 1, medium: 2, high: 3 };
if (comparison && levels[comparison.risk.level] >= levels[options.failOn]) process.exitCode = 2;
