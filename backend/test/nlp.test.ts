import { describe, expect, it } from "vitest";
import {
  normalizeTamil,
  splitSentences,
  tokenize,
} from "../src/nlp/tamil.js";
import { buildSearchIndex } from "../src/nlp/index.js";
import type { ChapterDoc } from "../src/epub/blocks.js";

describe("normalizeTamil", () => {
  it("collapses whitespace and trims", () => {
    expect(normalizeTamil("  அவன்   வந்தான்  ")).toBe("அவன் வந்தான்");
  });

  it("strips zero-width characters", () => {
    expect(normalizeTamil("கா\u200Bதி")).toBe("காதி");
    expect(normalizeTamil("வா\u200Dன\uFEFFன்")).toBe("வானன்");
  });

  it("applies NFC composition", () => {
    const decomposed = "க" + "\u0BBE";
    expect(decomposed.normalize("NFC")).toBe("கா");
    expect(normalizeTamil(decomposed)).toBe("கா");
  });
});

describe("tokenize", () => {
  it("splits on spaces and punctuation, keeping Tamil tokens", () => {
    expect(tokenize("அவன் வந்தான், போனான்!")).toEqual([
      "அவன்",
      "வந்தான்",
      "போனான்",
    ]);
  });

  it("drops standalone punctuation", () => {
    expect(tokenize("வாக்கியம். ! ? —")).toEqual(["வாக்கியம்"]);
  });

  it("keeps latin words and digits", () => {
    expect(tokenize("EPUB 3 நூல்")).toEqual(["EPUB", "3", "நூல்"]);
  });

  it("treats danda as a separator", () => {
    expect(tokenize("ஒன்று\u0964 இரண்டு")).toEqual(["ஒன்று", "இரண்டு"]);
  });
});

describe("splitSentences", () => {
  it("splits on . ! ? and danda", () => {
    expect(splitSentences("முதல். இரண்டாம்! மூன்றாம்? நான்காம்।")).toEqual([
      "முதல்.",
      "இரண்டாம்!",
      "மூன்றாம்?",
      "நான்காம்।",
    ]);
  });

  it("keeps trailing sentence without terminator", () => {
    expect(splitSentences("முதல். ஈட்டி")).toEqual(["முதல்.", "ஈட்டி"]);
  });
});

describe("buildSearchIndex", () => {
  const chapter: ChapterDoc = {
    idx: 0,
    href: "ch1.xhtml",
    title: "முதல் அத்தியாயம்",
    lang: "ta",
    blocks: [{ t: "p", text: "அவன் வந்தான். அவள் சென்றாள்." }],
    wordCount: 4,
    sentences: ["அவன் வந்தான்.", "அவள் சென்றாள்."],
  };

  it("maps words to sentence hits", () => {
    const index = buildSearchIndex([chapter]);
    expect(index["வந்தான்"]).toEqual([{ c: 0, s: 0, t: "அவன் வந்தான்." }]);
    expect(index["சென்றாள்"]).toEqual([{ c: 0, s: 1, t: "அவள் சென்றாள்." }]);
  });

  it("skips tokens shorter than min length", () => {
    const index = buildSearchIndex([chapter]);
    expect(index["அ"]).toBeUndefined();
  });
});
