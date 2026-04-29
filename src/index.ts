import { logger } from "./logger";
import { runPipeline } from "./pipeline";

async function main(): Promise<void> {
  try {
    const summary = await runPipeline();
    logger.info("Pipeline finished", summary);
  } catch (error) {
    logger.error("Pipeline failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

await main();
