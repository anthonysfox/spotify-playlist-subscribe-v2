import { formatVibeProfile, hasEnoughSignal } from "@/lib/tracks/vibe-profile";
import { describe, expect, it } from "vitest";

describe("formatVibeProfile", () => {
  it("formats every field in order", () => {
    const profile = {
      moods: ["nocturnal", "melancholic", "warm"],
      genres: ["ambient", "downtempo"],
      texture: "synth pads, soft piano",
      vocals: "instrumental",
      tempoFeel: "slow",
      listeningContext: ["late-night drive", "studying"],
    };

    expect(formatVibeProfile(profile)).toBe(
      `Moods: nocturnal, melancholic, warm\nGenres: ambient, downtempo\nTexture: synth pads, soft piano\nVocals: instrumental\nTempo feel: slow\nListening context: late-night drive, studying`,
    );
  });

  it("leaves out empty, missing and blank fields", () => {
    const profile = {
      moods: ["nocturnal", "melancholic", "warm"],
      genres: ["ambient", "downtempo"],
      listeningContext: [],
      tempoFeel: " ",
    };

    expect(formatVibeProfile(profile)).toBe(
      `Moods: nocturnal, melancholic, warm\nGenres: ambient, downtempo`,
    );
  });
});

describe("hasEnoughSignal", () => {
  it("doesn't have enough signal when both are empty", () => {
    expect(hasEnoughSignal([], [])).toBe(false);
  });

  it("does have enough signal when track tags has a tag", () => {
    expect(hasEnoughSignal(["ambient"], [])).toBe(true);
  });

  it("does have enough signal when artist tags has 3 tags and track tags has none", () => {
    expect(hasEnoughSignal([], ["ambient", "solo", "beautiful"])).toBe(true);
  });

  it("does not have enough signal when artist tags has less than 3 tags and track tags has none", () => {
    expect(hasEnoughSignal([], ["ambient", "solo"])).toBe(false);
  });
});
