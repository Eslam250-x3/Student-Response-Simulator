// ════════════════════════════════════════════════════════════════
//  📅 scheduler.gs - الجدولة الزمنية
// ════════════════════════════════════════════════════════════════


function createSchedule(numStudents, numDays, startH, endH, minGap, tz) {
    var now = new Date();
    var firstDay = new Date(now);
    firstDay.setSeconds(0, 0);
  
    if (now.getHours() >= endH) {
      firstDay.setDate(firstDay.getDate() + 1);
    }
    firstDay.setHours(startH, 0, 0, 0);
  
    var perDay = distributePerDay(numStudents, numDays);
    var windowMin = (endH - startH) * 60;
    var schedule = [];
  
    for (var day = 0; day < numDays; day++) {
      var dayStart = new Date(firstDay);
      dayStart.setDate(dayStart.getDate() + day);
  
      var times = [];
      for (var s = 0; s < perDay[day]; s++) {
        times.push(Math.floor(Math.random() * windowMin));
      }
      times.sort(function (a, b) { return a - b; });
  
      // ضمان الفجوة
      for (var s = 1; s < times.length; s++) {
        if (times[s] - times[s - 1] < minGap) {
          times[s] = times[s - 1] + minGap + Math.floor(Math.random() * 6);
          if (times[s] >= windowMin) {
            times[s] = windowMin - 1 - Math.floor(Math.random() * 10);
          }
        }
      }
  
      for (var s = 0; s < times.length; s++) {
        var dt = new Date(dayStart);
        dt.setMinutes(dt.getMinutes() + times[s]);
        dt.setSeconds(Math.floor(Math.random() * 60));
        schedule.push(dt);
      }
    }
  
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
  
  
  function buildQueue(numStudents, schedule) {
    var queue = [];
    for (var i = 0; i < numStudents; i++) {
      queue.push({
        idx: i,
        time: schedule[i].getTime(),
        timeStr: Utilities.formatDate(schedule[i], "Africa/Cairo", "yyyy-MM-dd HH:mm:ss"),
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
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'processQueue') {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }
  }
  
  
  function printScheduleSummary(queue, phaseName) {
    Logger.log("📅 جدول التطبيق " + phaseName + ":");
    var days = {};
    for (var i = 0; i < queue.length; i++) {
      var day = queue[i].timeStr.substring(0, 10);
      if (!days[day]) days[day] = 0;
      days[day]++;
    }
    for (var d in days) {
      Logger.log("   📆 " + d + ": " + days[d] + " طالب");
    }
    Logger.log("   ⏰ أول رد: " + queue[0].timeStr);
    Logger.log("   ⏰ آخر رد: " + queue[queue.length - 1].timeStr);
    Logger.log("");
  }