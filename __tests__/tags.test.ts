import { cleanTags } from "@/lib/tracks/tags";
import { describe, expect, it } from "vitest";

describe("cleanTags", () => {
  it("drops chart tags and bare years, dedupes, keeps decades", () => {
    expect(
      cleanTags(["Billboard Hot 100", "Dream Pop", "dream pop", "2019", "80s"]),
    ).toEqual(["dream pop", "80s"]);
  });
});
