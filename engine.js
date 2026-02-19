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
      consistency: beh.consistencyMin + rng() * (beh.consistencyMax - beh.consistencyMin),
      fatigue: rng() * beh.fatigueMax
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
  const isDryRun = config.settings.dryRun === true;
  const beh = config.settings.studentBehavior;
  const numQ = answers.length;
  const numChoices = (config.testInfo && config.testInfo.choicesPerQuestion) || 4;
  let response = null;

  if (!isDryRun) {
    response = form.createResponse();
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
  }

  let score = 0;
  const correctArr = [];

  for (let q = 0; q < numQ; q++) {
    const ans = answers[q];
    const choicesCount = (!isDryRun && mcqItems[q]) ? mcqItems[q].getChoices().length : numChoices;

    // ── 3PL IRT Model ──
    const guess = beh.guessingBase || 0.25;
    const disc = beh.discrimination || 1.7;
    const theta = student.skill * 4 - 2;  // تحويل skill [0,1] الى theta [-2,2]
    const diff_b = (ans.difficulty - 0.5) * 4; // تحويل difficulty [0,1] الى b [-2,2]

    let prob = guess + (1 - guess) / (1 + Math.exp(-disc * (theta - diff_b)));

    // تعديل الاتساق والارهاق
    const consF = beh.consistencyFactor || 0.25;
    prob += (rng() - 0.5) * (1 - student.consistency) * consF;

    if (q > (beh.fatigueStartQuestion || 20)) {
      prob *= (1 - student.fatigue * (q - (beh.fatigueStartQuestion || 20)) / 10);
    }

    prob = clamp(prob, beh.probMin || 0.08, beh.probMax || 0.96);

    let chosenIdx;
    if (rng() < prob) {
      chosenIdx = ans.correct;
      score++;
      correctArr.push(1);
    } else {
      chosenIdx = pickWrong(ans.correct, choicesCount, ans.attractiveWrong, student.skill, beh);
      correctArr.push(0);
    }

    if (!isDryRun && mcqItems[q]) {
      const choices = mcqItems[q].getChoices();
      response.withItemResponse(mcqItems[q].createResponse(choices[chosenIdx].getValue()));
    }
  }

  if (!isDryRun) {
    // Retry with exponential backoff (3 attempts)
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response.submit();
        break;
      } catch (e) {
        if (attempt === maxRetries) {
          Logger.log("❌ فشل إرسال الرد بعد " + maxRetries + " محاولات: " + e.message);
          throw e;
        }
        Logger.log("⚠️ محاولة " + attempt + " فشلت، إعادة المحاولة...");
        Utilities.sleep(1000 * Math.pow(2, attempt));
      }
    }
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
    attractiveIdx < numChoices && rng() < attractProb) {
    return attractiveIdx;
  }

  return wrong[Math.floor(rng() * wrong.length)];
}

// ════════════════════════════════════════════════════════════════
//  مقياس التدفق النفسي - توليد البروفايلات والاستجابة
// ════════════════════════════════════════════════════════════════

/**
 * توليد مستويات التدفق (قبلي وبعدي) لكل طالب
 * تُضاف كحقول preFlowLevel/postFlowLevel على البروفايل الموجود
 * @param {Object} flowConfig - إعدادات مقياس التدفق
 * @param {Object[]} baseProfiles - بروفايلات الطلاب من generateProfiles()
 * @returns {Object[]} نفس المصفوفة مع إضافة flowLevel
 */
function generateFlowProfiles(flowConfig, baseProfiles) {
  const groupFx = flowConfig.groupEffects || {};
  const pre = flowConfig.preFlow;
  const post = flowConfig.postFlow;
  const imp = flowConfig.improvement;
  const beh = flowConfig.responseBehavior || {};

  for (let i = 0; i < baseProfiles.length; i++) {
    const p = baseProfiles[i];
    const fx = groupFx[p.group] || { improvementBonus: 0 };

    // مستوى التدفق القبلي (توزيع طبيعي)
    const z1 = normalRandom();
    let preFlow = pre.meanFlow + z1 * pre.flowSpread;
    preFlow = clamp(preFlow, pre.minFlow, pre.maxFlow);

    // التحسن في التدفق بعد التدخل
    const z2 = normalRandom();
    const weakBonus = imp.weakBonus || 0.4;
    const skillFactor = 1 + (pre.meanFlow - preFlow) * weakBonus;
    const groupBonus = fx.improvementBonus || 0;
    let improvement = (imp.base + groupBonus) * skillFactor + z2 * imp.variation;
    improvement = clamp(improvement, 0.03, 0.45);

    let postFlow = preFlow + improvement;
    postFlow = clamp(postFlow, post.minFlow, post.maxFlow);

    // معامل الاتساق لهذا الطالب في الاستجابة
    const consMin = beh.consistencyMin || 0.55;
    const consMax = beh.consistencyMax || 0.95;
    const flowConsistency = consMin + rng() * (consMax - consMin);

    p.preFlowLevel  = preFlow;
    p.postFlowLevel = postFlow;
    p.flowConsistency = flowConsistency;
  }
  return baseProfiles;
}


/**
 * إرسال استجابة طالب واحد على مقياس التدفق (Likert)
 * @param {GoogleAppsScript.Forms.Form|null} form
 * @param {GoogleAppsScript.Forms.MultipleChoiceItem[]|null} likertItems
 * @param {Object} student - يحتوي على flowLevel, email, flowConsistency
 * @param {Object} flowConfig
 * @param {boolean} isDryRun
 * @returns {{totalScore: number, responses: number[]}}
 */
function submitFlowResponse(form, likertItems, student, flowConfig, isDryRun) {
  const items      = flowConfig.items;
  const negSet     = {};
  const negList    = flowConfig.negativeItems || [];
  for (let k = 0; k < negList.length; k++) negSet[negList[k]] = true;

  const noise      = (flowConfig.responseBehavior && flowConfig.responseBehavior.noiseLevel) || 0.18;
  const flowLevel  = student.flowLevel;
  const consistency = student.flowConsistency || 0.75;

  let response = null;
  if (!isDryRun && form) {
    response = form.createResponse();

    // ملء سؤال الإيميل
    if (student.email) {
      const emailIdx = (flowConfig.emailSettings && flowConfig.emailSettings.questionIndex !== undefined)
        ? flowConfig.emailSettings.questionIndex : 0;
      const allItems = form.getItems();
      if (emailIdx < allItems.length && allItems[emailIdx].getType() === FormApp.ItemType.TEXT) {
        response.withItemResponse(allItems[emailIdx].asTextItem().createResponse(student.email));
      }
    }
  }

  let totalScore = 0;
  const responses = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const isNeg = negSet[item.id] || item.isNegative;

    // احتساب الدرجة الفعلية المتوقعة (1-5) بعد العكس
    // ضجيج يتأثر بمعامل الاتساق
    const noiseAdj = noise * (1 - consistency);
    const raw = flowLevel * 4 + 1 + (rng() - 0.5) * noiseAdj * 4;
    const effectiveScore = Math.round(clamp(raw, 1, 5));

    // الدرجة الخام التي تُختار في الفورم
    // موجب: rawChoice = effectiveScore
    // سالب:  rawChoice = 6 - effectiveScore  (عكس)
    const rawChoice = isNeg ? (6 - effectiveScore) : effectiveScore;

    // index في مصفوفة الخيارات: دائماً=0(5د), غالباً=1(4د), أحياناً=2(3د), نادراً=3(2د), أبداً=4(1د)
    const choiceIndex = 5 - rawChoice; // 0=دائماً, ..., 4=أبداً

    responses.push(rawChoice);
    totalScore += effectiveScore; // الدرجة بعد العكس

    if (!isDryRun && form && likertItems && likertItems[i]) {
      const choices = likertItems[i].getChoices();
      const safeIdx = clamp(choiceIndex, 0, choices.length - 1);
      response.withItemResponse(likertItems[i].createResponse(choices[safeIdx].getValue()));
    }
  }

  if (!isDryRun && form && response) {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response.submit();
        break;
      } catch (e) {
        if (attempt === maxRetries) {
          Logger.log("❌ [Flow] فشل إرسال الرد بعد " + maxRetries + " محاولات: " + e.message);
          throw e;
        }
        Logger.log("⚠️ [Flow] محاولة " + attempt + " فشلت، إعادة المحاولة...");
        Utilities.sleep(1000 * Math.pow(2, attempt));
      }
    }
  }

  return { totalScore: totalScore, responses: responses };
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