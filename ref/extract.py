#!/usr/bin/env python3
"""Extract all quiz data from testpass.examsaathi.site API."""
import json, os, time, urllib.request, urllib.error

BASE = "https://testpass.examsaathi.site"
OUT = os.path.join(os.path.dirname(__file__), "quiz_data.json")

def fetch(url):
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read())
        except Exception as e:
            if attempt == 2:
                print(f"  FAILED: {url} -> {e}")
                return None
            time.sleep(1)

def main():
    result = {"categories": [], "series": {}, "subjects": {}, "tests": {}, "questions": {}}

    cats = fetch(f"{BASE}/api/exam-categories")
    if not cats:
        print("Failed to fetch categories")
        return
    result["categories"] = cats.get("data", [])
    print(f"Categories: {len(result['categories'])}")

    for ci, cat in enumerate(result["categories"]):
        eid = cat["exam_id"]
        print(f"[{ci+1}/{len(result['categories'])}] Category: {cat['exam_name']} (id={eid})")
        series = fetch(f"{BASE}/api/exam-categories/{eid}/test-series")
        if not series:
            continue
        result["series"][eid] = series.get("data", [])

        for s in series.get("data", []):
            sid = s["id"]
            subjects = fetch(f"{BASE}/api/test-series/{sid}/subjects")
            if not subjects:
                continue
            result["subjects"][sid] = subjects.get("data", [])

            for sub in subjects.get("data", []):
                suid = sub["subject_id"]
                tests = fetch(f"{BASE}/api/test-series/{sid}/subjects/{suid}/tests")
                if not tests:
                    continue
                result["tests"][f"{sid}_{suid}"] = tests.get("data", [])

                for t in tests.get("data", []):
                    tid = t["id"]
                    for lang in ["english", "hindi"]:
                        key = f"{tid}_{lang}"
                        if key in result["questions"]:
                            continue
                        # Try fetching the paper
                        paper = fetch(f"{BASE}/api/tests/{tid}/paper?lang={lang}")
                        if paper:
                            result["questions"][key] = paper
                        time.sleep(0.1)

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"\nDone! Saved to {OUT}")
    print(f"  Categories: {len(result['categories'])}")
    print(f"  Series: {sum(len(v) for v in result['series'].values())}")
    print(f"  Subjects: {sum(len(v) for v in result['subjects'].values())}")
    print(f"  Tests: {sum(len(v) for v in result['tests'].values())}")
    print(f"  Question papers: {len(result['questions'])}")

if __name__ == "__main__":
    main()
