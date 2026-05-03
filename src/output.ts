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
  const packCount = card.allRelevantPacks.length;
  const tierLabel = packCount === 3 ? "🔥 HIGH" : packCount === 2 ? "⭐ MED" : "•";
  const packsStr = card.packNames.join(", ");
  const description = card.description.trim().length > 0 ? card.description : "No description";
  
  return `<article class="deck-card" data-card-name="${escapeHtml(card.name)}">
  <img src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.name)}" loading="lazy" />
  <div class="deck-card-info">
    <div class="card-name">${escapeHtml(card.name)}</div>
    <div class="card-tier">${tierLabel} ${packCount}p</div>
    <div class="card-packs">${escapeHtml(packsStr)}</div>
    <button class="copy-btn" data-name="${escapeHtml(card.name)}">📋</button>
  </div>
  <div class="card-tooltip">
    <img src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.name)}" />
    <h3>${escapeHtml(card.name)}</h3>
    <p>${escapeHtml(description)}</p>
    <h4>Packs</h4>
    ${renderPackList(card.packNames)}
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
      
      /* Toggle buttons */
      .view-toggle { display: flex; gap: .5rem; margin-bottom: 1rem; }
      .view-btn { padding: .5rem 1rem; border: 1px solid #3a4c89; background: #0f1630; color: #c4cff4; border-radius: 6px; cursor: pointer; font-size: .9rem; transition: all .15s; }
      .view-btn.active { background: #3a4c89; color: #fff; border-color: #5a6cb5; }
      .view-btn:hover { border-color: #5a6cb5; }
      
      /* Last copied section */
      .last-copied-section { display: none; margin-bottom: 1rem; padding: 0.8rem; background: #1f2a52; border: 1px solid #3a4c89; border-radius: 8px; }
      .last-copied-label { font-size: 0.85rem; color: #9ca6cb; margin-bottom: 0.4rem; }
      .last-copied-content { display: flex; gap: 0.6rem; align-items: center; }
      .last-copied-name { font-size: 1rem; color: #ffd93d; font-weight: 600; flex: 1; }
      .go-to-btn { padding: 0.4rem 0.8rem; border: 1px solid #5a6cb5; background: #0f1630; color: #c4cff4; border-radius: 4px; cursor: pointer; font-size: 0.85rem; transition: all 0.15s; }
      .go-to-btn:hover { background: #3a4c89; border-color: #8b9dc3; }
      
      /* GRID VIEW (default) */
      .deck-grid { display: flex; flex-wrap: wrap; gap: 0.55rem; align-items: flex-start; }
      .deck-grid .deck-card { width: 88px; position: relative; }
      .deck-grid .deck-card img { width: 88px; height: 128px; object-fit: cover; border-radius: 6px; border: 1px solid #31447f; background: #0a0f1f; display: block; }
      .deck-grid .deck-card-info { display: none; }
      .deck-grid .deck-card:hover { z-index: 100; }
      
      /* Grid view tooltips - ONLY in grid view */
      .deck-grid .card-tooltip { position: fixed; display: none; width: 280px; background: rgba(15, 22, 48, 0.98); border: 1px solid #3a4c89; border-radius: 8px; padding: 0.8rem; gap: 0.6rem; z-index: 999; box-shadow: 0 8px 32px rgba(0,0,0,.6); }
      .deck-grid .deck-card:hover .card-tooltip { display: flex; flex-direction: column; }
      .card-tooltip img { width: 100%; height: auto; max-height: 200px; border-radius: 6px; border: 1px solid #3f5697; background: #0a0f1f; object-fit: cover; }
      .card-tooltip h3 { margin: 0; font-size: 0.95rem; color: #e6f0ff; }
      .card-tooltip h4 { margin: 0.4rem 0 0.2rem; font-size: 0.7rem; color: #9ca6cb; font-weight: 600; }
      .card-tooltip p { margin: 0; font-size: 0.75rem; line-height: 1.4; color: #c4cff4; max-height: 4rem; overflow: hidden; text-overflow: ellipsis; }
      .card-tooltip ul { margin: 0; padding-left: 1rem; list-style: none; max-height: 3rem; overflow: auto; color: #dce3fb; font-size: 0.7rem; }
      .card-tooltip li { margin-bottom: 0.2rem; }
      
      /* Yellow highlight dot */
      .deck-card.highlighted::after { content: ""; position: absolute; top: -8px; right: -8px; width: 12px; height: 12px; background: #ffd93d; border-radius: 50%; z-index: 10; box-shadow: 0 0 4px #ffd93d; }
      
      /* LIST VIEW */
      .deck-grid.list-view { display: grid; grid-template-columns: 1fr; gap: 0.4rem; }
      .deck-grid.list-view .deck-card { width: 100%; display: grid; grid-template-columns: 88px 1fr auto; gap: 0.8rem; align-items: center; padding: 0.6rem; background: #0f1630; border-radius: 6px; border: 1px solid #1f2a52; }
      .deck-grid.list-view .deck-card img { width: 88px; height: 128px; }
      .deck-grid.list-view .deck-card-info { display: flex; flex-direction: column; gap: 0.2rem; }
      .deck-grid.list-view .deck-card:hover { z-index: 1; }
      .deck-grid.list-view .card-tooltip { display: none !important; }
      
      /* List view info section */
      .card-name { font-size: 0.95rem; color: #d4ddfb; font-weight: 500; }
      .card-tier { font-size: 0.75rem; color: #9ca6cb; }
      .card-packs { font-size: 0.75rem; color: #8b9dc3; line-height: 1.2; }
      
      /* Copy button */
      .copy-btn { background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0.4rem; opacity: 0.6; transition: opacity .2s; }
      .copy-btn:hover { opacity: 1; }
      
      .empty { color: #9ca6cb; font-style: italic; }
    </style>
    <script>
      function setupViewToggle() {
        const gridBtn = document.getElementById('grid-view-btn');
        const listBtn = document.getElementById('list-view-btn');
        const grids = document.querySelectorAll('.deck-grid');
        
        gridBtn.addEventListener('click', () => {
          grids.forEach(g => g.classList.remove('list-view'));
          gridBtn.classList.add('active');
          listBtn.classList.remove('active');
          document.getElementById('last-copied-section').style.display = 'none';
        });
        
        listBtn.addEventListener('click', () => {
          grids.forEach(g => g.classList.add('list-view'));
          listBtn.classList.add('active');
          gridBtn.classList.remove('active');
          const lastCopied = localStorage.getItem('lastCopiedCard');
          document.getElementById('last-copied-section').style.display = lastCopied ? 'block' : 'none';
        });
      }
      
      function setupCopyButtons() {
        document.addEventListener('click', (e) => {
          if (e.target.classList.contains('copy-btn')) {
            e.stopPropagation();
            const cardName = e.target.dataset.name;
            navigator.clipboard.writeText(cardName).then(() => {
              localStorage.setItem('lastCopiedCard', cardName);
              updateHighlight();
              updateLastCopiedDisplay();
            });
          }
        });
      }
      
      function updateHighlight() {
        const lastCopied = localStorage.getItem('lastCopiedCard');
        document.querySelectorAll('.deck-card').forEach(card => {
          if (card.dataset.cardName === lastCopied) {
            card.classList.add('highlighted');
          } else {
            card.classList.remove('highlighted');
          }
        });
      }
      
      function updateLastCopiedDisplay() {
        const lastCopied = localStorage.getItem('lastCopiedCard');
        const section = document.getElementById('last-copied-section');
        const label = document.getElementById('last-copied-name');
        if (lastCopied) {
          label.textContent = lastCopied;
          const isListView = document.querySelector('.deck-grid.list-view');
          section.style.display = isListView ? 'block' : 'none';
        }
      }
      
      function positionTooltip(tooltip, card) {
        const rect = card.getBoundingClientRect();
        let left = rect.right + window.scrollX + 10;
        let top = rect.top + window.scrollY + 10;
        
        // Clamp to viewport
        if (left + 280 > window.innerWidth) left = rect.left + window.scrollX - 290;
        if (top + 350 > window.scrollY + window.innerHeight) top = rect.bottom + window.scrollY - 350;
        
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
      }
      
      document.addEventListener('DOMContentLoaded', () => {
        setupViewToggle();
        setupCopyButtons();
        updateHighlight();
        updateLastCopiedDisplay();
        
        document.querySelectorAll('.deck-card').forEach(card => {
          const tooltip = card.querySelector('.card-tooltip');
          if (tooltip) {
            card.addEventListener('mouseenter', () => positionTooltip(tooltip, card));
            card.addEventListener('mousemove', () => positionTooltip(tooltip, card));
          }
        });
      });
    </script>
  </head>
  <body>
    <main class="container">
      <h1>SR Cards Grouped by Pack Count</h1>
      <p class="meta">Generated at ${escapeHtml(report.summary.generatedAt)} · Cards: ${report.summary.candidateCards}</p>

      <div class="view-toggle">
        <button class="view-btn active" id="grid-view-btn">🔷 Grid View</button>
        <button class="view-btn" id="list-view-btn">📋 List View</button>
      </div>

      <div class="last-copied-section" id="last-copied-section">
        <div class="last-copied-label">📌 Last Copied Card</div>
        <div class="last-copied-content">
          <span class="last-copied-name" id="last-copied-name"></span>
          <button class="go-to-btn" id="go-to-btn">Go to Card</button>
        </div>
      </div>

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
