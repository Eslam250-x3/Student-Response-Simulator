// ════════════════════════════════════════════════════════════════
//  🚀 main.gs - الدوال الرئيسية للتشغيل
// ════════════════════════════════════════════════════════════════


// ╔═══════════════════════════════════════╗
// ║    CONFIG_FILE_ID: لو عاوز تحمل      ║
// ║    من ملف JSON في Drive              ║
// ║    سيبه فاضي = استخدم الافتراضي      ║
// ╚═══════════════════════════════════════╝
var CONFIG_FILE_ID = ""; // اختياري


// ── تحميل الإعدادات ──
function loadConfig() {
  if (CONFIG_FILE_ID && CONFIG_FILE_ID.length > 10) {
    return loadConfigFromDrive(CONFIG_FILE_ID);
  }
  return getTestConfig();
}


// ═══════════════════════════════════════
//  1️⃣  بدء التطبيق القبلي
// ═══════════════════════════════════════
function runPreTest() {
  var config = loadConfig();
  var props = PropertiesService.getScriptProperties();
  var state = props.getProperty('STATE') || 'IDLE';

  if (state === 'PRE_RUNNING' || state === 'POST_RUNNING') {
    Logger.log("❌ فيه محاكاة شغالة! استخدم checkStatus() أو stopSimulation()");
    return;
  }

  Logger.log("═══════════════════════════════════════════");
  Logger.log("🚀 بدء التطبيق القبلي (Pre-Test)");
  Logger.log("📋 " + config.testInfo.title);
  Logger.log("═══════════════════════════════════════════");

  // استخراج البيانات من الـ JSON
  var answers = extractAnswers(config);
  var settings = config.settings;

  // توليد بروفايلات الطلاب
  var profiles = generateProfiles(settings);

  // التحقق الإحصائي
  verifyStatisticalSignificance(profiles, answers.length);

  // إنشاء الجدول الزمني
  var schedule = createSchedule(
    settings.numStudents,
    settings.schedule.numDays,
    settings.schedule.startHour,
    settings.schedule.endHour,
    settings.schedule.minGapMinutes,
    settings.timezone
  );

  // إنشاء قائمة الانتظار
  var queue = buildQueue(settings.numStudents, schedule);

  // حفظ كل شيء
  props.setProperty('CONFIG', JSON.stringify(config));
  props.setProperty('PROFILES', JSON.stringify(profiles));
  props.setProperty('QUEUE', JSON.stringify(queue));
  props.setProperty('PHASE', 'PRE');
  props.setProperty('STATE', 'PRE_RUNNING');
  props.setProperty('PRE_SCORES', JSON.stringify([]));
  props.setProperty('PRE_Q_CORRECT', JSON.stringify(new Array(answers.length).fill(0)));

  // عرض الجدول
  printScheduleSummary(queue, 'القبلي');

  // إنشاء Trigger
  setupTrigger(settings.triggerIntervalMinutes || 5);

  Logger.log("✅ تم البدء! الردود ستتبعت تلقائياً حسب الجدول");
  Logger.log("💡 تابع بـ: checkStatus()");
}


// ═══════════════════════════════════════
//  2️⃣  بدء التطبيق البعدي
// ═══════════════════════════════════════
function runPostTest() {
  var props = PropertiesService.getScriptProperties();
  var state = props.getProperty('STATE') || 'IDLE';

  if (state === 'PRE_RUNNING' || state === 'POST_RUNNING') {
    Logger.log("❌ فيه محاكاة شغالة!");
    return;
  }
  if (state !== 'PRE_DONE') {
    Logger.log("⚠️ لازم التطبيق القبلي يخلص الأول!");
    Logger.log("💡 شغّل runPreTest() أو resetAll()");
    return;
  }

  var config = JSON.parse(props.getProperty('CONFIG'));
  var profiles = JSON.parse(props.getProperty('PROFILES'));
  var settings = config.settings;
  var answers = extractAnswers(config);

  Logger.log("═══════════════════════════════════════════");
  Logger.log("🚀 بدء التطبيق البعدي (Post-Test)");
  Logger.log("═══════════════════════════════════════════");

  var schedule = createSchedule(
    settings.numStudents,
    settings.schedule.numDays,
    settings.schedule.startHour,
    settings.schedule.endHour,
    settings.schedule.minGapMinutes,
    settings.timezone
  );

  var queue = buildQueue(settings.numStudents, schedule);

  props.setProperty('QUEUE', JSON.stringify(queue));
  props.setProperty('PHASE', 'POST');
  props.setProperty('STATE', 'POST_RUNNING');
  props.setProperty('POST_SCORES', JSON.stringify([]));
  props.setProperty('POST_Q_CORRECT', JSON.stringify(new Array(answers.length).fill(0)));

  printScheduleSummary(queue, 'البعدي');
  setupTrigger(settings.triggerIntervalMinutes || 5);

  Logger.log("✅ تم البدء! تابع بـ: checkStatus()");
}


// ═══════════════════════════════════════
//  ⏰  معالج قائمة الانتظار (تلقائي)
// ═══════════════════════════════════════
function processQueue() {
  var props = PropertiesService.getScriptProperties();
  var state = props.getProperty('STATE');
  if (state !== 'PRE_RUNNING' && state !== 'POST_RUNNING') return;

  var config = JSON.parse(props.getProperty('CONFIG'));
  var phase = props.getProperty('PHASE');
  var profiles = JSON.parse(props.getProperty('PROFILES'));
  var queue = JSON.parse(props.getProperty('QUEUE'));

  var scoreKey = phase + '_SCORES';
  var qKey = phase + '_Q_CORRECT';
  var scores = JSON.parse(props.getProperty(scoreKey) || '[]');
  var qCorrect = JSON.parse(props.getProperty(qKey) || '[]');

  var answers = extractAnswers(config);
  var settings = config.settings;
  var now = new Date().getTime();
  var sent = 0;
  var maxPerRun = 8;

  var form = null;
  var mcqItems = null;

  for (var i = 0; i < queue.length; i++) {
    if (queue[i].done || queue[i].time > now) continue;
    if (sent >= maxPerRun) break;

    if (!form) {
      var formId = extractFormId(settings.formUrl);
      form = FormApp.openById(formId);
      mcqItems = getMCQItems(form);

      if (mcqItems.length !== answers.length) {
        Logger.log("❌ عدد الأسئلة (" + mcqItems.length +
          ") ≠ عدد الإجابات (" + answers.length + ")");
        return;
      }
    }

    var skill = (phase === 'PRE') ? profiles[queue[i].idx].preSkill
      : profiles[queue[i].idx].postSkill;

    var result = submitResponse(form, mcqItems, {
      skill: skill,
      consistency: profiles[queue[i].idx].consistency,
      fatigue: profiles[queue[i].idx].fatigue
    }, answers, config);

    queue[i].done = true;
    queue[i].score = result.score;
    scores.push(result.score);

    for (var q = 0; q < result.correct.length; q++) {
      qCorrect[q] = (qCorrect[q] || 0) + result.correct[q];
    }

    sent++;
    var phaseName = (phase === 'PRE') ? 'قبلي' : 'بعدي';
    Logger.log("👤 [" + phaseName + "] " + padNum(scores.length, 2) + "/" +
      settings.numStudents + " | " + profiles[queue[i].idx].id +
      " | " + result.score + "/" + answers.length +
      " (" + (result.score / answers.length * 100).toFixed(0) + "%) " +
      getGradeEmoji(result.score / answers.length * 100));

    if (sent < maxPerRun) {
      Utilities.sleep(1500 + Math.floor(Math.random() * 3000));
    }
  }

  // حفظ
  props.setProperty('QUEUE', JSON.stringify(queue));
  props.setProperty(scoreKey, JSON.stringify(scores));
  props.setProperty(qKey, JSON.stringify(qCorrect));

  // التحقق من الاكتمال
  var remaining = queue.filter(function (q) { return !q.done; }).length;

  if (remaining === 0) {
    cleanupTriggers();

    if (phase === 'PRE') {
      props.setProperty('STATE', 'PRE_DONE');
      Logger.log("\n✅✅✅ التطبيق القبلي اكتمل! ✅✅✅");
      printPhaseReport(scores, qCorrect, config, 'القبلي');
      Logger.log("\n💡 الخطوة التالية: شغّل runPostTest()");
    } else {
      props.setProperty('STATE', 'POST_DONE');
      var preScores = JSON.parse(props.getProperty('PRE_SCORES') || '[]');
      var preQCorrect = JSON.parse(props.getProperty('PRE_Q_CORRECT') || '[]');
      Logger.log("\n✅✅✅ التطبيق البعدي اكتمل! ✅✅✅");
      printPhaseReport(scores, qCorrect, config, 'البعدي');
      printFinalReport(preScores, scores, preQCorrect, qCorrect, profiles, config);
    }
  } else if (sent > 0) {
    Logger.log("📊 تم: " + scores.length + " | متبقي: " + remaining);
  }
}