import path from "node:path";
import { ensureDir, writeJsonFile } from "./fs";
import type { NormalizedDataset, OverlapReport, CandidateCard } from "./types";

export async function writeNormalizedArtifacts(
  outputDir: string,
  dataset: NormalizedDataset,
): Promise<void> {
  const normalizedDir = `${outputDir}/normalized`;
  await ensureDir(normalizedDir);
  await writeJsonFile(`${normalizedDir}/packs.json`, dataset.packs);
  await writeJsonFile(`${normalizedDir}/cards.json`, dataset.cards);
}

export async function writeUiArtifacts(
  outputDir: string,
  report: OverlapReport,
): Promise<void> {
  const uiDir = `${outputDir}/ui/v1`;
  await ensureDir(uiDir);
  await writeJsonFile(`${uiDir}/summary.json`, report.summary);
  await writeJsonFile(`${uiDir}/buckets.json`, report.buckets);
  await writeJsonFile(`${uiDir}/packs.json`, report.packs);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderPackList(packNames: string[]): string {
  return `<ul>${packNames.map((pack) => `<li>${escapeHtml(pack)}</li>`).join("")}</ul>`;
}

function renderCard(card: CandidateCard): string {
  const description =
    card.description.trim().length > 0 ? card.description : "No description";
  return `<article class="deck-card">
  <img src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.name)}" loading="lazy" />
  <div class="deck-card-meta">
    <span class="name">${escapeHtml(card.name)}</span>
    <span class="packs">${card.allRelevantPacks.length} packs</span>
  </div>
  <div class="hover-preview" aria-hidden="true">
    <div class="hover-preview-inner">
      <img src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.name)} preview" loading="lazy" />
      <div class="hover-content">
        <h3>${escapeHtml(card.name)}</h3>
        <p>${escapeHtml(description)}</p>
        <h4>Packs</h4>
        ${renderPackList(card.packNames)}
      </div>
    </div>
  </div>
</article>`;
}

function renderBucketCards(cards: CandidateCard[]): string {
  if (cards.length === 0)
    return `<p class="empty">No cards in this bucket.</p>`;
  return `<div class="deck-grid">${cards.map(renderCard).join("\n")}</div>`;
}

export async function generateStaticSite(
  outputDir: string,
  report: OverlapReport,
): Promise<void> {
  const distDir = path.join(outputDir, "dist");
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Master Duel SR Deck Buckets</title>
    <style>
      :root { color-scheme: dark; }
      body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; background: #0b1020; color: #e6e9f5; }
      .container { max-width: 1500px; margin: 0 auto; padding: 1rem 1.1rem 2rem; }
      h1, h2, p { margin: 0; }
      .meta { margin-top: .45rem; color: #9ca6cb; }
      .bucket { margin-top: 1rem; border-radius: 12px; border: 1px solid #1f2a52; background: #121934; padding: .85rem; }
      .bucket h2 { font-size: 1rem; margin-bottom: .6rem; }
      .deck-grid { display: flex; flex-wrap: wrap; gap: .55rem; align-items: flex-start; overflow: visible; }
      .deck-card { width: 88px; position: relative; z-index: 1; }
      .deck-card img { width: 88px; height: 128px; object-fit: cover; border-radius: 6px; border: 1px solid #31447f; background: #0a0f1f; display: block; }
      .deck-card-meta { margin-top: .18rem; display: grid; gap: .1rem; }
      .deck-card .name { font-size: .62rem; line-height: 1.15; color: #d4ddfb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .deck-card .packs { font-size: .58rem; color: #9ba9d8; }
      .deck-card:hover { z-index: 100; }
      .hover-preview { position: fixed; inset: 0; display: grid; place-items: center; background: rgba(0,0,0,.58); opacity: 0; pointer-events: none; transition: opacity .12s ease; z-index: 500; }
      .deck-card:hover .hover-preview { opacity: 1; }
      .hover-preview-inner { width: min(840px, 92vw); display: grid; grid-template-columns: 300px 1fr; gap: 1rem; padding: 1rem; border-radius: 14px; border: 1px solid #3a4c89; background: #0f1630; box-shadow: 0 30px 70px rgba(0,0,0,.65); transform: scale(1.05); }
      .hover-preview-inner > img { width: 300px; height: 438px; border-radius: 10px; border: 1px solid #3f5697; background: #0a0f1f; object-fit: cover; }
      .hover-content h3 { margin: 0; font-size: 1.2rem; }
      .hover-content h4 { margin: .7rem 0 .35rem; font-size: .9rem; color: #c4cff4; }
      .hover-content p { margin: .55rem 0 0; font-size: .86rem; line-height: 1.45; color: #cdd6f5; max-height: 10.2rem; overflow: auto; }
      .hover-content ul { margin: 0; padding-left: 1rem; max-height: 10.8rem; overflow: auto; color: #dce3fb; }
      .hover-content li { margin-bottom: .28rem; font-size: .86rem; }
      .empty { color: #9ca6cb; font-style: italic; }
    </style>
  </head>
  <body>
    <main class="container">
      <h1>SR Cards Grouped by Pack Count</h1>
      <p class="meta">Generated at ${escapeHtml(report.summary.generatedAt)} · Cards: ${report.summary.candidateCards}</p>

      <section class="bucket">
        <h2>3 Pack Cards (${report.summary.bucketCounts.threePack})</h2>
        ${renderBucketCards(report.buckets.threePack)}
      </section>

      <section class="bucket">
        <h2>2 Pack Cards (${report.summary.bucketCounts.twoPack})</h2>
        ${renderBucketCards(report.buckets.twoPack)}
      </section>

      <section class="bucket">
        <h2>1 Pack Cards (${report.summary.bucketCounts.onePack})</h2>
        ${renderBucketCards(report.buckets.onePack)}
      </section>
    </main>
  </body>
</html>`;
  await Bun.write(`${distDir}/index.html`, html);
}
