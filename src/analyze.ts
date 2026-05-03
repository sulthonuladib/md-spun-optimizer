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
      if (source.packType !== "secret") return false;
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
  const shownCardIds = new Set<string>();
  const usedPackIds = new Set<string>();
  const threePack: CandidateCard[] = [];
  const twoPack: CandidateCard[] = [];
  const onePack: CandidateCard[] = [];

  for (const candidate of candidates) {
    if (shownCardIds.has(candidate.id)) {
      continue;
    }

    const relevantPackIds = candidate.allRelevantPacks.filter((packId) => isKnownPack(packId));
    if (relevantPackIds.length === 0) {
      continue;
    }

    const newPackIds = relevantPackIds.filter((packId) => !usedPackIds.has(packId));
    
    // Only show if ALL packs are new (no partial usage)
    if (newPackIds.length !== relevantPackIds.length) {
      continue;
    }

    const packNames = relevantPackIds
      .map((packId) => packById.get(packId)?.name ?? "")
      .filter((name) => name.length > 0)
      .sort((a, b) => a.localeCompare(b));
    
    const originalTier = toTier(relevantPackIds.length);
    const selected: CandidateCard = {
      ...candidate,
      allRelevantPacks: relevantPackIds,
      packNames,
    };

    if (originalTier === 3) {
      threePack.push(selected);
      shownCardIds.add(candidate.id);
      for (const packId of newPackIds) {
        usedPackIds.add(packId);
      }
    } else if (originalTier === 2) {
      twoPack.push(selected);
      shownCardIds.add(candidate.id);
      for (const packId of newPackIds) {
        usedPackIds.add(packId);
      }
    } else if (originalTier === 1) {
      onePack.push(selected);
      shownCardIds.add(candidate.id);
      for (const packId of newPackIds) {
        usedPackIds.add(packId);
      }
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
