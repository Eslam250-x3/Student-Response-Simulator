// ════════════════════════════════════════════════════════════════
//  🔧 utils.gs - الدوال المساعدة
// ════════════════════════════════════════════════════════════════

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
  
  function extractFormId(url) {
    url = url.trim();
    var m = url.match(/\/forms\/d\/([a-zA-Z0-9-_]+)/);
    if (m) return m[1];
    m = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (m) return m[1];
    if (/^[a-zA-Z0-9-_]{20,}$/.test(url)) return url;
    throw new Error("Can't extract Form ID: " + url);
  }
  
  function normalRandom() {
    var u1 = Math.random(), u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  
  function average(arr) {
    if (!arr.length) return 0;
    var s = 0;
    for (var i = 0; i < arr.length; i++) s += arr[i];
    return s / arr.length;
  }
  
  function stdDev(arr) {
    if (arr.length <= 1) return 0;
    var avg = average(arr);
    var s = 0;
    for (var i = 0; i < arr.length; i++) s += (arr[i] - avg) * (arr[i] - avg);
    return Math.sqrt(s / (arr.length - 1));
  }
  
  function padNum(n, len) {
    var s = String(n);
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
  
  function estimatePValue(t, df) {
    t = Math.abs(t);
    if (t > 5.0) return "< 0.0001 🔥🔥🔥";
    if (t > 3.5) return "< 0.001 🔥🔥";
    if (t > 2.89) return "< 0.005 ✅✅";
    if (t > 2.64) return "< 0.01 ✅";
    if (t > 1.99) return "< 0.05 ⚠️";
    return "> 0.05 ❌";
  }
  
  
  // ═══════════════════════════════
  //  أدوات التحكم
  // ═══════════════════════════════
  
  function checkStatus() {
    var props = PropertiesService.getScriptProperties();
    var state = props.getProperty('STATE') || 'IDLE';
    var phase = props.getProperty('PHASE') || '-';
    var queue = JSON.parse(props.getProperty('QUEUE') || '[]');
  
    var done = queue.filter(function (q) { return q.done; }).length;
    var remaining = queue.length - done;
  
    Logger.log("═══════════════════════════════════");
    Logger.log("📊 الحالة: " + state);
    Logger.log("📝 المرحلة: " + (phase === 'PRE' ? 'قبلي' : phase === 'POST' ? 'بعدي' : '-'));
    Logger.log("✅ تم: " + done + "/" + queue.length);
    Logger.log("⏳ متبقي: " + remaining);
  
    if (remaining > 0) {
      var next = queue.find(function (q) { return !q.done; });
      if (next) Logger.log("⏰ التالي: " + next.timeStr);
    }
  
    var scoreKey = phase + '_SCORES';
    var scores = JSON.parse(props.getProperty(scoreKey) || '[]');
    if (scores.length > 0) {
      Logger.log("📊 المتوسط: " + (average(scores) / 30 * 100).toFixed(1) + "%");
    }
  
    Logger.log("⏱️ مؤقتات: " + ScriptApp.getProjectTriggers().length);
    Logger.log("═══════════════════════════════════");
  }
  
  function stopSimulation() {
    cleanupTriggers();
    var props = PropertiesService.getScriptProperties();
    var state = props.getProperty('STATE') || 'IDLE';
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