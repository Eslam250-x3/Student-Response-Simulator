# -*- coding: utf-8 -*-
"""
سكربت تحويل الفصل الثالث من TXT عادي إلى صيغة مُجهَّزة للتنسيق (علامات # و ##، جداول بأنابيب)
للاستخدام مع سكربت python-docx لإنتاج ملف وورد منسق.
"""
import re
import os

def is_separator(line):
    """هل السطر فاصل (==== أو ---)؟"""
    s = line.strip()
    if not s:
        return False
    return all(c in '=\\-' for c in s) and len(s) >= 10

def is_main_section_title(line):
    """هل السطر عنوان قسم رئيسي (أولاً:، ثانياً:، ...، المرحلة الأولى:، ...)؟"""
    s = line.strip()
    if not s:
        return False
    patterns = [
        r'^أولاً:',
        r'^ثانياً:',
        r'^ثالثاً:',
        r'^رابعاً:',
        r'^خامساً:',
        r'^سادساً:',
        r'^سابعاً:',
        r'^المرحلة الأولى:',
        r'^المرحلة الثانية:',
        r'^المرحلة الثالثة:',
        r'^المرحلة الرابعة:',
        r'^المرحلة الخامسة:',
        r'^المرحلة السادسة:',
    ]
    return any(re.match(p, s) for p in patterns)

def is_scenario_title(line):
    """هل السطر عنوان سيناريو (--- سيناريو المجموعة ... ---)؟"""
    s = line.strip()
    return s.startswith('--- سيناريو المجموعة') and s.endswith('---')

def is_table_start(line):
    """هل السطر بداية جدول (جدول (N))؟"""
    return re.match(r'^جدول\s*\(\s*\d+\s*\)', line.strip())

def split_table_row(line):
    """تقسيم صف الجدول بالتبويب (واحد أو أكثر) وإرجاع قائمة الخلايا."""
    return [c.strip() for c in re.split(r'\t+', line)]

def is_continuation_line(line, prev_row):
    """هل السطر تكملة للصف السابق؟ (يبدأ بتبويب ومحتوى قصير)"""
    if not prev_row or not line.strip():
        return False
    parts = split_table_row(line)
    non_empty = [p for p in parts if p]
    if not non_empty:
        return False
    # سطر يبدأ بمسافات/تبويب ومحتوى قصير = تكملة
    if line.startswith(('\t', ' ')) and len(non_empty) <= 2 and all(len(p) < 60 for p in non_empty):
        return True
    return False

def merge_continuation(prev_row, line):
    """دمج سطر التكملة في آخر خلية من الصف السابق."""
    parts = split_table_row(line)
    content = ' '.join(p for p in parts if p)
    if content and prev_row:
        prev_row[-1] = prev_row[-1] + ' ' + content
    return prev_row

def pad_row(row, num_cols):
    """تكمية الصف بخلايا فارغة حتى num_cols."""
    while len(row) < num_cols:
        row.append('')
    return row[:num_cols]

def row_to_pipe(row):
    """تحويل صف إلى صيغة أنابيب | a | b | c |"""
    return '| ' + ' | '.join(cell for cell in row) + ' |'

def convert_file(input_path, output_path):
    """تحويل الملف من الصيغة العادية إلى صيغة التجهيز."""
    with open(input_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    out_lines = []
    i = 0
    skip_next_separator = False
    in_table = False
    table_rows = []
    prev_table_row = None
    num_table_cols = 0

    while i < len(lines):
        line = lines[i]
        orig = line
        stripped = line.strip()

        # --- حالة: داخل جدول ---
        if in_table:
            if not stripped:
                # سطر فارغ = نهاية الجدول
                if table_rows:
                    num_cols = max(len(r) for r in table_rows)
                    for row in table_rows:
                        padded = pad_row(row[:], num_cols)
                        out_lines.append(row_to_pipe(padded))
                in_table = False
                table_rows = []
                prev_table_row = None
                out_lines.append('')  # سطر فارغ بعد الجدول
                i += 1
                continue

            # سطر بدون تبويب = صف بخلية واحدة (مثل "أولاً: الموارد التعليمية" في جدول 3)
            if '\t' not in line:
                if table_rows and num_table_cols > 0:
                    table_rows.append([stripped])
                    prev_table_row = [stripped]
                else:
                    table_rows.append([stripped])
                    prev_table_row = [stripped]
                    num_table_cols = 1
                i += 1
                continue

            parts = split_table_row(line)
            if not parts:
                i += 1
                continue

            # هل هذا سطر تكملة؟
            if prev_table_row and is_continuation_line(line, prev_table_row):
                merge_continuation(prev_table_row, line)
                i += 1
                continue

            # صف جدول عادي (يحتوي تبويب)
            if parts:
                table_rows.append(parts)
                prev_table_row = parts
                if num_table_cols == 0:
                    num_table_cols = len(parts)
            i += 1
            continue

        # --- بداية جدول ---
        if is_table_start(line):
            out_lines.append(stripped)  # "جدول (N)"
            i += 1
            if i < len(lines) and lines[i].strip() and not is_table_start(lines[i]) and '\t' not in lines[i]:
                out_lines.append(lines[i].strip())  # عنوان الجدول
                i += 1
            # تخطي سطر فارغ إن وُجد
            if i < len(lines) and not lines[i].strip():
                i += 1
            in_table = True
            table_rows = []
            prev_table_row = None
            num_table_cols = 0
            continue

        # --- حذف الفواصل ---
        if is_separator(line):
            i += 1
            skip_next_separator = True
            continue

        # --- العناوين بعد الفواصل ---
        if skip_next_separator and stripped:
            skip_next_separator = False
            if is_main_section_title(stripped):
                out_lines.append('## ' + stripped)
                i += 1
                continue
            if is_scenario_title(stripped):
                title = stripped.replace('--- ', '').replace(' ---', '')
                out_lines.append('## ' + title)
                i += 1
                continue
            # ليس عنواناً، نُخرجه كسطر عادي

        # --- السطر الأول: عنوان رئيسي ---
        if i == 0 and stripped == 'الفصل الثالث':
            out_lines.append('# ' + stripped)
            i += 1
            continue

        # --- مقدمة ---
        if stripped == 'مقدمة:':
            out_lines.append('## مقدمة')
            i += 1
            continue

        # --- عناوين السيناريوهات (قد تظهر دون فاصل سابق) ---
        if is_scenario_title(stripped):
            title = stripped.replace('--- ', '').replace(' ---', '')
            out_lines.append('## ' + title)
            i += 1
            continue

        # --- سطر عادي ---
        if stripped:
            out_lines.append(stripped)
        i += 1

    # إذا انتهى الملف ونحن داخل جدول
    if in_table and table_rows:
        num_cols = max(len(r) for r in table_rows)
        for row in table_rows:
            padded = pad_row(row[:], num_cols)
            out_lines.append(row_to_pipe(padded))

    # كتابة الملف الناتج
    os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out_lines))

    print(f'تم بنجاح! تم حفظ الملف: {output_path}')
    print(f'عدد الأسطر الناتجة: {len(out_lines)}')

if __name__ == '__main__':
    base = os.path.dirname(os.path.abspath(__file__))
    input_file = os.path.join(base, 'الفصل_الثالث', 'الفصل_الثالث_كامل.txt')
    output_file = os.path.join(base, 'الفصل_الثالث', 'الفصل_الثالث_كامل_تجهيز_للتنسيق.txt')
    convert_file(input_file, output_file)
