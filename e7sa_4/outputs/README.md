# مخرجات التحليل الإحصائي — e7sa_4/outputs/

> **العينة:** N = 80 (20 × 4 مجموعات) بعد استبعاد 16 منسحبًا.
> **مستوى الدلالة:** α = 0.05.
> **أداة التحليل:** PSPPire على الماك (أو SPSS).

---

## الملفات

### 🎯 الأساسية (اللي بتستخدمها في PSPPire)

| الملف | الوصف |
|---|---|
| **`data_final.sav`** | **ملف الداتا** — افتحه في PSPPire (`File > Open > Data`) |
| **`analysis.sps`** | **ملف الـ syntax** — افتحه (`File > Open > Syntax`) وشغله (`Run > All`) |

### 📋 مرجعية / توثيق (لا تحتاجها للتحليل)

| الملف | الفايدة |
|---|---|
| `codebook.xlsx` | قاموس المتغيرات الـ 223 — للمراجعة والتوثيق في الفصل الرابع |
| `reconciliation_report.md` | تقرير مطابقة JSON مع Google Forms — **مفيد للدفاع** |
| `data_log.txt` | سجل بناء الداتا |
| `data_final.csv` / `.xlsx` | نسخ بديلة من الداتا لو احتجت تفتحها في Excel |

---

## خطوات التحليل

### 1. افتح الداتا في PSPPire

```
File > Open > Data > data_final.sav
```

ستجد 96 صف × 223 عمود مع Labels عربية كاملة وValue Labels.

### 2. شغّل الـ syntax

```
File > Open > Syntax > analysis.sps
Run > All
```

PSPPire سيطبق أولًا `SELECT IF (Is_Dropout = 0)` لتقليص العينة إلى 80، ثم ينفذ جميع الاختبارات بالترتيب:

1. FREQUENCIES و DESCRIPTIVES (التحقق الأولي)
2. MEANS (الإحصاء الوصفي)
3. RELIABILITY × 9 (KR-20 + Cronbach α لكل بُعد)
4. EXAMINE + ONEWAY (افتراضات ANOVA + Levene + Shapiro-Wilk)
5. ONEWAY (تكافؤ المجموعات قبليًا)
6. ONEWAY + CROSSTABS (Manipulation Checks)
7. **GLM × 2** (الفروض الستة)
8. ONEWAY /POSTHOC=TUKEY (المقارنات البعدية)
9. GLM × 12 (الأبعاد الثمانية + المهارات الأربع)
10. GRAPH (الرسوم البيانية)

### 3. انسخ الأرقام إلى `fasl_4/`

من نافذة PSPPire Output، انسخ الأرقام من الجداول إلى placeholders في:

`fasl_4/master_plan/sub_plans/01_descriptive_stats.md`
`fasl_4/master_plan/sub_plans/03_hypotheses_testing.md`
`fasl_4/master_plan/sub_plans/04_results_interpretation.md`
`fasl_4/master_plan/sub_plans/05_qualitative_analysis.md`

استخدم **جدول الربط الكامل** في `../sub_plans/07_outputs_to_fasl4_mapping.md` — بيحدد لكل placeholder اسم الجدول في نافذة Output وإحداثية الرقم (الصف والعمود).

---

## ملاحظات مهمة

### الترميز
- **Group:** 1=تنافسي×مفتوح، 2=تنافسي×محدد، 3=تشاركي×مفتوح، 4=تشاركي×محدد (مطابق لـ `simulation_data.json`).
- **Pattern:** 1=تنافسي، 2=تشاركي.
- **Timing:** 1=محدد، 2=مفتوح.

### Reverse Coding
- 23 فقرة سلبية في التدفق الذهني تم عكسها بالفعل في `data_final.sav` (new = 6 − raw).
- القائمة موجودة في `config.json > flow.negativeItems`.
- **لا تحتاج لتطبيق أي reverse coding في PSPP** — الداتا جاهزة.

### المنسحبون
- 16 طالب (4 من كل مجموعة) مستبعدون بواسطة `SELECT IF (Is_Dropout = 0)` في بداية `analysis.sps`.

### PSPP vs SPSS
- استُخدم `GLM` بدلًا من `UNIANOVA` لأن PSPP لم ينفذ `UNIANOVA` بعد. النتائج متطابقة تمامًا.
- PSPP لا يطبع `Partial η²` مباشرة في جدول GLM. لحسابها يدويًا من جدول "Tests of Between-Subjects Effects":

  $$\eta^2_p = \frac{SS_{\text{effect}}}{SS_{\text{effect}} + SS_{\text{error}}}$$

  **مثال:** لو جدول PSPP أعطاك `SS_Pattern = 54.45` و `SS_Error = 1118.60`، يبقى `η²_p = 54.45 / (54.45 + 1118.60) = 0.046`.

---

## إعادة بناء الداتا (لو حصل تعديل في المصادر)

```bash
cd /Users/user/Documents/Student-Response-Simulator

# 1. إعادة بناء ملفات الداتا
venv/bin/python e7sa_4/build_data.py

# 2. إعادة توليد تقرير المطابقة
venv/bin/python e7sa_4/reconcile.py
```

### الاعتماديات

```bash
venv/bin/pip install pandas openpyxl pyreadstat
```
