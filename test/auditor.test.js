import test from "node:test";
import assert from "node:assert/strict";
import { compareSnapshots, fingerprint, normalizeMarkdown, scrapeSnapshot } from "../src/auditor.js";

test("normalization produces stable fingerprints", () => {
  assert.equal(fingerprint("Hello  \r\n\r\n\r\nworld"), fingerprint("Hello\n\nworld"));
  assert.equal(normalizeMarkdown(" a  \n\n\n b "), "a\n\n b");
});

test("flags pricing and legal changes as risky", () => {
  const result = compareSnapshots(
    { markdown: "# Product\nFree forever" },
    { markdown: "# Product\nPricing is $20 monthly\nNew refund policy applies" }
  );
  assert.equal(result.changed, true);
  assert.equal(result.risk.level, "high");
  assert.deepEqual(result.risk.signals, ["pricing", "legal"]);
});

test("reports identical content as unchanged", () => {
  const result = compareSnapshots({ markdown: "same" }, { markdown: "same" });
  assert.equal(result.changed, false);
  assert.equal(result.risk.level, "none");
});

test("scrapes markdown through the Firecrawl SDK", async () => {
  const fake = { scrape: async () => ({ markdown: "# Example", metadata: { title: "Example" } }) };
  const result = await scrapeSnapshot("https://example.com", fake);
  assert.equal(result.title, "Example");
  assert.equal(result.markdown, "# Example");
});
