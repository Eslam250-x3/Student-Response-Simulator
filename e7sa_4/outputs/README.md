# مخرجات التحليل الإحصائي — e7sa_4/outputs/

> **العينة:** N = 80 (20 × 4 مجموعات) بعد استبعاد 16 منسحبًا.
> **مستوى الدلالة:** α = 0.05.
> **أداة التحليل:** PSPP (GNU's SPSS-compatible engine) على الماك.

---

## ⚡ الطريقة السريعة — PSPP من الـ Terminal (الموصى بها)

لو PSPPire GUI مش شغال أو عامل مشاكل، شغّل PSPP من الـ Terminal مباشرة. **نفس الـ engine ونفس النتائج** — بس أسرع وأوثق.

```bash
cd /Users/user/Documents/Student-Response-Simulator/e7sa_4/outputs
pspp -o pspp_output.html -O format=html analysis.sps
```

**الناتج:**
- `pspp_output.html` — كل الجداول والنتائج (يفتح في Safari بدبل-كليك)
- `charts/*.png` — كل الرسوم البيانية

**المميزات:**
- الجداول HTML قابلة للنسخ المباشر (Cmd+C) ولزقها في Word
- سريع (أقل من ثانية)
- لا يعتمد على الواجهة الرسومية

---

## الملفات

### 🎯 الأساسية (اللي بتستخدمها)

| الملف | الوصف |
|---|---|
| **`data_final.sav`** | ملف الداتا (96 صف × 223 عمود مع Labels عربية) |
| **`analysis.sps`** | ملف الـ syntax (36+ أمر إحصائي) |
| **`pspp_output.html`** | **نتائج التحليل الكاملة** — افتحه في Safari |
| **`charts/`** | الرسوم البيانية (26 صورة PNG) |

### 📋 مرجعية / توثيق

| الملف | الفايدة |
|---|---|
| `codebook.xlsx` | قاموس المتغيرات الـ 223 — للمراجعة والتوثيق في الفصل الرابع |
| `reconciliation_report.md` | تقرير مطابقة JSON مع Google Forms — **مفيد للدفاع** |
| `data_log.txt` | سجل بناء الداتا |
| `data_final.csv` / `.xlsx` | نسخ بديلة من الداتا لو احتجت تفتحها في Excel |

---

## خطوات التحليل

### 1. شغّل PSPP

```bash
cd /Users/user/Documents/Student-Response-Simulator/e7sa_4/outputs
pspp -o pspp_output.html -O format=html analysis.sps
```

`analysis.sps` يطبق أولًا `SELECT IF (Is_Dropout = 0)` لتقليص العينة إلى 80، ثم ينفذ الاختبارات بالترتيب:

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

### 2. افتح `pspp_output.html` في Safari

دبل-كليك على الملف → هيفتح صفحة فيها كل الجداول.

### 3. انسخ الأرقام إلى `fasl_4/`

من نافذة Safari:
- حدد الجدول بالماوس → Cmd+C
- الصقه مباشرة في Word أو في placeholders بـ `fasl_4/master_plan/sub_plans/`

استخدم **جدول الربط الكامل** في `../sub_plans/07_outputs_to_fasl4_mapping.md` — بيحدد لكل placeholder اسم الجدول في المخرجات وإحداثية الرقم (الصف والعمود).

---

## البديل — PSPPire GUI (لو فضّلت الواجهة الرسومية)

```
File > Open > Data     →  data_final.sav
File > Open > Syntax   →  analysis.sps
Run > All
```

> **ملاحظة:** في بعض إصدارات PSPPire على الماك (المثبتة من Homebrew) ممكن تلاقي مشاكل في فتح ملفات الـ syntax. لو حصل كده، استخدم الطريقة السريعة من الـ Terminal أعلاه.

---

## ملاحظات مهمة على النتائج

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

# 3. إعادة تشغيل التحليل
cd e7sa_4/outputs
pspp -o pspp_output.html -O format=html analysis.sps
```

### الاعتماديات

```bash
# بايثون
venv/bin/pip install pandas openpyxl pyreadstat

# PSPP (لو مش مثبت)
brew install pspp
```
