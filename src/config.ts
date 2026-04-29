import { AppError } from "./errors";

export interface PipelineConfig {
  baseUrl: string;
  pageLimit: number;
  maxPages: number;
  timeoutMs: number;
  retries: number;
  retryDelayMs: number;
  outputDir: string;
  targetRarities: string[];
  minDistinctPacks: number;
  includeExpiredPacks: boolean;
}

function parsePositiveInt(value: string | undefined, fallback: number, key: string): number {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new AppError(`Invalid positive integer for ${key}`, "CONFIG_INVALID", { key, value });
  }
  return parsed;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  if (value === "true" || value === "1") {
    return true;
  }
  if (value === "false" || value === "0") {
    return false;
  }
  throw new AppError(`Invalid boolean value: ${value}`, "CONFIG_INVALID", {
    key: "INCLUDE_EXPIRED_PACKS",
    value,
  });
}

function parseCsv(value: string | undefined, fallback: string[]): string[] {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  return value
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter((item) => item.length > 0);
}

export function getConfig(): PipelineConfig {
  const env = Bun.env;
  return {
    baseUrl: env.MDM_BASE_URL ?? "https://www.masterduelmeta.com/api/v1",
    pageLimit: parsePositiveInt(env.CRAWL_PAGE_LIMIT, 200, "CRAWL_PAGE_LIMIT"),
    maxPages: parsePositiveInt(env.CRAWL_MAX_PAGES, 200, "CRAWL_MAX_PAGES"),
    timeoutMs: parsePositiveInt(env.HTTP_TIMEOUT_MS, 10000, "HTTP_TIMEOUT_MS"),
    retries: parsePositiveInt(env.HTTP_RETRIES, 3, "HTTP_RETRIES"),
    retryDelayMs: parsePositiveInt(env.HTTP_RETRY_DELAY_MS, 400, "HTTP_RETRY_DELAY_MS"),
    outputDir: env.OUTPUT_DIR ?? "./data",
    targetRarities: parseCsv(env.TARGET_RARITIES, ["SR"]),
    minDistinctPacks: parsePositiveInt(env.MIN_DISTINCT_PACKS, 1, "MIN_DISTINCT_PACKS"),
    includeExpiredPacks: parseBoolean(env.INCLUDE_EXPIRED_PACKS, false),
  };
}
