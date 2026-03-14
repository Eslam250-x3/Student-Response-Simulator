#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
استخراج النص من PDF باستخدام Google Cloud Vision API (OCR)
الصفحات من 90 إلى 135
"""

import os
import sys
import json
import io
from pathlib import Path

# مسار الملفات
SCRIPT_DIR = Path(__file__).resolve().parent
PDF_PATH = SCRIPT_DIR / "الفصل_الثالث" / "رسالة تسبيح نهائى طبع.pdf"
CREDENTIALS_PATH = SCRIPT_DIR / "credentials.json"
OUTPUT_TXT = SCRIPT_DIR / "رسالة_تسبيح_صفحات_90_135.txt"

# نطاق الصفحات (1-based: 90 إلى 135)
START_PAGE = 90
END_PAGE = 135


def main():
    if not PDF_PATH.exists():
        print(f"خطأ: الملف غير موجود: {PDF_PATH}")
        sys.exit(1)

    if not CREDENTIALS_PATH.exists():
        print(f"خطأ: ملف الاعتماديات غير موجود: {CREDENTIALS_PATH}")
        sys.exit(1)

    # تعيين متغير البيئة للاعتماديات
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(CREDENTIALS_PATH)

    try:
        import fitz  # PyMuPDF
    except ImportError:
        print("خطأ: يجب تثبيت PyMuPDF: pip install PyMuPDF")
        sys.exit(1)

    try:
        from google.cloud import vision
    except ImportError:
        print("خطأ: يجب تثبيت google-cloud-vision: pip install google-cloud-vision")
        sys.exit(1)

    print(f"جاري فتح PDF: {PDF_PATH}")
    doc = fitz.open(PDF_PATH)
    total_pages = len(doc)

    if END_PAGE > total_pages:
        print(f"تحذير: الملف فيه {total_pages} صفحة فقط. سيتم استخراج حتى الصفحة {total_pages}")
        end = total_pages
    else:
        end = END_PAGE

    client = vision.ImageAnnotatorClient()
    all_text = []

    for page_num in range(START_PAGE, end + 1):
        # PyMuPDF يستخدم 0-based indexing
        page = doc[page_num - 1]
        # تحويل الصفحة إلى صورة (دقة عالية للعربية)
        mat = fitz.Matrix(3, 3)  # تكبير 3x ≈ 216 DPI
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img_bytes = pix.tobytes("png")

        image = vision.Image(content=img_bytes)
        response = client.document_text_detection(image=image)

        if response.error.message:
            print(f"خطأ في الصفحة {page_num}: {response.error.message}")
            all_text.append(f"\n--- صفحة {page_num} (خطأ) ---\n")
            continue

        if response.full_text_annotation:
            text = response.full_text_annotation.text
        else:
            text = ""

        all_text.append(f"\n--- صفحة {page_num} ---\n")
        all_text.append(text)
        print(f"تمت معالجة الصفحة {page_num}")

    doc.close()

    # حفظ النص
    output_text = "".join(all_text)
    OUTPUT_TXT.write_text(output_text, encoding="utf-8")
    print(f"\nتم الحفظ في: {OUTPUT_TXT}")
    print(f"عدد الأحرف: {len(output_text)}")


if __name__ == "__main__":
    main()
