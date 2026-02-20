// ════════════════════════════════════════════════════════════════
//  🔧 utils.gs - الدوال المساعدة
// ════════════════════════════════════════════════════════════════

// ═══════════════════════════════
//  نظام Logging مركزي
// ═══════════════════════════════
const LOG_LEVEL = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
let _currentLogLevel = LOG_LEVEL.INFO;

/**
 * تعيين مستوى الـ Logging
 * @param {number} level - مستوى من LOG_LEVEL
 */
function setLogLevel(level) { _currentLogLevel = level; }

/**
 * Logging مركزي بمستويات
 * @param {string} level - 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'
 * @param {string} msg - الرسالة
 */
function log(level, msg) {
  const lvl = LOG_LEVEL[level] !== undefined ? LOG_LEVEL[level] : LOG_LEVEL.INFO;
  if (lvl > _currentLogLevel) return;
  const prefix = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : level === 'DEBUG' ? '🔍' : '';
  Logger.log((prefix ? prefix + ' ' : '') + msg);
}

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

// getLikertItems = نفس getMCQItems (تمت إزالة التكرار)
const getLikertItems = getMCQItems;

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
  return Math.sqrt(variance(arr));
}

/**
 * حساب التباين (sample variance, n-1)
 * @param {number[]} arr
 * @returns {number}
 */
function variance(arr) {
  if (arr.length <= 1) return 0;
  const avg = average(arr);
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += (arr[i] - avg) * (arr[i] - avg);
  return s / (arr.length - 1);
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

// ═══════════════════════════════════════════
//  حسابات إحصائية دقيقة (p-value و F-critical)
// ═══════════════════════════════════════════

/**
 * تقريب دالة التوزيع التراكمي الطبيعي المعياري Φ(x)
 * Abramowitz & Stegun approximation (خطأ < 1.5e-7)
 * @param {number} x
 * @returns {number}
 */
function normalCDF(x) {
  if (x < -8) return 0;
  if (x > 8) return 1;
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

/**
 * تقريب p-value من إحصائية t ودرجات الحرية
 * يستخدم تقريب t → z (مناسب لـ df > 5)
 * @param {number} tStat - إحصائية t
 * @param {number} df - درجات الحرية
 * @returns {number} p-value (two-tailed)
 */
function approxPValue(tStat, df) {
  const t = Math.abs(tStat);
  if (df <= 0) return 1;
  if (df >= 1000) return 2 * (1 - normalCDF(t));

  // تقريب Cornish-Fisher لتحويل t الى z
  const g1 = (t * t + 1) / (4 * df);
  const g2 = (5 * t * t * t * t + 16 * t * t + 3) / (96 * df * df);
  const z = t * (1 - g1 + g2);
  // fallback: تقريب أبسط لو df صغير
  const zAlt = t * Math.pow(1 - 1 / (4 * df), -0.5) * Math.pow(1 + t * t / (2 * df), -0.5);
  const zFinal = df < 10 ? zAlt : z;
  return 2 * (1 - normalCDF(zFinal));
}

/**
 * تقدير p-value وإرجاع نص معروض (backward-compatible)
 * @param {number} t - إحصائية t
 * @param {number} df - درجات الحرية
 * @param {number} [requiredTValue] - قيمة t الحرجة (غير مستخدمة - للتوافق)
 * @returns {string} نص معروض لقيمة p
 */
function estimatePValue(t, df, requiredTValue) {
  const p = approxPValue(t, df);
  if (p < 0.0001) return "= " + p.toExponential(2) + " 🔥🔥🔥";
  if (p < 0.001) return "= " + p.toFixed(4) + " 🔥🔥";
  if (p < 0.005) return "= " + p.toFixed(4) + " ✅✅";
  if (p < 0.01) return "= " + p.toFixed(4) + " ✅";
  if (p < 0.05) return "= " + p.toFixed(4) + " ⚠️";
  return "= " + p.toFixed(4) + " ❌ (غير دال)";
}

/**
 * تقريب F-critical باستخدام Wilson-Hilferty
 * @param {number} df1 - درجات حرية البسط
 * @param {number} df2 - درجات حرية المقام
 * @param {number} [alpha=0.05] - مستوى الدلالة
 * @returns {number} قيمة F الحرجة التقريبية
 */
function approxFCritical(df1, df2, alpha) {
  alpha = alpha || 0.05;
  // تحويل alpha الى z-score
  // تقريب عكس الدالة التراكمية الطبيعية (Beasley-Springer-Moro)
  const p = 1 - alpha;
  const z = approxInvNorm(p);

  // Wilson-Hilferty approximation
  const v1 = 2 / (9 * df1);
  const v2 = 2 / (9 * df2);
  const num = Math.pow(1 - v2 + z * Math.sqrt(v2), 3);
  const den = Math.pow(1 - v1 - z * Math.sqrt(v1), 3);
  return den > 0 ? num / den : 9999;
}

/**
 * تقريب عكس التوزيع الطبيعي (Beasley-Springer-Moro)
 * @param {number} p - احتمال (0 < p < 1)
 * @returns {number} z-score
 */
function approxInvNorm(p) {
  if (p <= 0) return -8;
  if (p >= 1) return 8;
  // Rational approximation (Abramowitz & Stegun 26.2.23)
  if (p < 0.5) return -approxInvNorm(1 - p);
  const t = Math.sqrt(-2 * Math.log(1 - p));
  const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
  const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;
  return t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
}

/**
 * تقريب p-value من F-statistic (للعرض)
 * يستخدم تقريب t → z عبر Wilson-Hilferty
 * @param {number} F - إحصائية F
 * @param {number} df1
 * @param {number} df2
 * @returns {string} نص p-value
 */
function estimateFPValue(F, df1, df2) {
  if (F <= 0 || df1 <= 0 || df2 <= 0) return "> 0.05 ❌";
  // Wilson-Hilferty: transform F to approximate z
  const v1 = 2 / (9 * df1);
  const v2 = 2 / (9 * df2);
  const Fthird = Math.pow(F, 1 / 3);
  const z = ((1 - v2) * Fthird - (1 - v1)) / Math.sqrt(v2 * Fthird * Fthird + v1);
  const p = 1 - normalCDF(z);
  if (p < 0.0001) return "= " + p.toExponential(2) + " 🔥🔥";
  if (p < 0.001) return "= " + p.toFixed(4) + " 🔥";
  if (p < 0.01) return "= " + p.toFixed(4) + " **";
  if (p < 0.05) return "= " + p.toFixed(4) + " *";
  return "= " + p.toFixed(4) + " (غير دال)";
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