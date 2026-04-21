# 04 — مواصفات ملفات المخرجات (Output Files Specification)

> **الهدف:** توثيق شكل كل ملف مخرج نهائي (CSV, XLSX, SAV, etc.)، ترتيب أعمدته، وطريقة استخدامه.

---

## 1. نظرة عامة على مجلد المخرجات

بعد تنفيذ Pipeline، هيتولد:

```
e7sa_4/outputs/
├── data_final.csv              (~200 KB)   — الداتا في CSV
├── data_final.xlsx             (~400 KB)   — نفس الداتا + sheet للـCodebook
├── data_final.sav              (~300 KB)   — ملف SPSS/PSPP جاهز
├── analysis.sps                (~10 KB)    — Syntax للتحليل في PSPP
├── codebook.xlsx               (~50 KB)    — قاموس المتغيرات
├── data_log.txt                (~5 KB)     — سجل خطوات المعالجة
└── reconciliation_report.md    (~10 KB)    — تقرير المطابقة مع Forms
```

---

## 2. ترتيب الأعمدة النهائي في ملف الداتا

الأعمدة تأتي بهذا الترتيب بالضبط في CSV/XLSX/SAV (223 عمود):

### 2.1 قسم التعريفات (8 أعمدة)
```
1.  ID
2.  Name                    (اختياري — يُزال في نسخة المشاركة)
3.  Email                   (اختياري)
4.  Group
5.  Pattern
6.  Timing
7.  Team
8.  Is_Dropout
```

### 2.2 قسم حل المشكلات — القياس القبلي (35 عمود)
```
9.  PS_Pre_Total
10. PS_Pre_Skill1
11. PS_Pre_Skill2
12. PS_Pre_Skill3
13. PS_Pre_Skill4
14–43. PS_Pre_Q01..PS_Pre_Q30
```

### 2.3 قسم حل المشكلات — القياس البعدي (35 عمود)
```
44. PS_Post_Total
45. PS_Post_Skill1
46. PS_Post_Skill2
47. PS_Post_Skill3
48. PS_Post_Skill4
49–78. PS_Post_Q01..PS_Post_Q30
```

### 2.4 قسم التدفق الذهني — القياس القبلي (65 عمود)
```
79. Flow_Pre_Total
80. Flow_Pre_D1
81. Flow_Pre_D2
...
87. Flow_Pre_D8
88–143. Flow_Pre_I01..Flow_Pre_I56
```

### 2.5 قسم التدفق الذهني — القياس البعدي (65 عمود)
```
144. Flow_Post_Total
145. Flow_Post_D1
...
152. Flow_Post_D8
153–208. Flow_Post_I01..Flow_Post_I56
```

### 2.6 قسم الجرد بوك (15 عمود)
```
209. Task_M1
210. Task_M2
211. Task_M3
212. Task_M4
213. Task_M5
214. Task_Bonus
215. Task_Total
216. Task_Percentage
217. Task_Grade
218. Late_M1
219. Late_M2
220. Late_M3
221. Late_M4
222. Late_M5
223. Late_Count
```

---

## 3. مواصفات تفصيلية لكل ملف

### 3.1 `data_final.csv`

| الخاصية | القيمة |
|---|---|
| Encoding | `UTF-8 with BOM` (`utf-8-sig`) |
| Separator | `,` (فاصلة) |
| Decimal | `.` (نقطة) |
| Line Terminator | `\n` |
| Quote Char | `"` |
| Quoting | `QUOTE_MINIMAL` |
| الصف الأول | أسماء الأعمدة |
| عدد الصفوف | 97 (1 header + 96 بيانات) |

**طريقة الفتح في Excel (Mac):**
- File → Open → اختر CSV → Excel هيتعرف على UTF-8 تلقائيًا بسبب BOM.

### 3.2 `data_final.xlsx`

| الخاصية | القيمة |
|---|---|
| Sheets | `data` (البيانات), `codebook` (قاموس المتغيرات) |
| تجميد الصف الأول | نعم (Freeze Top Row) |
| Auto-filter | نعم (على الصف الأول) |
| تنسيق `Is_Dropout=1` | خلفية صفراء (اختياري) |
| تنسيق الأرقام العشرية | منزلة واحدة |

### 3.3 `data_final.sav` (SPSS/PSPP)

| الخاصية | القيمة |
|---|---|
| Format | SPSS .sav (يقرأه PSPP بدون مشاكل) |
| Metadata | كل المتغيرات مع Labels + Value Labels + Measure |
| Encoding | UTF-8 |
| Compression | مفعّل |

**التحقق من فتحه في PSPPire:**
```
File → Open → data_final.sav
Utilities → Variables → اتأكد إن Labels ظاهرة بالعربي صح
```

### 3.4 `analysis.sps` (Syntax لـ PSPP)

ملف نصي يحوي كل الأوامر الإحصائية (تفاصيله في [05 — خطة التحليل](05_pspp_spss_analysis_plan.md)).

مثال لبدايته:
```sps
* ================================================================
* analysis.sps — تحليل الفصل الرابع
* البحث: حشد المصادر وأثره في حل المشكلات والتدفق الذهني
* ================================================================

GET FILE='data_final.sav'.
DATASET NAME ds WINDOW=FRONT.

* استبعاد المنسحبين
SELECT IF (Is_Dropout = 0).
EXECUTE.

FREQUENCIES VARIABLES=Group Pattern Timing.
* ... (باقي الأوامر)
```

### 3.5 `codebook.xlsx`

Sheet واحد فيه الأعمدة:

| Variable | Label (AR) | Type | Width | Decimals | Values | Missing | Measure | Description |
|---|---|---|---|---|---|---|---|---|
| `ID` | معرّف الطالب | String | 8 | 0 | — | — | Nominal | STD-001..STD-096 |
| `Group` | المجموعة التجريبية | Numeric | 1 | 0 | 1="G1: تنافسي×مفتوح"; 2="G2:..."; ... | — | Nominal | 1 من 4 مجموعات |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |

### 3.6 `data_log.txt`

ملف نصي مختصر:

```
===== data_log.txt =====
Generated: 2026-04-21 22:30:00
Pipeline version: 1.0
Input files:
  - simulation_data.json    (MD5: abc...)
  - config.json             (MD5: def...)
  - 1 - Gradebook.csv       (MD5: ghi...)
  - constants.json          (MD5: jkl...)

Integrity Checks:
  [PASS] simulation has 96 students
  [PASS] gradebook has 96 rows
  [PASS] 16 dropouts match between constants.json and gradebook
  [PASS] Flow has 8 dimensions × 7 items = 56
  [PASS] negativeItems count = 23
  ...

Score Calculation Verification:
  - MCQ scores match JSON source:       96/96 students
  - Flow scores differ from JSON source: 0/96 students (after reverse coding)
    Note: Any difference is expected because JSON scores were calculated without reverse coding.

Output:
  - data_final.csv:   96 rows × 223 cols
  - data_final.xlsx:  2 sheets
  - data_final.sav:   with full metadata

Warnings: (لو موجود)

Status: ✅ SUCCESS
```

### 3.7 `reconciliation_report.md`

تقرير المطابقة بين `simulation_data.json` و ملفات Google Forms CSVs — تفاصيله في [06 — Assumptions & Manipulation Checks](06_assumptions_manipulation_checks.md).

---

## 4. نسخ الداتا المختلفة (Derived Datasets)

بعد `data_final.sav` الأساسي، يمكن للباحث (في PSPP/SPSS) إنشاء نسخ مفلترة:

### 4.1 `data_active.sav` (المتغيرات الأساسية للتحليل الرئيسي)
- فلتر: `SELECT IF (Is_Dropout = 0)` → 80 صف.
- الأعمدة: ID, Group, Pattern, Timing, Team, + كل المجاميع والأبعاد (بدون الفقرات الفردية).

### 4.2 `data_reliability.sav` (للـCronbach's α و KR-20)
- فلتر: `SELECT IF (Is_Dropout = 0)`.
- الأعمدة: ID + Group + كل الفقرات الفردية البعدية (PS_Post_Q01..Q30 + Flow_Post_I01..I56).

### 4.3 `data_full.sav` (كل شيء)
- بدون فلترة.
- كل الأعمدة.

> **ملاحظة:** مش ضروري نولد النسخ الثلاثة من البداية. `data_final.sav` فيه كل حاجة، والباحث يستخدم `SELECT IF` في PSPP عند الحاجة.

---

## 5. أحجام الملفات المتوقعة

| الملف | الحجم التقريبي |
|---|---|
| `data_final.csv` | 200–250 KB |
| `data_final.xlsx` | 400–500 KB |
| `data_final.sav` | 300–350 KB |
| `analysis.sps` | 8–12 KB |
| `codebook.xlsx` | 40–60 KB |
| `data_log.txt` | 3–5 KB |
| `reconciliation_report.md` | 8–12 KB |
| **الإجمالي** | ~ 1 MB |

---

## 6. فتح الملفات على الماك

### PSPPire
```bash
# تثبيت (مرة واحدة)
brew install --cask pspp

# التشغيل
open -a PSPP outputs/data_final.sav
```

### Excel / Numbers
- Double-click على `data_final.xlsx` → يفتح في Excel/Numbers تلقائياً.

### قراءة الـ SAV في Python (للمراجعة)
```python
import pyreadstat
df, meta = pyreadstat.read_sav("outputs/data_final.sav")
print(df.shape)           # (96, 223)
print(meta.column_labels)  # Arabic labels
```

---

## 7. اتفاقيات التسمية (Naming Conventions)

- **Snake_case** للمتغيرات: `PS_Pre_Total`, `Flow_Post_D1`, `Late_Count`.
- **PS_** للـProblem Solving.
- **Flow_** للـFlow.
- **Task_** للـGradebook.
- **_Pre** / **_Post** للقياس القبلي/البعدي.
- **_Q01..Q30** للفقرات الفردية في MCQ.
- **_I01..I56** للفقرات الفردية في Flow.
- **_D1..D8** للأبعاد الثمانية.
- **_Skill1..Skill4** للمهارات الأربع.

> **لا تغيّر أسماء المتغيرات بعد التصدير** — الـ`analysis.sps` بيعتمد عليها.

---

## 8. الخطوة التالية

→ [05 — خطة التحليل في PSPPire/SPSS](05_pspp_spss_analysis_plan.md)
