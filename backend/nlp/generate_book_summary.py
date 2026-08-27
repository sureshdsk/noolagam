"""
generate_book_summary.py

Reads a chapter-summaries JSON (produced by generate_summaries_gemini.py)
and asks Gemini to write ONE overall summary for the entire book, by
combining all the individual chapter summaries into one request.

Requirements:
    pip install -U google-genai

Setup:
    Same GEMINI_API_KEY environment variable as generate_summaries_gemini.py

Usage:
    python generate_book_summary.py deiva_yaanai_summaries.json

Output:
    Saves a file named <book>_book_summary.json containing one overall
    Tamil summary of the whole book.
"""

import sys
import os
import json
from pathlib import Path

from google import genai


def get_api_key():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: No API key found.")
        print("Set it first by running this in the SAME command prompt window:")
        print("  set GEMINI_API_KEY=your_key_here")
        sys.exit(1)
    return api_key


def build_combined_text(chapter_summaries, max_chars=8000):
    """
    Joins all chapter summaries into one block of text to send to Gemini.
    Using summaries (not full chapter text) keeps this well within
    Gemini's request size and the free-tier limits, since a whole book's
    full text would be far too much to send in one request.
    """
    parts = []
    for ch in chapter_summaries:
        title = ch.get("chapter_title", "")
        summary = ch.get("summary", "")
        if summary:
            parts.append(f"{title}: {summary}")

    combined = "\n".join(parts)
    return combined[:max_chars]


def summarize_whole_book(client, combined_text):
    prompt = f"""கீழே ஒரு தமிழ் புத்தகத்தின் ஒவ்வொரு அத்தியாயத்தின் சுருக்கமும் கொடுக்கப்பட்டுள்ளது.
இவை அனைத்தையும் படித்து, முழு புத்தகத்தையும் ஒரே ஒரு சுருக்கமாக 8-10 வரிகளில் தமிழில் எழுதவும்.
கதையின் முக்கிய போக்கை மட்டும் சொல்லவும், ஒவ்வொரு அத்தியாயத்தையும் தனித்தனியாக பட்டியலிட வேண்டாம்.

அத்தியாய சுருக்கங்கள்:
{combined_text}

முழு புத்தக சுருக்கம் (தமிழில், 8-10 வரிகள் மட்டும்):"""

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=prompt,
    )
    return response.text.strip()


def generate(input_json: str):
    api_key = get_api_key()
    client = genai.Client(api_key=api_key)

    with open(input_json, "r", encoding="utf-8") as f:
        data = json.load(f)

    if "chapter_summaries" not in data:
        print("ERROR: This doesn't look like a chapter-summaries JSON file.")
        print("Run generate_summaries_gemini.py first to create one.")
        sys.exit(1)

    print("Combining all chapter summaries...")
    combined_text = build_combined_text(data["chapter_summaries"])

    print("Asking Gemini for one whole-book summary...")
    try:
        book_summary = summarize_whole_book(client, combined_text)
    except Exception as e:
        print(f"Failed: {e}")
        sys.exit(1)

    result = {
        "source_file": data.get("source_file", input_json),
        "book_summary": book_summary,
    }

    book_name = Path(input_json).stem
    output_path = str(Path(input_json).parent / f"{book_name.replace('_summaries', '')}_book_summary.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\nSaved whole-book summary to: {output_path}")
    print("\n--- Preview ---")
    print(book_summary)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_book_summary.py chapters_summaries.json")
        sys.exit(1)

    generate(sys.argv[1])