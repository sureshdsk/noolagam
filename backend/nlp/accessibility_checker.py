"""
accessibility_checker.py

Scans one Tamil EPUB, or a whole folder of them, and checks for common
accessibility problems:
  1. Images missing alt-text
  2. Missing/incorrect language tags
  3. Broken heading hierarchy (e.g. jumping from H1 straight to H4)
  4. Tables without proper header cells (<th>)

Usage (from Command Prompt, inside your project folder):

    Check a single EPUB:
        python accessibility_checker.py "deiva_yaanai.epub"

    Check every EPUB in a folder:
        python accessibility_checker.py "C:\\Users\\Padma Priya R\\Books"

Output:
    - A readable summary printed to the terminal
    - A JSON file named accessibility_report.json saved in the same folder
      you ran the script from, with full details for every book checked
"""

import sys
import os
import json
import re
from ebooklib import epub, ITEM_DOCUMENT
from bs4 import BeautifulSoup


def check_images_for_alt_text(soup):
    """Return a list of problems found with <img> tags in this file."""
    issues = []
    images = soup.find_all("img")
    for img in images:
        alt = img.get("alt", "").strip()
        src = img.get("src", "unknown image")
        if not alt:
            issues.append(f"Image '{src}' is missing alt-text")
    return issues


def check_language_tag(soup, filename):
    """Return a list of problems found with the lang attribute."""
    issues = []
    html_tag = soup.find("html")
    if html_tag is None:
        issues.append(f"{filename}: no <html> tag found, cannot check language")
        return issues

    lang = html_tag.get("lang") or html_tag.get("xml:lang")
    if not lang:
        issues.append(f"{filename}: missing lang attribute on <html> tag")
    elif not lang.lower().startswith("ta") and not lang.lower().startswith("en"):
        # Flag anything that isn't Tamil or English as worth double-checking
        issues.append(f"{filename}: unexpected language tag '{lang}' (expected 'ta' or 'en')")
    return issues


def check_heading_hierarchy(soup, filename):
    """Return a list of problems where heading levels jump (e.g. H1 -> H4)."""
    issues = []
    headings = soup.find_all(re.compile(r"^h[1-6]$"))
    last_level = 0
    for heading in headings:
        level = int(heading.name[1])
        if last_level != 0 and level > last_level + 1:
            text_preview = heading.get_text(strip=True)[:40]
            issues.append(
                f"{filename}: heading jumps from H{last_level} to H{level} "
                f"at '{text_preview}'"
            )
        last_level = level
    return issues


def check_tables(soup, filename):
    """Return a list of problems where tables don't use proper header cells."""
    issues = []
    tables = soup.find_all("table")
    for i, table in enumerate(tables, start=1):
        headers = table.find_all("th")
        if not headers:
            issues.append(
                f"{filename}: table #{i} has no <th> header cells "
                f"(screen readers can't announce column meaning)"
            )
    return issues


def check_epub(filepath):
    """Run all accessibility checks on a single EPUB file."""
    book_name = os.path.basename(filepath)
    print(f"\nChecking: {book_name}")

    result = {
        "book": book_name,
        "path": filepath,
        "issues": [],
        "files_checked": 0,
    }

    try:
        book = epub.read_epub(filepath)
    except Exception as e:
        result["issues"].append(f"Could not open EPUB: {e}")
        print(f"  ERROR: could not open this EPUB ({e})")
        return result

    # Check overall book-level language metadata
    book_lang = book.get_metadata("DC", "language")
    if not book_lang:
        result["issues"].append("Book metadata is missing a language declaration")

    for item in book.get_items_of_type(ITEM_DOCUMENT):
        filename = item.get_name()
        result["files_checked"] += 1
        try:
            soup = BeautifulSoup(item.get_content(), "html.parser")
        except Exception as e:
            result["issues"].append(f"{filename}: could not parse content ({e})")
            continue

        result["issues"].extend(check_images_for_alt_text(soup))
        result["issues"].extend(check_language_tag(soup, filename))
        result["issues"].extend(check_heading_hierarchy(soup, filename))
        result["issues"].extend(check_tables(soup, filename))

    # Print a short summary right away for this book
    if result["issues"]:
        print(f"  Found {len(result['issues'])} issue(s):")
        for issue in result["issues"]:
            print(f"    - {issue}")
    else:
        print("  No accessibility issues found!")

    return result


def find_epub_files(path):
    """Given a file or folder path, return a list of .epub files to check."""
    if os.path.isfile(path):
        if path.lower().endswith(".epub"):
            return [path]
        else:
            print(f"'{path}' is not an .epub file.")
            return []
    elif os.path.isdir(path):
        epub_files = []
        for filename in os.listdir(path):
            if filename.lower().endswith(".epub"):
                epub_files.append(os.path.join(path, filename))
        if not epub_files:
            print(f"No .epub files found in folder '{path}'.")
        return epub_files
    else:
        print(f"Path '{path}' does not exist.")
        return []


def main():
    if len(sys.argv) < 2:
        print("Usage: python accessibility_checker.py <epub_file_or_folder>")
        sys.exit(1)

    target_path = sys.argv[1]
    epub_files = find_epub_files(target_path)

    if not epub_files:
        sys.exit(1)

    all_results = []
    for filepath in epub_files:
        result = check_epub(filepath)
        all_results.append(result)

    # Print an overall summary across all books
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    total_issues = 0
    for result in all_results:
        issue_count = len(result["issues"])
        total_issues += issue_count
        status = "PASS" if issue_count == 0 else f"{issue_count} issue(s)"
        print(f"  {result['book']}: {status}")
    print(f"\nTotal books checked: {len(all_results)}")
    print(f"Total issues found: {total_issues}")

    # Save full details to a JSON report
    report_path = "accessibility_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
    print(f"\nFull report saved to: {report_path}")


if __name__ == "__main__":
    main()