// ════════════════════════════════════════════════════════════════
//  ⚙️ engine.gs - محرك المحاكاة
// ════════════════════════════════════════════════════════════════


// ── استخراج بيانات الإجابات من الـ JSON ──
function extractAnswers(config) {
    return config.questions.map(function (q) {
      return {
        correct: q.correctAnswer,
        difficulty: q.difficulty,
        attractiveWrong: q.attractiveWrong,
        skill: q.skill
      };
    });
  }
  
  
  // ── توليد بروفايلات الطلاب ──
  function generateProfiles(settings) {
    var profiles = [];
    var n = settings.numStudents;
  
    for (var i = 0; i < n; i++) {
      var z1 = normalRandom();
      var preSkill = settings.preTest.meanSkill + z1 * settings.preTest.skillSpread;
      preSkill = clamp(preSkill, settings.preTest.minSkill, settings.preTest.maxSkill);
  
      var z2 = normalRandom();
      var imp = settings.improvement;
      var skillFactor = 1 + (settings.preTest.meanSkill - preSkill) * imp.weakBonus;
      var improvement = imp.base * skillFactor + z2 * imp.variation;
      improvement = clamp(improvement, 0.05, 0.45);
  
      var postSkill = preSkill + improvement;
      postSkill = clamp(postSkill, settings.postTest.minSkill, settings.postTest.maxSkill);
  
      var beh = settings.studentBehavior;
      profiles.push({
        id: "STD-" + padNum(i + 1, 3),
        preSkill: preSkill,
        postSkill: postSkill,
        improvement: postSkill - preSkill,
        consistency: beh.consistencyMin + Math.random() * (beh.consistencyMax - beh.consistencyMin),
        fatigue: Math.random() * beh.fatigueMax
      });
    }
  
    profiles.sort(function (a, b) { return b.preSkill - a.preSkill; });
    return profiles;
  }
  
  
  // ── إرسال رد طالب واحد ──
  function submitResponse(form, mcqItems, student, answers, config) {
    var response = form.createResponse();
    var score = 0;
    var correctArr = [];
    var beh = config.settings.studentBehavior;
  
    for (var q = 0; q < mcqItems.length; q++) {
      var item = mcqItems[q];
      var choices = item.getChoices();
      var ans = answers[q];
  
      // حساب الاحتمال
      var prob = beh.guessingBase +
        0.70 * student.skill * (1 - ans.difficulty * 0.5) +
        (Math.random() - 0.5) * (1 - student.consistency) * 0.25;
  
      // تأثير التعب
      if (q > beh.fatigueStartQuestion) {
        prob *= (1 - student.fatigue * (q - beh.fatigueStartQuestion) / 10);
      }
  
      prob = clamp(prob, 0.08, 0.96);
  
      var chosenIdx;
      if (Math.random() < prob) {
        chosenIdx = ans.correct;
        score++;
        correctArr.push(1);
      } else {
        chosenIdx = pickWrong(ans.correct, choices.length, ans.attractiveWrong, student.skill);
        correctArr.push(0);
      }
  
      response.withItemResponse(item.createResponse(choices[chosenIdx].getValue()));
    }
  
    response.submit();
    return { score: score, correct: correctArr };
  }
  
  
  // ── اختيار إجابة خاطئة ──
  function pickWrong(correctIdx, numChoices, attractiveIdx, skill) {
    var wrong = [];
    for (var c = 0; c < numChoices; c++) {
      if (c !== correctIdx) wrong.push(c);
    }
  
    var attractProb = 0.55 - skill * 0.25;
    if (attractiveIdx !== correctIdx && attractiveIdx >= 0 &&
      attractiveIdx < numChoices && Math.random() < attractProb) {
      return attractiveIdx;
    }
  
    return wrong[Math.floor(Math.random() * wrong.length)];
  }
  
  
  // ── التحقق من الدلالة الإحصائية المتوقعة ──
  function verifyStatisticalSignificance(profiles, numQ) {
    var diffs = profiles.map(function (p) { return p.improvement; });
    var meanD = average(diffs);
    var sdD = stdDev(diffs);
    var t = meanD / (sdD / Math.sqrt(profiles.length));
  
    Logger.log("📐 التحقق الإحصائي المبدئي:");
    Logger.log("   متوسط التحسن: " + (meanD * 100).toFixed(1) + "%");
    Logger.log("   t المتوقعة: " + t.toFixed(2));
    Logger.log("   " + (t > 2.89 ? "✅ p < 0.005 مضمونة" : "⚠️ قد تحتاج تعديل"));
    Logger.log("");
  }