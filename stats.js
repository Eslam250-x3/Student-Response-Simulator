// ════════════════════════════════════════════════════════════════
//  📊 stats.gs - الإحصائيات والتقارير
// ════════════════════════════════════════════════════════════════


function printPhaseReport(scores, qCorrect, config, phaseName) {
    var n = scores.length;
    var numQ = config.questions.length;
  
    Logger.log("\n╔══════════════════════════════════════════╗");
    Logger.log("║   📊 تقرير التطبيق " + phaseName);
    Logger.log("╠══════════════════════════════════════════╣");
    Logger.log("║  👥 العدد: " + n);
    Logger.log("║  📈 أعلى: " + Math.max.apply(null, scores) + "/" + numQ +
      " (" + (Math.max.apply(null, scores) / numQ * 100).toFixed(0) + "%)");
    Logger.log("║  📉 أقل: " + Math.min.apply(null, scores) + "/" + numQ +
      " (" + (Math.min.apply(null, scores) / numQ * 100).toFixed(0) + "%)");
    Logger.log("║  📊 متوسط: " + average(scores).toFixed(1) + "/" + numQ +
      " (" + (average(scores) / numQ * 100).toFixed(1) + "%)");
    Logger.log("║  📏 انحراف معياري: " + stdDev(scores).toFixed(2));
    Logger.log("╚══════════════════════════════════════════╝");
  
    // تحليل حسب المهارة
    if (config.skillsBreakdown) {
      Logger.log("\n📊 تحليل حسب المهارة:");
      for (var skill in config.skillsBreakdown) {
        var info = config.skillsBreakdown[skill];
        var skillTotal = 0;
        for (var q = 0; q < config.questions.length; q++) {
          if (config.questions[q].skill === skill) {
            skillTotal += qCorrect[q] || 0;
          }
        }
        var skillAvg = skillTotal / (n * info.count) * 100;
        Logger.log("   " + skill + ": " + skillAvg.toFixed(1) + "%");
      }
    }
  }
  
  
  function printFinalReport(preScores, postScores, preQC, postQC, profiles, config) {
    var n = preScores.length;
    var numQ = config.questions.length;
  
    // حساب الفروق
    var diffs = [];
    for (var i = 0; i < n; i++) {
      diffs.push(postScores[i] - preScores[i]);
    }
  
    var meanPre = average(preScores);
    var meanPost = average(postScores);
    var meanDiff = average(diffs);
    var sdPre = stdDev(preScores);
    var sdPost = stdDev(postScores);
    var sdDiff = stdDev(diffs);
  
    // Paired t-test
    var tValue = meanDiff / (sdDiff / Math.sqrt(n));
    var df = n - 1;
  
    // Effect sizes
    var pooledSD = Math.sqrt((sdPre * sdPre + sdPost * sdPost) / 2);
    var cohensD = meanDiff / pooledSD;
    var etaSq = (tValue * tValue) / (tValue * tValue + df);
  
    Logger.log("\n╔══════════════════════════════════════════════════════╗");
    Logger.log("║          📊 التقرير الإحصائي النهائي                 ║");
    Logger.log("╠══════════════════════════════════════════════════════╣");
    Logger.log("║                                                      ║");
    Logger.log("║  القبلي:  M=" + meanPre.toFixed(2) + " SD=" + sdPre.toFixed(2) +
      " (" + (meanPre / numQ * 100).toFixed(1) + "%)");
    Logger.log("║  البعدي:  M=" + meanPost.toFixed(2) + " SD=" + sdPost.toFixed(2) +
      " (" + (meanPost / numQ * 100).toFixed(1) + "%)");
    Logger.log("║  الفرق:   M=" + meanDiff.toFixed(2) + " SD=" + sdDiff.toFixed(2));
    Logger.log("║                                                      ║");
    Logger.log("║  ═══ الدلالة الإحصائية ═══                           ║");
    Logger.log("║  t(" + df + ") = " + tValue.toFixed(4));
    Logger.log("║  p " + estimatePValue(tValue, df));
    Logger.log("║  Cohen's d = " + cohensD.toFixed(4));
    Logger.log("║  η² = " + etaSq.toFixed(4));
    Logger.log("║  حجم التأثير: " + getEffectLabel(cohensD));
    Logger.log("║                                                      ║");
    Logger.log("║  " + (tValue > 2.89 ? "✅✅ دال عند 0.005 ✅✅" : "⚠️ تحقق يدوياً"));
    Logger.log("╚══════════════════════════════════════════════════════╝");
  
    // تحليل حسب المهارة
    Logger.log("\n📊 تحليل التحسن حسب المهارة:");
    Logger.log("المهارة\t\t\tقبلي%\tبعدي%\tالتحسن");
  
    for (var skill in config.skillsBreakdown) {
      var info = config.skillsBreakdown[skill];
      var preTotal = 0, postTotal = 0;
      for (var q = 0; q < config.questions.length; q++) {
        if (config.questions[q].skill === skill) {
          preTotal += preQC[q] || 0;
          postTotal += postQC[q] || 0;
        }
      }
      var preAvg = preTotal / (n * info.count) * 100;
      var postAvg = postTotal / (n * info.count) * 100;
      Logger.log(skill + "\t" + preAvg.toFixed(1) + "%\t" + postAvg.toFixed(1) +
        "%\t+" + (postAvg - preAvg).toFixed(1) + "%");
    }
  
    // بيانات للنسخ في Excel
    Logger.log("\n📋 بيانات للنسخ في Excel/SPSS:");
    Logger.log("Student\tPre\tPost\tDiff\tPre%\tPost%");
    for (var i = 0; i < n; i++) {
      Logger.log(profiles[i].id + "\t" + preScores[i] + "\t" + postScores[i] +
        "\t" + (postScores[i] - preScores[i]) + "\t" +
        (preScores[i] / numQ * 100).toFixed(0) + "\t" +
        (postScores[i] / numQ * 100).toFixed(0));
    }
  }