#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
استخراج عناوين الفصل الثاني (الإطار النظري) من ملف DOCX
"""

import sys
from pathlib import Path
from docx import Document

SCRIPT_DIR = Path(__file__).resolve().parent
WORKSPACE = SCRIPT_DIR.parent
DOCX_PATH = WORKSPACE / "الاطار سوبر نهائي.docx"
OUTPUT_TXT = SCRIPT_DIR / "chapter2_framework.txt"
OUTLINE_TXT = SCRIPT_DIR / "chapter2_outline.txt"


def main():
    if not DOCX_PATH.exists():
        print(f"خطأ: الملف غير موجود: {DOCX_PATH}")
        sys.exit(1)

    doc = Document(DOCX_PATH)
    
    full_text = []
    outline = []
    
    for i, para in enumerate(doc.paragraphs):
        text = para.text.strip()
        style = para.style.name if para.style else ""
        
        if text:
            full_text.append(text)
            
            # استخراج العناوين بناء على الـ style
            if "Heading" in style or "heading" in style or "عنوان" in style:
                outline.append(f"[{style}] {text}")
            # استخراج العناوين المحتملة (نص قصير جدًا قد يكون عنوان)
            elif len(text) < 100 and (text.startswith(("أولاً", "ثانياً", "ثانيًا", "ثالثاً", "ثالثًا", "رابعاً", "رابعًا", "خامساً", "خامسًا", "سادساً", "سادسًا", "سابعاً", "سابعًا", "ثامناً", "ثامنًا", "المبحث", "المحور")) or text.endswith(":") or text.endswith("؟")):
                outline.append(f"[POSSIBLE_HEADING] {text}")
    
    # حفظ النص الكامل
    OUTPUT_TXT.write_text("\n\n".join(full_text), encoding="utf-8")
    OUTLINE_TXT.write_text("\n".join(outline), encoding="utf-8")
    
    print(f"عدد الفقرات: {len(full_text)}")
    print(f"عدد العناوين: {len(outline)}")
    print(f"النص الكامل: {OUTPUT_TXT}")
    print(f"العناوين: {OUTLINE_TXT}")


if __name__ == "__main__":
    main()
