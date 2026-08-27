export function slugifyBookId(name: string): string {
  const base = (name.split("/").pop() ?? name).replace(/\.epub$/i, "");
  const slug = base
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_-]+/gu, "");
  return slug.length > 0 ? slug : "book";
}
