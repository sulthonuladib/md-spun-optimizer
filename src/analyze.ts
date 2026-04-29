import type { CandidateCard, CanonicalPack, NormalizedDataset, OverlapReport } from "./types";

export interface OverlapOptions {
  targetRarities: string[];
  minDistinctPacks: number;
  includeExpiredPacks: boolean;
}

function compareCandidateCards(a: CandidateCard, b: CandidateCard): number {
  return (
    b.allRelevantPacks.length - a.allRelevantPacks.length ||
    a.name.localeCompare(b.name) ||
    a.id.localeCompare(b.id)
  );
}

function toTier(packCount: number): 1 | 2 | 3 {
  if (packCount >= 3) return 3;
  if (packCount === 2) return 2;
  return 1;
}

export function buildOverlapReport(dataset: NormalizedDataset, options: OverlapOptions): OverlapReport {
  const packById = new Map<string, CanonicalPack>(dataset.packs.map((pack) => [pack.id, pack]));
  const targetRarities = new Set(options.targetRarities.map((rarity) => rarity.toUpperCase()));
  const candidateById = new Map<string, CandidateCard>();
  const isKnownPack = (packId: string): boolean => {
    const name = packById.get(packId)?.name;
    return name !== undefined && name !== "Unknown Pack";
  };

  for (const card of dataset.cards) {
    if (targetRarities.size > 0 && !targetRarities.has(card.rarity)) continue;

    const relevantSources = card.sources.filter((source) => {
      if (source.packType !== "secret" && source.packType !== "selection") return false;
      if (!isKnownPack(source.packId)) return false;
      if (options.includeExpiredPacks) return true;
      return !packById.get(source.packId)?.isExpired;
    });

    const uniquePackIds = [...new Set(relevantSources.map((source) => source.packId))].sort();
    if (uniquePackIds.length < options.minDistinctPacks) continue;

    const packNames = uniquePackIds
      .map((packId) => packById.get(packId)?.name ?? "")
      .filter((name) => name.length > 0)
      .sort((a, b) => a.localeCompare(b));

    const existing = candidateById.get(card.id);
    if (existing) {
      candidateById.set(card.id, {
        ...existing,
        allRelevantPacks: [...new Set([...existing.allRelevantPacks, ...uniquePackIds])].sort(),
        packNames: [...new Set([...existing.packNames, ...packNames])].sort((a, b) =>
          a.localeCompare(b),
        ),
      });
      continue;
    }

    candidateById.set(card.id, {
      id: card.id,
      name: card.name,
      rarity: card.rarity,
      description: card.description,
      imageUrl: card.imageUrl,
      allRelevantPacks: uniquePackIds,
      packNames,
    });
  }

  const candidates = [...candidateById.values()].sort(compareCandidateCards);
  const usedPackIds = new Set<string>();
  const threePack: CandidateCard[] = [];
  const twoPack: CandidateCard[] = [];
  const onePack: CandidateCard[] = [];

  for (const candidate of candidates) {
    const remainingPackIds = candidate.allRelevantPacks.filter(
      (packId) => !usedPackIds.has(packId) && isKnownPack(packId),
    );
    if (remainingPackIds.length === 0) {
      continue;
    }

    const remainingPackNames = remainingPackIds
      .map((packId) => packById.get(packId)?.name ?? "")
      .filter((name) => name.length > 0)
      .sort((a, b) => a.localeCompare(b));
    const selected: CandidateCard = {
      ...candidate,
      allRelevantPacks: remainingPackIds,
      packNames: remainingPackNames,
    };

    const tier = toTier(remainingPackIds.length);
    if (tier === 3) threePack.push(selected);
    if (tier === 2) twoPack.push(selected);
    if (tier === 1) onePack.push(selected);

    for (const packId of remainingPackIds) {
      usedPackIds.add(packId);
    }
  }

  const packs = [...usedPackIds]
    .map((id) => packById.get(id))
    .filter((pack): pack is CanonicalPack => pack !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const selectedCount = threePack.length + twoPack.length + onePack.length;

  return {
    summary: {
      generatedAt: new Date().toISOString(),
      totalPacks: dataset.packs.length,
      totalCards: dataset.cards.length,
      candidateCards: selectedCount,
      bucketCounts: {
        threePack: threePack.length,
        twoPack: twoPack.length,
        onePack: onePack.length,
      },
      targetRarities: [...targetRarities].sort(),
      minDistinctPacks: options.minDistinctPacks,
    },
    buckets: { threePack, twoPack, onePack },
    packs,
  };
}
