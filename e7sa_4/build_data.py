#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_data.py — Pipeline تجهيز داتا الإحصاء للفصل الرابع.

يقرأ:
  - simulation_data.json            (المصدر الأساسي للتحليل)
  - config.json                     (أبعاد التدفق + negativeItems + Likert choices)
  - مقاييس نهائيه/اختبار_المشكلات_الأخلاقية_البيوطبية.json (تصنيف المهارات)
  - 1 - Gradebook.csv               (المهام + التأخيرات + Is_Dropout + Team)
  - constants.json                  (dropoutIds)

ينتج:
  e7sa_4/outputs/data_final.csv
  e7sa_4/outputs/data_final.xlsx
  e7sa_4/outputs/data_final.sav
  e7sa_4/outputs/codebook.xlsx
  e7sa_4/outputs/data_log.txt

يتبع الخطة الموثقة في e7sa_4/sub_plans/03_data_preparation_pipeline.md.
"""

from __future__ import annotations

import csv
import json
import re
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
import pyreadstat

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "outputs"
OUT.mkdir(exist_ok=True)

LOG_LINES: list[str] = []


def log(msg: str) -> None:
    print(msg)
    LOG_LINES.append(msg)


# ────────────────────────── Constants ──────────────────────────

LIKERT_MAP = {
    "أبداً": 1,
    "نادراً": 2,
    "أحياناً": 3,
    "غالباً": 4,
    "دائماً": 5,
}

GROUP_MAP = {"G1": 1, "G2": 2, "G3": 3, "G4": 4}

GROUP_LABELS = {
    1: "G1: تنافسي × مفتوح",
    2: "G2: تنافسي × محدد",
    3: "G3: تشاركي × مفتوح",
    4: "G4: تشاركي × محدد",
}

PATTERN_LABELS = {1: "تنافسي", 2: "تشاركي"}
TIMING_LABELS = {1: "محدد", 2: "مفتوح"}
YN_LABELS = {0: "لا", 1: "نعم"}
DROPOUT_LABELS = {0: "نشط", 1: "منسحب"}
LATE_LABELS = {0: "في الموعد", 1: "متأخر"}

DIM_NAMES = {
    "D1": "وضوح وتحديد الأهداف",
    "D2": "مستوى النشاط والانشغال والتركيز والانتباه",
    "D3": "الشعور بالكفاءة والتحكم في الأداء",
    "D4": "التركيز الإدراكي ومعرفة الآثار الناتجة",
    "D5": "الشعور بالثقة في الأداء",
    "D6": "فقدان الوعي بالذات",
    "D7": "الشعور باستغراق الزمن",
    "D8": "الشعور باللذة والرضا والاستمتاع",
}

SKILL_ORDER = [
    "تحديد المشكلة",
    "افتراض الأسباب",
    "اختبار الفروض",
    "الوصول للحلول",
]


# ────────────────────────── Loaders ──────────────────────────

def load_sources():
    log("─── 1. قراءة المصادر ───")
    sim = json.loads((ROOT / "simulation_data.json").read_text(encoding="utf-8"))
    cfg = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
    mcq = json.loads(
        (ROOT / "مقاييس نهائيه" / "اختبار_المشكلات_الأخلاقية_البيوطبية.json").read_text(encoding="utf-8")
    )
    constants = json.loads((ROOT / "constants.json").read_text(encoding="utf-8"))

    with open(ROOT / "1 - Gradebook.csv", encoding="utf-8") as fh:
        gb = list(csv.DictReader(fh))

    log(f"  - simulation_data.json: {len(sim['students'])} طالب")
    log(f"  - config.json: {len(cfg['flow']['dimensions'])} أبعاد, {len(cfg['flow']['negativeItems'])} فقرة سلبية")
    log(f"  - MCQ instrument: {len(mcq['questions'])} سؤال, {len(mcq['skillsBreakdown'])} مهارات")
    log(f"  - Gradebook: {len(gb)} صف")
    log(f"  - dropoutIds: {len(constants['dropoutIds'])}")

    return sim, cfg, mcq, gb, constants


def integrity_checks(sim, cfg, mcq, gb, constants):
    log("\n─── 2. Integrity Checks ───")
    assert len(sim["students"]) == 96, "simulation_data.json must have 96 students"
    assert len(gb) == 96, "Gradebook must have 96 rows"
    assert len(constants["dropoutIds"]) == 16, "constants.json must list 16 dropouts"
    assert len(cfg["flow"]["dimensions"]) == 8
    assert len(cfg["flow"]["negativeItems"]) == 23
    assert len(mcq["questions"]) == 30
    # Match between dropouts in constants and gradebook Is_Dropout=نعم
    gb_dropouts = {r["ID"] for r in gb if r["Is_Dropout"].strip() == "نعم"}
    c_dropouts = set(constants["dropoutIds"])
    assert gb_dropouts == c_dropouts, f"Dropout mismatch: gb={gb_dropouts - c_dropouts}, c={c_dropouts - gb_dropouts}"
    # Each student has the right array lengths
    for s in sim["students"]:
        assert len(s["mcq_pre_correct"]) == 30
        assert len(s["mcq_post_correct"]) == 30
        assert len(s["flow_pre_responses"]) == 56
        assert len(s["flow_post_responses"]) == 56
    log("  [PASS] كل الـ integrity checks نجحت")


# ────────────────────────── Builders ──────────────────────────

def build_skill_map(mcq):
    """Return dict: question_index (0-29) -> skill_number (1-4)."""
    skill_to_num = {name: i + 1 for i, name in enumerate(SKILL_ORDER)}
    qid_to_idx = {q["id"]: q["order"] - 1 for q in mcq["questions"]}
    idx_to_skill = {}
    for skill_name, info in mcq["skillsBreakdown"].items():
        n = skill_to_num[skill_name]
        for qid in info["questionIds"]:
            idx_to_skill[qid_to_idx[qid]] = n
    assert len(idx_to_skill) == 30
    return idx_to_skill


def build_dim_map(cfg):
    """Return dict: flow_item_index (0-55) -> dim_number (1-8)."""
    idx_to_dim = {}
    for dim in cfg["flow"]["dimensions"]:
        n = int(dim["id"].replace("D", ""))
        for item_id in dim["items"]:
            idx_to_dim[item_id - 1] = n
    assert len(idx_to_dim) == 56
    return idx_to_dim


def likert_to_int(text: str) -> int | None:
    if text is None:
        return None
    t = text.strip()
    return LIKERT_MAP.get(t)


def compute_flow_scores(responses: list[str], neg_items: set[int]) -> tuple[list[int], list[int], int]:
    """
    Returns (per_item_values_after_reverse, per_dim_totals, grand_total).
    neg_items are 1-based item numbers.
    """
    vals = []
    for i, r in enumerate(responses, start=1):
        raw = likert_to_int(r)
        if raw is None:
            raise ValueError(f"Unknown Likert text at item {i}: {r!r}")
        v = (6 - raw) if i in neg_items else raw
        vals.append(v)
    return vals


def build_dataframe(sim, cfg, mcq, gb, constants):
    log("\n─── 3. بناء الـ DataFrame ───")

    skill_map = build_skill_map(mcq)
    dim_map = build_dim_map(cfg)
    neg_items = set(cfg["flow"]["negativeItems"])
    dropout_set = set(constants["dropoutIds"])
    gb_by_id = {r["ID"]: r for r in gb}

    rows = []
    # sanity verifies
    flow_score_diff_count = 0

    for s in sim["students"]:
        sid = s["id"]
        grp = GROUP_MAP[s["group"]]
        pattern = 1 if grp in (1, 2) else 2  # 1=تنافسي, 2=تشاركي
        timing = 1 if grp in (2, 4) else 2   # 1=محدد, 2=مفتوح
        is_dropout = 1 if sid in dropout_set else 0

        gb_row = gb_by_id[sid]
        # Team: "عمل فردي" → 0, "فريق N" → N
        team_txt = gb_row["Team"].strip()
        if "فردي" in team_txt:
            team = 0
        else:
            m = re.search(r"\d+", team_txt)
            team = int(m.group()) if m else 0

        row: dict = {
            "ID": sid,
            "Name": s["name"],
            "Email": s["email"],
            "Group": grp,
            "Pattern": pattern,
            "Timing": timing,
            "Team": team,
            "Is_Dropout": is_dropout,
        }

        # ── MCQ ──
        for phase, key in [("Pre", "mcq_pre_correct"), ("Post", "mcq_post_correct")]:
            corr = s[key]
            total = int(sum(corr))
            row[f"PS_{phase}_Total"] = total
            for k in range(1, 5):
                row[f"PS_{phase}_Skill{k}"] = int(sum(
                    corr[i] for i in range(30) if skill_map[i] == k
                ))
            for i in range(30):
                row[f"PS_{phase}_Q{i+1:02d}"] = int(corr[i])

        # ── Flow ──
        for phase, key in [("Pre", "flow_pre_responses"), ("Post", "flow_post_responses")]:
            vals = compute_flow_scores(s[key], neg_items)
            # per-dim totals
            dim_totals = [0] * 8
            for idx in range(56):
                d = dim_map[idx] - 1
                dim_totals[d] += vals[idx]
                row[f"Flow_{phase}_I{idx+1:02d}"] = vals[idx]
            grand = sum(dim_totals)
            assert grand == sum(vals)
            row[f"Flow_{phase}_Total"] = grand
            for k in range(1, 9):
                row[f"Flow_{phase}_D{k}"] = dim_totals[k - 1]

            # Compare with JSON score (Post only, informational)
            if phase == "Post":
                json_score = s.get("flow_post_score")
                if json_score is not None and json_score != grand:
                    flow_score_diff_count += 1

        # ── Gradebook ──
        def _num(x):
            try:
                return float(x)
            except (ValueError, TypeError):
                return 0.0

        def _late(x):
            x = (x or "").strip()
            if x == "نعم":
                return 1
            if x == "لا":
                return 0
            return np.nan  # "-" → system missing

        for k in range(1, 6):
            row[f"Task_M{k}"] = _num(gb_row[f"M{k}"])
            row[f"Late_M{k}"] = _late(gb_row[f"M{k}_Late"])

        row["Task_Bonus"] = _num(gb_row["Bonus"])
        row["Task_Total"] = _num(gb_row["Total"])
        row["Task_Percentage"] = _num(gb_row["Percentage"])
        row["Task_Grade"] = gb_row["Grade"]
        row["Late_Count"] = sum(int(row[f"Late_M{k}"]) for k in range(1, 6)
                                if not (isinstance(row[f"Late_M{k}"], float) and np.isnan(row[f"Late_M{k}"])))

        rows.append(row)

    df = pd.DataFrame(rows)
    log(f"  - DataFrame: {len(df)} صف × {len(df.columns)} عمود")
    log(f"  - Flow post scores تختلف عن JSON في {flow_score_diff_count}/96 طالب "
        "(متوقع بسبب reverse coding — نعتمد الحساب الجديد)")
    return df


def ordered_columns():
    cols = ["ID", "Name", "Email", "Group", "Pattern", "Timing", "Team", "Is_Dropout"]
    # MCQ Pre
    cols += ["PS_Pre_Total"] + [f"PS_Pre_Skill{k}" for k in range(1, 5)] + [f"PS_Pre_Q{i:02d}" for i in range(1, 31)]
    # MCQ Post
    cols += ["PS_Post_Total"] + [f"PS_Post_Skill{k}" for k in range(1, 5)] + [f"PS_Post_Q{i:02d}" for i in range(1, 31)]
    # Flow Pre
    cols += ["Flow_Pre_Total"] + [f"Flow_Pre_D{k}" for k in range(1, 9)] + [f"Flow_Pre_I{i:02d}" for i in range(1, 57)]
    # Flow Post
    cols += ["Flow_Post_Total"] + [f"Flow_Post_D{k}" for k in range(1, 9)] + [f"Flow_Post_I{i:02d}" for i in range(1, 57)]
    # Gradebook
    cols += [f"Task_M{k}" for k in range(1, 6)]
    cols += ["Task_Bonus", "Task_Total", "Task_Percentage", "Task_Grade"]
    cols += [f"Late_M{k}" for k in range(1, 6)]
    cols += ["Late_Count"]
    return cols


def validate_final(df: pd.DataFrame):
    log("\n─── 4. Post-build Validation ───")
    assert len(df) == 96
    assert df["Group"].value_counts().sort_index().tolist() == [24] * 4
    active = df[df["Is_Dropout"] == 0]
    assert len(active) == 80
    assert active["Group"].value_counts().sort_index().tolist() == [20] * 4

    # Pattern / Timing consistency
    assert (df.loc[df["Group"].isin([1, 2]), "Pattern"] == 1).all()
    assert (df.loc[df["Group"].isin([3, 4]), "Pattern"] == 2).all()
    assert (df.loc[df["Group"].isin([2, 4]), "Timing"] == 1).all()
    assert (df.loc[df["Group"].isin([1, 3]), "Timing"] == 2).all()

    # Score ranges
    assert df["PS_Post_Total"].between(0, 30).all()
    assert df["Flow_Post_Total"].between(56, 280).all()
    assert df["Late_Count"].between(0, 5).all()

    # sum of skills == total
    for phase in ("Pre", "Post"):
        s = sum(df[f"PS_{phase}_Skill{k}"] for k in range(1, 5))
        assert (s == df[f"PS_{phase}_Total"]).all(), f"PS_{phase}_Skill sum mismatch"
        s = sum(df[f"Flow_{phase}_D{k}"] for k in range(1, 9))
        assert (s == df[f"Flow_{phase}_Total"]).all(), f"Flow_{phase}_D sum mismatch"

    log("  [PASS] كل التحققات نجحت")

    # Descriptive summary for the log
    log("\n  توزيع المنسحبين حسب المجموعة:")
    drop_by_group = df[df["Is_Dropout"] == 1]["Group"].value_counts().sort_index()
    for g, n in drop_by_group.items():
        log(f"    {GROUP_LABELS[g]}: {n} منسحب")

    log("\n  متوسطات القياس البعدي (بعد استبعاد المنسحبين):")
    for dv in ("PS_Post_Total", "Flow_Post_Total", "Late_Count", "Task_Total"):
        log(f"    {dv}:")
        g = active.groupby("Group")[dv].agg(["count", "mean", "std"]).round(2)
        for idx, r in g.iterrows():
            log(f"      {GROUP_LABELS[idx]}: N={int(r['count'])}, M={r['mean']:.2f}, SD={r['std']:.2f}")


# ────────────────────────── Codebook + Metadata ──────────────────────────

def build_metadata(cfg, mcq):
    """Build variable labels and value labels dicts for export."""
    labels: dict[str, str] = {}
    value_labels: dict[str, dict] = {}
    measures: dict[str, str] = {}

    # Identifiers / categorical
    labels["ID"] = "معرّف الطالب"
    labels["Name"] = "اسم الطالب"
    labels["Email"] = "البريد الإلكتروني"
    labels["Group"] = "المجموعة التجريبية"
    labels["Pattern"] = "نمط حشد المصادر"
    labels["Timing"] = "زمن حشد المصادر"
    labels["Team"] = "الفرقة (للمجموعات التشاركية)"
    labels["Is_Dropout"] = "منسحب"

    value_labels["Group"] = GROUP_LABELS
    value_labels["Pattern"] = PATTERN_LABELS
    value_labels["Timing"] = TIMING_LABELS
    value_labels["Is_Dropout"] = DROPOUT_LABELS
    value_labels["Team"] = {0: "عمل فردي", 1: "فريق 1", 2: "فريق 2", 3: "فريق 3",
                            4: "فريق 4", 5: "فريق 5", 6: "فريق 6"}

    for v in ["ID", "Name", "Email"]:
        measures[v] = "nominal"
    for v in ["Group", "Pattern", "Timing", "Team", "Is_Dropout"]:
        measures[v] = "nominal"

    # MCQ Totals & Skills
    skill_names = {1: "تحديد المشكلة", 2: "افتراض الأسباب", 3: "اختبار الفروض", 4: "الوصول للحلول"}
    for phase, phase_ar in [("Pre", "القبلي"), ("Post", "البعدي")]:
        labels[f"PS_{phase}_Total"] = f"حل المشكلات — {phase_ar} (الدرجة الكلية)"
        measures[f"PS_{phase}_Total"] = "scale"
        for k in range(1, 5):
            labels[f"PS_{phase}_Skill{k}"] = f"حل المشكلات — {phase_ar} — {skill_names[k]}"
            measures[f"PS_{phase}_Skill{k}"] = "scale"
        for i in range(1, 31):
            col = f"PS_{phase}_Q{i:02d}"
            labels[col] = f"حل المشكلات — {phase_ar} — السؤال {i}"
            value_labels[col] = {0: "خطأ", 1: "صح"}
            measures[col] = "nominal"

    # Flow totals / dims / items
    for phase, phase_ar in [("Pre", "القبلي"), ("Post", "البعدي")]:
        labels[f"Flow_{phase}_Total"] = f"التدفق الذهني — {phase_ar} (الدرجة الكلية)"
        measures[f"Flow_{phase}_Total"] = "scale"
        for k in range(1, 9):
            labels[f"Flow_{phase}_D{k}"] = f"التدفق — {phase_ar} — البعد {k}: {DIM_NAMES[f'D{k}']}"
            measures[f"Flow_{phase}_D{k}"] = "scale"
        for i in range(1, 57):
            col = f"Flow_{phase}_I{i:02d}"
            labels[col] = f"التدفق — {phase_ar} — الفقرة {i} (بعد العكس)"
            value_labels[col] = {1: "تدفق منخفض (1)", 2: "(2)", 3: "متوسط (3)", 4: "(4)", 5: "تدفق عالٍ (5)"}
            measures[col] = "ordinal"

    # Gradebook
    for k in range(1, 6):
        labels[f"Task_M{k}"] = f"درجة المهمة {k} (0–100)"
        measures[f"Task_M{k}"] = "scale"
        labels[f"Late_M{k}"] = f"تأخر تسليم المهمة {k}"
        value_labels[f"Late_M{k}"] = LATE_LABELS
        measures[f"Late_M{k}"] = "nominal"

    labels["Task_Bonus"] = "نقاط إضافية"
    labels["Task_Total"] = "إجمالي درجات المهام (0–500)"
    labels["Task_Percentage"] = "النسبة المئوية للمهام"
    labels["Task_Grade"] = "التقدير الحرفي"
    labels["Late_Count"] = "عدد التأخيرات (0–5) — Manipulation Check"
    for v in ["Task_Bonus", "Task_Total", "Task_Percentage", "Late_Count"]:
        measures[v] = "scale"
    measures["Task_Grade"] = "ordinal"

    return labels, value_labels, measures


def write_codebook(df: pd.DataFrame, labels, value_labels, measures, path: Path):
    rows = []
    for col in df.columns:
        if col in ("ID", "Name", "Email", "Task_Grade"):
            typ = "String"
        elif pd.api.types.is_numeric_dtype(df[col]):
            typ = "Numeric"
        else:
            typ = "String"
        vl = value_labels.get(col, {})
        vl_txt = "; ".join(f'{k}="{v}"' for k, v in vl.items()) if vl else ""
        rows.append({
            "Variable": col,
            "Label": labels.get(col, ""),
            "Type": typ,
            "Measure": measures.get(col, "scale"),
            "Min": df[col].min() if typ == "Numeric" else "",
            "Max": df[col].max() if typ == "Numeric" else "",
            "Values": vl_txt,
            "Missing": "SYSMIS" if df[col].isna().any() else "",
        })
    cb = pd.DataFrame(rows)
    with pd.ExcelWriter(path, engine="openpyxl") as xw:
        cb.to_excel(xw, index=False, sheet_name="codebook")
    log(f"  ✅ codebook.xlsx   ({path.stat().st_size/1024:.1f} KB)")


# ────────────────────────── Exporters ──────────────────────────

def export_all(df: pd.DataFrame, labels, value_labels, measures):
    log("\n─── 5. التصدير ───")
    # Reorder columns
    df = df[ordered_columns()].copy()

    # ── CSV ──
    csv_path = OUT / "data_final.csv"
    df.to_csv(csv_path, index=False, encoding="utf-8-sig")
    log(f"  ✅ data_final.csv   ({csv_path.stat().st_size/1024:.1f} KB)")

    # ── XLSX ──
    xlsx_path = OUT / "data_final.xlsx"
    with pd.ExcelWriter(xlsx_path, engine="openpyxl") as xw:
        df.to_excel(xw, sheet_name="data", index=False, freeze_panes=(1, 1))
    log(f"  ✅ data_final.xlsx  ({xlsx_path.stat().st_size/1024:.1f} KB)")

    # ── SAV (SPSS) ──
    sav_path = OUT / "data_final.sav"

    # SPSS variable names: max 8 chars for strict, up to 64 for modern. pyreadstat is fine with our names.
    # Build column-labels dict matching columns actually in df
    col_labels = {c: labels.get(c, "") for c in df.columns if c in labels}
    vlabels = {c: value_labels[c] for c in df.columns if c in value_labels}
    # pyreadstat expects variable_value_labels where keys match exactly. Integer keys for numeric vars.
    # Convert Task_Grade value labels absent → skip
    # Ensure numeric value label keys are ints
    vlabels_clean = {}
    for c, m in vlabels.items():
        if c == "Task_Grade":
            continue
        vlabels_clean[c] = {int(k): v for k, v in m.items()}

    # Measure mapping
    measure_clean = {c: measures.get(c, "scale") for c in df.columns}

    # Ensure integer dtypes for ints so SPSS treats them as F-format integers.
    int_cols = [c for c in df.columns if c not in ("ID", "Name", "Email", "Task_Grade")]
    for c in int_cols:
        if df[c].dtype == object:
            continue
        if df[c].isna().any():
            continue  # keep as float for SYSMIS
        if np.allclose(df[c].dropna() % 1, 0):
            try:
                df[c] = df[c].astype("int64")
            except Exception:
                pass

    pyreadstat.write_sav(
        df,
        str(sav_path),
        column_labels=[col_labels.get(c, "") for c in df.columns],
        variable_value_labels=vlabels_clean,
        variable_measure=measure_clean,
        file_label="e7sa_4 — داتا الفصل الرابع (رسالة الماجستير)",
    )
    log(f"  ✅ data_final.sav   ({sav_path.stat().st_size/1024:.1f} KB)")

    # ── Codebook ──
    write_codebook(df, labels, value_labels, measures, OUT / "codebook.xlsx")


# ────────────────────────── Main ──────────────────────────

def main():
    start = datetime.now()
    log(f"╔══════════════════════════════════════════════════════")
    log(f"║ build_data.py — تجهيز داتا الفصل الرابع")
    log(f"║ بدأ: {start:%Y-%m-%d %H:%M:%S}")
    log(f"╚══════════════════════════════════════════════════════\n")

    sim, cfg, mcq, gb, constants = load_sources()
    integrity_checks(sim, cfg, mcq, gb, constants)
    df = build_dataframe(sim, cfg, mcq, gb, constants)
    validate_final(df)
    labels, value_labels, measures = build_metadata(cfg, mcq)
    export_all(df, labels, value_labels, measures)

    end = datetime.now()
    log(f"\n─── انتهى بنجاح في {(end-start).total_seconds():.1f} ثانية ───")

    log_path = OUT / "data_log.txt"
    log_path.write_text("\n".join(LOG_LINES), encoding="utf-8")
    print(f"\n📝 data_log.txt   ({log_path.stat().st_size/1024:.1f} KB)")


if __name__ == "__main__":
    main()
