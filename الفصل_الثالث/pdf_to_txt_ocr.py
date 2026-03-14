#!/usr/bin/env python3
"""
سكربت لتحويل صفحات PDF (90-135) إلى ملف TXT باستخدام Google Cloud Vision API (OCR)
"""

import os
import sys
import io
import base64
from pathlib import Path

# إعداد مسار الاعتماديات
SCRIPT_DIR = Path(__file__).resolve().parent
CREDENTIALS_PATH = SCRIPT_DIR / "credentials.json"
PDF_PATH = SCRIPT_DIR / "رسالة تسبيح نهائى طبع.pdf"
OUTPUT_TXT_PATH = SCRIPT_DIR / "رسالة تسبيح_صفحات_90_135.txt"

# نطاق الصفحات المطلوبة (1-based: 90 إلى 135)
START_PAGE = 90
END_PAGE = 135

# DPI لتحويل الصفحات إلى صور (أعلى = جودة أفضل لكن حجم أكبر)
PDF_DPI = 200


def check_dependencies():
    """التحقق من تثبيت المكتبات المطلوبة"""
    missing = []
    try:
        import fitz  # PyMuPDF
    except ImportError:
        missing.append("PyMuPDF (pip install PyMuPDF)")
    
    try:
        from google.cloud import vision
    except ImportError:
        missing.append("google-cloud-vision (pip install google-cloud-vision)")
    
    if missing:
        print("يرجى تثبيت المكتبات التالية:")
        for m in missing:
            print(f"  - {m}")
        sys.exit(1)


def pdf_pages_to_images(pdf_path: Path, start: int, end: int, dpi: int = 200):
    """تحويل صفحات PDF إلى صور باستخدام PyMuPDF"""
    import fitz
    
    doc = fitz.open(pdf_path)
    images = []
    
    # PyMuPDF يستخدم 0-based indexing
    for page_num in range(start - 1, min(end, len(doc))):
        page = doc[page_num]
        # zoom = dpi/72 للحصول على الدقة المطلوبة
        mat = fitz.Matrix(dpi / 72, dpi / 72)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img_bytes = pix.tobytes("png")
        images.append((page_num + 1, img_bytes))
    
    doc.close()
    return images


def ocr_image_with_vision(image_bytes: bytes, client) -> str:
    """استخراج النص من صورة باستخدام Google Vision API"""
    from google.cloud import vision
    
    image = vision.Image(content=image_bytes)
    response = client.document_text_detection(image=image)
    
    if response.full_text_annotation:
        return response.full_text_annotation.text
    return ""


def main():
    check_dependencies()
    
    import fitz
    from google.cloud import vision
    from google.oauth2 import service_account
    
    if not PDF_PATH.exists():
        print(f"خطأ: الملف غير موجود: {PDF_PATH}")
        sys.exit(1)
    
    if not CREDENTIALS_PATH.exists():
        print(f"خطأ: ملف الاعتماديات غير موجود: {CREDENTIALS_PATH}")
        sys.exit(1)
    
    # إعداد متغير البيئة للاعتماديات
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(CREDENTIALS_PATH)
    
    credentials = service_account.Credentials.from_service_account_file(
        str(CREDENTIALS_PATH)
    )
    vision_client = vision.ImageAnnotatorClient(credentials=credentials)
    
    print(f"جاري تحويل الصفحات {START_PAGE}-{END_PAGE} من PDF إلى صور...")
    images = pdf_pages_to_images(PDF_PATH, START_PAGE, END_PAGE, PDF_DPI)
    
    if not images:
        print("لم يتم العثور على صفحات في النطاق المحدد.")
        sys.exit(1)
    
    print(f"تم تحويل {len(images)} صفحة. جاري استخراج النص (OCR)...")
    
    all_text = []
    for i, (page_num, img_bytes) in enumerate(images, 1):
        print(f"  معالجة الصفحة {page_num} ({i}/{len(images)})...")
        text = ocr_image_with_vision(img_bytes, vision_client)
        all_text.append(f"\n\n--- صفحة {page_num} ---\n\n{text}")
    
    output_text = "\n".join(all_text).strip()
    
    OUTPUT_TXT_PATH.write_text(output_text, encoding="utf-8")
    print(f"\nتم الحفظ بنجاح في: {OUTPUT_TXT_PATH}")


if __name__ == "__main__":
    main()
