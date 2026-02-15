// ════════════════════════════════════════════════════════════════
//  📅 scheduler.gs - الجدولة الزمنية
// ════════════════════════════════════════════════════════════════


/**
 * إنشاء جدول زمني لتوزيع الردود
 * @param {number} numStudents
 * @param {number} numDays
 * @param {number} startH - ساعة البداية
 * @param {number} endH - ساعة النهاية
 * @param {number} minGap - الحد الأدنى بين الردود (دقائق)
 * @param {string} [tz] - المنطقة الزمنية
 * @returns {Date[]}
 */
function createSchedule(numStudents, numDays, startH, endH, minGap, tz) {
  const now = new Date();
  const firstDay = new Date(now);
  firstDay.setSeconds(0, 0);

  if (now.getHours() >= endH) {
    firstDay.setDate(firstDay.getDate() + 1);
  }
  firstDay.setHours(startH, 0, 0, 0);

  const perDay = distributePerDay(numStudents, numDays);
  const windowMin = (endH - startH) * 60;
  const schedule = [];

  for (let day = 0; day < numDays; day++) {
    const dayStart = new Date(firstDay);
    dayStart.setDate(dayStart.getDate() + day);

    const times = [];
    for (let s = 0; s < perDay[day]; s++) {
      times.push(Math.floor(rng() * windowMin));
    }
    times.sort(function (a, b) { return a - b; });

    for (let s = 1; s < times.length; s++) {
      if (times[s] - times[s - 1] < minGap) {
        times[s] = times[s - 1] + minGap + Math.floor(rng() * 6);
        if (times[s] >= windowMin) {
          times[s] = windowMin - 1 - Math.floor(rng() * 10);
        }
      }
    }

    for (let s = 0; s < times.length; s++) {
      const dt = new Date(dayStart);
      dt.setMinutes(dt.getMinutes() + times[s]);
      dt.setSeconds(Math.floor(rng() * 60));
      schedule.push(dt);
    }
  }

  schedule.sort(function (a, b) { return a.getTime() - b.getTime(); });
  return schedule;
}

function distributePerDay(total, days) {
  const dist = [];
  let remaining = total;

  for (let d = 0; d < days - 1; d++) {
    const avg = remaining / (days - d);
    const variance = Math.floor((rng() - 0.5) * avg * 0.4);
    let count = Math.round(avg) + variance;
    count = Math.max(Math.floor(total * 0.2), count);
    count = Math.min(Math.ceil(total * 0.45), count);
    count = Math.min(count, remaining - (days - d - 1));
    dist.push(count);
    remaining -= count;
  }
  dist.push(remaining);
  return dist;
}

/**
 * بناء قائمة الانتظار من الجدول
 * @param {number} numStudents
 * @param {Date[]} schedule
 * @param {string} [tz]
 * @returns {Object[]}
 */
function buildQueue(numStudents, schedule, tz) {
  const tzStr = tz || "Africa/Cairo";
  const queue = [];
  for (let i = 0; i < numStudents; i++) {
    queue.push({
      idx: i,
      time: schedule[i].getTime(),
      timeStr: Utilities.formatDate(schedule[i], tzStr, "yyyy-MM-dd HH:mm:ss"),
      done: false,
      score: -1
    });
  }
  return queue;
}

function setupTrigger(intervalMinutes) {
  cleanupTriggers();
  ScriptApp.newTrigger('processQueue')
    .timeBased()
    .everyMinutes(intervalMinutes)
    .create();
  Logger.log("⏱️ تم إنشاء مؤقت كل " + intervalMinutes + " دقائق");
}

function cleanupTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'processQueue') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

function printScheduleSummary(queue, phaseName) {
  Logger.log("📅 جدول التطبيق " + phaseName + ":");
  const days = {};
  for (let i = 0; i < queue.length; i++) {
    const day = queue[i].timeStr.substring(0, 10);
    if (!days[day]) days[day] = 0;
    days[day]++;
  }
  for (const d in days) {
    Logger.log("   📆 " + d + ": " + days[d] + " طالب");
  }
  Logger.log("   ⏰ أول رد: " + queue[0].timeStr);
  Logger.log("   ⏰ آخر رد: " + queue[queue.length - 1].timeStr);
  Logger.log("");
}