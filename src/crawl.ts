import type { PipelineConfig } from "./config";
import { AppError } from "./errors";
import { ensureDir, writeJsonFile } from "./fs";
import { logger } from "./logger";
import type { RawCard, RawPack } from "./types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class HttpClient {
  constructor(
    private readonly config: Pick<
      PipelineConfig,
      "timeoutMs" | "retries" | "retryDelayMs"
    >,
  ) {}

  async getJson<T>(url: URL): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.config.retries; attempt += 1) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(
          () => controller.abort(),
          this.config.timeoutMs,
        );
        const startedAt = Date.now();
        try {
          const response = await fetch(url, {
            method: "GET",
            signal: controller.signal,
          });
          if (!response.ok) {
            throw new AppError("HTTP request failed", "HTTP_ERROR", {
              url: url.toString(),
              status: response.status,
              statusText: response.statusText,
            });
          }
          const json = (await response.json()) as T;
          logger.debug("HTTP request succeeded", {
            url: url.toString(),
            attempt,
            durationMs: Date.now() - startedAt,
          });
          return json;
        } finally {
          clearTimeout(timer);
        }
      } catch (error) {
        lastError = error;
        if (attempt >= this.config.retries) {
          break;
        }
        logger.warn("HTTP request retry", {
          url: url.toString(),
          attempt,
          error: error instanceof Error ? error.message : String(error),
        });
        await sleep(this.config.retryDelayMs * attempt);
      }
    }
    throw new AppError(
      "HTTP request failed after retries",
      "HTTP_RETRY_EXHAUSTED",
      {
        error:
          lastError instanceof Error ? lastError.message : String(lastError),
      },
    );
  }
}

function appendQuery(url: URL, params: Record<string, string | number>): void {
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
}

export class MasterDuelMetaClient {
  private readonly httpClient: HttpClient;

  constructor(private readonly config: PipelineConfig) {
    this.httpClient = new HttpClient(config);
  }

  private async fetchPaginated<T>(
    endpoint: string,
    extraParams: Record<string, string | number> = {},
  ): Promise<T[]> {
    const items: T[] = [];
    for (let page = 1; page <= this.config.maxPages; page += 1) {
      const url = new URL(`${this.config.baseUrl}${endpoint}`);
      appendQuery(url, { page, limit: this.config.pageLimit, ...extraParams });
      const payload = await this.httpClient.getJson<unknown>(url);
      if (!Array.isArray(payload)) {
        throw new AppError(
          "Unexpected API response shape",
          "API_INVALID_RESPONSE",
          {
            endpoint,
            page,
          },
        );
      }
      const batch = payload as T[];
      if (batch.length === 0) {
        break;
      }
      items.push(...batch);
      logger.info("Fetched API page", {
        endpoint,
        page,
        batchSize: batch.length,
      });
      if (batch.length < this.config.pageLimit) {
        break;
      }
    }
    return items;
  }

  fetchPacks(): Promise<RawPack[]> {
    return this.fetchPaginated<RawPack>("/sets", {
      aggregate: "searchSecretPacks",
      sort: "release",
    });
  }

  fetchCards(): Promise<RawCard[]> {
    return this.fetchPaginated<RawCard>("/cards", { sort: "release" });
  }
}

export async function writeRawSnapshots(
  outputDir: string,
  timestamp: string,
  payload: { packs: RawPack[]; cards: RawCard[] },
): Promise<void> {
  const rawDir = `${outputDir}/raw`;
  await ensureDir(rawDir);
  await writeJsonFile(`${rawDir}/packs-${timestamp}.json`, payload.packs);
  await writeJsonFile(`${rawDir}/cards-${timestamp}.json`, payload.cards);
  await writeJsonFile(`${rawDir}/packs.latest.json`, payload.packs);
  await writeJsonFile(`${rawDir}/cards.latest.json`, payload.cards);
}
