// ════════════════════════════════════════════════════════════════
//  🔧 utils.gs - الدوال المساعدة
// ════════════════════════════════════════════════════════════════

/**
 * استخراج عناصر الاختيار من متعدد من الفورم
 * @param {GoogleAppsScript.Forms.Form} form - الفورم
 * @returns {GoogleAppsScript.Forms.MultipleChoiceItem[]}
 */
function getMCQItems(form) {
  const items = form.getItems();
  const mcq = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].getType() === FormApp.ItemType.MULTIPLE_CHOICE) {
      mcq.push(items[i].asMultipleChoiceItem());
    }
  }
  return mcq;
}

/**
 * استخراج عناصر Likert (اختيار من متعدد) من فورم المقياس
 * مشابهة لـ getMCQItems لكن مخصصة لمقياس التدفق
 * @param {GoogleAppsScript.Forms.Form} form - فورم مقياس التدفق
 * @returns {GoogleAppsScript.Forms.MultipleChoiceItem[]}
 */
function getLikertItems(form) {
  const items = form.getItems();
  const likert = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].getType() === FormApp.ItemType.MULTIPLE_CHOICE) {
      likert.push(items[i].asMultipleChoiceItem());
    }
  }
  return likert;
}

/**
 * استخراج معرف الفورم من الرابط
 * @param {string} url - رابط الفورم أو المعرف
 * @returns {string}
 * @throws {Error} إذا لم يتم استخراج المعرف
 */
function extractFormId(url) {
  url = url.trim();
  let m = url.match(/\/forms\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  m = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(url)) return url;
  throw new Error("Can't extract Form ID: " + url);
}

// ═══════════════════════════════
//  Seeded PRNG (Mulberry32)
//  لو seed = null/undefined يستخدم Math.random
// ═══════════════════════════════
let _rngFunc = null;

/**
 * تهيئة مولد الأرقام العشوائية
 * @param {number|null} seed - رقم seed (null = عشوائي)
 */
function initRng(seed) {
  if (seed !== null && seed !== undefined) {
    let s = seed | 0;
    _rngFunc = function () {
      s |= 0; s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    Logger.log("🌱 Seed: " + seed + " (نتائج قابلة للتكرار)");
  } else {
    _rngFunc = null;
  }
}

/**
 * رقم عشوائي [0,1) -- يستخدم seed لو موجود
 * @returns {number}
 */
function rng() {
  return _rngFunc ? _rngFunc() : Math.random();
}

/**
 * رقم عشوائي من التوزيع الطبيعي المعياري (Box-Muller)
 * @returns {number}
 */
function normalRandom() {
  const u1 = Math.max(rng(), 1e-10);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * تحديد قيمة ضمن نطاق
 * @param {number} v - القيمة
 * @param {number} min - الحد الأدنى
 * @param {number} max - الحد الأقصى
 * @returns {number}
 */
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

/**
 * حساب المتوسط الحسابي
 * @param {number[]} arr
 * @returns {number}
 */
function average(arr) {
  if (!arr.length) return 0;
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s / arr.length;
}

/**
 * حساب الانحراف المعياري
 * @param {number[]} arr
 * @returns {number}
 */
function stdDev(arr) {
  if (arr.length <= 1) return 0;
  const avg = average(arr);
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += (arr[i] - avg) * (arr[i] - avg);
  return Math.sqrt(s / (arr.length - 1));
}

function padNum(n, len) {
  let s = String(n);
  while (s.length < len) s = "0" + s;
  return s;
}

function getGradeEmoji(pct) {
  if (pct >= 85) return "🌟";
  if (pct >= 75) return "✅";
  if (pct >= 65) return "📗";
  if (pct >= 50) return "📙";
  return "📕";
}

function getEffectLabel(d) {
  d = Math.abs(d);
  if (d >= 1.2) return "كبير جداً 🔥";
  if (d >= 0.8) return "كبير 💪";
  if (d >= 0.5) return "متوسط 📊";
  if (d >= 0.2) return "صغير 📉";
  return "ضعيف";
}

/**
 * تقدير تقريبي لقيمة p من إحصائية t (للعرض فقط).
 * @param {number} t - إحصائية t
 * @param {number} df - درجات الحرية (غير مستخدم في التقريب الحالي)
 * @param {number} [requiredTValue] - قيمة t الحرجة لـ alpha=0.005
 * @returns {string} نص معروض لقيمة p
 */
function estimatePValue(t, df, requiredTValue) {
  t = Math.abs(t);
  const t005 = (requiredTValue !== undefined && requiredTValue !== null) ? requiredTValue : 2.89;
  if (t > 5.0) return "< 0.0001 🔥🔥🔥";
  if (t > 3.5) return "< 0.001 🔥🔥";
  if (t > t005) return "< 0.005 ✅✅";
  if (t > 2.64) return "< 0.01 ✅";
  if (t > 1.99) return "< 0.05 ⚠️";
  return "> 0.05 ❌";
}

/**
 * التحقق من صحة الاعدادات وبيانات الطالبات
 * @param {Object} config
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateConfig(config) {
  const errors = [];

  // التحقق من formUrl
  if (!config.settings || !config.settings.formUrl) {
    errors.push("formUrl مفقود في الاعدادات");
  } else if (config.settings.formUrl === "https://docs.google.com/forms/d/FORM_ID_HERE/edit") {
    if (!config.settings.dryRun) {
      errors.push("formUrl لم يتم تعديله -- ضع رابط الفورم الحقيقي أو فعّل dryRun");
    }
  }

  // التحقق من الأسئلة
  if (!config.questions || !config.questions.length) {
    errors.push("لا توجد أسئلة في الاعدادات");
  }

  // التحقق من الطالبات
  const students = getStudents();
  if (!students || !students.length) {
    errors.push("لا يوجد طالبات في students.js");
  } else {
    // التحقق من عدم تكرار الـ IDs
    const ids = {};
    for (let i = 0; i < students.length; i++) {
      if (ids[students[i].id]) {
        errors.push("ID مكرر: " + students[i].id);
      }
      ids[students[i].id] = true;

      if (!students[i].email) {
        errors.push("ايميل مفقود للطالبة: " + students[i].id);
      }
      if (!students[i].group) {
        errors.push("مجموعة مفقودة للطالبة: " + students[i].id);
      }
    }

    // التحقق من توزيع المجموعات
    if (config.settings.groups) {
      const groupCounts = {};
      for (let i = 0; i < students.length; i++) {
        groupCounts[students[i].group] = (groupCounts[students[i].group] || 0) + 1;
      }
      for (const gKey in config.settings.groups) {
        const expected = config.settings.groups[gKey].count;
        const actual = groupCounts[gKey] || 0;
        if (actual !== expected) {
          errors.push("المجموعة " + gKey + ": متوقع " + expected + " لكن وجد " + actual);
        }
      }
    }
  }

  if (errors.length) {
    Logger.log("❌ أخطاء في التحقق:");
    for (let i = 0; i < errors.length; i++) {
      Logger.log("   " + (i + 1) + ". " + errors[i]);
    }
  } else {
    Logger.log("✅ التحقق من الاعدادات: كل شيء سليم");
  }

  return { valid: errors.length === 0, errors: errors };
}


// ═══════════════════════════════
//  أدوات التحكم
// ═══════════════════════════════

function checkStatus() {
  const props = PropertiesService.getScriptProperties();
  const state = props.getProperty('STATE') || 'IDLE';
  const phase = props.getProperty('PHASE') || '-';
  const queue = JSON.parse(props.getProperty('QUEUE') || '[]');

  const done = queue.filter(function (q) { return q.done; }).length;
  const remaining = queue.length - done;

  Logger.log("═══════════════════════════════════");
  Logger.log("📊 الحالة: " + state);
  Logger.log("📝 المرحلة: " + (phase === 'PRE' ? 'قبلي' : phase === 'POST' ? 'بعدي' : '-'));
  Logger.log("✅ تم: " + done + "/" + queue.length);
  Logger.log("⏳ متبقي: " + remaining);

  if (remaining > 0) {
    const next = queue.find(function (q) { return !q.done; });
    if (next) Logger.log("⏰ التالي: " + next.timeStr);
  }

  const scoreKey = phase + '_SCORES';
  const scores = JSON.parse(props.getProperty(scoreKey) || '[]');
  if (scores.length > 0) {
    let numQ = 30;
    try {
      const cfg = JSON.parse(props.getProperty('CONFIG') || '{}');
      if (cfg.questions) numQ = cfg.questions.length;
    } catch (e) { /* fallback to 30 */ }
    Logger.log("📊 متوسط MCQ: " + (average(scores) / numQ * 100).toFixed(1) + "%");
  }

  const flowScoreKey = 'FLOW_' + phase + '_SCORES';
  const flowScores = JSON.parse(props.getProperty(flowScoreKey) || '[]');
  if (flowScores.length > 0) {
    Logger.log("🌊 متوسط التدفق: " + average(flowScores).toFixed(1) + "/280" +
      " (" + (average(flowScores) / 280 * 100).toFixed(1) + "%)");
  }

  Logger.log("⏱️ مؤقتات: " + ScriptApp.getProjectTriggers().length);
  Logger.log("═══════════════════════════════════");
}

function stopSimulation() {
  cleanupTriggers();
  const props = PropertiesService.getScriptProperties();
  const state = props.getProperty('STATE') || 'IDLE';
  if (state.indexOf('RUNNING') > -1) {
    props.setProperty('STATE', state.replace('RUNNING', 'DONE'));
  }
  Logger.log("🛑 تم الإيقاف");
}

function resetAll() {
  cleanupTriggers();
  PropertiesService.getScriptProperties().deleteAllProperties();
  Logger.log("🔄 تم إعادة التعيين");
}