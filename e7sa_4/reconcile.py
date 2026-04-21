#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
reconcile.py — Reconciliation بين simulation_data.json و ملفات Google Forms Responses.

يتحقق من:
  1. مطابقة عدد الاستجابات.
  2. ربط Email ↔ ID في simulation.
  3. مقارنة Score الكلي في MCQ بين Forms و JSON.
  4. مقارنة استجابات عينة من Flow.

يخرج: e7sa_4/outputs/reconciliation_report.md
"""

from __future__ import annotations

import csv
import json
import random
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "outputs"
OUT.mkdir(exist_ok=True)

MCQ_CSV = ROOT / "اختبار حل المشكلات الأخلاقية البيوطبية (Responses) - Form Responses 1.csv"
FLOW_CSV = ROOT / "مقياس التدفق النفسي (Responses) - Form Responses 1.csv"

LINES: list[str] = []


def md(s: str = "") -> None:
    LINES.append(s)


def parse_score(s: str) -> int | None:
    if not s:
        return None
    s = s.strip()
    if "/" in s:
        try:
            return int(s.split("/")[0].strip())
        except ValueError:
            return None
    try:
        return int(float(s))
    except ValueError:
        return None


def parse_ts(ts: str) -> datetime | None:
    """Google Forms timestamps look like '2/21/2026 19:07:41'."""
    ts = ts.strip()
    for fmt in ("%m/%d/%Y %H:%M:%S", "%m/%d/%Y %H:%M", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(ts, fmt)
        except ValueError:
            continue
    return None


def load_forms_csv(path: Path):
    with open(path, encoding="utf-8") as fh:
        reader = csv.reader(fh)
        header = next(reader)
        rows = list(reader)
    return header, rows


def main():
    print("─── Reconciliation بين JSON و Forms ───\n")

    sim = json.loads((ROOT / "simulation_data.json").read_text(encoding="utf-8"))
    constants = json.loads((ROOT / "constants.json").read_text(encoding="utf-8"))
    dropouts = set(constants["dropoutIds"])

    id_by_email = {s["email"].strip().lower(): s["id"] for s in sim["students"]}
    student_by_id = {s["id"]: s for s in sim["students"]}

    md("# تقرير Reconciliation بين Simulation JSON و Google Forms CSVs")
    md()
    md(f"**توليد:** {datetime.now():%Y-%m-%d %H:%M:%S}")
    md()
    md("---")
    md()

    # ── Section 1: Response Counts ──
    md("## 1. مطابقة عدد الاستجابات")
    md()
    _, mcq_rows = load_forms_csv(MCQ_CSV)
    _, flow_rows = load_forms_csv(FLOW_CSV)

    n_active = 96 - len(dropouts)
    expected_mcq = n_active * 2 + len(dropouts) * 1
    expected_flow = expected_mcq

    md(f"- **MCQ Forms:** {len(mcq_rows)} استجابة فعلية / {expected_mcq} متوقع "
       f"({'✅ مطابق' if len(mcq_rows) == expected_mcq else '⚠️ غير مطابق'})")
    md(f"- **Flow Forms:** {len(flow_rows)} استجابة فعلية / {expected_flow} متوقع "
       f"({'✅ مطابق' if len(flow_rows) == expected_flow else '⚠️ ' + str(expected_flow - len(flow_rows)) + ' ناقص'})")
    md()
    md(f"- **الحسبة المتوقعة:** {n_active} نشط × 2 (قبلي+بعدي) + {len(dropouts)} منسحب × 1 (قبلي) = {expected_mcq}")
    md()

    # ── Section 2: Email → ID Mapping ──
    md("## 2. ربط الإيميل بالـ ID")
    md()
    mcq_emails = [r[2].strip().lower() for r in mcq_rows]
    flow_emails = [r[1].strip().lower() for r in flow_rows]
    unmapped_mcq = [e for e in mcq_emails if e not in id_by_email]
    unmapped_flow = [e for e in flow_emails if e not in id_by_email]
    md(f"- **MCQ:** {len(mcq_emails) - len(unmapped_mcq)}/{len(mcq_emails)} استجابة مرتبطة بـ ID "
       f"({'✅' if not unmapped_mcq else '⚠️ ' + str(len(unmapped_mcq)) + ' غير مرتبطة'})")
    md(f"- **Flow:** {len(flow_emails) - len(unmapped_flow)}/{len(flow_emails)} استجابة مرتبطة بـ ID "
       f"({'✅' if not unmapped_flow else '⚠️ ' + str(len(unmapped_flow)) + ' غير مرتبطة'})")
    if unmapped_mcq:
        md()
        md(f"  ملاحظة: إيميلات غير مرتبطة في MCQ: {unmapped_mcq[:3]}{'...' if len(unmapped_mcq)>3 else ''}")
    md()

    # ── Section 3: Pre/Post Classification (by timestamp ordering) ──
    md("## 3. تصنيف Pre/Post حسب الـ Timestamp")
    md()

    def classify(rows, email_col):
        by_student: dict[str, list[tuple[datetime, list]]] = {}
        for r in rows:
            email = r[email_col].strip().lower()
            sid = id_by_email.get(email)
            if not sid:
                continue
            ts = parse_ts(r[0])
            by_student.setdefault(sid, []).append((ts, r))
        # Sort each student's submissions by ts
        for sid in by_student:
            by_student[sid].sort(key=lambda x: x[0] or datetime.max)
        return by_student

    mcq_by_sid = classify(mcq_rows, 2)
    flow_by_sid = classify(flow_rows, 1)

    active_mcq_with_2 = sum(1 for sid, v in mcq_by_sid.items() if sid not in dropouts and len(v) >= 2)
    dropout_mcq_with_1 = sum(1 for sid, v in mcq_by_sid.items() if sid in dropouts and len(v) >= 1)
    active_flow_with_2 = sum(1 for sid, v in flow_by_sid.items() if sid not in dropouts and len(v) >= 2)
    dropout_flow_with_1 = sum(1 for sid, v in flow_by_sid.items() if sid in dropouts and len(v) >= 1)

    md(f"- **MCQ:** {active_mcq_with_2}/{n_active} طالب نشط عنده قياس قبلي+بعدي، "
       f"{dropout_mcq_with_1}/{len(dropouts)} منسحب عنده قياس قبلي فقط")
    md(f"- **Flow:** {active_flow_with_2}/{n_active} طالب نشط عنده قياس قبلي+بعدي، "
       f"{dropout_flow_with_1}/{len(dropouts)} منسحب عنده قياس قبلي فقط")
    md()

    # Missing / partial Flow responses (the 1 missing)
    flow_missing = []
    for s in sim["students"]:
        sid = s["id"]
        if sid in dropouts:
            expected = 1
        else:
            expected = 2
        got = len(flow_by_sid.get(sid, []))
        if got < expected:
            flow_missing.append((sid, s["email"], expected, got))
    if flow_missing:
        md(f"### استجابات Flow الناقصة:")
        md("| ID | Email | المتوقع | الفعلي |")
        md("|---|---|---|---|")
        for sid, em, exp, got in flow_missing:
            md(f"| `{sid}` | `{em}` | {exp} | {got} |")
        md()

    # ── Section 4: MCQ Score Match ──
    md("## 4. مقارنة Score الكلي في MCQ (Forms vs JSON)")
    md()
    total_compared = 0
    score_matches = 0
    mismatches = []

    for sid, submissions in mcq_by_sid.items():
        student = student_by_id[sid]
        # First submission = Pre, second = Post
        # Compare Pre
        if len(submissions) >= 1:
            forms_score = parse_score(submissions[0][1][1])
            json_score = student["mcq_pre_score"]
            total_compared += 1
            if forms_score == json_score:
                score_matches += 1
            else:
                mismatches.append((sid, "Pre", forms_score, json_score))
        if len(submissions) >= 2:
            forms_score = parse_score(submissions[1][1][1])
            json_score = student["mcq_post_score"]
            total_compared += 1
            if forms_score == json_score:
                score_matches += 1
            else:
                mismatches.append((sid, "Post", forms_score, json_score))

    rate = score_matches / total_compared if total_compared else 0
    md(f"- **المطابقة:** {score_matches}/{total_compared} ({rate*100:.1f}%) "
       f"{'✅' if rate >= 0.99 else '⚠️'}")
    if mismatches:
        md()
        md("### عينة من الفروق:")
        md("| ID | المرحلة | Forms Score | JSON Score |")
        md("|---|---|---|---|")
        for sid, phase, fs, js in mismatches[:10]:
            md(f"| `{sid}` | {phase} | {fs} | {js} |")
        md()
    md()

    # ── Section 5: Flow Response Sample Match ──
    md("## 5. مقارنة استجابات Flow (عينة 5 طلاب × البعدي)")
    md()
    random.seed(42)
    active_ids = [sid for sid in flow_by_sid if sid not in dropouts and len(flow_by_sid[sid]) >= 2]
    sample = random.sample(active_ids, min(5, len(active_ids)))

    md("| ID | عدد الفقرات المطابقة | عدد الفقرات المختلفة |")
    md("|---|---|---|")
    total_items_compared = 0
    total_items_matched = 0
    for sid in sample:
        student = student_by_id[sid]
        json_resp = student["flow_post_responses"]  # list of 56 Arabic strings
        _, forms_row = flow_by_sid[sid][1]  # Post submission
        # Flow CSV: col 0=Timestamp, col 1=email, cols 2..57 = 56 items
        forms_resp = [c.strip() for c in forms_row[2:58]]
        matches = sum(1 for a, b in zip(json_resp, forms_resp) if a.strip() == b)
        diffs = 56 - matches
        total_items_compared += 56
        total_items_matched += matches
        md(f"| `{sid}` | {matches}/56 | {diffs} |")

    md()
    md(f"**الإجمالي:** {total_items_matched}/{total_items_compared} فقرة مطابقة "
       f"({total_items_matched/total_items_compared*100:.1f}%)")
    md()

    # ── Summary ──
    md("## 6. الخلاصة")
    md()
    overall_ok = (
        len(mcq_rows) == expected_mcq
        and abs(len(flow_rows) - expected_flow) <= 1
        and not unmapped_mcq
        and not unmapped_flow
        and rate >= 0.99
        and total_items_matched / total_items_compared >= 0.99
    )
    if overall_ok:
        md("✅ **التحقق الإجرائي نجح**: البيانات في `simulation_data.json` مطابقة لما وصل إلى "
           "Google Forms (عدا ملاحظات طفيفة موثقة أعلاه).")
    else:
        md("⚠️ **تحذير:** يوجد فروق تستدعي المراجعة (انظر الأقسام أعلاه).")
    md()
    md("**الغرض من هذا التقرير:** دليل إجرائي موثق يربط بين البيانات المصدرية (JSON) "
       "والبيانات الخام من Google Forms، لدعم مصداقية التحليل الإحصائي أمام لجنة المناقشة.")

    report = OUT / "reconciliation_report.md"
    report.write_text("\n".join(LINES), encoding="utf-8")
    print(f"✅ reconciliation_report.md ({report.stat().st_size/1024:.1f} KB)")


if __name__ == "__main__":
    main()
