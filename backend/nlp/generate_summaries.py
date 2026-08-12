"""
Tamil EPUB Reader+ — AI Chapter Summary Generator (Gemini version)
--------------------------------------------------------------------
Purpose:
    Reads the chapters JSON (produced by tamil_epub_extractor.py)
    and generates a short AI summary for each chapter using Gemini.

    NOTE: gemini-2.0-flash was fully shut down on June 1, 2026.
    This version uses gemini-2.5-flash-lite, the current active
    free-tier model (as of July 2026).

Requirements:
    pip install -U google-genai

Setup:
    1. Get a free API key from https://aistudio.google.com/apikey
       (keys start with your Gemini API key)
    2. Set it as an environment variable:

       Windows (Command Prompt):
           set GEMINI_API_KEY=YOUR_GEMINI_API_KEY

       Then run the script in the SAME command prompt window.

Usage:
    python generate_summaries_gemini.py deiva_yaanai.json
"""

import sys
import os
import json
import time
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


def summarize_chapter(client, chapter_title: str, chapter_text: str, max_chars: int = 6000):
    """
    Sends chapter text to Gemini and asks for a short Tamil summary.
    """
    text_for_prompt = chapter_text[:max_chars]

    prompt = f"""இது ஒரு தமிழ் புத்தகத்தின் அத்தியாயம். இதை 3-4 வரிகளில் தமிழில் சுருக்கமாக சொல்லவும்.
கதையின் முக்கிய நிகழ்வுகளை மட்டும் குறிப்பிடவும்.

அத்தியாயம் தலைப்பு: {chapter_title}

உள்ளடக்கம்:
{text_for_prompt}

சுருக்கம் (தமிழில், 3-4 வரிகள் மட்டும்):"""

    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=prompt,
    )
    return response.text.strip()


def generate_all_summaries(input_json: str, output_json: str = None):
    api_key = get_api_key()
    client = genai.Client(api_key=api_key)

    with open(input_json, "r", encoding="utf-8") as f:
        data = json.load(f)

    summaries = []
    total = len(data["chapters"])

    for i, ch in enumerate(data["chapters"], start=1):
        print(f"[{i}/{total}] Summarizing: {ch['title'][:40]}...")
        try:
            summary = summarize_chapter(client, ch["title"], ch["text"])
        except Exception as e:
            print(f"  Failed: {e}")
            summary = None

        summaries.append({
            "chapter_id": ch["id"],
            "chapter_title": ch["title"],
            "word_count": ch["word_count"],
            "summary": summary,
        })

        time.sleep(4)  # free tier is ~15 requests/minute, so pace ourselves

    result = {
        "source_file": data["source_file"],
        "chapter_summaries": summaries,
    }

    if output_json:
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"\nSaved {len(summaries)} summaries to {output_json}")

    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_summaries_gemini.py chapters.json")
        sys.exit(1)

    input_file = sys.argv[1]
    out_file = str(Path(input_file).with_suffix("")) + "_summaries.json"

    result = generate_all_summaries(input_file, out_file)

    print("\n--- Preview ---")
    for s in result["chapter_summaries"][:3]:
        print(f"\n{s['chapter_title']}:")
        print(s["summary"])