"""
Tamil EPUB Reader+ — Chapter Audio Generator (gTTS version)
--------------------------------------------------------------------
Purpose:
    Reads a chapters JSON (from tamil_epub_extractor.py) or a
    summaries JSON (from generate_summaries_gemini.py) and turns
    each chapter's text into a Tamil .mp3 audio file.

Requirements:
    pip install gtts

Usage:
    Full chapter text -> audio (slower, longer files):
        python generate_audio.py deiva_yaanai.json

    Summary text -> audio (faster, short files, good for demos):
        python generate_audio.py deiva_yaanai_summaries.json

Output:
    Creates a folder named "<book_name>_audio" containing one .mp3
    file per chapter, e.g. chapter_01.mp3, chapter_02.mp3, ...
"""

import sys
import os
import json
import time
from pathlib import Path

from gtts import gTTS


def make_audio_for_chapter(text: str, output_path: str, max_chars: int = 4500):
    """
    Converts one chapter's text to a Tamil .mp3 file.
    gTTS has a soft limit on how much text it handles well in one call,
    so very long chapters get trimmed to max_chars to keep things reliable.
    """
    if not text:
        return False

    text_to_speak = text[:max_chars]
    tts = gTTS(text=text_to_speak, lang="ta")
    tts.save(output_path)
    return True


def detect_format(data):
    """
    Figures out whether this JSON came from the extractor (full chapters),
    the summarizer (short per-chapter summaries), or the whole-book
    summarizer (one summary for the entire book), and returns the list
    of items plus which field holds the text to speak.
    """
    if "chapters" in data:
        return data["chapters"], "text", "title"
    elif "chapter_summaries" in data:
        return data["chapter_summaries"], "summary", "chapter_title"
    elif "book_summary" in data:
        # Wrap the single whole-book summary in a list so the rest of the
        # code (which expects a list of items) can handle it the same way.
        fake_item = {"title": "Whole Book Summary", "summary": data["book_summary"]}
        return [fake_item], "summary", "title"
    else:
        print("ERROR: This JSON doesn't look like a chapters, chapter-summaries, or book-summary file.")
        sys.exit(1)


def generate_all_audio(input_json: str):
    with open(input_json, "r", encoding="utf-8") as f:
        data = json.load(f)

    items, text_field, title_field = detect_format(data)
    is_single_book_summary = "book_summary" in data

    book_name = Path(input_json).stem
    output_folder = str(Path(input_json).parent / f"{book_name}_audio")
    os.makedirs(output_folder, exist_ok=True)

    total = len(items)
    success_count = 0

    for i, item in enumerate(items, start=1):
        title = item.get(title_field, f"Chapter {i}")[:40]
        text = item.get(text_field)

        print(f"[{i}/{total}] Generating audio: {title}...")

        if is_single_book_summary:
            output_path = os.path.join(output_folder, "book_summary.mp3")
        else:
            output_path = os.path.join(output_folder, f"chapter_{i:02d}.mp3")

        try:
            made = make_audio_for_chapter(text, output_path)
            if made:
                success_count += 1
            else:
                print(f"  Skipped: no text found for this chapter")
        except Exception as e:
            print(f"  Failed: {e}")

        time.sleep(1)  # small pause to be gentle on the free service

    print(f"\nDone. {success_count}/{total} audio files created in '{output_folder}/'")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_audio.py chapters.json")
        print("   or: python generate_audio.py chapters_summaries.json")
        sys.exit(1)

    generate_all_audio(sys.argv[1])