# -*- coding: utf-8 -*-
import zipfile
from pathlib import Path

base = Path(r"e:\New folder (6)")
doc = base / "الفصل_الثالث" / "الفصل_الثالث_منسق_تحديث_نهائي.docx"
out = base / "_docx_snippet.xml"

with zipfile.ZipFile(doc) as z:
    xml = z.read("word/document.xml").decode("utf-8")

needle = "تنافسي"
i = xml.find(needle)
snippet = xml[max(0, i - 500) : i + 1200] if i >= 0 else xml[: 3000]
out.write_text(snippet, encoding="utf-8")
print("wrote", out, "chars", len(snippet))
