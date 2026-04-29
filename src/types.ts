export type CanonicalPackType =
  | "secret"
  | "selection"
  | "normal"
  | "bonus"
  | "other";

export interface CanonicalPack {
  id: string;
  name: string;
  type: CanonicalPackType;
  releaseAt: string | null;
  expiresAt: string | null;
  isExpired: boolean;
}

export interface CardSource {
  packId: string;
  packName: string;
  packType: CanonicalPackType;
}

export interface CanonicalCard {
  id: string;
  name: string;
  rarity: string;
  description: string;
  imageUrl: string;
  releaseAt: string | null;
  sources: CardSource[];
}

export interface NormalizedDataset {
  packs: CanonicalPack[];
  cards: CanonicalCard[];
}

export interface CandidateCard {
  id: string;
  name: string;
  rarity: string;
  description: string;
  imageUrl: string;
  allRelevantPacks: string[];
  packNames: string[];
}

export interface OverlapBuckets {
  threePack: CandidateCard[];
  twoPack: CandidateCard[];
  onePack: CandidateCard[];
}

export interface OverlapSummary {
  generatedAt: string;
  totalPacks: number;
  totalCards: number;
  candidateCards: number;
  bucketCounts: {
    threePack: number;
    twoPack: number;
    onePack: number;
  };
  targetRarities: string[];
  minDistinctPacks: number;
}

export interface OverlapReport {
  summary: OverlapSummary;
  buckets: OverlapBuckets;
  packs: CanonicalPack[];
}

export interface RawPack {
  _id: string;
  type?: string;
  name?: string;
  release?: string;
  expires?: string;
}

export interface RawCardSource {
  _id: string;
  type?: string;
  name?: string;
}

export interface RawCardObtain {
  source?: RawCardSource;
  type?: string;
}

export interface RawCard {
  _id: string;
  name?: string;
  rarity?: string;
  release?: string;
  description?: string;
  obtain?: RawCardObtain[];
}
