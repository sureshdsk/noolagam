"""
Tamil EPUB Reader+ — Step 1 Starter Script
--------------------------------------------
Purpose:
    1. Parse a Tamil EPUB file and extract clean chapter-wise text.
    2. Normalize Tamil Unicode (fixes inconsistent character encoding).
    3. Tokenize text into words/sentences using indic-nlp-library.
    4. Split text into sentences (for search + text-to-speech later).
    5. Build a simple search index across the whole book.

Requirements:
    pip install ebooklib beautifulsoup4 indic-nlp-library

Usage:
    python tamil_epub_extractor.py path/to/book.epub
    python tamil_epub_extractor.py path/to/book.epub தமிழ்   (also searches for a word)
"""

import sys
import json
import re
from pathlib import Path

from ebooklib import epub
import ebooklib
from bs4 import BeautifulSoup

from indicnlp.tokenize import indic_tokenize
from indicnlp.normalize.indic_normalize import IndicNormalizerFactory


def looks_like_table_of_contents(soup, cleaned_text: str) -> bool:
    """
    Heuristic check: is this page actually a Table of Contents page
    rather than real chapter content?
    """
    if soup.find("nav") is not None:
        return True

    lines = [l.strip() for l in cleaned_text.split("\n") if l.strip()]
    if not lines:
        return True

    short_lines = [l for l in lines if len(l) < 40]
    short_ratio = len(short_lines) / len(lines)

    has_long_paragraph = any(len(l) > 150 for l in lines)
    return short_ratio > 0.8 and not has_long_paragraph


def extract_chapters(epub_path: str, min_words: int = 30):
    """
    Reads an EPUB file and returns a list of REAL content chapters.
    Automatically skips empty pages, TOC/nav pages, and tiny fragments.
    """
    book = epub.read_epub(epub_path)
    chapters = []

    for item in book.get_items():
        if item.get_type() != ebooklib.ITEM_DOCUMENT:
            continue

        soup = BeautifulSoup(item.get_content(), "html.parser")

        heading = soup.find(["h1", "h2", "h3"])
        title = heading.get_text(strip=True) if heading else item.get_name()

        raw_text = soup.get_text(separator="\n")
        cleaned_text = re.sub(r"\n{2,}", "\n", raw_text).strip()

        if not cleaned_text:
            continue

        if looks_like_table_of_contents(soup, cleaned_text):
            continue

        word_count_estimate = len(cleaned_text.split())
        if word_count_estimate < min_words:
            continue

        chapters.append({
            "id": item.get_id(),
            "title": title,
            "text": cleaned_text,
        })

    return chapters


def normalize_and_tokenize(text: str, lang: str = "ta"):
    normalizer = IndicNormalizerFactory().get_normalizer(lang)
    normalized = normalizer.normalize(text)
    tokens = list(indic_tokenize.trivial_tokenize(normalized, lang=lang))
    return normalized, tokens


def split_sentences(text: str, lang: str = "ta"):
    """
    Splits normalized Tamil text into sentences.
    """
    raw_sentences = re.split(r"(?<=[.!?।])\s+", text)
    return [s.strip() for s in raw_sentences if s.strip()]


def build_search_index(chapters_processed):
    """
    Builds a simple word -> [locations] search index.
    """
    index = {}

    for ch in chapters_processed:
        for sent_idx, sentence in enumerate(ch["sentences"]):
            _, tokens = normalize_and_tokenize(sentence)
            for word in set(tokens):
                if len(word) < 2:
                    continue
                index.setdefault(word, []).append({
                    "chapter_id": ch["id"],
                    "chapter_title": ch["title"],
                    "sentence_index": sent_idx,
                    "sentence": sentence,
                })

    return index


def process_epub(epub_path: str, output_json: str = None, index_json: str = None):
    chapters = extract_chapters(epub_path)

    processed = []
    for ch in chapters:
        normalized_text, tokens = normalize_and_tokenize(ch["text"])
        sentences = split_sentences(normalized_text)
        processed.append({
            "id": ch["id"],
            "title": ch["title"],
            "text": normalized_text,
            "sentences": sentences,
            "word_count": len(tokens),
            "tokens_preview": tokens[:20],
        })

    result = {
        "source_file": Path(epub_path).name,
        "chapter_count": len(processed),
        "chapters": processed,
    }

    if output_json:
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"Saved extracted output to {output_json}")

    search_index = build_search_index(processed)
    if index_json:
        with open(index_json, "w", encoding="utf-8") as f:
            json.dump(search_index, f, ensure_ascii=False, indent=2)
        print(f"Saved search index ({len(search_index)} unique words) to {index_json}")

    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python tamil_epub_extractor.py path/to/book.epub")
        sys.exit(1)

    epub_file = sys.argv[1]
    out_file = str(Path(epub_file).with_suffix(".json"))
    index_file = str(Path(epub_file).with_suffix("")) + "_search_index.json"

    result = process_epub(epub_file, out_file, index_file)

    print(f"\nExtracted {result['chapter_count']} chapters from {result['source_file']}")
    for ch in result["chapters"][:3]:
        print(f"\n--- {ch['title']} ({ch['word_count']} words) ---")
        print(ch["text"][:200], "...")

    if len(sys.argv) >= 3:
        search_word = sys.argv[2]
        with open(index_file, "r", encoding="utf-8") as f:
            search_index = json.load(f)

        matches = search_index.get(search_word, [])
        print(f"\nSearch results for '{search_word}': {len(matches)} matches")
        for m in matches[:5]:
            print(f"  [{m['chapter_title']}] {m['sentence'][:100]}")
            