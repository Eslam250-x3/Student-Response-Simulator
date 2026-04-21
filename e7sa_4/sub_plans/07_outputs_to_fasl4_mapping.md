# 07 — ربط مخرجات SPSS بـ fasl_4 (Outputs-to-fasl4 Mapping)

> **الهدف:** جدول مرجعي يحدد لكل `[PLACEHOLDER_*]` في سب بلانات [`fasl_4/master_plan/sub_plans/`](../../fasl_4/master_plan/sub_plans/)، المصدر الدقيق للرقم في مخرجات SPSS/PSPP.

---

## 1. نظرة عامة

- **إجمالي الـ placeholders في `fasl_4`:** ~127 placeholder عبر 7 ملفات.
- **الملف الأكثر حاجة للأرقام:** `05_qualitative_analysis.md` (61 placeholder) + `03_hypotheses_testing.md` (26) + `04_results_interpretation.md` (18) + `01_descriptive_stats.md` (15).
- **مصدر الأرقام:** **نافذة Output في PSPPire** بعد تشغيل `e7sa_4/outputs/analysis.sps` على `data_final.sav`.
- **هام:** استُخدم `GLM` بدل `UNIANOVA` لأن PSPP لا يدعم UNIANOVA. النتائج متطابقة.

---

## 2. Mapping لـ `01_descriptive_stats.md`

| Placeholder | النوع | مصدر SPSS | الموقع في مخرجات PSPP |
|---|---|---|---|
| `[PLACEHOLDER_SAMPLE_SIZE]` | عدد | `SELECT IF (Is_Dropout=0)` | "Valid N (listwise)" في FREQUENCIES |
| `[PLACEHOLDER_N_G1]` | 20 | `FREQUENCIES Group` | جدول Frequencies — Group |
| `[PLACEHOLDER_N_G2]` | 20 | نفس الشيء | نفس الشيء |
| `[PLACEHOLDER_N_G3]` | 20 | نفس الشيء | نفس الشيء |
| `[PLACEHOLDER_N_G4]` | 20 | نفس الشيء | نفس الشيء |
| `[PLACEHOLDER_MEAN_PS_G1]` | M | `MEANS PS_Post_Total BY Group` | جدول Means — Row G1, Col Mean |
| `[PLACEHOLDER_SD_PS_G1]` | SD | نفس الشيء | Col Std. Deviation |
| `[PLACEHOLDER_MEAN_PS_G2]` ... `[PLACEHOLDER_SD_PS_G4]` | — | نفس الأمر | نفس الجدول |
| `[PLACEHOLDER_MEAN_FLOW_G1]` ... `[PLACEHOLDER_SD_FLOW_G4]` | — | `MEANS Flow_Post_Total BY Group` | جدول Means |
| `[PLACEHOLDER_MEAN_FLOW_D1..D8_G1..G4]` | — | `MEANS Flow_Post_D1..D8 BY Group` | جدول Means متعدد |
| `[PLACEHOLDER_MEAN_PS_SKILL1..4_G1..G4]` | — | `MEANS PS_Post_Skill1..4 BY Group` | جدول Means متعدد |

**الأمر الموحد لإنتاج كل ما يلزم `01_descriptive_stats.md`:**
```sps
MEANS TABLES=PS_Post_Total Flow_Post_Total
              PS_Post_Skill1 PS_Post_Skill2 PS_Post_Skill3 PS_Post_Skill4
              Flow_Post_D1 Flow_Post_D2 Flow_Post_D3 Flow_Post_D4
              Flow_Post_D5 Flow_Post_D6 Flow_Post_D7 Flow_Post_D8
      BY Group
  /CELLS=COUNT MEAN STDDEV MIN MAX.
```

---

## 3. Mapping لـ `02_research_questions.md`

| Placeholder | مصدر | ملاحظة |
|---|---|---|
| `[PLACEHOLDER_RQ1_ANSWER]` | من قسم Hypotheses + Interpretation | إجابة إنشائية |
| `[PLACEHOLDER_RQ2_ANSWER]` | من قسم Hypotheses + Interpretation | إجابة إنشائية |

> **ملاحظة:** الـplaceholders هنا نصية، مش أرقام. تُكتَب بناءً على نتائج الفروض.

---

## 4. Mapping لـ `03_hypotheses_testing.md` (الأهم)

### 4.1 الفرض 1 (نمط الحشد × حل المشكلات)

| Placeholder | مصدر | الموقع |
|---|---|---|
| `[PLACEHOLDER_F_H1]` | `GLM PS_Post_Total BY Pattern Timing` | "Tests of Between-Subjects Effects" → Row `نمط حشد المصادر` → Col `F` |
| `[PLACEHOLDER_P_H1]` | نفس الشيء | Col `Sig.` |
| `[PLACEHOLDER_ETA_H1]` | **يُحسب يدويًا**: η²_p = SS_Pattern / (SS_Pattern + SS_Error) | من نفس الجدول — العمود `Type III Sum Of Squares` |
| `[PLACEHOLDER_DF_H1]` | نفس الجدول | `df` (1 للعامل، 76 للخطأ) |

### 4.2 الفرض 2 (الزمن × حل المشكلات)

| Placeholder | مصدر | الموقع |
|---|---|---|
| `[PLACEHOLDER_F_H2]` | نفس الأمر السابق | Row `زمن حشد المصادر` → Col `F` |
| `[PLACEHOLDER_P_H2]` | نفس الشيء | Col `Sig.` |
| `[PLACEHOLDER_ETA_H2]` | **يُحسب يدويًا**: η²_p = SS_Timing / (SS_Timing + SS_Error) | من جدول "Tests of Between-Subjects Effects" |

### 4.3 الفرض 3 (التفاعل × حل المشكلات)

| Placeholder | مصدر | الموقع |
|---|---|---|
| `[PLACEHOLDER_F_H3]` | نفس الأمر | Row `نمط حشد المصادر × زمن حشد المصادر` → Col `F` |
| `[PLACEHOLDER_P_H3]` | نفس الشيء | Col `Sig.` |
| `[PLACEHOLDER_ETA_H3]` | **يُحسب يدويًا**: η²_p = SS_Interaction / (SS_Interaction + SS_Error) | — |

### 4.4 الفروض 4-6 (التدفق الذهني)

نفس الهيكل مع الأمر:
```sps
GLM Flow_Post_Total BY Pattern Timing
  /DESIGN=Pattern Timing Pattern*Timing.
```

| Placeholder | مصدر الصف في الجدول "Tests of Between-Subjects Effects" |
|---|---|
| `[PLACEHOLDER_F_H4]`, `[PLACEHOLDER_P_H4]`, `[PLACEHOLDER_ETA_H4]` | Row `نمط حشد المصادر` |
| `[PLACEHOLDER_F_H5]`, `[PLACEHOLDER_P_H5]`, `[PLACEHOLDER_ETA_H5]` | Row `زمن حشد المصادر` |
| `[PLACEHOLDER_F_H6]`, `[PLACEHOLDER_P_H6]`, `[PLACEHOLDER_ETA_H6]` | Row `نمط حشد المصادر × زمن حشد المصادر` |

> ⚠️ **η²_p دائمًا تُحسب يدويًا:** `η²_p = SS_effect / (SS_effect + SS_error)`.

### 4.5 Post-hoc (لو دلّ التفاعل)

| Placeholder | مصدر |
|---|---|
| `[PLACEHOLDER_TUKEY_G1_G2]` | `ONEWAY PS_Post_Total BY Group /POSTHOC=TUKEY` → جدول Multiple Comparisons |
| `[PLACEHOLDER_TUKEY_G1_G3]` | نفس الشيء |
| ... (6 مقارنات ثنائية) | — |

### 4.6 جدول Between-Subjects Effects الموحد

| Source | Type III SS | df | MS | F | Sig. | η²_p |
|---|---|---|---|---|---|---|
| Pattern | [SS] | 1 | [MS] | `[F_H1]` / `[F_H4]` | `[P_H1]` / `[P_H4]` | `[ETA_H1]` / `[ETA_H4]` |
| Timing | [SS] | 1 | [MS] | `[F_H2]` / `[F_H5]` | `[P_H2]` / `[P_H5]` | `[ETA_H2]` / `[ETA_H5]` |
| Pattern*Timing | [SS] | 1 | [MS] | `[F_H3]` / `[F_H6]` | `[P_H3]` / `[P_H6]` | `[ETA_H3]` / `[ETA_H6]` |
| Error | [SS] | 76 | [MS] | — | — | — |
| Total | [SS] | 80 | — | — | — | — |

---

## 5. Mapping لـ `04_results_interpretation.md`

هذا الملف معظم محتواه تفسيري. الـ placeholders هنا نصية:

| Placeholder | النوع | مصدر |
|---|---|---|
| `[PLACEHOLDER_INTERP_H1]` | نص | تفسير نتيجة ف1 في ضوء النظرية + الدراسات السابقة |
| `[PLACEHOLDER_INTERP_H2]` ... `[PLACEHOLDER_INTERP_H6]` | نص | نفس الشيء لباقي الفروض |
| `[PLACEHOLDER_BEST_GROUP_PS]` | G# | المجموعة ذات أعلى متوسط في `PS_Post_Total` |
| `[PLACEHOLDER_BEST_GROUP_FLOW]` | G# | المجموعة ذات أعلى متوسط في `Flow_Post_Total` |
| `[PLACEHOLDER_WORST_GROUP_PS]` | G# | المجموعة ذات أقل متوسط |
| `[PLACEHOLDER_WORST_GROUP_FLOW]` | G# | نفس الشيء |

> بعض الـplaceholders المتبقية (18 إجمالي) ستكون إشارات متقاطعة لأرقام من `03_hypotheses_testing.md`.

---

## 6. Mapping لـ `05_qualitative_analysis.md`

هذا الملف يحوي 61 placeholder لأن فيه تحليل تفصيلي لكل بُعد من الأبعاد الثمانية وكل مهارة من الأربعة.

### 6.1 لكل بُعد من أبعاد التدفق (D1-D8)

| Placeholder | مصدر |
|---|---|
| `[PLACEHOLDER_MEAN_D<k>_G1..G4]` | `MEANS Flow_Post_D<k> BY Group` |
| `[PLACEHOLDER_F_PATTERN_D<k>]` | `GLM Flow_Post_D<k> BY Pattern Timing` → Row `نمط حشد المصادر` → F |
| `[PLACEHOLDER_P_PATTERN_D<k>]` | نفس الشيء → Sig. |
| `[PLACEHOLDER_F_TIMING_D<k>]` | Row `زمن حشد المصادر` → F |
| `[PLACEHOLDER_P_TIMING_D<k>]` | Sig. |
| `[PLACEHOLDER_F_INT_D<k>]` | Row `نمط حشد المصادر × زمن حشد المصادر` → F |
| `[PLACEHOLDER_P_INT_D<k>]` | Sig. |

### 6.2 لكل مهارة من مهارات حل المشكلات (Skill1-Skill4)

| Placeholder | مصدر |
|---|---|
| `[PLACEHOLDER_MEAN_SKILL<k>_G1..G4]` | `MEANS PS_Post_Skill<k> BY Group` |
| `[PLACEHOLDER_F_PATTERN_SKILL<k>]` ... | `GLM PS_Post_Skill<k> BY Pattern Timing` |

### 6.3 الأوامر الموحدة للتحليل الاستكشافي (موجودة بالفعل في `analysis.sps` الأقسام 8 و 9)

```sps
GLM Flow_Post_D1 BY Pattern Timing /DESIGN=Pattern Timing Pattern*Timing.
GLM Flow_Post_D2 BY Pattern Timing /DESIGN=Pattern Timing Pattern*Timing.
...
GLM Flow_Post_D8 BY Pattern Timing /DESIGN=Pattern Timing Pattern*Timing.

GLM PS_Post_Skill1 BY Pattern Timing /DESIGN=Pattern Timing Pattern*Timing.
...
GLM PS_Post_Skill4 BY Pattern Timing /DESIGN=Pattern Timing Pattern*Timing.
```

---

## 7. Mapping لـ `06_research_outputs.md`

| Placeholder | مصدر |
|---|---|
| `[PLACEHOLDER_FINAL_SUMMARY]` | ملخص نصي لكل النتائج |
| `[PLACEHOLDER_KEY_FINDINGS]` | قائمة النتائج الرئيسية |
| `[PLACEHOLDER_ALPHA_PS]` | `RELIABILITY PS_Post_Q01..Q30` → Cronbach's α |

---

## 8. Mapping لـ `07_recommendations.md`

| Placeholder | مصدر |
|---|---|
| `[PLACEHOLDER_REC_PRACTICAL]` | توصيات عملية بناءً على النتائج |
| `[PLACEHOLDER_REC_RESEARCH]` | توصيات بحثية |

> placeholders نصية، تُكتَب من الباحث بعد رؤية النتائج.

---

## 9. جدول التنفيذ (Checklist للملء)

بعد تشغيل `analysis.sps`، نملأ الـplaceholders بهذا الترتيب:

- [ ] 1. **الوصفي:** ملء `01_descriptive_stats.md` من `MEANS` و `FREQUENCIES`.
- [ ] 2. **الفروض:** ملء `03_hypotheses_testing.md` من `GLM` × 2 (6 فروض × 3 قيم = 18 رقم رئيسي).
- [ ] 3. **الأبعاد والمهارات:** ملء `05_qualitative_analysis.md` من `GLM` × 12 (8 أبعاد + 4 مهارات).
- [ ] 4. **التفسير:** كتابة `04_results_interpretation.md` (نصي بناءً على النتائج).
- [ ] 5. **المخرجات النهائية:** كتابة `06_research_outputs.md` + `07_recommendations.md` + `08_suggested_research.md`.

---

## 10. أمثلة مُعبَّأة (للتوضيح فقط — الأرقام الفعلية من PSPP)

### مثال 1: الفرض 3 (التفاعل × حل المشكلات)

**قبل الملء:**
> "يوجد تأثير دال إحصائيًا للتفاعل على حل المشكلات عند F=`[PLACEHOLDER_F_H3]`, p=`[PLACEHOLDER_P_H3]`, η²=`[PLACEHOLDER_ETA_H3]`."

**بعد الملء (لو كانت الأرقام F=4.85, p=0.031, η²=0.060):**
> "يوجد تأثير دال إحصائيًا للتفاعل على حل المشكلات عند F=4.85, p=0.031, η²=0.060."

### مثال 2: جدول وصفي لحل المشكلات

**قبل الملء:**

| المجموعة | N | Mean | SD |
|---|---|---|---|
| G1 | `[N_G1]` | `[MEAN_PS_G1]` | `[SD_PS_G1]` |
| G2 | `[N_G2]` | `[MEAN_PS_G2]` | `[SD_PS_G2]` |
| ... | ... | ... | ... |

**بعد الملء (أمثلة):**

| المجموعة | N | Mean | SD |
|---|---|---|---|
| G1 | 20 | 20.45 | 2.35 |
| G2 | 20 | 19.80 | 2.71 |
| G3 | 20 | 23.30 | 2.05 |
| G4 | 20 | 21.55 | 2.49 |

---

## 11. الخلاصة

- **2 أمر GLM رئيسي** يغطيان الفروض الـ6 (PS + Flow).
- **12 أمر GLM إضافي** للأبعاد والمهارات.
- **2 أمر MEANS موحد** يملأ كل الوصفي.
- **2 أمر ONEWAY** للتكافؤ قبليًا.
- **9 أوامر RELIABILITY** للثبات (1 لـMCQ + 1 لـFlow الكلي + 8 للأبعاد + 4 للمهارات).
- **2 أمر EXAMINE** لاختبارات الافتراضات.
- **2 أمر CROSSTABS/ONEWAY** لـManipulation Checks.

**الإجمالي:** ~36 أمر إحصائي في `analysis.sps`، تُنتج كل الأرقام اللازمة لـ `fasl_4`.

---

## 12. الخطوة التالية (بعد اكتمال خطط e7sa_4)

1. تنفيذ Pipeline (من [03 — Data Prep](03_data_preparation_pipeline.md)).
2. تشغيل `analysis.sps` في PSPPire (من [05 — Analysis Plan](05_pspp_spss_analysis_plan.md)).
3. نقل الأرقام إلى `fasl_4/master_plan/sub_plans/*` باستخدام هذا الـ mapping.
4. كتابة الفصل الرابع النهائي.
