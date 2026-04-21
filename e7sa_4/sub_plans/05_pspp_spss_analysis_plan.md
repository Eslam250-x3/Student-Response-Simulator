# 05 — خطة التحليل في PSPPire/SPSS

> **الهدف:** تحديد كل اختبار إحصائي سيُنفَّذ، ترتيبه، أوامره في PSPP syntax، وطريقة تنفيذه يدويًا عبر القوائم.

---

## 1. ملخص الخطة

| # | الخطوة | الأمر الإحصائي | الغرض |
|---|---|---|---|
| 1 | تجهيز البيئة | `GET FILE` + `SELECT IF` | تحميل الداتا وفلترة المنسحبين |
| 2 | التحقق الأولي | `FREQUENCIES` + `MISSING VALUES` | جودة الداتا |
| 3 | الإحصاء الوصفي | `DESCRIPTIVES` + `MEANS` | M, SD لكل متغير × مجموعة |
| 4 | الثبات | `RELIABILITY` | Cronbach's α + KR-20 |
| 5 | افتراضات ANOVA | `EXAMINE` | Shapiro-Wilk + Levene |
| 6 | تكافؤ المجموعات | `ONEWAY` | على القياس القبلي |
| 7 | Manipulation Checks | `CROSSTABS` + `ONEWAY` | تأثير Timing على Late_Count |
| 8 | **Two-way ANOVA** | `UNIANOVA` | **الاختبار الرئيسي للفروض** |
| 9 | Post-hoc | `UNIANOVA /POSTHOC=TUKEY` | مقارنات بعدية |
| 10 | الرسوم البيانية | `GRAPH` / `GGRAPH` | Interaction plots + Bar charts |

---

## 2. البنية العامة لـ `analysis.sps`

```sps
* ================================================================
* analysis.sps — الفصل الرابع
* الباحث: إسلام محمد عبد النبي
* Target: PSPPire 2.0.0+ / SPSS 28+
* ================================================================

* ───── 0. تجهيز الداتا ─────
GET FILE='data_final.sav'.
DATASET NAME ds.

* استبعاد المنسحبين (16 طالب → العينة 80)
SELECT IF (Is_Dropout = 0).
EXECUTE.

* ───── باقي الأوامر بالترتيب ─────
* ... (التفاصيل في الأقسام التالية)
```

---

## 3. التفاصيل لكل خطوة

### الخطوة 1 — تجهيز البيئة

```sps
GET FILE='data_final.sav'.
DATASET NAME ds WINDOW=FRONT.

* فلترة المنسحبين
SELECT IF (Is_Dropout = 0).
EXECUTE.
```

**النتيجة المتوقعة:** بعد `SELECT IF` يبقى 80 صف.

---

### الخطوة 2 — التحقق الأولي

```sps
FREQUENCIES VARIABLES=Group Pattern Timing Team
  /ORDER=ANALYSIS.

MISSING VALUES ALL (SYSMIS).
DESCRIPTIVES VARIABLES=PS_Post_Total Flow_Post_Total
  /STATISTICS=MEAN STDDEV MIN MAX.
```

**النتيجة المتوقعة:** 20 طالب × 4 مجموعات، no missing values في المتغيرات التابعة الرئيسية.

---

### الخطوة 3 — الإحصاء الوصفي (→ يملأ جداول Sub-plan 01)

#### 3.1 حل المشكلات — الدرجة الكلية

```sps
MEANS TABLES=PS_Post_Total BY Group
  /CELLS=COUNT MEAN STDDEV MIN MAX.
```

**يملأ:** جدول (1) في [`../fasl_4/master_plan/sub_plans/01_descriptive_stats.md`](../../fasl_4/master_plan/sub_plans/01_descriptive_stats.md).

#### 3.2 حل المشكلات — المهارات الأربع

```sps
MEANS TABLES=PS_Post_Skill1 PS_Post_Skill2 PS_Post_Skill3 PS_Post_Skill4 BY Group
  /CELLS=COUNT MEAN STDDEV.
```

#### 3.3 التدفق الذهني — الدرجة الكلية

```sps
MEANS TABLES=Flow_Post_Total BY Group
  /CELLS=COUNT MEAN STDDEV MIN MAX.
```

**يملأ:** جدول (2).

#### 3.4 التدفق الذهني — الأبعاد الثمانية

```sps
MEANS TABLES=Flow_Post_D1 Flow_Post_D2 Flow_Post_D3 Flow_Post_D4
              Flow_Post_D5 Flow_Post_D6 Flow_Post_D7 Flow_Post_D8 BY Group
  /CELLS=COUNT MEAN STDDEV.
```

**يملأ:** جدول (2أ).

---

### الخطوة 4 — الثبات (Reliability)

#### 4.1 KR-20 لمقياس حل المشكلات (بما إنه dichotomous)

```sps
RELIABILITY
  /VARIABLES=PS_Post_Q01 TO PS_Post_Q30
  /SCALE('حل المشكلات - بعدي') ALL
  /MODEL=ALPHA
  /STATISTICS=DESCRIPTIVE SCALE.
```

> **ملاحظة:** للعناصر الثنائية (0/1)، Cronbach's α = KR-20 رياضيًا. PSPP هيظهر "Cronbach's Alpha" وهيا نفسها KR-20.

**الهدف:** α ≥ 0.70 (مقبول) أو ≥ 0.80 (ممتاز).

#### 4.2 Cronbach's α لمقياس التدفق الذهني (الكلي)

```sps
RELIABILITY
  /VARIABLES=Flow_Post_I01 TO Flow_Post_I56
  /SCALE('التدفق الذهني - بعدي - الكلي') ALL
  /MODEL=ALPHA.
```

#### 4.3 Cronbach's α لكل بُعد من الأبعاد الثمانية

```sps
* البعد 1
RELIABILITY
  /VARIABLES=Flow_Post_I01 Flow_Post_I02 Flow_Post_I03 Flow_Post_I04
             Flow_Post_I05 Flow_Post_I06 Flow_Post_I07
  /SCALE('التدفق - البعد 1') ALL
  /MODEL=ALPHA.

* البعد 2
RELIABILITY
  /VARIABLES=Flow_Post_I08 TO Flow_Post_I14
  /SCALE('التدفق - البعد 2') ALL
  /MODEL=ALPHA.

* ... (تكرار للأبعاد 3-8)
```

---

### الخطوة 5 — اختبارات الافتراضات

#### 5.1 Shapiro-Wilk للتوزيع الطبيعي

```sps
EXAMINE VARIABLES=PS_Post_Total Flow_Post_Total BY Group
  /PLOT=NPPLOT
  /STATISTICS=DESCRIPTIVES
  /PERCENTILES=HAVERAGE
  /MISSING=LISTWISE.
```

**القراءة:** في جدول "Tests of Normality"، Shapiro-Wilk column، `Sig.` لازم تكون > 0.05 لكل مجموعة.

#### 5.2 Levene's Test لتجانس التباين

```sps
ONEWAY PS_Post_Total BY Group
  /STATISTICS=HOMOGENEITY.

ONEWAY Flow_Post_Total BY Group
  /STATISTICS=HOMOGENEITY.
```

**القراءة:** Levene's Test في ONEWAY output، `Sig.` لازم تكون > 0.05.

> **لو فشل Levene:** نذكر في الفصل ونستخدم `UNIANOVA` عادي (مقاوم للانتهاك مع عينات متساوية).

---

### الخطوة 6 — تكافؤ المجموعات قبل التجربة

```sps
* حل المشكلات - القياس القبلي
ONEWAY PS_Pre_Total BY Group
  /STATISTICS=DESCRIPTIVES
  /MISSING=ANALYSIS.

* التدفق الذهني - القياس القبلي
ONEWAY Flow_Pre_Total BY Group
  /STATISTICS=DESCRIPTIVES
  /MISSING=ANALYSIS.
```

**المطلوب:** `Sig. > 0.05` يعني تكافؤ (لا توجد فروق قبل التجربة).

> **من `simulation_data.json > metadata.stats.baseline`:** `F=0.504, p=0.680` ⇒ متوقع تكافؤ تام.

---

### الخطوة 7 — Manipulation Checks

#### 7.1 تأثير Timing على عدد التأخيرات

```sps
* ANOVA
ONEWAY Late_Count BY Timing
  /STATISTICS=DESCRIPTIVES HOMOGENEITY.

* Cross-tabulation
CROSSTABS
  /TABLES=Late_Count BY Timing
  /STATISTICS=CHISQ.
```

**المتوقع (من الجرد بوك):** p < 0.001، لأن المفتوح = 0 تأخيرات دائمًا، المحدد فيه 23-38 تأخير.

#### 7.2 Engagement Check (درجات المهام)

```sps
ONEWAY Task_Total BY Group
  /STATISTICS=DESCRIPTIVES.
```

**الهدف:** التحقق من إن المجموعات الأربع انخرطت في التجربة بشكل كافٍ. لازم متوسطات معقولة (>250 من 500).

#### 7.3 ICC للفرق داخل المجموعات التشاركية (اختياري)

PSPP مفيهوش `MIXED` بشكل كامل، لكن يمكن الحصول على تقدير مبدئي عبر:

```sps
* فلترة للمجموعات التشاركية فقط
TEMPORARY.
SELECT IF (Pattern = 2).
EXECUTE.

* ANOVA للفرق
ONEWAY Flow_Post_Total BY Team
  /STATISTICS=DESCRIPTIVES.
```

**القراءة:** لو Between-groups SS / Total SS صغيرة (< 5%) → الفرق ليس لها تأثير يُذكر.

---

### الخطوة 8 — Two-way ANOVA (الاختبار الرئيسي)

#### 8.1 لحل المشكلات (يختبر ف1، ف2، ف3)

```sps
UNIANOVA PS_Post_Total BY Pattern Timing
  /METHOD=SSTYPE(3)
  /INTERCEPT=INCLUDE
  /POSTHOC=Pattern(TUKEY) Timing(TUKEY)
  /EMMEANS=TABLES(Pattern)
  /EMMEANS=TABLES(Timing)
  /EMMEANS=TABLES(Pattern*Timing)
  /PRINT=DESCRIPTIVE ETASQ HOMOGENEITY OPOWER
  /PLOT=PROFILE(Pattern*Timing)
  /CRITERIA=ALPHA(.05)
  /DESIGN=Pattern Timing Pattern*Timing.
```

**المخرجات اللازمة:**
- Tests of Between-Subjects Effects:
  - `Pattern`: F, df, Sig., Partial Eta Squared → **ف1**
  - `Timing`: F, df, Sig., Partial Eta Squared → **ف2**
  - `Pattern * Timing`: F, df, Sig., Partial Eta Squared → **ف3**
- Estimated Marginal Means (للرسم البياني).

#### 8.2 للتدفق الذهني (يختبر ف4، ف5، ف6)

```sps
UNIANOVA Flow_Post_Total BY Pattern Timing
  /METHOD=SSTYPE(3)
  /INTERCEPT=INCLUDE
  /POSTHOC=Pattern(TUKEY) Timing(TUKEY)
  /EMMEANS=TABLES(Pattern)
  /EMMEANS=TABLES(Timing)
  /EMMEANS=TABLES(Pattern*Timing)
  /PRINT=DESCRIPTIVE ETASQ HOMOGENEITY OPOWER
  /PLOT=PROFILE(Pattern*Timing)
  /CRITERIA=ALPHA(.05)
  /DESIGN=Pattern Timing Pattern*Timing.
```

#### 8.3 تحليل استكشافي للأبعاد (8 runs للتدفق + 4 runs لحل المشكلات)

```sps
* مثال لبُعد واحد:
UNIANOVA Flow_Post_D1 BY Pattern Timing
  /METHOD=SSTYPE(3)
  /PRINT=DESCRIPTIVE ETASQ
  /DESIGN=Pattern Timing Pattern*Timing.

* يُكرّر لـD2..D8 و Skill1..Skill4
```

---

### الخطوة 9 — Post-hoc Tukey (إن دلّ التفاعل)

Tukey مُدمج في `UNIANOVA` أعلاه. لمقارنة المجموعات الأربع مباشرة:

```sps
ONEWAY PS_Post_Total BY Group
  /POSTHOC=TUKEY ALPHA(0.05)
  /STATISTICS=DESCRIPTIVES HOMOGENEITY.

ONEWAY Flow_Post_Total BY Group
  /POSTHOC=TUKEY ALPHA(0.05)
  /STATISTICS=DESCRIPTIVES HOMOGENEITY.
```

**النتيجة:** مصفوفة 4×4 توضح أي المجموعات مختلفة عن أي مجموعات.

---

### الخطوة 10 — الرسوم البيانية

#### 10.1 Bar Chart للمتوسطات

```sps
GRAPH
  /BAR(GROUPED)=MEAN(PS_Post_Total) BY Pattern BY Timing
  /TITLE='متوسطات حل المشكلات حسب المجموعات الأربع'.

GRAPH
  /BAR(GROUPED)=MEAN(Flow_Post_Total) BY Pattern BY Timing
  /TITLE='متوسطات التدفق الذهني حسب المجموعات الأربع'.
```

#### 10.2 Interaction Plot (مخطط التفاعل)

مُدمج في `UNIANOVA` عبر `/PLOT=PROFILE(Pattern*Timing)`.

#### 10.3 Radar Chart للأبعاد الثمانية

PSPP مفيهوش Radar مباشرة — يُنفَّذ في Excel بعد نقل المتوسطات:
- جدول 4 صفوف (المجموعات) × 8 أعمدة (الأبعاد).
- Insert → Chart → Radar.

---

## 4. التنفيذ خطوة بخطوة في PSPPire (GUI — للتنفيذ اليدوي)

### 4.1 تحميل الداتا
1. `File → Open → Data File...`
2. اختر `data_final.sav`
3. تحقق من `Variable View` — لازم الأسماء العربية تظهر بشكل صح.

### 4.2 فلترة المنسحبين
1. `Data → Select Cases...`
2. اختر `If condition is satisfied`
3. اكتب: `Is_Dropout = 0`
4. `Continue → OK`

### 4.3 تشغيل ANOVA (للمتغير التابع الأول)
1. `Analyze → General Linear Model → Univariate...`
2. **Dependent Variable:** `PS_Post_Total`
3. **Fixed Factor(s):** `Pattern`, `Timing`
4. `Options... → Descriptive statistics, Homogeneity tests, Estimates of effect size`
5. `Plots... → Horizontal axis: Pattern, Separate Lines: Timing → Add`
6. `Post Hoc... → Pattern: Tukey, Timing: Tukey → Continue`
7. `OK`

### 4.4 تكرار لـ Flow_Post_Total
نفس الخطوات مع تبديل Dependent Variable.

### 4.5 الاحتفاظ بالمخرجات
`File → Save As → analysis_output.spv` (SPSS Viewer File).
أو Export as PDF/HTML للمشاركة مع المشرف.

---

## 5. ترتيب تشغيل السكريبت `analysis.sps`

```bash
# من Terminal على الماك (بعد تثبيت PSPP)
cd /Users/user/Documents/Student-Response-Simulator/e7sa_4/outputs
pspp analysis.sps > analysis_output.txt

# أو من داخل PSPPire:
# File → Open → analysis.sps → Run → All
```

**المخرجات:** ملف نصي `analysis_output.txt` فيه كل الجداول والنتائج.

---

## 6. Checklist للتنفيذ النهائي

قبل إغلاق التحليل، تأكد إنك حصلت على:

- [ ] وصفي (M, SD) لكل DV × Group
- [ ] Cronbach's α ≥ 0.70 للمقياسين الكليين
- [ ] Cronbach's α لكل بُعد من الأبعاد الثمانية
- [ ] Shapiro-Wilk p > 0.05 (أو ذكر الانتهاك كمحدد)
- [ ] Levene p > 0.05 (أو ذكر الانتهاك)
- [ ] تكافؤ المجموعات قبليًا: p > 0.05
- [ ] Manipulation Check على Late_Count: p < 0.05 (تأكيد تأثير Timing)
- [ ] **Two-way ANOVA لـ PS_Post_Total:** 3 قيم F + 3 قيم p + 3 قيم η² (ف1، ف2، ف3)
- [ ] **Two-way ANOVA لـ Flow_Post_Total:** 3 قيم F + 3 قيم p + 3 قيم η² (ف4، ف5، ف6)
- [ ] Tukey HSD لكل مقياس
- [ ] Interaction Plot لكل مقياس
- [ ] (استكشافي) ANOVA للأبعاد/المهارات

---

## 7. الوقت المتوقع

- **إعداد `analysis.sps`:** 30 دقيقة.
- **تنفيذ كامل السكريبت:** 5-10 دقائق.
- **مراجعة المخرجات ونقلها:** 1-2 ساعة.

---

## 8. الخطوة التالية

→ [06 — الافتراضات و Manipulation Checks التفصيلية](06_assumptions_manipulation_checks.md)
