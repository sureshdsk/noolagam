export type Block =
  | { t: "h"; lvl: number; text: string }
  | { t: "p"; text: string }
  | { t: "img"; key: string; alt?: string }
  | { t: "table"; header: boolean; rows: string[][] }
  | { t: "quote"; text: string; cite?: string }
  | { t: "list"; ordered: boolean; items: string[] };

export interface ChapterDoc {
  idx: number;
  href: string;
  title: string;
  lang: string;
  blocks: Block[];
  wordCount: number;
  sentences: string[];
}
