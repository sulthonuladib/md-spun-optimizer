import { describe, expect, test } from "bun:test";
import { buildOverlapReport } from "./analyze";

describe("buildOverlapReport", () => {
  test("prioritizes higher coverage and avoids duplicate packs across buckets", () => {
    const report = buildOverlapReport(
      {
        packs: [
          { id: "p1", name: "Pack One", type: "secret", releaseAt: null, expiresAt: null, isExpired: false },
          { id: "p2", name: "Pack Two", type: "selection", releaseAt: null, expiresAt: null, isExpired: false },
          { id: "p3", name: "Pack Three", type: "secret", releaseAt: null, expiresAt: null, isExpired: false },
          { id: "p4", name: "Pack Four", type: "secret", releaseAt: null, expiresAt: null, isExpired: false },
        ],
        cards: [
          {
            id: "c1",
            name: "Card One",
            rarity: "SR",
            description: "D1",
            imageUrl: "https://img/1",
            releaseAt: null,
            sources: [
              { packId: "p1", packName: "Pack One", packType: "secret" },
              { packId: "p2", packName: "Pack Two", packType: "selection" },
              { packId: "p3", packName: "Pack Three", packType: "secret" },
            ],
          },
          {
            id: "c2",
            name: "Card Two",
            rarity: "SR",
            description: "D2",
            imageUrl: "https://img/2",
            releaseAt: null,
            sources: [
              { packId: "p2", packName: "Pack Two", packType: "selection" },
              { packId: "p4", packName: "Pack Four", packType: "secret" },
            ],
          },
          {
            id: "c3",
            name: "Card Three",
            rarity: "SR",
            description: "D3",
            imageUrl: "https://img/3",
            releaseAt: null,
            sources: [{ packId: "p1", packName: "Pack One", packType: "secret" }],
          },
        ],
      },
      { targetRarities: ["SR"], minDistinctPacks: 1, includeExpiredPacks: false },
    );

    expect(report.summary.bucketCounts.threePack).toBe(1);
    expect(report.summary.bucketCounts.twoPack).toBe(0);
    expect(report.summary.bucketCounts.onePack).toBe(1);
    expect(report.buckets.threePack[0]?.id).toBe("c1");
    expect(report.buckets.onePack[0]?.id).toBe("c2");
    expect(report.buckets.onePack[0]?.allRelevantPacks).toEqual(["p4"]);
  });
});
