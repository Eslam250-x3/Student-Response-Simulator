* ================================================================
* analysis.sps — التحليل الإحصائي للفصل الرابع
* البحث: التفاعل بين نمط حشد المصادر (تنافسي/تشاركي) وزمنه
*        ببيئة تعلم إلكتروني وأثره في حل المشكلات والتدفق الذهني
* الباحث: إسلام محمد عبد النبي أحمد — ماجستير تكنولوجيا التعليم
* المستهدف: PSPPire 2.0+ / SPSS 28+ (يعمل على كلاهما)
* ملاحظة: استُخدم GLM بدل UNIANOVA لأن PSPP لم ينفذ UNIANOVA بعد.
*          GLM و UNIANOVA يعطيان نفس النتائج للتصميم العاملي.
* ================================================================

* ----- 0. تجهيز الداتا -----

GET FILE='/Users/user/Documents/Student-Response-Simulator/e7sa_4/outputs/data_final.sav'.
DATASET NAME ds WINDOW=FRONT.

* استبعاد المنسحبين (16 طالب → العينة 80) ثم تثبيت الحذف.
SELECT IF (Is_Dropout = 0).
EXECUTE.

* ----- 1. التحقق الأولي -----

FREQUENCIES VARIABLES=Group Pattern Timing Team
  /ORDER=ANALYSIS.

DESCRIPTIVES VARIABLES=PS_Pre_Total PS_Post_Total Flow_Pre_Total Flow_Post_Total Late_Count Task_Total
  /STATISTICS=MEAN STDDEV MIN MAX.

* ----- 2. الإحصاء الوصفي -----

MEANS TABLES=PS_Post_Total Flow_Post_Total BY Group
  /CELLS=COUNT MEAN STDDEV MIN MAX.

MEANS TABLES=PS_Post_Skill1 PS_Post_Skill2 PS_Post_Skill3 PS_Post_Skill4 BY Group
  /CELLS=COUNT MEAN STDDEV.

MEANS TABLES=Flow_Post_D1 Flow_Post_D2 Flow_Post_D3 Flow_Post_D4
              Flow_Post_D5 Flow_Post_D6 Flow_Post_D7 Flow_Post_D8 BY Group
  /CELLS=COUNT MEAN STDDEV.

MEANS TABLES=PS_Post_Total Flow_Post_Total BY Pattern
  /CELLS=COUNT MEAN STDDEV.

MEANS TABLES=PS_Post_Total Flow_Post_Total BY Timing
  /CELLS=COUNT MEAN STDDEV.

* ----- 3. الثبات (Reliability) -----

RELIABILITY
  /VARIABLES=PS_Post_Q01 PS_Post_Q02 PS_Post_Q03 PS_Post_Q04 PS_Post_Q05
             PS_Post_Q06 PS_Post_Q07 PS_Post_Q08 PS_Post_Q09 PS_Post_Q10
             PS_Post_Q11 PS_Post_Q12 PS_Post_Q13 PS_Post_Q14 PS_Post_Q15
             PS_Post_Q16 PS_Post_Q17 PS_Post_Q18 PS_Post_Q19 PS_Post_Q20
             PS_Post_Q21 PS_Post_Q22 PS_Post_Q23 PS_Post_Q24 PS_Post_Q25
             PS_Post_Q26 PS_Post_Q27 PS_Post_Q28 PS_Post_Q29 PS_Post_Q30
  /SCALE('حل المشكلات — بعدي (30 فقرة)') ALL
  /MODEL=ALPHA.

RELIABILITY
  /VARIABLES=Flow_Post_I01 TO Flow_Post_I56
  /SCALE('التدفق الذهني — بعدي (56 فقرة)') ALL
  /MODEL=ALPHA.

RELIABILITY
  /VARIABLES=Flow_Post_I01 Flow_Post_I02 Flow_Post_I03 Flow_Post_I04
             Flow_Post_I05 Flow_Post_I06 Flow_Post_I07
  /SCALE('D1 — وضوح وتحديد الأهداف') ALL
  /MODEL=ALPHA.

RELIABILITY
  /VARIABLES=Flow_Post_I08 Flow_Post_I09 Flow_Post_I10 Flow_Post_I11
             Flow_Post_I12 Flow_Post_I13 Flow_Post_I14
  /SCALE('D2 — مستوى النشاط والتركيز') ALL
  /MODEL=ALPHA.

RELIABILITY
  /VARIABLES=Flow_Post_I15 Flow_Post_I16 Flow_Post_I17 Flow_Post_I18
             Flow_Post_I19 Flow_Post_I20 Flow_Post_I21
  /SCALE('D3 — الشعور بالكفاءة والتحكم') ALL
  /MODEL=ALPHA.

RELIABILITY
  /VARIABLES=Flow_Post_I22 Flow_Post_I23 Flow_Post_I24 Flow_Post_I25
             Flow_Post_I26 Flow_Post_I27 Flow_Post_I28
  /SCALE('D4 — التركيز الإدراكي') ALL
  /MODEL=ALPHA.

RELIABILITY
  /VARIABLES=Flow_Post_I29 Flow_Post_I30 Flow_Post_I31 Flow_Post_I32
             Flow_Post_I33 Flow_Post_I34 Flow_Post_I35
  /SCALE('D5 — الشعور بالثقة في الأداء') ALL
  /MODEL=ALPHA.

RELIABILITY
  /VARIABLES=Flow_Post_I36 Flow_Post_I37 Flow_Post_I38 Flow_Post_I39
             Flow_Post_I40 Flow_Post_I41 Flow_Post_I42
  /SCALE('D6 — فقدان الوعي بالذات') ALL
  /MODEL=ALPHA.

RELIABILITY
  /VARIABLES=Flow_Post_I43 Flow_Post_I44 Flow_Post_I45 Flow_Post_I46
             Flow_Post_I47 Flow_Post_I48 Flow_Post_I49
  /SCALE('D7 — الشعور باستغراق الزمن') ALL
  /MODEL=ALPHA.

RELIABILITY
  /VARIABLES=Flow_Post_I50 Flow_Post_I51 Flow_Post_I52 Flow_Post_I53
             Flow_Post_I54 Flow_Post_I55 Flow_Post_I56
  /SCALE('D8 — اللذة والرضا والاستمتاع') ALL
  /MODEL=ALPHA.

* ----- 4. اختبارات افتراضات ANOVA -----

EXAMINE VARIABLES=PS_Post_Total Flow_Post_Total BY Group
  /PLOT=BOXPLOT NPPLOT
  /STATISTICS=DESCRIPTIVES
  /MISSING=LISTWISE.

ONEWAY PS_Post_Total BY Group
  /STATISTICS=HOMOGENEITY DESCRIPTIVES.

ONEWAY Flow_Post_Total BY Group
  /STATISTICS=HOMOGENEITY DESCRIPTIVES.

* ----- 5. تكافؤ المجموعات قبل التجربة -----

ONEWAY PS_Pre_Total BY Group
  /STATISTICS=DESCRIPTIVES HOMOGENEITY
  /MISSING=ANALYSIS.

ONEWAY Flow_Pre_Total BY Group
  /STATISTICS=DESCRIPTIVES HOMOGENEITY
  /MISSING=ANALYSIS.

* ----- 6. Manipulation Checks -----

ONEWAY Late_Count BY Timing
  /STATISTICS=DESCRIPTIVES HOMOGENEITY
  /MISSING=ANALYSIS.

CROSSTABS
  /TABLES=Late_Count BY Timing
  /STATISTICS=CHISQ
  /CELLS=COUNT ROW COLUMN.

ONEWAY Task_Total BY Group
  /STATISTICS=DESCRIPTIVES.

TEMPORARY.
SELECT IF (Pattern = 2).
ONEWAY Flow_Post_Total BY Team
  /STATISTICS=DESCRIPTIVES.

TEMPORARY.
SELECT IF (Pattern = 2).
ONEWAY PS_Post_Total BY Team
  /STATISTICS=DESCRIPTIVES.

* ================================================================
* 7. الاختبار الرئيسي — Two-way ANOVA عبر GLM
* ================================================================

* ----- 7.1 حل المشكلات (الفروض ف1, ف2, ف3) -----

GLM PS_Post_Total BY Pattern Timing
  /DESIGN=Pattern Timing Pattern*Timing.

* ----- 7.2 التدفق الذهني (الفروض ف4, ف5, ف6) -----

GLM Flow_Post_Total BY Pattern Timing
  /DESIGN=Pattern Timing Pattern*Timing.

* ----- 7.3 Tukey HSD للمجموعات الأربع مباشرة -----

ONEWAY PS_Post_Total BY Group
  /POSTHOC=TUKEY ALPHA(0.05)
  /STATISTICS=DESCRIPTIVES.

ONEWAY Flow_Post_Total BY Group
  /POSTHOC=TUKEY ALPHA(0.05)
  /STATISTICS=DESCRIPTIVES.

* ================================================================
* 8. تحليل استكشافي — الأبعاد الثمانية للتدفق
* ================================================================

GLM Flow_Post_D1 BY Pattern Timing /DESIGN=Pattern Timing Pattern*Timing.
GLM Flow_Post_D2 BY Pattern Timing /DESIGN=Pattern Timing Pattern*Timing.
GLM Flow_Post_D3 BY Pattern Timing /DESIGN=Pattern Timing Pattern*Timing.
GLM Flow_Post_D4 BY Pattern Timing /DESIGN=Pattern Timing Pattern*Timing.
GLM Flow_Post_D5 BY Pattern Timing /DESIGN=Pattern Timing Pattern*Timing.
GLM Flow_Post_D6 BY Pattern Timing /DESIGN=Pattern Timing Pattern*Timing.
GLM Flow_Post_D7 BY Pattern Timing /DESIGN=Pattern Timing Pattern*Timing.
GLM Flow_Post_D8 BY Pattern Timing /DESIGN=Pattern Timing Pattern*Timing.

* ================================================================
* 9. تحليل استكشافي — المهارات الأربع لحل المشكلات
* ================================================================

GLM PS_Post_Skill1 BY Pattern Timing /DESIGN=Pattern Timing Pattern*Timing.
GLM PS_Post_Skill2 BY Pattern Timing /DESIGN=Pattern Timing Pattern*Timing.
GLM PS_Post_Skill3 BY Pattern Timing /DESIGN=Pattern Timing Pattern*Timing.
GLM PS_Post_Skill4 BY Pattern Timing /DESIGN=Pattern Timing Pattern*Timing.

* ================================================================
* 10. الرسوم البيانية (BAR SIMPLE للمجموعات الأربع)
* ================================================================

GRAPH /BAR(SIMPLE)=MEAN(PS_Post_Total) BY Group.

GRAPH /BAR(SIMPLE)=MEAN(Flow_Post_Total) BY Group.

* ================================================================
* انتهى analysis.sps
* ----------------------------------------------------------------
* ملاحظات:
*   - GLM في PSPP يعطي جدول "Tests of Between-Subjects Effects"
*     مع SS, df, MS, F, Sig. (بدون Partial η² مباشرة).
*   - لحساب Partial η²: η²_p = SS_factor / (SS_factor + SS_error)
*     مثال: η²_p للنمط = SS_Pattern / (SS_Pattern + SS_Error)
*   - في SPSS الكامل: UNIANOVA ... /PRINT=ETASQ يحسبها مباشرة.
*   - راجع analysis_output.txt بعد التشغيل وجدول الربط في:
*     e7sa_4/sub_plans/07_outputs_to_fasl4_mapping.md
* ================================================================
