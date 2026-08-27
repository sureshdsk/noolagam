import type { ChapterDoc } from "./blocks.js";

export type A11yIssueType =
  | "img_missing_alt"
  | "lang_missing"
  | "lang_invalid"
  | "heading_jump"
  | "table_missing_header";

export interface A11yIssue {
  chapterIdx: number;
  type: A11yIssueType;
  detail?: string;
}

export interface A11yReport {
  issues: A11yIssue[];
  counts: Partial<Record<A11yIssueType, number>>;
  score: number;
}

const VALID_LANGS = new Set(["ta", "en"]);

export function analyzeChapter(
  chapter: Pick<ChapterDoc, "idx" | "blocks">,
  langAttr: string | null,
  bookLanguage: string,
): A11yIssue[] {
  const issues: A11yIssue[] = [];
  const { idx, blocks } = chapter;

  if (langAttr === null) {
    issues.push({ chapterIdx: idx, type: "lang_missing" });
  } else if (!VALID_LANGS.has(langAttr.toLowerCase())) {
    issues.push({
      chapterIdx: idx,
      type: "lang_invalid",
      detail: `lang="${langAttr}" (book: ${bookLanguage})`,
    });
  }

  let prevHeadingLvl: number | null = null;
  let imgNo = 0;
  let tableNo = 0;
  for (const block of blocks) {
    switch (block.t) {
      case "h": {
        if (prevHeadingLvl !== null && block.lvl > prevHeadingLvl + 1) {
          issues.push({
            chapterIdx: idx,
            type: "heading_jump",
            detail: `h${prevHeadingLvl} -> h${block.lvl}`,
          });
        }
        prevHeadingLvl = block.lvl;
        break;
      }
      case "img": {
        if (!block.alt) {
          issues.push({
            chapterIdx: idx,
            type: "img_missing_alt",
            detail: `img #${imgNo + 1} (${block.key})`,
          });
        }
        imgNo += 1;
        break;
      }
      case "table": {
        tableNo += 1;
        if (!block.header) {
          issues.push({
            chapterIdx: idx,
            type: "table_missing_header",
            detail: `table #${tableNo}`,
          });
        }
        break;
      }
      default:
        break;
    }
  }
  return issues;
}

export function aggregateA11y(issues: A11yIssue[]): A11yReport {
  const counts: Partial<Record<A11yIssueType, number>> = {};
  for (const issue of issues) {
    counts[issue.type] = (counts[issue.type] ?? 0) + 1;
  }
  return {
    issues,
    counts,
    score: Math.max(0, 100 - issues.length),
  };
}
