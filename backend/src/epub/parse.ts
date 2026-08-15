import { unzipSync } from "fflate";
import { splitSentences, tokenize } from "../nlp/tamil.js";
import { aggregateA11y, analyzeChapter, type A11yReport } from "./a11y.js";
import type { Block, ChapterDoc } from "./blocks.js";
import {
  parseHtml,
  parseXml,
  type DomDocument,
  type DomElement,
  type ManifestItem,
} from "./dom.js";

const XHTML_TYPES = new Set(["application/xhtml+xml", "text/html"]);
const MIN_CHAPTER_WORDS = 30;
const TOC_SHORT_LINE = 40;
const TOC_MAX_LINE = 150;

export interface EpubMetadata {
  title: string;
  author: string | null;
  language: string;
}

export interface SkippedItem {
  href: string;
  reason: "unsupported_media_type" | "missing_file" | "table_of_contents" | "low_word_count";
}

export interface ParsedEpub {
  bookId: string;
  metadata: EpubMetadata;
  chapters: ChapterDoc[];
  skipped: SkippedItem[];
  images: Record<string, Uint8Array>;
  cover: { path: string; bytes: Uint8Array } | null;
  a11y: A11yReport;
}

export function parseEpub(bytes: Uint8Array, bookId: string): ParsedEpub {
  const files = unzipSync(bytes);
  const dec = new TextDecoder("utf-8");
  const str = (path: string): string | null => {
    const data = files[path];
    return data ? dec.decode(data) : null;
  };

  const containerXml = str("META-INF/container.xml");
  if (!containerXml) throw new Error("not an EPUB: missing META-INF/container.xml");
  const opfPath =
    parseXml(containerXml).getElementsByTagName("rootfile")[0]?.getAttribute("full-path") ?? null;
  if (!opfPath) throw new Error("invalid EPUB: container.xml has no rootfile");
  const opfXml = str(opfPath);
  if (!opfXml) throw new Error(`invalid EPUB: missing OPF at ${opfPath}`);

  const opf = parseXml(opfXml);
  const opfDir = dirOf(opfPath);
  const metadata: EpubMetadata = {
    title: textOf(opf.getElementsByTagName("dc:title")[0] ?? null) ?? bookId,
    author: textOf(opf.getElementsByTagName("dc:creator")[0] ?? null),
    language: textOf(opf.getElementsByTagName("dc:language")[0] ?? null) ?? "ta",
  };

  const items = new Map<string, ManifestItem>();
  for (const el of opf.getElementsByTagName("item")) {
    const id = el.getAttribute("id");
    const href = el.getAttribute("href");
    if (!id || !href) continue;
    items.set(id, {
      id,
      path: resolvePath(opfDir, href),
      mediaType: el.getAttribute("media-type") ?? "",
      properties: el.getAttribute("properties") ?? "",
    });
  }

  const toc = buildTocMap(items, str);
  const images: Record<string, Uint8Array> = {};
  for (const item of items.values()) {
    if (item.mediaType.startsWith("image/")) {
      const data = files[item.path];
      if (data) images[item.path] = data;
    }
  }
  const cover = findCover(opf, items, files);

  const chapters: ChapterDoc[] = [];
  const skipped: SkippedItem[] = [];
  const issues = [];

  for (const itemref of opf.getElementsByTagName("itemref")) {
    const idref = itemref.getAttribute("idref");
    if (!idref) continue;
    const item = items.get(idref);
    if (!item) {
      skipped.push({ href: idref, reason: "missing_file" });
      continue;
    }
    if (!XHTML_TYPES.has(item.mediaType)) {
      skipped.push({ href: item.path, reason: "unsupported_media_type" });
      continue;
    }
    const xhtml = str(item.path);
    if (xhtml === null) {
      skipped.push({ href: item.path, reason: "missing_file" });
      continue;
    }

    const document = parseHtml(xhtml);
    const langAttr =
      document.documentElement?.getAttribute("lang") ??
      document.documentElement?.getAttribute("xml:lang") ??
      null;

    if (document.querySelector("nav")) {
      skipped.push({ href: item.path, reason: "table_of_contents" });
      continue;
    }

    const blocks = extractBlocks(document.body, dirOf(item.path));
    const texts = blocks.map((b) => blockText(b)).filter((t) => t.length > 0);
    if (looksLikeToc(texts)) {
      skipped.push({ href: item.path, reason: "table_of_contents" });
      continue;
    }

    const wordCount = tokenize(texts.join(" ")).length;
    if (wordCount < MIN_CHAPTER_WORDS) {
      skipped.push({ href: item.path, reason: "low_word_count" });
      continue;
    }

    const idx = chapters.length;
    const chapter: ChapterDoc = {
      idx,
      href: item.path,
      title: toc.get(item.path) ?? firstHeadingText(blocks) ?? firstParagraphText(blocks) ?? item.id,
      lang: langAttr ?? metadata.language,
      blocks,
      wordCount,
      sentences: texts.flatMap((t) => splitSentences(t)),
    };
    chapters.push(chapter);
    issues.push(...analyzeChapter(chapter, langAttr, metadata.language));
  }

  return {
    bookId,
    metadata,
    chapters,
    skipped,
    images,
    cover,
    a11y: aggregateA11y(issues),
  };
}

function textOf(el: DomElement | null | undefined): string | null {
  if (!el) return null;
  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  return text.length > 0 ? text : null;
}

function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i + 1);
}

export function resolvePath(baseDir: string, href: string): string {
  const noFragment = href.split("#")[0] ?? "";
  const parts: string[] = [];
  for (const seg of (baseDir + noFragment).split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts.join("/");
}

function buildTocMap(
  items: Map<string, ManifestItem>,
  str: (path: string) => string | null,
): Map<string, string> {
  const map = new Map<string, string>();
  const navItem = [...items.values()].find((i) =>
    i.properties.split(/\s+/).includes("nav"),
  );
  const navXml = navItem ? str(navItem.path) : null;
  if (navItem && navXml) {
    const dir = dirOf(navItem.path);
    for (const a of parseHtml(navXml).getElementsByTagName("a")) {
      const href = a.getAttribute("href");
      const label = textOf(a);
      if (!href || !label) continue;
      const path = resolvePath(dir, href);
      if (!map.has(path)) map.set(path, label);
    }
    return map;
  }
  const ncxItem = [...items.values()].find(
    (i) => i.mediaType === "application/x-dtbncx+xml",
  );
  const ncxXml = ncxItem ? str(ncxItem.path) : null;
  if (ncxItem && ncxXml) {
    const ncx = parseXml(ncxXml);
    const dir = dirOf(ncxItem.path);
    for (const np of ncx.getElementsByTagName("navPoint")) {
      const src = np.getElementsByTagName("content")[0]?.getAttribute("src");
      const label = textOf(np.getElementsByTagName("text")[0] ?? null);
      if (!src || !label) continue;
      map.set(resolvePath(dir, src), label);
    }
  }
  return map;
}

function findCover(
  opf: DomDocument,
  items: Map<string, ManifestItem>,
  files: Record<string, Uint8Array>,
): { path: string; bytes: Uint8Array } | null {
  let path: string | null = null;
  for (const item of items.values()) {
    if (
      item.mediaType.startsWith("image/") &&
      item.properties.split(/\s+/).includes("cover-image")
    ) {
      path = item.path;
      break;
    }
  }
  if (!path) {
    for (const meta of opf.getElementsByTagName("meta")) {
      if (meta.getAttribute("name") === "cover") {
        const id = meta.getAttribute("content");
        const item = id ? items.get(id) : undefined;
        if (item && item.mediaType.startsWith("image/")) {
          path = item.path;
          break;
        }
      }
    }
  }
  if (!path) {
    const candidate = [...items.values()].find(
      (i) => i.mediaType.startsWith("image/") && /cover/i.test(i.path),
    );
    path = candidate?.path ?? null;
  }
  if (!path) return null;
  const bytes = files[path];
  return bytes ? { path, bytes } : null;
}

function looksLikeToc(texts: string[]): boolean {
  if (texts.length === 0) return false;
  if (texts.some((t) => t.length > TOC_MAX_LINE)) return false;
  const short = texts.filter((t) => t.length < TOC_SHORT_LINE).length;
  return short / texts.length > 0.8;
}

function firstHeadingText(blocks: Block[]): string | null {
  for (const block of blocks) {
    if (block.t === "h") return block.text;
  }
  return null;
}

function firstParagraphText(blocks: Block[]): string | null {
  for (const block of blocks) {
    if (block.t === "p" && block.text.trim().length > 0) {
      return block.text.length > 80 ? `${block.text.slice(0, 79)}…` : block.text;
    }
  }
  return null;
}

function blockText(block: Block): string {
  switch (block.t) {
    case "h":
    case "p":
    case "quote":
      return block.text;
    case "list":
      return block.items.join(" ");
    case "table":
      return block.rows.map((r) => r.join(" ")).join(" ");
    case "img":
      return "";
  }
}

function extractBlocks(body: DomElement | null, baseDir: string): Block[] {
  const blocks: Block[] = [];
  if (body) {
    for (const child of body.children) {
      walk(child, baseDir, blocks);
    }
  }
  return blocks;
}

function imgBlock(el: DomElement, baseDir: string): Block {
  const src = el.getAttribute("src") ?? el.getAttribute("xlink:href") ?? "";
  const alt = el.getAttribute("alt");
  const block: Block = { t: "img", key: resolvePath(baseDir, src) };
  if (alt && alt.trim().length > 0) block.alt = alt.trim();
  return block;
}

function walk(el: DomElement, baseDir: string, out: Block[]): void {
  const tag = el.tagName.toLowerCase();
  const text = textOf(el) ?? "";

  switch (tag) {
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6": {
      if (text) out.push({ t: "h", lvl: Number(tag[1]), text });
      return;
    }
    case "p": {
      if (text) out.push({ t: "p", text });
      for (const img of el.querySelectorAll("img")) {
        out.push(imgBlock(img, baseDir));
      }
      return;
    }
    case "img": {
      out.push(imgBlock(el, baseDir));
      return;
    }
    case "blockquote": {
      if (text) {
        const cite = el.getAttribute("cite");
        const block: Block = { t: "quote", text };
        if (cite) block.cite = cite;
        out.push(block);
      }
      return;
    }
    case "ul":
    case "ol": {
      const items = el.children
        .filter((li) => li.tagName.toLowerCase() === "li")
        .map((li) => textOf(li))
        .filter((t): t is string => t !== null);
      if (items.length > 0) out.push({ t: "list", ordered: tag === "ol", items });
      return;
    }
    case "table": {
      const rows = el.querySelectorAll("tr").map((tr) =>
        tr.children.map((cell) => textOf(cell) ?? ""),
      );
      const hasHeader = el.querySelector("th") !== null;
      if (rows.length > 0) out.push({ t: "table", header: hasHeader, rows });
      return;
    }
    default: {
      if (el.children.length > 0) {
        for (const child of el.children) walk(child, baseDir, out);
      } else if (text) {
        out.push({ t: "p", text });
      }
    }
  }
}
