import { mkdir } from "node:fs/promises";

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function writeJsonFile(path: string, payload: unknown): Promise<void> {
  await Bun.write(path, `${JSON.stringify(payload, null, 2)}\n`);
}

export function formatTimestamp(date: Date): string {
  return date.toISOString().replaceAll(":", "-").replaceAll(".", "-");
}
