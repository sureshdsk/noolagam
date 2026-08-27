import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseEpub } from "../src/epub/parse.js";
import { buildArtifacts } from "../src/pipeline/artifacts.js";

const PS_PATH = fileURLToPath(
  new URL("../../assets/books/ponniyin_selvan.epub", import.meta.url),
);
const DY_PATH = fileURLToPath(
  new URL("../../assets/books/deiva_yaanai/deiva_yaanai.epub", import.meta.url),
);

async function load(path: string, bookId: string) {
  return parseEpub(new Uint8Array(await readFile(path)), bookId);
}

describe.skipIf(!existsSync(PS_PATH))("golden: ponniyin_selvan.epub", () => {
  it("extracts catalog metadata", async () => {
    const parsed = await load(PS_PATH, "ponniyin_selvan");
    expect(parsed.metadata.title).toBe("பொன்னியின் செல்வன்");
    expect(parsed.metadata.author).toBe("கல்கி ரா. கிருஷ்ணமூர்த்தி");
    expect(parsed.metadata.language).toBe("ta");
    expect(parsed.cover?.path).toBe("EPUB/media/cover.jpg");
  });

  it("extracts all chapters with Tamil text intact", async () => {
    const parsed = await load(PS_PATH, "ponniyin_selvan");
    expect(parsed.chapters.length).toBe(295);
    expect(parsed.chapters[0]?.title).toBe("பொன்னியின் செல்வன்");
    expect(parsed.chapters.at(-1)?.title).toBe("முடிவுரை");
    const words = parsed.chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
    expect(words).toBeGreaterThan(400_000);
    expect(words).toBeLessThan(435_000);
    for (const ch of parsed.chapters) {
      expect(ch.blocks.length).toBeGreaterThan(0);
      expect(ch.lang).toBe("ta");
    }
  });

  it("skips only front matter", async () => {
    const parsed = await load(PS_PATH, "ponniyin_selvan");
    expect(parsed.skipped.map((s) => s.reason).sort()).toEqual([
      "low_word_count",
      "table_of_contents",
      "table_of_contents",
    ]);
  });

  it("builds storage-shaped artifacts", async () => {
    const parsed = await load(PS_PATH, "ponniyin_selvan");
    const artifacts = buildArtifacts(parsed);
    expect(artifacts.length).toBe(295 + 4);
    expect(artifacts.map((f) => f.path)).toContain("books/ponniyin_selvan/manifest.json");
    expect(artifacts.map((f) => f.path)).toContain("books/ponniyin_selvan/chapters/0.json");
    expect(artifacts.map((f) => f.path)).toContain("books/ponniyin_selvan/cover.jpg");
  });
});

describe.skipIf(!existsSync(DY_PATH))("golden: deiva_yaanai.epub", () => {
  it("extracts chapters despite sparse metadata", async () => {
    const parsed = await load(DY_PATH, "deiva_yaanai");
    expect(parsed.metadata.language).toBe("en-IN");
    expect(parsed.chapters.length).toBe(24);
    expect(parsed.chapters[0]?.title).toBe("தெய்வயானை");
    expect(parsed.chapters.at(-1)?.title).toBe("ஸினிமாக் கதை");
    const words = parsed.chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
    expect(words).toBeGreaterThan(64_000);
    expect(words).toBeLessThan(70_000);
  });

  it("flags real a11y issues (lang + alt)", async () => {
    const parsed = await load(DY_PATH, "deiva_yaanai");
    expect(parsed.a11y.counts).toEqual({
      lang_invalid: 24,
      img_missing_alt: 1,
    });
  });

  it("emits block-model chapter json", async () => {
    const parsed = await load(DY_PATH, "deiva_yaanai");
    const artifacts = buildArtifacts(parsed);
    const chapterFile = artifacts.find((f) => f.path === "books/deiva_yaanai/chapters/1.json");
    expect(chapterFile).toBeDefined();
    const chapter = JSON.parse(chapterFile!.data as string);
    expect(chapter.title).toBe("அமர வாழ்வு");
    expect(chapter.blocks[0]).toEqual({ t: "h", lvl: 1, text: "அமர வாழ்வு" });
    expect(chapter.blocks.some((b: { t: string }) => b.t === "p")).toBe(true);
  });
});
