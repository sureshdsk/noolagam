export type CompletionFn = (messages: { role: "system" | "user"; content: string }[]) => Promise<string>;

export interface SummaryChapterInput {
  idx: number;
  title: string;
  text: string;
}

export interface ChapterSummary {
  idx: number;
  title: string;
  summary: string;
}

export interface BookSummaries {
  chapterSummaries: ChapterSummary[];
  bookSummary: string;
}

const CHAPTER_TEXT_MAX_CHARS = 6000;
const COMBINED_MAX_CHARS = 8000;
const MAX_EMPTY_RETRIES = 2;
const INTER_CALL_DELAY_MS = 500;

const CHAPTER_PROMPT = (title: string, text: string) => `நீ ஒரு தமிழ் இலக்கிய உதவியாளர். கீழே உள்ள அத்தியாயத்தைப் படித்து, அதன் முக்கிய நிகழ்வுகளை 3 அல்லது 4 வரிகளில் தமிழில் சுருக்கமாக எழுது. விளக்கம் அல்லது பகுப்பாய்வு தேவையில்லை; நிகழ்வுகளை மட்டும் தொடர்ச்சியாகத் தருக.

அத்தியாயம்: ${title}

${text}`;

const BOOK_PROMPT = (lines: string) => `கீழே ஒரு நாவலின் ஒவ்வொரு அத்தியாயத்தின் சுருக்கமும் உள்ளது. இவற்றை அடிப்படையாகக் கொண்டு, நாவலின் முழுக் கதையை 8 முதல் 10 வரிகளில் தமிழில் எழுது. அத்தியாயங்களை வரிசைப்படுத்தி பட்டியலிடாமல், கதையின் ஓட்டத்தைப் பின்பற்றி எழுது.

${lines}`;

function truncate(text: string, maxChars: number): string {
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function completeWithRetry(
  complete: CompletionFn,
  messages: { role: "system" | "user"; content: string }[],
): Promise<string> {
  let last = "";
  for (let attempt = 0; attempt <= MAX_EMPTY_RETRIES; attempt++) {
    last = await complete(messages);
    if (last.length > 0) return last;
  }
  return `[சுருக்கம் கிடைக்கவில்லை — ${new Date().toISOString()}]`;
}

export async function generateBookSummaries(
  complete: CompletionFn,
  chapters: SummaryChapterInput[],
): Promise<BookSummaries> {
  const chapterSummaries: ChapterSummary[] = [];
  for (const chapter of chapters) {
    const summary = await completeWithRetry(complete, [
      {
        role: "user",
        content: CHAPTER_PROMPT(chapter.title, truncate(chapter.text, CHAPTER_TEXT_MAX_CHARS)),
      },
    ]);
    chapterSummaries.push({ idx: chapter.idx, title: chapter.title, summary });
    await sleep(INTER_CALL_DELAY_MS);
  }

  const lines = chapterSummaries
    .map((ch) => `${ch.title}: ${ch.summary}`)
    .join("\n\n");
  const bookSummary = await completeWithRetry(complete, [
    { role: "user", content: BOOK_PROMPT(truncate(lines, COMBINED_MAX_CHARS)) },
  ]);

  return { chapterSummaries, bookSummary };
}
