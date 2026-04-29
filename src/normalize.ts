import type { CanonicalPackType, CardSource, NormalizedDataset, RawCard, RawPack } from "./types";

function normalizePackType(input: string | undefined): CanonicalPackType {
  const type = (input ?? "").toLowerCase();
  if (type.includes("secret")) return "secret";
  if (type.includes("selection")) return "selection";
  if (type.includes("normal")) return "normal";
  if (type.includes("bonus")) return "bonus";
  return "other";
}

function normalizeIsoString(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toCardImageUrl(cardName: string): string {
  return `https://imgserv.duellinksmeta.com/v2/mdm/card/${encodeURIComponent(cardName)}`;
}

export function normalizeDataset(rawPacks: RawPack[], rawCards: RawCard[], now = new Date()): NormalizedDataset {
  const packMetaById = new Map<string, { name: string; type: CanonicalPackType }>();
  for (const pack of rawPacks) {
    if (!pack._id) {
      continue;
    }
    const name = (pack.name ?? "").trim();
    if (name.length === 0) {
      continue;
    }
    packMetaById.set(pack._id, {
      name,
      type: normalizePackType(pack.type),
    });
  }

  const packs = rawPacks
    .filter((pack) => typeof pack._id === "string" && pack._id.length > 0)
    .map((pack) => {
      const expiresAt = normalizeIsoString(pack.expires);
      return {
        id: pack._id,
        name: (pack.name ?? "").trim() || "Unknown Pack",
        type: normalizePackType(pack.type),
        releaseAt: normalizeIsoString(pack.release),
        expiresAt,
        isExpired: expiresAt !== null ? new Date(expiresAt).getTime() < now.getTime() : false,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

  const cards = rawCards
    .filter((card) => typeof card._id === "string" && card._id.length > 0)
    .map((card) => {
      const sourceMap = new Map<string, CardSource>();
      for (const obtain of card.obtain ?? []) {
        if (obtain.type !== "sets" || !obtain.source?._id) continue;
        const sourceId = obtain.source._id;
        const fallbackMeta = packMetaById.get(sourceId);
        const sourceName = (obtain.source.name ?? "").trim() || fallbackMeta?.name || "Unknown Pack";
        const sourceType = obtain.source.type ?? fallbackMeta?.type;
        sourceMap.set(obtain.source._id, {
          packId: sourceId,
          packName: sourceName,
          packType: normalizePackType(sourceType),
        });
      }
      return {
        id: card._id,
        name: card.name ?? card._id,
        rarity: (card.rarity ?? "UNKNOWN").toUpperCase(),
        description: card.description ?? "",
        imageUrl: toCardImageUrl(card.name ?? card._id),
        releaseAt: normalizeIsoString(card.release),
        sources: [...sourceMap.values()].sort(
          (a, b) => a.packName.localeCompare(b.packName) || a.packId.localeCompare(b.packId),
        ),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

  return { packs, cards };
}
