// ═══════════════════════════════════════════════════════════
//  سكريبت محاكاة استجابات 80 طالب على الفورم التاني
//  الطلاب بيجاوبوا بالإجابات الصحيحة الحقيقية (من فورم 1)
//  مع نسبة أخطاء واقعية لأنهم لسه بيتعلموا
// ═══════════════════════════════════════════════════════════

function simulateStudentResponses() {

    // ╔══════════════════════════════════════════════════╗
    // ║              ⚙️ الإعدادات الرئيسية               ║
    // ╚══════════════════════════════════════════════════╝
  
    var FORM_URL = "https://docs.google.com/forms/d/1wC1jPfQjbVj7rvu-WPLj-7PkpV_HweYWwwFx5KT3GLs/edit";
    var NUM_STUDENTS = 80;
  
    // متوسط مستوى الطلاب (0.0 - 1.0)
    // 0.65 يعني المتوسط حوالي 65%
    var MEAN_SKILL = 0.65;
  
    // مدى التفاوت بين الطلاب
    // 0.15 يعني فيه طلاب ممتازين وطلاب ضعاف
    var SKILL_SPREAD = 0.15;
  
    // ══════════════════════════════════════════════════
  
    // ═══════════════════════════════════════════════════════════
    //  الإجابات الصحيحة الحقيقية (المأخوذة من فورم 1)
    //  0 = الاختيار الأول (A)
    //  1 = الاختيار الثاني (B)
    //  2 = الاختيار الثالث (C)
    //  3 = الاختيار الرابع (D)
    // ═══════════════════════════════════════════════════════════
  
    var CORRECT_ANSWERS = [
      0, // Q31: A - معايير أخلاقية ومنصفة لتحديد الأولوية
      1, // Q32: B - معتقدات دينية أو ثقافية راسخة
      1, // Q33: B - دراسة مسحية تقارن مجموعات بخلفيات دينية مختلفة
      3, // Q34: D - انتهاك مبدأ الموافقة المستنيرة وخداع المشاركين
      3, // Q35: D - حملات توعية بالتعاون مع رجال الدين
      2, // Q36: C - انعدام العدالة في توزيع الموارد الصحية
      0, // Q37: A - الخوف من الأعراض الجانبية
      3, // Q38: D - مقابلات معمقة واستبيانات مع المرضى الرافضين
      1, // Q39: B - انتشار الفقر مع ضعف الرقابة القانونية
      3, // Q40: D - تطبيق الموافقة المستنيرة بشفافية كاملة
      2, // Q41: C - التعارض بين استقلالية المريضة وواجب الطبيب
      3, // Q42: D - تعارض فكرة موت الدماغ مع معتقداتهم الدينية
      3, // Q43: D - دراسة ميدانية لتحليل الوضع الاقتصادي
      2, // Q44: C - مقابلات منظمة مع العائلات الرافضة
      0, // Q45: A - تشديد العقوبات + دعم اقتصادي للفقراء
      3, // Q46: D - الصراع بين حاجة المال وتسليع الجسد
      1, // Q47: B - ضغط العمل الشديد ونظام المواعيد
      3, // Q48: D - مراقبة جداول العمل ومقارنة برضا المرضى
      2, // Q49: C - حملات توعية ودعم نفسي للعائلات
      1, // Q50: B - ورش عمل لتدريب الأطباء على التواصل
      3, // Q51: D - انتهاك المعايير الأخلاقية والموافقة المستنيرة
      3, // Q52: D - تعارض مع قَسَم أبقراط والمعتقدات الدينية
      1, // Q53: B - استبيان مجهول بسيناريوهات أخلاقية
      1, // Q54: B - حوار شامل ثم تحويل لطبيب آخر
      3, // Q55: D - حملات توعية وطنية شاملة
      3, // Q56: D - انتهاك صارخ لمبدأ العدالة والمساواة
      1, // Q57: B - نقص الوعي العام ومفاهيم خاطئة
      3, // Q58: D - استبيان يسأل الناس عن مخاوفهم
      3, // Q59: D - نظام فرز طبي حسب خطورة الحالة
      2  // Q60: C - لجنة أخلاقيات بحث وسياسات صارمة
    ];
  
    // ═══════════════════════════════════════════════════════════
    //  صعوبة كل سؤال (0.0 = سهل جداً → 1.0 = صعب جداً)
    //  الأسئلة المباشرة أسهل، والأسئلة البحثية أصعب
    // ═══════════════════════════════════════════════════════════
  
    var DIFFICULTY = [
      0.25, // Q31: سهل - تحديد المعضلة واضح
      0.40, // Q32: متوسط - فرض يحتاج تفكير
      0.45, // Q33: متوسط/صعب - اختيار منهج بحثي
      0.20, // Q34: سهل - الموافقة المستنيرة واضحة
      0.40, // Q35: متوسط - اختيار الحل الأنسب
      0.25, // Q36: سهل - العدالة في الرعاية
      0.20, // Q37: سهل - الخوف من التجارب واضح
      0.55, // Q38: صعب - اختيار المنهج البحثي الصحيح
      0.35, // Q39: متوسط - تحليل الظاهرة
      0.40, // Q40: متوسط - اختيار الحل الأخلاقي
      0.35, // Q41: متوسط - تحديد التعارض الأخلاقي
      0.30, // Q42: متوسط - فهم موقف العائلات
      0.50, // Q43: صعب - اختيار المنهج البحثي
      0.45, // Q44: متوسط/صعب - المنهج البحثي
      0.25, // Q45: سهل - الحل واضح ومنطقي
      0.35, // Q46: متوسط - تحديد المشكلة الأخلاقية
      0.30, // Q47: متوسط - تفسير سلوك الأطباء
      0.50, // Q48: صعب - اختبار الفرضية
      0.35, // Q49: متوسط - اختيار الحل المناسب
      0.35, // Q50: متوسط - الحل المستدام
      0.40, // Q51: متوسط - تحديد المشكلة
      0.45, // Q52: متوسط/صعب - فهم موقف الأطباء
      0.30, // Q53: متوسط - اختيار المنهج
      0.35, // Q54: متوسط - حل التعارض
      0.25, // Q55: سهل - الاستراتيجية واضحة
      0.35, // Q56: متوسط - تحديد المشكلة
      0.40, // Q57: متوسط - تفسير الظاهرة
      0.50, // Q58: صعب - سؤال جديد
      0.35, // Q59: متوسط - الحل العملي
      0.25  // Q60: سهل - الإجراء التصحيحي واضح
    ];
  
    // ═══════════════════════════════════════════════════════════
    //  الإجابة الخاطئة الأكثر جاذبية لكل سؤال
    //  (الإجابة اللي الطالب الضعيف هيميل ليها)
    //  -1 يعني مفيش إجابة خاطئة مفضلة (اختيار عشوائي)
    // ═══════════════════════════════════════════════════════════
  
    var ATTRACTIVE_WRONG = [
      1, // Q31: نقص التمويل (يبدو منطقي لكن سطحي)
      0, // Q32: عدم معرفة طريقة التسجيل
      2, // Q33: سؤال الأطباء (يبدو طريقة بحثية لكن ضعيفة)
      0, // Q34: التكلفة المالية
      1, // Q35: إجبار المواطنين بالقانون
      0, // Q36: عدم وجود أطباء كافيين
      2, // Q37: ارتفاع التكلفة
      2, // Q38: فحوصات دم (تبدو علمية لكن غير مناسبة)
      2, // Q39: نقص الوعي التعليمي
      1, // Q40: مبالغ مالية ضخمة (حل سريع لكن غير أخلاقي)
      0, // Q41: اعتراض الأسرة (جزء من المشكلة لكن مش الجوهر)
      0, // Q42: عدم فهم المصطلحات
      1, // Q43: مراجعة قوائم الطعام
      0, // Q44: قياس ضغط الدم (يبدو طبي لكن غير مناسب)
      3, // Q45: تجاهل المشكلة
      1, // Q46: رفض الأسرة
      2, // Q47: ارتفاع أعداد المرضى (قريب لكن مش السبب الرئيسي)
      1, // Q48: زيادة عدد المستشفيات
      0, // Q49: إلغاء معيار موت الدماغ
      2, // Q50: تقليل عدد المرضى (حل مؤقت مش مستدام)
      0, // Q51: ارتفاع عدد العمليات
      2, // Q52: قلة الخبرة
      3, // Q53: سؤال المرضى
      0, // Q54: تجاهل رغبة المريض
      0, // Q55: إغلاق مراكز
      2, // Q56: ارتفاع أعداد المرضى
      0, // Q57: كراهية المستشفيات
      1, // Q58: زيادة عدد المستشفيات
      1, // Q59: أولوية للأغنياء
      3  // Q60: تجاهل الموضوع
    ];
  
    // ═══════════════════════════════════════════════════════════
    //                    🚀 بداية التنفيذ
    // ═══════════════════════════════════════════════════════════
  
    Logger.log("═══════════════════════════════════════════");
    Logger.log("🚀 بدء محاكاة استجابات " + NUM_STUDENTS + " طالب");
    Logger.log("═══════════════════════════════════════════");
  
    // فتح الفورم
    var formId = extractFormId(FORM_URL);
    var form = FormApp.openById(formId);
  
    Logger.log("📋 اسم الفورم: " + form.getTitle());
    Logger.log("📝 هل هو Quiz: " + form.isQuiz());
  
    // استخراج أسئلة MCQ فقط
    var items = form.getItems();
    var mcqItems = [];
  
    for (var i = 0; i < items.length; i++) {
      var type = items[i].getType();
      if (type === FormApp.ItemType.MULTIPLE_CHOICE) {
        mcqItems.push(items[i].asMultipleChoiceItem());
      }
    }
  
    var numQuestions = mcqItems.length;
    Logger.log("📊 عدد أسئلة MCQ: " + numQuestions);
  
    // ─── التحقق ───
    if (numQuestions !== CORRECT_ANSWERS.length) {
      Logger.log("❌ خطأ: عدد الأسئلة (" + numQuestions +
        ") مش متطابق مع عدد الإجابات المحددة (" + CORRECT_ANSWERS.length + ")");
      Logger.log("💡 تأكد إن الفورم فيه " + CORRECT_ANSWERS.length + " سؤال MCQ");
      return;
    }
  
    // ─── التحقق من أول 3 أسئلة ───
    Logger.log("");
    Logger.log("🔍 التحقق من أول 3 أسئلة:");
    for (var v = 0; v < Math.min(3, numQuestions); v++) {
      var choices = mcqItems[v].getChoices();
      Logger.log("  Q" + (v + 1) + ": " + mcqItems[v].getTitle().substring(0, 50) + "...");
      Logger.log("  الإجابة الصحيحة المحددة: " + getChoiceLabel(CORRECT_ANSWERS[v]) +
        " = " + choices[CORRECT_ANSWERS[v]].getValue().substring(0, 40) + "...");
    }
    Logger.log("");
  
    // ═══════════════════════════════════════════════════════════
    //           توليد مستويات الطلاب (منحنى طبيعي)
    // ═══════════════════════════════════════════════════════════
  
    var studentProfiles = generateStudentProfiles(NUM_STUDENTS, MEAN_SKILL, SKILL_SPREAD);
  
    Logger.log("📊 توزيع مستويات الطلاب:");
    Logger.log("  🌟 ممتاز (>85%): " + studentProfiles.filter(function (s) { return s.skill > 0.85; }).length + " طالب");
    Logger.log("  ✅ جيد جداً (75-85%): " + studentProfiles.filter(function (s) { return s.skill > 0.75 && s.skill <= 0.85; }).length + " طالب");
    Logger.log("  📗 جيد (65-75%): " + studentProfiles.filter(function (s) { return s.skill > 0.65 && s.skill <= 0.75; }).length + " طالب");
    Logger.log("  📙 مقبول (50-65%): " + studentProfiles.filter(function (s) { return s.skill > 0.50 && s.skill <= 0.65; }).length + " طالب");
    Logger.log("  📕 ضعيف (<50%): " + studentProfiles.filter(function (s) { return s.skill <= 0.50; }).length + " طالب");
    Logger.log("");
  
    // ═══════════════════════════════════════════════════════════
    //              إرسال الاستجابات
    // ═══════════════════════════════════════════════════════════
  
    var allScores = [];
    var questionCorrectCount = new Array(numQuestions).fill(0);
  
    for (var s = 0; s < NUM_STUDENTS; s++) {
      var student = studentProfiles[s];
      var response = form.createResponse();
      var score = 0;
      var studentAnswers = [];
  
      for (var q = 0; q < numQuestions; q++) {
        var item = mcqItems[q];
        var choices = item.getChoices();
        var numChoices = choices.length;
        var correctIdx = CORRECT_ANSWERS[q];
        var diff = DIFFICULTY[q];
        var attractiveWrong = ATTRACTIVE_WRONG[q];
  
        // ─── حساب احتمال الإجابة الصحيحة ───
        var probCorrect = calculateProbability(student.skill, diff, student.consistency);
  
        // ─── تأثير التعب (الأسئلة الأخيرة أصعب شوية) ───
        if (q > 20) {
          probCorrect *= (1 - student.fatigueRate * (q - 20) / 10);
        }
  
        probCorrect = Math.max(0.10, Math.min(0.95, probCorrect));
  
        // ─── اختيار الإجابة ───
        var chosenIdx;
        if (Math.random() < probCorrect) {
          // إجابة صحيحة
          chosenIdx = correctIdx;
          score++;
          questionCorrectCount[q]++;
        } else {
          // إجابة خاطئة - اختيار واقعي
          chosenIdx = pickWrongAnswer(correctIdx, numChoices, attractiveWrong, student.skill);
        }
  
        response.withItemResponse(item.createResponse(choices[chosenIdx].getValue()));
        studentAnswers.push(getChoiceLabel(chosenIdx));
      }
  
      // ─── إرسال الاستجابة ───
      response.submit();
      allScores.push(score);
  
      var percentage = (score / numQuestions * 100).toFixed(0);
      var grade = getGrade(percentage);
  
      Logger.log("👤 طالب " + padNumber(s + 1, 2) + "/" + NUM_STUDENTS +
        " | المستوى: " + (student.skill * 100).toFixed(0) + "%" +
        " | الدرجة: " + score + "/" + numQuestions +
        " (" + percentage + "%) " + grade);
  
      // ─── تأخير بين كل إرسال (300-800 مللي ثانية) ───
      if (s < NUM_STUDENTS - 1) {
        Utilities.sleep(300 + Math.floor(Math.random() * 500));
      }
    }
  
    // ═══════════════════════════════════════════════════════════
    //                📊 الإحصائيات النهائية
    // ═══════════════════════════════════════════════════════════
  
    printStatistics(allScores, numQuestions, questionCorrectCount, mcqItems, NUM_STUDENTS);
  }
  
  
  // ═══════════════════════════════════════════════════════════
  //              الدوال المساعدة
  // ═══════════════════════════════════════════════════════════
  
  
  // ─── حساب احتمال الإجابة الصحيحة ───
  function calculateProbability(skill, difficulty, consistency) {
    // النموذج:
    // الأساس = 0.25 (احتمال التخمين العشوائي لـ 4 اختيارات)
    // الباقي يعتمد على مهارة الطالب وصعوبة السؤال
  
    var base = 0.25; // تخمين عشوائي
    var skillEffect = 0.70 * skill * (1 - difficulty * 0.5);
  
    // الطلاب الأكثر ثباتاً أقرب للمتوقع
    // الطلاب المتذبذبون قد يفاجئوا (للأفضل أو الأسوأ)
    var randomFactor = (Math.random() - 0.5) * (1 - consistency) * 0.3;
  
    var prob = base + skillEffect + randomFactor;
    return Math.max(0.10, Math.min(0.95, prob));
  }
  
  
  // ─── اختيار إجابة خاطئة بشكل واقعي ───
  function pickWrongAnswer(correctIdx, numChoices, attractiveWrongIdx, skill) {
    var wrongChoices = [];
    for (var c = 0; c < numChoices; c++) {
      if (c !== correctIdx) wrongChoices.push(c);
    }
  
    // الطلاب الضعاف يميلون أكثر للإجابة الخاطئة الجاذبة
    // الطلاب الأقوياء (لو غلطوا) ممكن يختاروا أي إجابة
    var attractiveProbability = 0.6 - skill * 0.3;
    // يعني طالب ضعيف (skill=0.3): 51% يختار الجاذبة
    // طالب قوي (skill=0.8): 36% يختار الجاذبة
  
    if (attractiveWrongIdx !== correctIdx &&
      attractiveWrongIdx >= 0 &&
      attractiveWrongIdx < numChoices &&
      Math.random() < attractiveProbability) {
      return attractiveWrongIdx;
    }
  
    // اختيار عشوائي من الباقي
    return wrongChoices[Math.floor(Math.random() * wrongChoices.length)];
  }
  
  
  // ─── توليد بروفايلات الطلاب ───
  function generateStudentProfiles(numStudents, meanSkill, spread) {
    var profiles = [];
  
    for (var i = 0; i < numStudents; i++) {
      // Box-Muller transform للتوزيع الطبيعي
      var u1 = Math.random();
      var u2 = Math.random();
      var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  
      var skill = meanSkill + z * spread;
      skill = Math.max(0.20, Math.min(0.95, skill));
  
      // ثبات الطالب (بعض الطلاب أداؤهم ثابت وبعضهم متذبذب)
      var consistency = 0.5 + Math.random() * 0.5; // 0.5 - 1.0
  
      // معدل التعب (بعض الطلاب يتعبون أسرع)
      var fatigueRate = Math.random() * 0.15; // 0 - 0.15
  
      profiles.push({
        skill: skill,
        consistency: consistency,
        fatigueRate: fatigueRate
      });
    }
  
    // ترتيب حسب المستوى (الأعلى أولاً) للتسجيل
    profiles.sort(function (a, b) { return b.skill - a.skill; });
  
    return profiles;
  }
  
  
  // ─── طباعة الإحصائيات ───
  function printStatistics(scores, numQuestions, questionCorrectCount, mcqItems, numStudents) {
    var sum = scores.reduce(function (a, b) { return a + b; }, 0);
    var avg = sum / scores.length;
    var max = Math.max.apply(null, scores);
    var min = Math.min.apply(null, scores);
  
    // الانحراف المعياري
    var variance = scores.reduce(function (s, score) {
      return s + Math.pow(score - avg, 2);
    }, 0) / scores.length;
    var stdDev = Math.sqrt(variance);
  
    // الوسيط
    var sorted = scores.slice().sort(function (a, b) { return a - b; });
    var median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
  
    // توزيع التقديرات
    var grades = { excellent: 0, veryGood: 0, good: 0, pass: 0, fail: 0 };
    for (var i = 0; i < scores.length; i++) {
      var pct = scores[i] / numQuestions * 100;
      if (pct >= 85) grades.excellent++;
      else if (pct >= 75) grades.veryGood++;
      else if (pct >= 65) grades.good++;
      else if (pct >= 50) grades.pass++;
      else grades.fail++;
    }
  
    Logger.log("");
    Logger.log("╔══════════════════════════════════════════════════╗");
    Logger.log("║            📊 الإحصائيات النهائية               ║");
    Logger.log("╠══════════════════════════════════════════════════╣");
    Logger.log("║                                                  ║");
    Logger.log("║  👥 عدد الطلاب:        " + padNumber(numStudents, 3) + "                      ║");
    Logger.log("║  📝 عدد الأسئلة:       " + padNumber(numQuestions, 3) + "                      ║");
    Logger.log("║                                                  ║");
    Logger.log("║  📈 أعلى درجة:         " + max + "/" + numQuestions + " (" + (max / numQuestions * 100).toFixed(0) + "%)            ║");
    Logger.log("║  📉 أقل درجة:          " + min + "/" + numQuestions + " (" + (min / numQuestions * 100).toFixed(0) + "%)            ║");
    Logger.log("║  📊 المتوسط:           " + avg.toFixed(1) + "/" + numQuestions + " (" + (avg / numQuestions * 100).toFixed(1) + "%)       ║");
    Logger.log("║  📐 الوسيط:            " + median + "/" + numQuestions + "                       ║");
    Logger.log("║  📏 الانحراف المعياري:  " + stdDev.toFixed(2) + "                        ║");
    Logger.log("║                                                  ║");
    Logger.log("║  ── توزيع التقديرات ──                          ║");
    Logger.log("║  🌟 ممتاز (≥85%):      " + padNumber(grades.excellent, 3) + " طالب (" + (grades.excellent / numStudents * 100).toFixed(0) + "%)          ║");
    Logger.log("║  ✅ جيد جداً (75-84%):  " + padNumber(grades.veryGood, 3) + " طالب (" + (grades.veryGood / numStudents * 100).toFixed(0) + "%)          ║");
    Logger.log("║  📗 جيد (65-74%):       " + padNumber(grades.good, 3) + " طالب (" + (grades.good / numStudents * 100).toFixed(0) + "%)          ║");
    Logger.log("║  📙 مقبول (50-64%):     " + padNumber(grades.pass, 3) + " طالب (" + (grades.pass / numStudents * 100).toFixed(0) + "%)          ║");
    Logger.log("║  📕 ضعيف (<50%):        " + padNumber(grades.fail, 3) + " طالب (" + (grades.fail / numStudents * 100).toFixed(0) + "%)          ║");
    Logger.log("║                                                  ║");
    Logger.log("╚══════════════════════════════════════════════════╝");
  
    // ─── تحليل صعوبة الأسئلة ───
    Logger.log("");
    Logger.log("📊 تحليل الأسئلة (نسبة الإجابة الصحيحة):");
    Logger.log("─────────────────────────────────────────");
  
    var easiest = { idx: 0, pct: 0 };
    var hardest = { idx: 0, pct: 100 };
  
    for (var q = 0; q < numQuestions; q++) {
      var pct = (questionCorrectCount[q] / numStudents * 100).toFixed(0);
      var bar = createBar(questionCorrectCount[q], numStudents);
      var diffLabel = pct >= 80 ? "سهل" : (pct >= 60 ? "متوسط" : (pct >= 40 ? "صعب" : "صعب جداً"));
  
      Logger.log("  Q" + padNumber(q + 1, 2) + ": " + bar + " " + padNumber(pct, 3) + "% (" +
        questionCorrectCount[q] + "/" + numStudents + ") - " + diffLabel);
  
      if (parseFloat(pct) > easiest.pct) { easiest = { idx: q, pct: parseFloat(pct) }; }
      if (parseFloat(pct) < hardest.pct) { hardest = { idx: q, pct: parseFloat(pct) }; }
    }
  
    Logger.log("");
    Logger.log("  🟢 أسهل سؤال: Q" + (easiest.idx + 1) + " (" + easiest.pct + "%)");
    Logger.log("  🔴 أصعب سؤال: Q" + (hardest.idx + 1) + " (" + hardest.pct + "%)");
  
    Logger.log("");
    Logger.log("✅ تم إرسال جميع الاستجابات بنجاح!");
    Logger.log("📋 يمكنك مراجعة الردود في: " + form.getSummaryUrl());
  }
  
  
  // ─── دوال مساعدة صغيرة ───
  
  function getChoiceLabel(index) {
    var labels = ["A", "B", "C", "D", "E", "F"];
    return index < labels.length ? labels[index] : String(index + 1);
  }
  
  function getGrade(percentage) {
    percentage = parseFloat(percentage);
    if (percentage >= 85) return "🌟";
    if (percentage >= 75) return "✅";
    if (percentage >= 65) return "📗";
    if (percentage >= 50) return "📙";
    return "📕";
  }
  
  function padNumber(num, length) {
    var str = String(num);
    while (str.length < length) str = " " + str;
    return str;
  }
  
  function createBar(count, total) {
    var pct = count / total;
    var barLength = 20;
    var filled = Math.round(pct * barLength);
    var bar = "";
    for (var i = 0; i < barLength; i++) {
      bar += i < filled ? "█" : "░";
    }
    return bar;
  }
  
  function extractFormId(url) {
    url = url.trim();
    var match = url.match(/\/forms\/d\/([a-zA-Z0-9-_]+)/);
    if (match) return match[1];
    match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) return match[1];
    if (/^[a-zA-Z0-9-_]{20,}$/.test(url)) return url;
    throw new Error("مش قادر أستخرج ID: " + url);
  }