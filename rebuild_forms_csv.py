#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
rebuild_forms_csv.py — إعادة بناء ملفات CSV الخاصة بـ Google Forms
من simulation_data.json المحدّث.

يقرأ:
  - simulation_data.json (البيانات المحدّثة)
  - config.json (أسماء الأسئلة والخيارات)
  - الملفات القديمة (للحفاظ على نفس Headers)

ينتج:
  - اختبار حل المشكلات... (Responses) - Form Responses 1.csv
  - مقياس التدفق النفسي (Responses) - Form Responses 1.csv
"""

import csv
import json
import os
import random
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent

# === Paths ===
SIM_DATA = ROOT / "simulation_data.json"
CONFIG = ROOT / "config.json"
MCQ_CSV = ROOT / "اختبار حل المشكلات الأخلاقية البيوطبية (Responses) - Form Responses 1.csv"
FLOW_CSV = ROOT / "مقياس التدفق النفسي (Responses) - Form Responses 1.csv"


CONSTANTS = ROOT / "constants.json"


def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def get_dropout_ids():
    """Load dropout IDs from constants.json."""
    constants = load_json(CONSTANTS)
    return set(constants.get("dropoutIds", []))


def read_existing_header(csv_path):
    """Read header from existing CSV to preserve exact column names."""
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        return next(reader)


def generate_timestamps(n_rows, base_date="2/21/2026", start_hour=19):
    """Generate realistic-looking timestamps."""
    timestamps = []
    current = datetime(2026, 2, 21, start_hour, 0, 0)
    for i in range(n_rows):
        offset = timedelta(minutes=random.randint(2, 8), seconds=random.randint(0, 59))
        current += offset
        ts = current.strftime("%-m/%-d/%Y %-H:%M:%S")
        timestamps.append(ts)
    return timestamps


def rebuild_mcq_csv():
    """Rebuild MCQ CSV from simulation_data.json."""
    print("🔄 إعادة بناء CSV اختبار حل المشكلات...")
    
    sim = load_json(SIM_DATA)
    config = load_json(CONFIG)
    
    # Read existing header
    header = read_existing_header(MCQ_CSV)
    # header: [Timestamp, Score, Email, Q1, Q2, ..., Q30]
    
    students = sim["students"]
    dropout_ids = get_dropout_ids()
    
    # Get MCQ questions from config to map answer indices to text
    mcq_questions = config.get("questions", [])
    
    rows = []
    
    for student in students:
        email = student["email"]
        student_id = student.get("id", "")
        is_dropout = student_id in dropout_ids
        
        # Pre-test response
        pre_responses = student.get("mcq_pre_responses", [])
        pre_score = student.get("mcq_pre_score", 0)
        total_questions = len(mcq_questions) if mcq_questions else 30
        
        pre_row = [""] * len(header)  # Start with empty
        pre_row[0] = ""  # Timestamp - will be set later
        pre_row[1] = f"{pre_score} / {total_questions}"
        pre_row[2] = email
        
        # Fill in answers
        for q_idx, resp in enumerate(pre_responses):
            if q_idx + 3 < len(header):
                # resp is the index of chosen option (0-based)
                if mcq_questions and q_idx < len(mcq_questions):
                    choices = mcq_questions[q_idx].get("choices", [])
                    if isinstance(resp, int) and resp < len(choices):
                        pre_row[q_idx + 3] = choices[resp]
                    else:
                        pre_row[q_idx + 3] = str(resp)
                else:
                    pre_row[q_idx + 3] = str(resp)
        
        rows.append(("pre", pre_row, email))
        
        # Post-test response (only for non-dropouts)
        if not is_dropout:
            post_responses = student.get("mcq_post_responses", [])
            post_score = student.get("mcq_post_score", 0)
            
            post_row = [""] * len(header)
            post_row[0] = ""  # Timestamp
            post_row[1] = f"{post_score} / {total_questions}"
            post_row[2] = email
            
            for q_idx, resp in enumerate(post_responses):
                if q_idx + 3 < len(header):
                    if mcq_questions and q_idx < len(mcq_questions):
                        choices = mcq_questions[q_idx].get("choices", [])
                        if isinstance(resp, int) and resp < len(choices):
                            post_row[q_idx + 3] = choices[resp]
                        else:
                            post_row[q_idx + 3] = str(resp)
                    else:
                        post_row[q_idx + 3] = str(resp)
            
            rows.append(("post", post_row, email))
    
    # Sort: all pre first, then all post (simulating test administration)
    pre_rows = [r for r in rows if r[0] == "pre"]
    post_rows = [r for r in rows if r[0] == "post"]
    
    # Shuffle within each phase for realism
    random.shuffle(pre_rows)
    random.shuffle(post_rows)
    
    all_rows = pre_rows + post_rows
    
    # Assign timestamps
    timestamps = generate_timestamps(len(all_rows))
    for i, (phase, row, email) in enumerate(all_rows):
        row[0] = timestamps[i]
    
    # Write CSV
    with open(MCQ_CSV, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(header)
        for phase, row, email in all_rows:
            writer.writerow(row)
    
    print(f"  ✅ تم كتابة {len(all_rows)} صف ({len(pre_rows)} قبلي + {len(post_rows)} بعدي)")


def rebuild_flow_csv():
    """Rebuild Flow CSV from simulation_data.json."""
    print("🔄 إعادة بناء CSV مقياس التدفق النفسي...")
    
    sim = load_json(SIM_DATA)
    config = load_json(CONFIG)
    
    # Read existing header
    header = read_existing_header(FLOW_CSV)
    # header: [Timestamp, Email, Item1, Item2, ..., Item56]
    
    students = sim["students"]
    dropout_ids = get_dropout_ids()
    
    # Likert choices from config (ordered 1=دائماً to 5=أبداً)
    flow_config = config.get("flow", {})
    likert_choices = flow_config.get("choices", ["دائماً", "غالباً", "أحياناً", "نادراً", "أبداً"])
    
    rows = []
    
    for student in students:
        email = student["email"]
        student_id = student.get("id", "")
        is_dropout = student_id in dropout_ids
        
        # Pre-test
        pre_responses = student.get("flow_pre_responses", [])
        
        pre_row = [""] * len(header)
        pre_row[0] = ""  # Timestamp
        pre_row[1] = email
        
        for q_idx, resp in enumerate(pre_responses):
            if q_idx + 2 < len(header):
                # resp is 1-5 Likert value, convert to text
                if isinstance(resp, int) and 1 <= resp <= len(likert_choices):
                    pre_row[q_idx + 2] = likert_choices[resp - 1]
                else:
                    pre_row[q_idx + 2] = str(resp)
        
        rows.append(("pre", pre_row, email))
        
        # Post-test (only for non-dropouts)
        if not is_dropout:
            post_responses = student.get("flow_post_responses", [])
            
            post_row = [""] * len(header)
            post_row[0] = ""  # Timestamp
            post_row[1] = email
            
            for q_idx, resp in enumerate(post_responses):
                if q_idx + 2 < len(header):
                    if isinstance(resp, int) and 1 <= resp <= len(likert_choices):
                        post_row[q_idx + 2] = likert_choices[resp - 1]
                    else:
                        post_row[q_idx + 2] = str(resp)
            
            rows.append(("post", post_row, email))
    
    # Sort: all pre first, then all post
    pre_rows = [r for r in rows if r[0] == "pre"]
    post_rows = [r for r in rows if r[0] == "post"]
    
    random.shuffle(pre_rows)
    random.shuffle(post_rows)
    
    all_rows = pre_rows + post_rows
    
    # Assign timestamps
    timestamps = generate_timestamps(len(all_rows), start_hour=20)
    for i, (phase, row, email) in enumerate(all_rows):
        row[0] = timestamps[i]
    
    # Write CSV
    with open(FLOW_CSV, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(header)
        for phase, row, email in all_rows:
            writer.writerow(row)
    
    print(f"  ✅ تم كتابة {len(all_rows)} صف ({len(pre_rows)} قبلي + {len(post_rows)} بعدي)")


if __name__ == "__main__":
    random.seed(42)  # For reproducibility
    print("=" * 50)
    print("📋 إعادة بناء ملفات Google Forms CSV")
    print("=" * 50)
    
    rebuild_mcq_csv()
    print()
    rebuild_flow_csv()
    
    print()
    print("✅ تم إعادة بناء جميع ملفات CSV بنجاح!")
