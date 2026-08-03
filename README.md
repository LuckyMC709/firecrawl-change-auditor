# Firecrawl Change Auditor

A small CLI that uses the official Firecrawl JavaScript SDK to detect meaningful changes on a web page and highlight risky updates to pricing, policies, security, or availability.

It is useful in CI jobs, release monitoring, compliance checks, and competitor tracking. The first run creates a baseline; later runs compare clean Firecrawl Markdown against it and produce a readable report.

## Features

- Scrapes JavaScript-heavy pages through Firecrawl.
- Stores deterministic SHA-256 snapshots.
- Shows added and removed lines.
- Assigns a transparent 0–10 risk score.
- Can fail CI when a chosen risk threshold is reached.
- Includes unit tests that run without API credits.

## Quick start

Requires Node.js 20 or newer and a [Firecrawl API key](https://www.firecrawl.dev/).

```bash
npm install
cp .env.example .env
export FIRECRAWL_API_KEY=fc-YOUR_API_KEY
npm start -- https://example.com
```

The first run saves `.firecrawl-audit/snapshot.json`. Run the same command later to create `audit-report.md` with the detected changes.

## CLI options

```bash
npm start -- https://example.com \
  --snapshot .firecrawl-audit/example.json \
  --report audit-report.md \
  --fail-on medium
```

`--fail-on` accepts `low`, `medium`, or `high`. A matching result exits with code 2, making the tool easy to use in GitHub Actions.

## How the risk score works

Changed lines add up to 10 points. Relevant pricing or legal language adds 3 points per category; security and availability language adds 4. The final level is none (0), low (1–2), medium (3–6), or high (7–10). This rule-based approach is fast, auditable, and needs no second AI API.

## Test

```bash
npm test
```

Tests mock the Firecrawl response, so no API key or network access is needed.

## Built with Firecrawl

This example deliberately relies on `@mendable/firecrawl-js` for page extraction. Firecrawl turns dynamic pages into consistent Markdown before comparison, avoiding brittle HTML selectors and browser automation.

## License

MIT
