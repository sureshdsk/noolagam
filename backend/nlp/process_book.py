"""
process_book.py

Runs the ENTIRE Tamil EPUB Reader+ pipeline with one single command,
instead of running each script manually:

    1. Extract  -> tamil_epub_extractor.py
    2. Per-chapter summaries -> generate_summaries_gemini.py
    3. Whole-book summary -> generate_book_summary.py
    4. Audio of the whole-book summary -> generate_audio.py

Requirements:
    Same as the individual scripts - ebooklib, beautifulsoup4,
    indic-nlp-library, google-genai, gtts must all be installed,
    and GEMINI_API_KEY must be set before running this.

Usage:
    set GEMINI_API_KEY=your_key_here
    python process_book.py "C:\\path\\to\\book.epub"

Output:
    Prints progress for each of the 4 steps as it runs.
    If any step fails, the pipeline stops immediately and shows
    which step failed, so it's easy to fix and re-run just that part.
"""

import sys
import os
import subprocess
from pathlib import Path


def run_step(step_number, step_name, command):
    """
    Runs one step of the pipeline as a separate command, the same way
    you'd type it yourself. Stops the whole pipeline if this step fails.
    """
    print(f"\n{'=' * 60}")
    print(f"STEP {step_number}: {step_name}")
    print(f"{'=' * 60}")
    print(f"Running: {' '.join(command)}\n")

    result = subprocess.run(command)

    if result.returncode != 0:
        print(f"\nPIPELINE STOPPED: Step {step_number} ({step_name}) failed.")
        print(f"Fix the issue above, then you can re-run just this step manually:")
        print(f"  {' '.join(command)}")
        sys.exit(1)


def process_book(epub_path):
    if not os.path.isfile(epub_path):
        print(f"ERROR: Could not find file '{epub_path}'")
        sys.exit(1)

    if not os.environ.get("GEMINI_API_KEY"):
        print("ERROR: GEMINI_API_KEY is not set.")
        print("Run this first, in the SAME command prompt window:")
        print("  set GEMINI_API_KEY=your_key_here")
        sys.exit(1)

    book_stem = Path(epub_path).stem   # e.g. "deiva_yaanai" from "deiva_yaanai.epub"
    book_dir = Path(epub_path).parent  # the folder the epub lives in - outputs land here too

    print(f"\nStarting full pipeline for: {epub_path}")
    print(f"This will run 4 steps. Each one depends on the previous one finishing.")

    # Step 1: Extract chapters from the EPUB
    run_step(1, "Extracting chapters from EPUB",
              [sys.executable, "tamil_epub_extractor.py", epub_path])

    chapters_json = str(book_dir / f"{book_stem}.json")
    if not os.path.isfile(chapters_json):
        print(f"\nERROR: Expected '{chapters_json}' to be created after Step 1, but it wasn't found.")
        print("Check what filename the extractor actually saved, and let's fix this script to match.")
        sys.exit(1)

    # Step 2: Generate per-chapter summaries (needed as input for the whole-book summary)
    run_step(2, "Generating per-chapter summaries (Gemini)",
              [sys.executable, "generate_summaries_gemini.py", chapters_json])

    summaries_json = str(book_dir / f"{book_stem}_summaries.json")
    if not os.path.isfile(summaries_json):
        print(f"\nERROR: Expected '{summaries_json}' to be created after Step 2, but it wasn't found.")
        sys.exit(1)

    # Step 3: Combine chapter summaries into one whole-book summary
    run_step(3, "Generating whole-book summary (Gemini)",
              [sys.executable, "generate_book_summary.py", summaries_json])

    book_summary_json = str(book_dir / f"{book_stem}_book_summary.json")
    if not os.path.isfile(book_summary_json):
        print(f"\nERROR: Expected '{book_summary_json}' to be created after Step 3, but it wasn't found.")
        sys.exit(1)

    # Step 4: Turn the whole-book summary into audio
    run_step(4, "Generating whole-book audio (gTTS)",
              [sys.executable, "generate_audio.py", book_summary_json])

    audio_folder = str(book_dir / f"{book_stem}_book_summary_audio")
    print(f"\n{'=' * 60}")
    print("PIPELINE COMPLETE")
    print(f"{'=' * 60}")
    print(f"  Chapters JSON:      {chapters_json}")
    print(f"  Chapter summaries:  {summaries_json}")
    print(f"  Whole-book summary: {book_summary_json}")
    print(f"  Whole-book audio:   {audio_folder}/book_summary.mp3")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python process_book.py path/to/book.epub")
        sys.exit(1)

    process_book(sys.argv[1])