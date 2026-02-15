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

/**
 * رقم عشوائي من التوزيع الطبيعي المعياري (Box-Muller)
 * @returns {number}
 */
function normalRandom() {
  const u1 = Math.random(), u2 = Math.random();
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
    Logger.log("📊 المتوسط: " + (average(scores) / 30 * 100).toFixed(1) + "%");
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