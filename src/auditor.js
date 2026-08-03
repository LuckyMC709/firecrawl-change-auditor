import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RISK_RULES = [
  { id: "pricing", pattern: /\b(price|pricing|cost|fee|subscription|billing|refund)\b/i, weight: 3 },
  { id: "legal", pattern: /\b(terms|privacy|policy|legal|liability|warranty)\b/i, weight: 3 },
  { id: "security", pattern: /\b(security|password|authentication|permission|breach|vulnerability)\b/i, weight: 4 },
  { id: "availability", pattern: /\b(deprecat|discontinu|unavailable|removed|shutdown|end.of.life)\b/i, weight: 4 }
];

export function normalizeMarkdown(markdown = "") {
  return markdown.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
}

export function fingerprint(markdown) {
  return createHash("sha256").update(normalizeMarkdown(markdown)).digest("hex");
}

function lines(value) {
  return new Set(normalizeMarkdown(value).split("\n").map(line => line.trim()).filter(Boolean));
}

export function compareSnapshots(previous, current) {
  const before = lines(previous.markdown);
  const after = lines(current.markdown);
  const added = [...after].filter(line => !before.has(line));
  const removed = [...before].filter(line => !after.has(line));
  const changed = [...added, ...removed];
  const matchedRules = RISK_RULES.filter(rule => changed.some(line => rule.pattern.test(line)));
  const rawScore = matchedRules.reduce((sum, rule) => sum + rule.weight, 0) + Math.min(changed.length, 10);
  const score = Math.min(rawScore, 10);
  const level = score >= 7 ? "high" : score >= 3 ? "medium" : score > 0 ? "low" : "none";
  return {
    changed: fingerprint(previous.markdown) !== fingerprint(current.markdown),
    risk: { score, level, signals: matchedRules.map(rule => rule.id) },
    added,
    removed
  };
}

export async function scrapeSnapshot(url, firecrawl) {
  const result = await firecrawl.scrape(url, { formats: ["markdown"], onlyMainContent: true });
  const markdown = result.markdown ?? result.data?.markdown;
  if (!markdown) throw new Error(`Firecrawl returned no markdown for ${url}`);
  return {
    url,
    capturedAt: new Date().toISOString(),
    title: result.metadata?.title ?? result.data?.metadata?.title ?? null,
    markdown: normalizeMarkdown(markdown),
    hash: fingerprint(markdown)
  };
}

export async function loadSnapshot(file) {
  try { return JSON.parse(await readFile(file, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

export async function saveSnapshot(file, snapshot) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(snapshot, null, 2) + "\n");
}

export function reportMarkdown(snapshot, comparison) {
  if (!comparison) return `# Change audit\n\nBaseline created for **${snapshot.url}**.\n`;
  const list = values => values.length ? values.slice(0, 20).map(v => `- ${v}`).join("\n") : "- None";
  return `# Change audit\n\n- URL: ${snapshot.url}\n- Captured: ${snapshot.capturedAt}\n- Changed: ${comparison.changed ? "yes" : "no"}\n- Risk: **${comparison.risk.level} (${comparison.risk.score}/10)**\n- Signals: ${comparison.risk.signals.join(", ") || "none"}\n\n## Added\n\n${list(comparison.added)}\n\n## Removed\n\n${list(comparison.removed)}\n`;
}
