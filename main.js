// ════════════════════════════════════════════════════════════════
//  🚀 main.gs - الدوال الرئيسية للتشغيل
// ════════════════════════════════════════════════════════════════


// ╔═══════════════════════════════════════╗
// ║    CONFIG_FILE_ID: لو عاوز تحمل      ║
// ║    من ملف JSON في Drive              ║
// ║    سيبه فاضي = استخدم الافتراضي      ║
// ╚═══════════════════════════════════════╝
const CONFIG_FILE_ID = ""; // اختياري


/**
 * تحميل الإعدادات من Drive أو الافتراضي
 * @returns {Object} كائن الإعدادات
 */
function loadConfig() {
  if (CONFIG_FILE_ID && CONFIG_FILE_ID.length > 10) {
    return loadConfigFromDrive(CONFIG_FILE_ID);
  }
  return getTestConfig();
}


/**
 * بدء التطبيق القبلي - توليد البروفايلات والجدولة
 */
function runPreTest() {
  const config = loadConfig();
  const props = PropertiesService.getScriptProperties();
  const state = props.getProperty('STATE') || 'IDLE';

  if (state === 'PRE_RUNNING' || state === 'POST_RUNNING') {
    Logger.log("❌ فيه محاكاة شغالة! استخدم checkStatus() أو stopSimulation()");
    return;
  }

  // التحقق من صحة الاعدادات
  const validation = validateConfig(config);
  if (!validation.valid) {
    Logger.log("❌ لا يمكن البدء -- اصلح الأخطاء أعلاه");
    return;
  }

  Logger.log("═══════════════════════════════════════════");
  Logger.log("🚀 بدء التطبيق القبلي (Pre-Test)" + (config.settings.dryRun ? " [DRY RUN]" : ""));
  Logger.log("📋 " + config.testInfo.title);
  Logger.log("═══════════════════════════════════════════");

  // تهيئة مولد الأرقام العشوائية
  initRng(config.settings.seed || null);

  // استخراج البيانات من الـ JSON
  const answers = extractAnswers(config);
  const settings = config.settings;

  // توليد بروفايلات الطلاب (العدد يؤخذ من students.js)
  const profiles = generateProfiles(settings);
  const numStudents = profiles.length;

  // توليد مستويات التدفق وإضافتها للبروفايلات
  const flowConfig = getFlowConfig();
  generateFlowProfiles(flowConfig, profiles);

  // التحقق الإحصائي
  verifyStatisticalSignificance(profiles, answers.length, config);

  // إنشاء الجدول الزمني
  const schedule = createSchedule(
    numStudents,
    settings.schedule.numDays,
    settings.schedule.startHour,
    settings.schedule.endHour,
    settings.schedule.minGapMinutes,
    settings.timezone,
    settings.schedule.startFromNow || false
  );

  // إنشاء قائمة الانتظار
  const queue = buildQueue(numStudents, schedule, settings.timezone);

  // حفظ كل شيء
  props.setProperty('CONFIG', JSON.stringify(config));
  props.setProperty('FLOW_CONFIG', JSON.stringify(flowConfig));
  props.setProperty('PROFILES', JSON.stringify(profiles));
  props.setProperty('QUEUE', JSON.stringify(queue));
  props.setProperty('PHASE', 'PRE');
  props.setProperty('STATE', 'PRE_RUNNING');
  props.setProperty('PRE_SCORES', JSON.stringify([]));
  props.setProperty('PRE_Q_CORRECT', JSON.stringify(new Array(answers.length).fill(0)));
  props.setProperty('PRE_DETAILS', JSON.stringify([]));
  props.setProperty('FLOW_PRE_SCORES', JSON.stringify([]));

  // عرض الجدول
  printScheduleSummary(queue, 'القبلي');

  // إنشاء Trigger
  setupTrigger(settings.triggerIntervalMinutes || 5);

  const flowActive = flowConfig.formUrl.indexOf('FLOW_FORM_ID_HERE') === -1;
  Logger.log("✅ تم البدء! الردود ستتبعت تلقائياً حسب الجدول");
  Logger.log("📋 MCQ: " + (settings.dryRun ? "DRY RUN" : "إرسال حقيقي"));
  Logger.log("📊 مقياس التدفق: " + (flowActive ? "إرسال حقيقي" : "لم يُضبط الرابط بعد - سيتم التخطي"));
  Logger.log("💡 تابع بـ: checkStatus()");
}


/**
 * بدء التطبيق البعدي - بعد اكتمال القبلي
 */
function runPostTest() {
  const props = PropertiesService.getScriptProperties();
  const state = props.getProperty('STATE') || 'IDLE';

  if (state === 'PRE_RUNNING' || state === 'POST_RUNNING') {
    Logger.log("❌ فيه محاكاة شغالة!");
    return;
  }
  if (state !== 'PRE_DONE') {
    Logger.log("⚠️ لازم التطبيق القبلي يخلص الأول!");
    Logger.log("💡 شغّل runPreTest() أو resetAll()");
    return;
  }

  let config, profiles;
  try {
    config = JSON.parse(props.getProperty('CONFIG'));
    profiles = JSON.parse(props.getProperty('PROFILES'));
  } catch (e) {
    Logger.log("❌ خطأ في قراءة البيانات المحفوظة: " + e.message);
    Logger.log("💡 جرّب resetAll() ثم runPreTest() من جديد");
    return;
  }
  const settings = config.settings;
  const answers = extractAnswers(config);
  const numStudents = profiles.length;

  Logger.log("═══════════════════════════════════════════");
  Logger.log("🚀 بدء التطبيق البعدي (Post-Test)");
  Logger.log("═══════════════════════════════════════════");

  const schedule = createSchedule(
    numStudents,
    settings.schedule.numDays,
    settings.schedule.startHour,
    settings.schedule.endHour,
    settings.schedule.minGapMinutes,
    settings.timezone,
    settings.schedule.startFromNow || false
  );

  const queue = buildQueue(numStudents, schedule, settings.timezone);

  props.setProperty('QUEUE', JSON.stringify(queue));
  props.setProperty('PHASE', 'POST');
  props.setProperty('STATE', 'POST_RUNNING');
  props.setProperty('POST_SCORES', JSON.stringify([]));
  props.setProperty('POST_Q_CORRECT', JSON.stringify(new Array(answers.length).fill(0)));
  props.setProperty('POST_DETAILS', JSON.stringify([]));
  props.setProperty('FLOW_POST_SCORES', JSON.stringify([]));

  printScheduleSummary(queue, 'البعدي');
  setupTrigger(settings.triggerIntervalMinutes || 5);

  Logger.log("✅ تم البدء! تابع بـ: checkStatus()");
}


/**
 * معالج قائمة الانتظار - يُستدعى تلقائياً بالـ Trigger
 * يرسل ردود الطلاب حسب الجدول الزمني
 */
function processQueue() {
  const props = PropertiesService.getScriptProperties();
  const state = props.getProperty('STATE');
  if (state !== 'PRE_RUNNING' && state !== 'POST_RUNNING') return;

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;

  try {
  let config, flowConfig, phase, profiles, queue, scores, qCorrect, details, scoreKey, qKey, detailKey;
  let flowScores, flowScoreKey;
  try {
    config = JSON.parse(props.getProperty('CONFIG'));
    flowConfig = JSON.parse(props.getProperty('FLOW_CONFIG') || 'null');
    phase = props.getProperty('PHASE');
    profiles = JSON.parse(props.getProperty('PROFILES'));
    queue = JSON.parse(props.getProperty('QUEUE'));
    scoreKey = phase + '_SCORES';
    qKey = phase + '_Q_CORRECT';
    detailKey = phase + '_DETAILS';
    flowScoreKey = 'FLOW_' + phase + '_SCORES';
    scores = JSON.parse(props.getProperty(scoreKey) || '[]');
    qCorrect = JSON.parse(props.getProperty(qKey) || '[]');
    details = JSON.parse(props.getProperty(detailKey) || '[]');
    flowScores = JSON.parse(props.getProperty(flowScoreKey) || '[]');
  } catch (e) {
    Logger.log("❌ خطأ في قراءة البيانات: " + e.message);
    return;
  }

  const answers = extractAnswers(config);
  const settings = config.settings;
  const queueProc = settings.queueProcessing || {};
  const maxPerRun = queueProc.maxPerRun || 8;
  const sleepMinMs = queueProc.sleepMinMs || 1500;
  const sleepExtraMaxMs = queueProc.sleepExtraMaxMs || 3000;
  const now = new Date().getTime();
  let sent = 0;

  const isDryRun = settings.dryRun === true;
  const startTime = Date.now();
  const MAX_RUNTIME_MS = 5 * 60 * 1000;  // 5 دقائق حد امان (GAS limit = 6 min)
  let form = null;
  let mcqItems = null;

  // مقياس التدفق
  const flowActive = flowConfig &&
    flowConfig.formUrl &&
    flowConfig.formUrl.indexOf('FLOW_FORM_ID_HERE') === -1 &&
    !isDryRun;
  let flowForm = null;
  let likertItems = null;

  for (let i = 0; i < queue.length; i++) {
    if (queue[i].done || queue[i].time > now) continue;
    if (sent >= maxPerRun) break;
    // حماية من تجاوز 6 دقائق
    if (Date.now() - startTime > MAX_RUNTIME_MS) {
      Logger.log("⏰ تم الايقاف المبكر -- اقتراب من حد الـ 6 دقائق");
      break;
    }

    if (!form && !isDryRun) {
      const formId = extractFormId(settings.formUrl);
      form = FormApp.openById(formId);
      mcqItems = getMCQItems(form);

      if (mcqItems.length !== answers.length) {
        Logger.log("❌ عدد الأسئلة (" + mcqItems.length +
          ") ≠ عدد الإجابات (" + answers.length + ")");
        Logger.log("💡 عدّل config.questions ليطابق الفورم، أو استخدم resetAll() ثم runPreTest() من جديد");
        cleanupTriggers();
        props.setProperty('STATE', phase + '_ERROR');
        return;
      }
    }

    const prof = profiles[queue[i].idx];
    const skill = (phase === 'PRE') ? prof.preSkill : prof.postSkill;

    // ── إرسال رد MCQ ──
    const result = submitResponse(form, mcqItems, {
      skill: skill,
      consistency: prof.consistency,
      fatigue: prof.fatigue,
      email: prof.email
    }, answers, config);

    // ── إرسال رد مقياس التدفق (نفس الطالب، نفس الوقت) ──
    let flowScore = -1;
    if (flowConfig) {
      if (flowActive) {
        if (!flowForm) {
          flowForm = FormApp.openById(extractFormId(flowConfig.formUrl));
          likertItems = getLikertItems(flowForm);
          if (likertItems.length !== flowConfig.items.length) {
            Logger.log("⚠️ [Flow] عدد عبارات الفورم (" + likertItems.length +
              ") ≠ عدد عبارات الإعداد (" + flowConfig.items.length + ") -- سيتم تخطي المقياس");
            flowForm = null;
            likertItems = null;
          }
        }
      }
      const flowLevel = (phase === 'PRE') ? prof.preFlowLevel : prof.postFlowLevel;
      if (flowLevel !== undefined) {
        const flowResult = submitFlowResponse(
          flowActive ? flowForm : null,
          flowActive ? likertItems : null,
          { flowLevel: flowLevel, email: prof.email, flowConsistency: prof.flowConsistency },
          flowConfig,
          isDryRun || !flowActive
        );
        flowScore = flowResult.totalScore;
        flowScores.push(flowScore);
      }
    }

    queue[i].done = true;
    queue[i].score = result.score;
    queue[i].flowScore = flowScore;
    scores.push(result.score);

    for (let q = 0; q < result.correct.length; q++) {
      qCorrect[q] = (qCorrect[q] || 0) + result.correct[q];
    }

    // حفظ بيانات تفصيلية لكل طالبة (مضغوطة لتجنب حد 9KB)
    // correct array يُخزن كـ string "110100..." بدل [1,1,0,1,0,0,...]
    details.push({
      id: prof.id,
      group: prof.group,
      score: result.score,
      flowScore: flowScore,
      c: result.correct.join("")
    });

    sent++;
    const phaseName = (phase === 'PRE') ? 'قبلي' : 'بعدي';
    const flowStr = flowScore >= 0 ? " | تدفق: " + flowScore + "/280" : "";
    Logger.log("👤 [" + phaseName + "] " + padNum(scores.length, 2) + "/" +
      profiles.length + " | " + prof.id + " [" + prof.group + "] " +
      prof.name + " | " + result.score + "/" + answers.length +
      " (" + (result.score / answers.length * 100).toFixed(0) + "%) " +
      getGradeEmoji(result.score / answers.length * 100) + flowStr);

    if (sent < maxPerRun) {
      Utilities.sleep(sleepMinMs + Math.floor(rng() * sleepExtraMaxMs));
    }
  }

  // حفظ
  props.setProperty('QUEUE', JSON.stringify(queue));
  props.setProperty(scoreKey, JSON.stringify(scores));
  props.setProperty(qKey, JSON.stringify(qCorrect));
  props.setProperty(detailKey, JSON.stringify(details));
  props.setProperty(flowScoreKey, JSON.stringify(flowScores));

  // التحقق من الاكتمال
  const remaining = queue.filter(function (q) { return !q.done; }).length;

  if (remaining === 0) {
    cleanupTriggers();

    if (phase === 'PRE') {
      props.setProperty('STATE', 'PRE_DONE');
      Logger.log("\n✅✅✅ التطبيق القبلي اكتمل! ✅✅✅");
      printPhaseReport(scores, qCorrect, config, 'القبلي');
      Logger.log("\n💡 الخطوة التالية: شغّل runPostTest()");
    } else {
      props.setProperty('STATE', 'POST_DONE');
      let preScores, preQCorrect, preDetails, postDetails;
      try {
        preScores = JSON.parse(props.getProperty('PRE_SCORES') || '[]');
        preQCorrect = JSON.parse(props.getProperty('PRE_Q_CORRECT') || '[]');
        preDetails = JSON.parse(props.getProperty('PRE_DETAILS') || '[]');
        postDetails = details;
      } catch (e) {
        Logger.log("❌ خطأ في قراءة نتائج القبلي: " + e.message);
        return;
      }
      Logger.log("\n✅✅✅ التطبيق البعدي اكتمل! ✅✅✅");
      printPhaseReport(scores, qCorrect, config, 'البعدي');
      printFinalReport(preScores, scores, preQCorrect, qCorrect, profiles, config, preDetails, postDetails);

      // اشعار بالبريد
      try {
        const email = Session.getActiveUser().getEmail();
        if (email) {
          MailApp.sendEmail(email,
            "✅ المحاكاة اكتملت - " + (config.testInfo ? config.testInfo.title : ""),
            "تم إرسال " + profiles.length + " رد (قبلي + بعدي).\n\n" +
            "شغّل exportToSheet() لتصدير النتائج في Google Sheet.\n" +
            "أو شغّل checkStatus() لعرض الحالة.");
          Logger.log("📧 تم إرسال إشعار بالبريد الإلكتروني");
        }
      } catch (mailErr) {
        Logger.log("⚠️ لم يتم إرسال البريد: " + mailErr.message);
      }
    }
  } else if (sent > 0) {
    Logger.log("📊 تم: " + scores.length + " | متبقي: " + remaining);
  }
  } finally {
    lock.releaseLock();
  }
}