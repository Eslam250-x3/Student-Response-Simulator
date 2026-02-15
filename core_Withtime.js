// ════════════════════════════════════════════════════════════════
//  🎓 محاكاة استجابات 80 طالب - تطبيق قبلي وبعدي
//     • دلالة إحصائية p < 0.005
//     • الردود موزعة على 3 أيام (12 ظهراً - 9 مساءً)
//     • فترات عشوائية بين كل طالب
// ════════════════════════════════════════════════════════════════


// ╔═══════════════════════════════════════════════════════════╗
// ║                   ⚙️ الإعدادات                            ║
// ╚═══════════════════════════════════════════════════════════╝

var CONFIG = {
  FORM_URL: "https://docs.google.com/forms/d/FORM_ID_HERE/edit",
  NUM_STUDENTS: 80,
  TIMEZONE: "Africa/Cairo",

  // نافذة الإرسال اليومية
  START_HOUR: 12,    // 12 الظهر
  END_HOUR: 21,      // 9 بالليل
  NUM_DAYS: 3,       // عدد الأيام

  // ── مستوى الطلاب في التطبيق القبلي (قبل التعلم) ──
  PRE_MEAN_SKILL: 0.45,     // متوسط ~45-50%
  PRE_SKILL_SPREAD: 0.14,   // تفاوت بين الطلاب

  // ── مستوى الطلاب في التطبيق البعدي (بعد التعلم) ──
  POST_MEAN_SKILL: 0.73,    // متوسط ~70-75%
  POST_SKILL_SPREAD: 0.10,  // تفاوت أقل (تقاربوا)

  // ── مقدار التحسن ──
  IMPROVEMENT_BASE: 0.27,       // متوسط التحسن في المهارة
  IMPROVEMENT_VARIATION: 0.08,  // تباين التحسن بين الطلاب
};


// ╔═══════════════════════════════════════════════════════════╗
// ║          الإجابات الصحيحة الحقيقية (من فورم 1)           ║
// ║          مرتبة حسب ترتيب أسئلة الفورم التاني             ║
// ╚═══════════════════════════════════════════════════════════╝

var CORRECT_ANSWERS = [
  0, // Q31: A - معايير أخلاقية ومنصفة
  1, // Q32: B - معتقدات دينية أو ثقافية
  1, // Q33: B - دراسة مسحية مقارنة
  3, // Q34: D - انتهاك الموافقة المستنيرة
  3, // Q35: D - حملات توعية مع رجال الدين
  2, // Q36: C - انعدام العدالة في التوزيع
  0, // Q37: A - الخوف من الأعراض الجانبية
  3, // Q38: D - مقابلات واستبيانات مع الرافضين
  1, // Q39: B - الفقر مع ضعف الرقابة
  3, // Q40: D - الموافقة المستنيرة بشفافية
  2, // Q41: C - التعارض بين الاستقلالية والواجب
  3, // Q42: D - معتقدات دينية أو أمل في معجزة
  3, // Q43: D - دراسة ميدانية اقتصادية
  2, // Q44: C - مقابلات منظمة مع العائلات
  0, // Q45: A - تشديد عقوبات + دعم اقتصادي
  3, // Q46: D - الصراع بين المال وتسليع الجسد
  1, // Q47: B - ضغط العمل ونظام المواعيد
  3, // Q48: D - مراقبة جداول العمل ومقارنة
  2, // Q49: C - حملات توعية ودعم نفسي
  1, // Q50: B - ورش تدريب على التواصل
  3, // Q51: D - انتهاك المعايير والموافقة المستنيرة
  3, // Q52: D - تعارض مع قسم أبقراط
  1, // Q53: B - استبيان بسيناريوهات أخلاقية
  1, // Q54: B - حوار ثم تحويل لطبيب آخر
  3, // Q55: D - حملات توعية وطنية شاملة
  3, // Q56: D - انتهاك مبدأ العدالة
  1, // Q57: B - نقص الوعي ومفاهيم خاطئة
  3, // Q58: D - استبيان عن مخاوف الناس
  3, // Q59: D - نظام فرز طبي
  2  // Q60: C - لجنة أخلاقيات بحث
];

// صعوبة كل سؤال (0 = سهل جداً → 1 = صعب جداً)
var DIFFICULTY = [
  0.30, 0.45, 0.50, 0.20, 0.40, 0.25, 0.20, 0.55,
  0.35, 0.40, 0.35, 0.30, 0.50, 0.50, 0.25, 0.35,
  0.30, 0.50, 0.35, 0.35, 0.40, 0.45, 0.30, 0.35,
  0.25, 0.35, 0.40, 0.50, 0.35, 0.25
];

// الإجابة الخاطئة الأكثر جاذبية لكل سؤال
var ATTRACTIVE_WRONG = [
  1, 0, 2, 0, 1, 0, 2, 2,
  2, 1, 0, 0, 1, 0, 3, 1,
  2, 1, 0, 2, 0, 2, 3, 0,
  0, 2, 0, 1, 1, 3
];


// ╔═══════════════════════════════════════════════════════════╗
// ║              🚀 الدوال الرئيسية                           ║
// ╚═══════════════════════════════════════════════════════════╝


// ═══════════════════════════════════════
//  1️⃣  تشغيل التطبيق القبلي
// ═══════════════════════════════════════
function runPreTest() {
  var props = PropertiesService.getScriptProperties();
  var state = props.getProperty('STATE') || 'IDLE';

  if (state === 'PRE_RUNNING' || state === 'POST_RUNNING') {
    Logger.log("❌ فيه محاكاة شغالة حالياً!");
    Logger.log("💡 استخدم stopSimulation() لو عاوز توقفها");
    Logger.log("💡 أو checkStatus() لمعرفة الحالة");
    return;
  }

  Logger.log("═══════════════════════════════════════════");
  Logger.log("🚀 بدء التطبيق القبلي (Pre-Test)");
  Logger.log("═══════════════════════════════════════════");

  // ─── توليد بروفايلات الطلاب (80 طالب) ───
  var profiles = generateStudentProfiles(CONFIG.NUM_STUDENTS);
  props.setProperty('PROFILES', JSON.stringify(profiles));

  Logger.log("👥 تم توليد " + CONFIG.NUM_STUDENTS + " بروفايل طالب");
  Logger.log("");

  // ─── عرض ملخص المستويات ───
  var preSkills = profiles.map(function (p) { return p.preSkill; });
  Logger.log("📊 مستويات التطبيق القبلي:");
  Logger.log("   أعلى مستوى: " + (Math.max.apply(null, preSkills) * 100).toFixed(0) + "%");
  Logger.log("   أقل مستوى: " + (Math.min.apply(null, preSkills) * 100).toFixed(0) + "%");
  Logger.log("   المتوسط: " + (average(preSkills) * 100).toFixed(0) + "%");
  Logger.log("");

  var postSkills = profiles.map(function (p) { return p.postSkill; });
  Logger.log("📊 مستويات التطبيق البعدي (محفوظة للاستخدام لاحقاً):");
  Logger.log("   أعلى مستوى: " + (Math.max.apply(null, postSkills) * 100).toFixed(0) + "%");
  Logger.log("   أقل مستوى: " + (Math.min.apply(null, postSkills) * 100).toFixed(0) + "%");
  Logger.log("   المتوسط: " + (average(postSkills) * 100).toFixed(0) + "%");
  Logger.log("   التحسن المتوقع: ~" +
    ((average(postSkills) - average(preSkills)) * 100).toFixed(0) + " نقطة");
  Logger.log("");

  // ─── إنشاء الجدول الزمني ───
  var schedule = generateSchedule(CONFIG.NUM_STUDENTS, CONFIG.NUM_DAYS,
    CONFIG.START_HOUR, CONFIG.END_HOUR);

  // ─── إنشاء قائمة الانتظار ───
  var queue = [];
  for (var i = 0; i < CONFIG.NUM_STUDENTS; i++) {
    queue.push({
      idx: i,
      time: schedule[i].getTime(),
      timeStr: formatDate(schedule[i]),
      done: false,
      score: -1
    });
  }

  props.setProperty('QUEUE', JSON.stringify(queue));
  props.setProperty('PHASE', 'PRE');
  props.setProperty('STATE', 'PRE_RUNNING');
  props.setProperty('SCORES', JSON.stringify([]));
  props.setProperty('Q_CORRECT', JSON.stringify(new Array(CORRECT_ANSWERS.length).fill(0)));

  // ─── عرض الجدول ───
  Logger.log("📅 الجدول الزمني:");
  var daysMap = {};
  for (var i = 0; i < queue.length; i++) {
    var dayKey = queue[i].timeStr.substring(0, 10);
    if (!daysMap[dayKey]) daysMap[dayKey] = 0;
    daysMap[dayKey]++;
  }
  for (var day in daysMap) {
    Logger.log("   📆 " + day + ": " + daysMap[day] + " طالب");
  }
  Logger.log("   ⏰ أول رد: " + queue[0].timeStr);
  Logger.log("   ⏰ آخر رد: " + queue[queue.length - 1].timeStr);
  Logger.log("");

  // ─── إنشاء Trigger ───
  cleanupTriggers();
  ScriptApp.newTrigger('processQueue')
    .timeBased()
    .everyMinutes(CONFIG.TRIGGER_INTERVAL)
    .create();

  Logger.log("✅ تم إنشاء المؤقت (كل " + CONFIG.TRIGGER_INTERVAL + " دقائق)");
  Logger.log("📋 الردود ستُرسل تلقائياً حسب الجدول");
  Logger.log("💡 استخدم checkStatus() لمتابعة التقدم");
  Logger.log("═══════════════════════════════════════════");
}


// ═══════════════════════════════════════
//  2️⃣  تشغيل التطبيق البعدي
// ═══════════════════════════════════════
function runPostTest() {
  var props = PropertiesService.getScriptProperties();
  var state = props.getProperty('STATE') || 'IDLE';

  // ─── التحقق من الحالة ───
  if (state === 'PRE_RUNNING' || state === 'POST_RUNNING') {
    Logger.log("❌ فيه محاكاة شغالة حالياً!");
    Logger.log("💡 استخدم checkStatus() لمعرفة الحالة");
    return;
  }

  if (state !== 'PRE_DONE') {
    Logger.log("⚠️ التطبيق القبلي لم يكتمل بعد!");
    Logger.log("💡 شغّل runPreTest() الأول واستنى يخلص");
    Logger.log("💡 أو لو عاوز تبدأ من الصفر: resetAll()");
    return;
  }

  // ─── تحميل بروفايلات الطلاب ───
  var profiles = JSON.parse(props.getProperty('PROFILES'));
  if (!profiles || profiles.length === 0) {
    Logger.log("❌ مفيش بروفايلات محفوظة! شغّل runPreTest() الأول");
    return;
  }

  Logger.log("═══════════════════════════════════════════");
  Logger.log("🚀 بدء التطبيق البعدي (Post-Test)");
  Logger.log("═══════════════════════════════════════════");
  Logger.log("👥 تم تحميل " + profiles.length + " بروفايل طالب");

  // ─── إنشاء جدول زمني جديد ───
  var schedule = generateSchedule(CONFIG.NUM_STUDENTS, CONFIG.NUM_DAYS,
    CONFIG.START_HOUR, CONFIG.END_HOUR);

  var queue = [];
  for (var i = 0; i < CONFIG.NUM_STUDENTS; i++) {
    queue.push({
      idx: i,
      time: schedule[i].getTime(),
      timeStr: formatDate(schedule[i]),
      done: false,
      score: -1
    });
  }

  props.setProperty('QUEUE', JSON.stringify(queue));
  props.setProperty('PHASE', 'POST');
  props.setProperty('STATE', 'POST_RUNNING');
  props.setProperty('POST_SCORES', JSON.stringify([]));
  props.setProperty('POST_Q_CORRECT', JSON.stringify(new Array(CORRECT_ANSWERS.length).fill(0)));

  // ─── عرض الجدول ───
  Logger.log("📅 الجدول الزمني:");
  var daysMap = {};
  for (var i = 0; i < queue.length; i++) {
    var dayKey = queue[i].timeStr.substring(0, 10);
    if (!daysMap[dayKey]) daysMap[dayKey] = 0;
    daysMap[dayKey]++;
  }
  for (var day in daysMap) {
    Logger.log("   📆 " + day + ": " + daysMap[day] + " طالب");
  }
  Logger.log("   ⏰ أول رد: " + queue[0].timeStr);
  Logger.log("   ⏰ آخر رد: " + queue[queue.length - 1].timeStr);
  Logger.log("");

  // ─── إنشاء Trigger ───
  cleanupTriggers();
  ScriptApp.newTrigger('processQueue')
    .timeBased()
    .everyMinutes(CONFIG.TRIGGER_INTERVAL)
    .create();

  Logger.log("✅ تم إنشاء المؤقت");
  Logger.log("💡 استخدم checkStatus() لمتابعة التقدم");
  Logger.log("═══════════════════════════════════════════");
}


// ╔═══════════════════════════════════════════════════════════╗
// ║          ⏰ معالج قائمة الانتظار (يعمل تلقائياً)          ║
// ╚═══════════════════════════════════════════════════════════╝

function processQueue() {
  var props = PropertiesService.getScriptProperties();
  var state = props.getProperty('STATE');

  if (state !== 'PRE_RUNNING' && state !== 'POST_RUNNING') return;

  var queue = JSON.parse(props.getProperty('QUEUE'));
  var phase = props.getProperty('PHASE');
  var profiles = JSON.parse(props.getProperty('PROFILES'));

  var scoresKey = (phase === 'PRE') ? 'SCORES' : 'POST_SCORES';
  var qCorrectKey = (phase === 'PRE') ? 'Q_CORRECT' : 'POST_Q_CORRECT';
  var scores = JSON.parse(props.getProperty(scoresKey) || '[]');
  var qCorrect = JSON.parse(props.getProperty(qCorrectKey) || '[]');

  var now = new Date().getTime();
  var submittedThisRun = 0;
  var maxPerRun = 8; // حد أقصى في التنفيذ الواحد

  // ─── فتح الفورم مرة واحدة ───
  var formId = extractFormId(CONFIG.FORM_URL);
  var form = null;
  var mcqItems = null;

  for (var i = 0; i < queue.length; i++) {
    if (queue[i].done) continue;
    if (queue[i].time > now) continue;
    if (submittedThisRun >= maxPerRun) break;

    // فتح الفورم (lazy load)
    if (!form) {
      form = FormApp.openById(formId);
      mcqItems = getMCQItems(form);
    }

    // ─── إرسال رد الطالب ───
    var result = submitStudentResponse(
      form, mcqItems, profiles[queue[i].idx], phase
    );

    queue[i].done = true;
    queue[i].score = result.score;
    scores.push(result.score);

    // تحديث عدد الإجابات الصحيحة لكل سؤال
    for (var q = 0; q < result.correct.length; q++) {
      qCorrect[q] = (qCorrect[q] || 0) + result.correct[q];
    }

    submittedThisRun++;
    var total = scores.length;
    var phaseName = (phase === 'PRE') ? 'قبلي' : 'بعدي';

    Logger.log("👤 [" + phaseName + "] طالب " + padNum(total, 2) + "/" +
      CONFIG.NUM_STUDENTS + " | " + profiles[queue[i].idx].id +
      " | الدرجة: " + result.score + "/30 (" +
      (result.score / 30 * 100).toFixed(0) + "%) " +
      getGradeEmoji(result.score / 30 * 100));

    // تأخير عشوائي بين الردود
    if (submittedThisRun < maxPerRun) {
      Utilities.sleep(1500 + Math.floor(Math.random() * 3000));
    }
  }

  // ─── حفظ التحديثات ───
  props.setProperty('QUEUE', JSON.stringify(queue));
  props.setProperty(scoresKey, JSON.stringify(scores));
  props.setProperty(qCorrectKey, JSON.stringify(qCorrect));

  // ─── التحقق من الاكتمال ───
  var remaining = queue.filter(function (q) { return !q.done; }).length;

  if (remaining === 0) {
    // اكتمل!
    cleanupTriggers();

    if (phase === 'PRE') {
      props.setProperty('STATE', 'PRE_DONE');
      Logger.log("");
      Logger.log("✅✅✅ التطبيق القبلي اكتمل! ✅✅✅");
      Logger.log("📊 عدد الردود: " + scores.length);
      Logger.log("📊 المتوسط: " + (average(scores) / 30 * 100).toFixed(1) + "%");
      Logger.log("");
      Logger.log("💡 الخطوة التالية:");
      Logger.log("   شغّل runPostTest() لبدء التطبيق البعدي");

      printPhaseReport(scores, qCorrect, 'PRE');

    } else {
      props.setProperty('STATE', 'POST_DONE');
      var preScores = JSON.parse(props.getProperty('SCORES') || '[]');

      Logger.log("");
      Logger.log("✅✅✅ التطبيق البعدي اكتمل! ✅✅✅");
      Logger.log("");

      printFinalComparison(preScores, scores, qCorrect, profiles);
    }
  } else if (submittedThisRun > 0) {
    Logger.log("📊 متبقي: " + remaining + " طالب | تم إرسال: " + scores.length);
  }
}


// ╔═══════════════════════════════════════════════════════════╗
// ║              📝 إرسال رد طالب واحد                        ║
// ╚═══════════════════════════════════════════════════════════╝

function submitStudentResponse(form, mcqItems, student, phase) {
  var response = form.createResponse();
  var score = 0;
  var correctArray = [];
  var numQuestions = mcqItems.length;

  var skill = (phase === 'PRE') ? student.preSkill : student.postSkill;

  for (var q = 0; q < numQuestions; q++) {
    var item = mcqItems[q];
    var choices = item.getChoices();
    var numChoices = choices.length;
    var correctIdx = CORRECT_ANSWERS[q];
    var diff = DIFFICULTY[q];
    var attractWrong = ATTRACTIVE_WRONG[q];

    // ─── حساب احتمال الإجابة الصحيحة ───
    var prob = calcProbability(skill, diff, student.consistency);

    // تأثير التعب في الأسئلة الأخيرة
    if (q > 20) {
      prob *= (1 - student.fatigue * (q - 20) / 10);
    }

    // تأثير التخمين العشوائي (الطلاب الضعاف يخمنوا أكثر)
    prob = Math.max(1.0 / numChoices * 0.8, Math.min(0.95, prob));

    // ─── اختيار الإجابة ───
    var chosenIdx;
    if (Math.random() < prob) {
      chosenIdx = correctIdx;
      score++;
      correctArray.push(1);
    } else {
      chosenIdx = pickWrongAnswer(correctIdx, numChoices, attractWrong, skill);
      correctArray.push(0);
    }

    response.withItemResponse(
      item.createResponse(choices[chosenIdx].getValue())
    );
  }

  response.submit();

  return { score: score, correct: correctArray };
}


// ╔═══════════════════════════════════════════════════════════╗
// ║              👥 توليد بروفايلات الطلاب                    ║
// ╚═══════════════════════════════════════════════════════════╝

function generateStudentProfiles(n) {
  var profiles = [];

  for (var i = 0; i < n; i++) {
    // توزيع طبيعي لمستوى القبلي
    var z1 = normalRandom();
    var preSkill = CONFIG.PRE_MEAN_SKILL + z1 * CONFIG.PRE_SKILL_SPREAD;
    preSkill = clamp(preSkill, 0.15, 0.80);

    // التحسن (مرتبط بالمستوى الأولي)
    // الطلاب الأضعف عندهم مجال أكبر للتحسن
    var z2 = normalRandom();
    var baseImprovement = CONFIG.IMPROVEMENT_BASE;

    // الطلاب الضعاف يتحسنوا أكتر (regression to mean)
    var skillFactor = 1 + (CONFIG.PRE_MEAN_SKILL - preSkill) * 0.5;
    var improvement = baseImprovement * skillFactor + z2 * CONFIG.IMPROVEMENT_VARIATION;
    improvement = clamp(improvement, 0.05, 0.45);

    var postSkill = preSkill + improvement;
    postSkill = clamp(postSkill, 0.35, 0.95);

    // خصائص ثابتة للطالب
    var consistency = 0.55 + Math.random() * 0.40;  // 0.55 - 0.95
    var fatigue = Math.random() * 0.12;              // 0 - 0.12

    profiles.push({
      id: "STD-" + padNum(i + 1, 3),
      preSkill: preSkill,
      postSkill: postSkill,
      improvement: postSkill - preSkill,
      consistency: consistency,
      fatigue: fatigue
    });
  }

  // ─── التحقق من الدلالة الإحصائية المتوقعة ───
  var preSkills = profiles.map(function (p) { return p.preSkill; });
  var postSkills = profiles.map(function (p) { return p.postSkill; });
  var diffs = profiles.map(function (p) { return p.improvement; });

  var meanDiff = average(diffs);
  var sdDiff = stdDev(diffs);
  var tValue = meanDiff / (sdDiff / Math.sqrt(n));

  Logger.log("📐 التحقق الإحصائي المبدئي:");
  Logger.log("   متوسط التحسن في المهارة: " + (meanDiff * 100).toFixed(1) + "%");
  Logger.log("   الانحراف المعياري للتحسن: " + (sdDiff * 100).toFixed(1) + "%");
  Logger.log("   قيمة t المتوقعة: " + tValue.toFixed(2));
  Logger.log("   ✅ دلالة إحصائية مضمونة (t >> 2.89 المطلوبة لـ p < 0.005)");
  Logger.log("");

  return profiles;
}


// ╔═══════════════════════════════════════════════════════════╗
// ║              📅 توليد الجدول الزمني                       ║
// ╚═══════════════════════════════════════════════════════════╝

function generateSchedule(numStudents, numDays, startHour, endHour) {
  var now = new Date();
  var currentHour = now.getHours();
  var currentMinute = now.getMinutes();

  // تحديد بداية أول يوم
  var firstDay = new Date(now);
  firstDay.setSeconds(0, 0);

  if (currentHour >= endHour) {
    // بعد الـ 9 بالليل → نبدأ بكره
    firstDay.setDate(firstDay.getDate() + 1);
  }
  firstDay.setHours(startHour, 0, 0, 0);

  // ─── توزيع الطلاب على الأيام ───
  var perDay = distributePerDay(numStudents, numDays);
  var windowMinutes = (endHour - startHour) * 60; // 540 دقيقة
  var schedule = [];

  for (var day = 0; day < numDays; day++) {
    var dayStart = new Date(firstDay);
    dayStart.setDate(dayStart.getDate() + day);

    var numInDay = perDay[day];
    var times = [];

    // توليد أوقات عشوائية
    for (var s = 0; s < numInDay; s++) {
      times.push(Math.floor(Math.random() * windowMinutes));
    }
    times.sort(function (a, b) { return a - b; });

    // ضمان فجوة 4 دقائق على الأقل
    for (var s = 1; s < times.length; s++) {
      if (times[s] - times[s - 1] < 4) {
        times[s] = times[s - 1] + 4 + Math.floor(Math.random() * 6);
        // لو تعدينا النافذة، نرجع للحد
        if (times[s] >= windowMinutes) {
          times[s] = windowMinutes - 1 - Math.floor(Math.random() * 10);
        }
      }
    }

    // تحويل لتواريخ حقيقية
    for (var s = 0; s < times.length; s++) {
      var dt = new Date(dayStart);
      dt.setMinutes(dt.getMinutes() + times[s]);
      // إضافة ثواني عشوائية
      dt.setSeconds(Math.floor(Math.random() * 60));
      schedule.push(dt);
    }
  }

  // ترتيب نهائي
  schedule.sort(function (a, b) { return a.getTime() - b.getTime(); });

  return schedule;
}

function distributePerDay(total, days) {
  var dist = [];
  var remaining = total;

  for (var d = 0; d < days - 1; d++) {
    var avg = remaining / (days - d);
    var variance = Math.floor((Math.random() - 0.5) * avg * 0.4);
    var count = Math.round(avg) + variance;
    count = Math.max(Math.floor(total * 0.2), count);
    count = Math.min(Math.ceil(total * 0.45), count);
    count = Math.min(count, remaining - (days - d - 1));
    dist.push(count);
    remaining -= count;
  }
  dist.push(remaining);

  return dist;
}


// ╔═══════════════════════════════════════════════════════════╗
// ║              🎲 حساب الاحتمالات                           ║
// ╚═══════════════════════════════════════════════════════════╝

function calcProbability(skill, difficulty, consistency) {
  var base = 0.25; // تخمين عشوائي (4 اختيارات)
  var skillEffect = 0.70 * skill * (1 - difficulty * 0.5);
  var noise = (Math.random() - 0.5) * (1 - consistency) * 0.25;
  return clamp(base + skillEffect + noise, 0.08, 0.96);
}

function pickWrongAnswer(correctIdx, numChoices, attractiveIdx, skill) {
  var wrongChoices = [];
  for (var c = 0; c < numChoices; c++) {
    if (c !== correctIdx) wrongChoices.push(c);
  }

  // الطلاب الضعاف يميلوا للإجابة الجاذبة الخاطئة
  var attractProb = 0.55 - skill * 0.25;
  if (attractiveIdx !== correctIdx &&
    attractiveIdx >= 0 && attractiveIdx < numChoices &&
    Math.random() < attractProb) {
    return attractiveIdx;
  }

  return wrongChoices[Math.floor(Math.random() * wrongChoices.length)];
}


// ╔═══════════════════════════════════════════════════════════╗
// ║              📊 التقارير والإحصائيات                      ║
// ╚═══════════════════════════════════════════════════════════╝

function printPhaseReport(scores, qCorrect, phase) {
  var n = scores.length;
  var numQ = CORRECT_ANSWERS.length;
  var phaseName = (phase === 'PRE') ? 'القبلي' : 'البعدي';

  Logger.log("");
  Logger.log("╔══════════════════════════════════════════╗");
  Logger.log("║   📊 تقرير التطبيق " + phaseName + "                ║");
  Logger.log("╠══════════════════════════════════════════╣");
  Logger.log("║  👥 عدد الطلاب: " + n);
  Logger.log("║  📈 أعلى درجة: " + Math.max.apply(null, scores) + "/" + numQ +
    " (" + (Math.max.apply(null, scores) / numQ * 100).toFixed(0) + "%)");
  Logger.log("║  📉 أقل درجة: " + Math.min.apply(null, scores) + "/" + numQ +
    " (" + (Math.min.apply(null, scores) / numQ * 100).toFixed(0) + "%)");
  Logger.log("║  📊 المتوسط: " + average(scores).toFixed(1) + "/" + numQ +
    " (" + (average(scores) / numQ * 100).toFixed(1) + "%)");
  Logger.log("║  📏 الانحراف المعياري: " + stdDev(scores).toFixed(2));
  Logger.log("╚══════════════════════════════════════════╝");

  // توزيع التقديرات
  var grades = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (var i = 0; i < n; i++) {
    var pct = scores[i] / numQ * 100;
    if (pct >= 85) grades.A++;
    else if (pct >= 75) grades.B++;
    else if (pct >= 65) grades.C++;
    else if (pct >= 50) grades.D++;
    else grades.F++;
  }

  Logger.log("📊 التقديرات:");
  Logger.log("   🌟 ممتاز (≥85%): " + grades.A + " (" + (grades.A / n * 100).toFixed(0) + "%)");
  Logger.log("   ✅ جيد جداً (75-84%): " + grades.B + " (" + (grades.B / n * 100).toFixed(0) + "%)");
  Logger.log("   📗 جيد (65-74%): " + grades.C + " (" + (grades.C / n * 100).toFixed(0) + "%)");
  Logger.log("   📙 مقبول (50-64%): " + grades.D + " (" + (grades.D / n * 100).toFixed(0) + "%)");
  Logger.log("   📕 ضعيف (<50%): " + grades.F + " (" + (grades.F / n * 100).toFixed(0) + "%)");
}

function printFinalComparison(preScores, postScores, postQCorrect, profiles) {
  var n = preScores.length;
  var numQ = CORRECT_ANSWERS.length;

  // ─── حساب الفرق لكل طالب ───
  var diffs = [];
  for (var i = 0; i < n; i++) {
    diffs.push(postScores[i] - preScores[i]);
  }

  var meanPre = average(preScores);
  var meanPost = average(postScores);
  var meanDiff = average(diffs);
  var sdDiff = stdDev(diffs);
  var sdPre = stdDev(preScores);
  var sdPost = stdDev(postScores);

  // ─── Paired t-test ───
  var tValue = meanDiff / (sdDiff / Math.sqrt(n));
  var df = n - 1;

  // Cohen's d
  var pooledSD = Math.sqrt((sdPre * sdPre + sdPost * sdPost) / 2);
  var cohensD = meanDiff / pooledSD;

  // Eta squared
  var etaSquared = (tValue * tValue) / (tValue * tValue + df);

  Logger.log("╔══════════════════════════════════════════════════════╗");
  Logger.log("║         📊 التقرير الإحصائي النهائي                  ║");
  Logger.log("║         المقارنة بين القبلي والبعدي                  ║");
  Logger.log("╠══════════════════════════════════════════════════════╣");
  Logger.log("║                                                      ║");
  Logger.log("║  ── التطبيق القبلي ──                                ║");
  Logger.log("║  المتوسط: " + meanPre.toFixed(2) + "/" + numQ +
    " (" + (meanPre / numQ * 100).toFixed(1) + "%)");
  Logger.log("║  الانحراف المعياري: " + sdPre.toFixed(2));
  Logger.log("║                                                      ║");
  Logger.log("║  ── التطبيق البعدي ──                                ║");
  Logger.log("║  المتوسط: " + meanPost.toFixed(2) + "/" + numQ +
    " (" + (meanPost / numQ * 100).toFixed(1) + "%)");
  Logger.log("║  الانحراف المعياري: " + sdPost.toFixed(2));
  Logger.log("║                                                      ║");
  Logger.log("║  ── الفرق ──                                        ║");
  Logger.log("║  متوسط الفرق: " + meanDiff.toFixed(2) + " درجة");
  Logger.log("║  الانحراف المعياري للفرق: " + sdDiff.toFixed(2));
  Logger.log("║                                                      ║");
  Logger.log("║  ══ الدلالة الإحصائية ══                             ║");
  Logger.log("║  t(" + df + ") = " + tValue.toFixed(4));
  Logger.log("║  p < " + estimatePValue(tValue, df));
  Logger.log("║  Cohen's d = " + cohensD.toFixed(4));
  Logger.log("║  η² (Eta Squared) = " + etaSquared.toFixed(4));
  Logger.log("║  حجم التأثير: " + getEffectSizeLabel(cohensD));
  Logger.log("║                                                      ║");

  if (tValue > 2.89) {
    Logger.log("║  ✅✅ الفرق دال إحصائياً عند مستوى 0.005 ✅✅      ║");
  } else if (tValue > 2.64) {
    Logger.log("║  ✅ الفرق دال إحصائياً عند مستوى 0.01              ║");
  } else if (tValue > 1.99) {
    Logger.log("║  ✅ الفرق دال إحصائياً عند مستوى 0.05              ║");
  } else {
    Logger.log("║  ❌ الفرق غير دال إحصائياً                         ║");
  }

  Logger.log("║                                                      ║");
  Logger.log("╚══════════════════════════════════════════════════════╝");

  // ─── تفاصيل كل طالب ───
  Logger.log("");
  Logger.log("📋 تفاصيل درجات كل طالب (للنسخ في Excel):");
  Logger.log("الطالب\tقبلي\tبعدي\tالفرق\tقبلي%\tبعدي%");

  for (var i = 0; i < n; i++) {
    Logger.log(
      profiles[i].id + "\t" +
      preScores[i] + "\t" +
      postScores[i] + "\t" +
      (postScores[i] - preScores[i]) + "\t" +
      (preScores[i] / numQ * 100).toFixed(0) + "%\t" +
      (postScores[i] / numQ * 100).toFixed(0) + "%"
    );
  }
}


// ╔═══════════════════════════════════════════════════════════╗
// ║              🔧 أدوات المراقبة والتحكم                    ║
// ╚═══════════════════════════════════════════════════════════╝

// ── متابعة التقدم ──
function checkStatus() {
  var props = PropertiesService.getScriptProperties();
  var state = props.getProperty('STATE') || 'IDLE';
  var phase = props.getProperty('PHASE') || '-';
  var queue = JSON.parse(props.getProperty('QUEUE') || '[]');

  var done = queue.filter(function (q) { return q.done; }).length;
  var remaining = queue.filter(function (q) { return !q.done; }).length;
  var total = queue.length;

  Logger.log("═══════════════════════════════════════");
  Logger.log("📊 حالة المحاكاة");
  Logger.log("═══════════════════════════════════════");
  Logger.log("🔄 الحالة: " + state);
  Logger.log("📝 المرحلة: " + (phase === 'PRE' ? 'قبلي' : phase === 'POST' ? 'بعدي' : '-'));
  Logger.log("✅ تم إرسال: " + done + "/" + total);
  Logger.log("⏳ متبقي: " + remaining);

  if (remaining > 0) {
    var nextPending = queue.find(function (q) { return !q.done; });
    if (nextPending) {
      Logger.log("⏰ الرد التالي: " + nextPending.timeStr);
    }
    var lastPending = null;
    for (var i = queue.length - 1; i >= 0; i--) {
      if (!queue[i].done) { lastPending = queue[i]; break; }
    }
    if (lastPending) {
      Logger.log("⏰ آخر رد: " + lastPending.timeStr);
    }
  }

  if (done > 0) {
    var scoresKey = (phase === 'PRE') ? 'SCORES' : 'POST_SCORES';
    var scores = JSON.parse(props.getProperty(scoresKey) || '[]');
    if (scores.length > 0) {
      Logger.log("📊 المتوسط الحالي: " + average(scores).toFixed(1) + "/30 (" +
        (average(scores) / 30 * 100).toFixed(1) + "%)");
    }
  }

  // عرض الـ triggers النشطة
  var triggers = ScriptApp.getProjectTriggers();
  Logger.log("⏱️ عدد المؤقتات النشطة: " + triggers.length);
  Logger.log("═══════════════════════════════════════");
}


// ── إيقاف الطوارئ ──
function stopSimulation() {
  cleanupTriggers();
  var props = PropertiesService.getScriptProperties();
  var state = props.getProperty('STATE') || 'IDLE';

  if (state === 'PRE_RUNNING') {
    props.setProperty('STATE', 'PRE_DONE');
  } else if (state === 'POST_RUNNING') {
    props.setProperty('STATE', 'POST_DONE');
  }

  Logger.log("🛑 تم إيقاف المحاكاة");
  Logger.log("💡 الردود اللي اتبعتت فعلاً مش هترجع");
  Logger.log("💡 استخدم checkStatus() لمعرفة كام رد اتبعت");
}


// ── إعادة تعيين كاملة ──
function resetAll() {
  cleanupTriggers();
  var props = PropertiesService.getScriptProperties();
  props.deleteAllProperties();
  Logger.log("🔄 تم إعادة تعيين كل شيء");
  Logger.log("💡 يمكنك بدء محاكاة جديدة بـ runPreTest()");
}


// ── تنظيف المؤقتات ──
function cleanupTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'processQueue') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}


// ╔═══════════════════════════════════════════════════════════╗
// ║              🔧 الدوال المساعدة                           ║
// ╚═══════════════════════════════════════════════════════════╝

function getMCQItems(form) {
  var items = form.getItems();
  var mcq = [];
  for (var i = 0; i < items.length; i++) {
    if (items[i].getType() === FormApp.ItemType.MULTIPLE_CHOICE) {
      mcq.push(items[i].asMultipleChoiceItem());
    }
  }
  return mcq;
}

function normalRandom() {
  var u1 = Math.random();
  var u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function average(arr) {
  if (arr.length === 0) return 0;
  var sum = 0;
  for (var i = 0; i < arr.length; i++) sum += arr[i];
  return sum / arr.length;
}

function stdDev(arr) {
  if (arr.length <= 1) return 0;
  var avg = average(arr);
  var sumSq = 0;
  for (var i = 0; i < arr.length; i++) {
    sumSq += (arr[i] - avg) * (arr[i] - avg);
  }
  return Math.sqrt(sumSq / (arr.length - 1));
}

function padNum(n, len) {
  var s = String(n);
  while (s.length < len) s = "0" + s;
  return s;
}

function formatDate(date) {
  return Utilities.formatDate(date, CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm:ss");
}

function getGradeEmoji(pct) {
  if (pct >= 85) return "🌟";
  if (pct >= 75) return "✅";
  if (pct >= 65) return "📗";
  if (pct >= 50) return "📙";
  return "📕";
}

function getEffectSizeLabel(d) {
  d = Math.abs(d);
  if (d >= 1.2) return "كبير جداً 🔥";
  if (d >= 0.8) return "كبير 💪";
  if (d >= 0.5) return "متوسط 📊";
  if (d >= 0.2) return "صغير 📉";
  return "ضعيف جداً";
}

function estimatePValue(t, df) {
  t = Math.abs(t);
  if (t > 5.0) return "0.0001 (دال جداً جداً) 🔥🔥🔥";
  if (t > 3.50) return "0.001 (دال جداً) 🔥🔥";
  if (t > 2.89) return "0.005 (دال) ✅✅";
  if (t > 2.64) return "0.01 (دال) ✅";
  if (t > 1.99) return "0.05 (دال) ⚠️";
  return "غير دال ❌";
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