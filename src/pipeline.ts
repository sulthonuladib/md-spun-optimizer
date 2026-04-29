import { getConfig } from "./config";
import { MasterDuelMetaClient, writeRawSnapshots } from "./crawl";
import { formatTimestamp } from "./fs";
import { logger } from "./logger";
import { normalizeDataset } from "./normalize";
import { buildOverlapReport } from "./analyze";
import { generateStaticSite, writeNormalizedArtifacts, writeUiArtifacts } from "./output";

export async function runPipeline() {
  const config = getConfig();
  logger.info("Starting pipeline", config);

  const client = new MasterDuelMetaClient(config);
  const [packs, cards] = await Promise.all([client.fetchPacks(), client.fetchCards()]);

  const timestamp = formatTimestamp(new Date());
  await writeRawSnapshots(config.outputDir, timestamp, { packs, cards });

  const dataset = normalizeDataset(packs, cards);
  await writeNormalizedArtifacts(config.outputDir, dataset);

  const report = buildOverlapReport(dataset, {
    targetRarities: config.targetRarities,
    minDistinctPacks: config.minDistinctPacks,
    includeExpiredPacks: config.includeExpiredPacks,
  });
  await writeUiArtifacts(config.outputDir, report);
  await generateStaticSite(process.cwd(), report);
  return report.summary;
}
