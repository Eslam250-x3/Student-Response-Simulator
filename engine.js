// ════════════════════════════════════════════════════════════════
//  ⚙️ engine.gs - محرك المحاكاة
// ════════════════════════════════════════════════════════════════


/**
 * استخراج بيانات الإجابات من الإعدادات
 * @param {Object} config - كائن الإعدادات
 * @returns {Object[]}
 */
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

/**
 * توليد بروفايلات الطلاب مرتبطة ببيانات الطالبات من students.js
 * كل طالبة تأخد مستوى فردي + تأثير مجموعتها على التحسن
 * @param {Object} settings - إعدادات المحاكاة
 * @returns {Object[]}
 */
function generateProfiles(settings) {
  const students = getStudents();
  const profiles = [];
  const n = students.length;
  const groupFx = settings.groupEffects || {};

  for (let i = 0; i < n; i++) {
    const student = students[i];
    const fx = groupFx[student.group] || { improvementBonus: 0, skillSpreadMod: 0 };

    // ── مستوى القبلي (متساوي بين المجموعات -- تعيين عشوائي) ──
    const z1 = normalRandom();
    let preSkill = settings.preTest.meanSkill + z1 * settings.preTest.skillSpread;
    preSkill = clamp(preSkill, settings.preTest.minSkill, settings.preTest.maxSkill);

    // ── التحسن (يتأثر بمجموعة الطالبة) ──
    const z2 = normalRandom();
    const imp = settings.improvement;
    const skillFactor = 1 + (settings.preTest.meanSkill - preSkill) * imp.weakBonus;
    const groupBonus = fx.improvementBonus || 0;
    const spreadMod = fx.skillSpreadMod || 0;
    let improvement = (imp.base + groupBonus) * skillFactor + z2 * (imp.variation + spreadMod);
    improvement = clamp(improvement, 0.05, 0.50);

    let postSkill = preSkill + improvement;
    postSkill = clamp(postSkill, settings.postTest.minSkill, settings.postTest.maxSkill);

    const beh = settings.studentBehavior;
    profiles.push({
      id: student.id,
      name: student.name,
      email: student.email,
      group: student.group,
      preSkill: preSkill,
      postSkill: postSkill,
      improvement: postSkill - preSkill,
      consistency: beh.consistencyMin + Math.random() * (beh.consistencyMax - beh.consistencyMin),
      fatigue: Math.random() * beh.fatigueMax
    });
  }

  // ملاحظة: الترتيب بالـ preSkill لأغراض المحاكاة فقط
  // بيانات كل طالبة (id, name, email, group) تظل مرتبطة بالبروفايل
  profiles.sort(function (a, b) { return b.preSkill - a.preSkill; });
  return profiles;
}

/**
 * إرسال رد طالبة واحدة للفورم (بما في ذلك الإيميل)
 * @param {GoogleAppsScript.Forms.Form} form
 * @param {GoogleAppsScript.Forms.MultipleChoiceItem[]} mcqItems
 * @param {Object} student - {skill, consistency, fatigue, email}
 * @param {Object[]} answers
 * @param {Object} config
 * @returns {{score: number, correct: number[]}}
 */
function submitResponse(form, mcqItems, student, answers, config) {
  const response = form.createResponse();

  // ── ملء سؤال الإيميل (Short answer) ──
  if (student.email) {
    const emailIdx = (config.settings.emailSettings && config.settings.emailSettings.questionIndex !== undefined)
      ? config.settings.emailSettings.questionIndex : 0;
    const allItems = form.getItems();
    if (emailIdx < allItems.length && allItems[emailIdx].getType() === FormApp.ItemType.TEXT) {
      const emailItem = allItems[emailIdx].asTextItem();
      response.withItemResponse(emailItem.createResponse(student.email));
    }
  }

  let score = 0;
  const correctArr = [];
  const beh = config.settings.studentBehavior;

  for (let q = 0; q < mcqItems.length; q++) {
    const item = mcqItems[q];
    const choices = item.getChoices();
    const ans = answers[q];

    const skillW = beh.skillWeight || 0.70;
    const diffF = beh.difficultyFactor || 0.5;
    const consF = beh.consistencyFactor || 0.25;
    const probMin = beh.probMin || 0.08;
    const probMax = beh.probMax || 0.96;
    let prob = beh.guessingBase +
      skillW * student.skill * (1 - ans.difficulty * diffF) +
      (Math.random() - 0.5) * (1 - student.consistency) * consF;

    if (q > beh.fatigueStartQuestion) {
      prob *= (1 - student.fatigue * (q - beh.fatigueStartQuestion) / 10);
    }

    prob = clamp(prob, probMin, probMax);

    let chosenIdx;
    if (Math.random() < prob) {
      chosenIdx = ans.correct;
      score++;
      correctArr.push(1);
    } else {
      chosenIdx = pickWrong(ans.correct, choices.length, ans.attractiveWrong, student.skill, beh);
      correctArr.push(0);
    }

    response.withItemResponse(item.createResponse(choices[chosenIdx].getValue()));
  }

  try {
    response.submit();
  } catch (e) {
    Logger.log("❌ فشل إرسال الرد: " + e.message);
    throw e;
  }
  return { score: score, correct: correctArr };
}

function pickWrong(correctIdx, numChoices, attractiveIdx, skill, beh) {
  const wrong = [];
  for (let c = 0; c < numChoices; c++) {
    if (c !== correctIdx) wrong.push(c);
  }

  const attractBase = (beh && beh.attractBase) || 0.55;
  const attractSkillF = (beh && beh.attractSkillFactor) || 0.25;
  const attractProb = attractBase - skill * attractSkillF;
  if (attractiveIdx !== correctIdx && attractiveIdx >= 0 &&
    attractiveIdx < numChoices && Math.random() < attractProb) {
    return attractiveIdx;
  }

  return wrong[Math.floor(Math.random() * wrong.length)];
}

function verifyStatisticalSignificance(profiles, numQ, config) {
  const diffs = profiles.map(function (p) { return p.improvement; });
  const meanD = average(diffs);
  const sdD = stdDev(diffs);
  const t = meanD / (sdD / Math.sqrt(profiles.length));
  const requiredT = (config && config.settings && config.settings.statisticalTarget)
    ? config.settings.statisticalTarget.requiredTValue : 2.89;

  Logger.log("📐 التحقق الإحصائي المبدئي:");
  Logger.log("   متوسط التحسن: " + (meanD * 100).toFixed(1) + "%");
  Logger.log("   t المتوقعة: " + t.toFixed(2));
  Logger.log("   " + (t > requiredT ? "✅ p < 0.005 مضمونة" : "⚠️ قد تحتاج تعديل"));
  Logger.log("");
}