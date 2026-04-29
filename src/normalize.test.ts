import { describe, expect, test } from "bun:test";
import { normalizeDataset } from "./normalize";

describe("normalizeDataset", () => {
  test("normalizes pack type and card sources deterministically", () => {
    const dataset = normalizeDataset(
      [
        { _id: "p2", name: "Pack B", type: "Selection Pack" },
        { _id: "p1", name: "Pack A", type: "Secret Pack" },
      ],
      [
        {
          _id: "c1",
          name: "Card One",
          rarity: "sr",
          description: "Sample card text",
          obtain: [
            { type: "sets", source: { _id: "p1", name: "Pack A", type: "Secret Pack" } },
            { type: "sets", source: { _id: "p2", name: "Pack B", type: "Selection Pack" } },
          ],
        },
      ],
      new Date("2026-01-01T00:00:00.000Z"),
    );

    expect(dataset.packs[0]?.id).toBe("p1");
    expect(dataset.packs[0]?.type).toBe("secret");
    expect(dataset.cards[0]?.rarity).toBe("SR");
    expect(dataset.cards[0]?.description).toBe("Sample card text");
    expect(dataset.cards[0]?.imageUrl).toContain("imgserv.duellinksmeta.com");
    expect(dataset.cards[0]?.sources.map((source) => source.packType)).toEqual([
      "secret",
      "selection",
    ]);
  });
});
