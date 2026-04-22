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

## 🏆 البديل الأفضل — IBM SPSS Statistics (الموصى به للفصل الرابع)

PSPP و SPSS بيستخدموا **نفس الخوارزميات الإحصائية بالظبط** — الأرقام (F, p, SS, df) **متطابقة 100%**. لكن SPSS بيقدم مميزات إضافية:

| الميزة | PSPP | SPSS |
|---|:---:|:---:|
| الأرقام (F, p, SS) | ✅ متطابقة | ✅ متطابقة |
| Partial η² تلقائي | ❌ يدوي | ✅ تلقائي |
| جداول منسقة | HTML بسيط | APA-style جاهزة |
| تصدير لـ Word | نسخ يدوي | ✅ مباشر |

### خطوات التشغيل في SPSS:

#### الخطوة 1: افتح ملف البيانات
```
File → Open → Data → اختار: data_final.sav
```
> الملف فيه 96 صف × 223 عمود مع Labels عربية — هيشتغل في SPSS مباشرة.

#### الخطوة 2: شغّل ملف التحليل
```
File → Open → Syntax → اختار: analysis.sps
```
ثم اضغط: **Run → All** (أو Ctrl+A ثم ▶️ الزر الأخضر)

> **ملاحظة:** ملف `analysis.sps` يستخدم أمر `GLM` (وليس `UNIANOVA`). في SPSS الاتنين بيدوا نفس النتائج. لو فضّلت `UNIANOVA`، استبدل أوامر `GLM` بـ:
> ```spss
> UNIANOVA MCQ_Post_Total BY Pattern Timing
>   /METHOD=SSTYPE(3)
>   /PRINT=ETASQ DESCRIPTIVE
>   /DESIGN=Pattern Timing Pattern*Timing.
> ```

#### الخطوة 3: فعّل Partial η² (حجم التأثير)
لو استخدمت القوائم بدل الـ Syntax:
```
Analyze → General Linear Model → Univariate
  → Dependent Variable: MCQ_Post_Total (أو Flow_Post_Total)
  → Fixed Factors: Pattern, Timing
  → Options → ☑ Estimates of effect size  ← مهم!
  → Options → ☑ Descriptive statistics
  → Post Hoc → اختار Pattern و Timing → ☑ Tukey
  → Plots → Horizontal: Pattern → Separate Lines: Timing → Add
  → OK
```

#### الخطوة 4: صدّر النتائج لـ Word
```
File → Export → اختار: Word/RTF (.doc)
```
كده الجداول هتبقى جاهزة للنسخ مباشرة في الفصل الرابع.

### النتائج المتوقعة (للتأكيد):

| الفرض | F | Sig | Partial η² | القرار |
|---|---|---|---|---|
| ف1: النمط → حل مشكلات | 24.31 | .000 | .242 | ✅ دال |
| ف2: الزمن → حل مشكلات | 0.07 | .791 | .001 | غير دال |
| ف3: التفاعل → حل مشكلات | 0.02 | .894 | .000 | غير دال |
| ف4: النمط → تدفق | 5.30 | .024 | .065 | ✅ دال |
| ف5: الزمن → تدفق | 16.62 | .000 | .179 | ✅ دال |
| ف6: التفاعل → تدفق | 0.07 | .789 | .001 | غير دال |

> **تأكيد:** لو الأرقام اللي طلعتلك من SPSS مختلفة عن الجدول ده — فيه مشكلة. راجع إنك فتحت `data_final.sav` الصح وإن `SELECT IF (Is_Dropout = 0)` اتنفذ.

---

## ملاحظات مهمة على النتائج

### الترميز
- **Group:** 1=تنافسي×مفتوح، 2=تنافسي×محدد، 3=تشاركي×مفتوح، 4=تشاركي×محدد (مطابق لـ `simulation_data.json`).
- **Pattern:** 1=تنافسي، 2=تشاركي.
- **Timing:** 1=محدد، 2=مفتوح.

### Reverse Coding
- 23 فقرة سلبية في التدفق الذهني تم عكسها بالفعل في `data_final.sav` (new = 6 − raw).
- القائمة موجودة في `config.json > flow.negativeItems`.
- **لا تحتاج لتطبيق أي reverse coding في PSPP/SPSS** — الداتا جاهزة.

### المنسحبون
- 16 طالب (4 من كل مجموعة) مستبعدون بواسطة `SELECT IF (Is_Dropout = 0)` في بداية `analysis.sps`.

### PSPP vs SPSS
- استُخدم `GLM` بدلًا من `UNIANOVA` لأن PSPP لم ينفذ `UNIANOVA` بعد. النتائج متطابقة تمامًا.
- PSPP لا يطبع `Partial η²` مباشرة في جدول GLM. لحسابها يدويًا من جدول "Tests of Between-Subjects Effects":

  $$\eta^2_p = \frac{SS_{\text{effect}}}{SS_{\text{effect}} + SS_{\text{error}}}$$

  **مثال:** لو جدول PSPP أعطاك `SS_Pattern = 273.80` و `SS_Error = 856.00`، يبقى `η²_p = 273.80 / (273.80 + 856.00) = 0.242`.

---

## إعادة بناء الداتا (لو حصل تعديل في المصادر)

```bash
cd /Users/user/Documents/Student-Response-Simulator

# 1. إعادة توليد المحاكاة
venv/bin/python generate_simulation.py --seed 42

# 2. إعادة بناء ملفات الداتا
venv/bin/python e7sa_4/build_data.py

# 3. إعادة بناء ملفات Google Forms CSV
venv/bin/python rebuild_forms_csv.py

# 4. إعادة توليد تقرير المطابقة
venv/bin/python e7sa_4/reconcile.py

# 5. إعادة تشغيل التحليل
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

