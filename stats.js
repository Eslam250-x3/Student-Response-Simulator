// ════════════════════════════════════════════════════════════════
//  📊 stats.gs - الإحصائيات والتقارير
// ════════════════════════════════════════════════════════════════


/**
 * طباعة تقرير مرحلة واحدة (قبلي أو بعدي)
 * @param {number[]} scores
 * @param {number[]} qCorrect
 * @param {Object} config
 * @param {string} phaseName
 */
function printPhaseReport(scores, qCorrect, config, phaseName) {
  const n = scores.length;
  const numQ = config.questions.length;

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

  if (config.skillsBreakdown) {
    Logger.log("\n📊 تحليل حسب المهارة:");
    for (const skill in config.skillsBreakdown) {
      const info = config.skillsBreakdown[skill];
      if (!info || !info.count) continue;
      let skillTotal = 0;
      for (let q = 0; q < config.questions.length; q++) {
        if (config.questions[q].skill === skill) {
          skillTotal += qCorrect[q] || 0;
        }
      }
      const skillAvg = skillTotal / (n * info.count) * 100;
      Logger.log("   " + skill + ": " + skillAvg.toFixed(1) + "%");
    }
  }
}
  
  
/**
 * طباعة التقرير الإحصائي النهائي (قبلي vs بعدي)
 * @param {number[]} preScores
 * @param {number[]} postScores
 * @param {number[]} preQC
 * @param {number[]} postQC
 * @param {Object[]} profiles
 * @param {Object} config
 */
function printFinalReport(preScores, postScores, preQC, postQC, profiles, config, preDetails, postDetails) {
  const numQ = config.questions.length;

  // ── مطابقة الدرجات بالـ student ID (paired correctly) ──
  const preMap = {};
  const postMap = {};
  if (preDetails && preDetails.length) {
    for (let i = 0; i < preDetails.length; i++) preMap[preDetails[i].id] = preDetails[i].score;
  }
  if (postDetails && postDetails.length) {
    for (let i = 0; i < postDetails.length; i++) postMap[postDetails[i].id] = postDetails[i].score;
  }

  // بناء مصفوفات متطابقة حسب الـ student ID
  const pairedPre = [];
  const pairedPost = [];
  const diffs = [];
  const students = getStudents();
  for (let i = 0; i < students.length; i++) {
    const sid = students[i].id;
    if (preMap[sid] !== undefined && postMap[sid] !== undefined) {
      pairedPre.push(preMap[sid]);
      pairedPost.push(postMap[sid]);
      diffs.push(postMap[sid] - preMap[sid]);
    }
  }

  const n = pairedPre.length;
  const meanPre = average(pairedPre);
  const meanPost = average(pairedPost);
  const meanDiff = average(diffs);
  const sdPre = stdDev(pairedPre);
  const sdPost = stdDev(pairedPost);
  const sdDiff = stdDev(diffs);

  const tValue = meanDiff / (sdDiff / Math.sqrt(n));
  const df = n - 1;

  const pooledSD = Math.sqrt((sdPre * sdPre + sdPost * sdPost) / 2);
  const cohensD = meanDiff / pooledSD;
  const etaSq = (tValue * tValue) / (tValue * tValue + df);

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
  const requiredT = (config.settings && config.settings.statisticalTarget)
    ? config.settings.statisticalTarget.requiredTValue : 2.89;
  Logger.log("║  p " + estimatePValue(tValue, df, requiredT));
  Logger.log("║  Cohen's d = " + cohensD.toFixed(4));
  Logger.log("║  η² = " + etaSq.toFixed(4));
  Logger.log("║  حجم التأثير: " + getEffectLabel(cohensD));
  Logger.log("║                                                      ║");
  Logger.log("║  " + (tValue > requiredT ? "✅✅ دال عند 0.005 ✅✅" : "⚠️ تحقق يدوياً"));
  Logger.log("╚══════════════════════════════════════════════════════╝");

  Logger.log("\n📊 تحليل التحسن حسب المهارة:");
  Logger.log("المهارة\t\t\tقبلي%\tبعدي%\tالتحسن");

  for (const skill in config.skillsBreakdown) {
    const info = config.skillsBreakdown[skill];
    if (!info || !info.count) continue;
    let preTotal = 0, postTotal = 0;
    for (let q = 0; q < config.questions.length; q++) {
      if (config.questions[q].skill === skill) {
        preTotal += preQC[q] || 0;
        postTotal += postQC[q] || 0;
      }
    }
    const preAvg = preTotal / (n * info.count) * 100;
    const postAvg = postTotal / (n * info.count) * 100;
    Logger.log(skill + "\t" + preAvg.toFixed(1) + "%\t" + postAvg.toFixed(1) +
      "%\t+" + (postAvg - preAvg).toFixed(1) + "%");
  }

  // ══════════════════════════════════════════════════════
  //  📊 تقرير حسب المجموعة
  // ══════════════════════════════════════════════════════
  if (config.settings.groups) {
    printGroupReport(preDetails, postDetails, config);
  }

  // ══════════════════════════════════════════════════════
  //  📋 بيانات تفصيلية لكل طالبة (للنسخ في Excel)
  // ══════════════════════════════════════════════════════
  printDetailedTracking(preDetails, postDetails, config);
}


/**
 * طباعة تقرير حسب المجموعة (4 مجموعات)
 * @param {Object[]} preDetails - بيانات تفصيلية قبلي
 * @param {Object[]} postDetails - بيانات تفصيلية بعدي
 * @param {Object} config
 */
function printGroupReport(preDetails, postDetails, config) {
  const groups = config.settings.groups;
  const numQ = config.questions.length;

  // ── بناء خريطة الدرجات بالـ ID لكل مرحلة ──
  const preById = {};
  const postById = {};

  if (preDetails && preDetails.length) {
    for (let i = 0; i < preDetails.length; i++) {
      preById[preDetails[i].id] = preDetails[i].score;
    }
  }
  if (postDetails && postDetails.length) {
    for (let i = 0; i < postDetails.length; i++) {
      postById[postDetails[i].id] = postDetails[i].score;
    }
  }

  // ── بناء بيانات متطابقة حسب المجموعة والـ student ID ──
  const groupData = {};  // { G1: { pre: [], post: [], diffs: [] }, ... }
  const students = getStudents();
  for (let i = 0; i < students.length; i++) {
    const sid = students[i].id;
    const g = students[i].group;
    if (!groupData[g]) groupData[g] = { pre: [], post: [], diffs: [] };
    if (preById[sid] !== undefined && postById[sid] !== undefined) {
      groupData[g].pre.push(preById[sid]);
      groupData[g].post.push(postById[sid]);
      groupData[g].diffs.push(postById[sid] - preById[sid]);
    }
  }

  Logger.log("\n╔══════════════════════════════════════════════════════╗");
  Logger.log("║       📊 تقرير حسب المجموعات البحثية               ║");
  Logger.log("╠══════════════════════════════════════════════════════╣");
  Logger.log("║  المجموعة\t\tعدد\tقبلي\tبعدي\tالفرق\tالتحسن% ║");
  Logger.log("╠══════════════════════════════════════════════════════╣");

  for (const gKey in groups) {
    const gInfo = groups[gKey];
    const gd = groupData[gKey] || { pre: [], post: [], diffs: [] };

    const preMean = gd.pre.length ? average(gd.pre) : 0;
    const postMean = gd.post.length ? average(gd.post) : 0;
    const diff = postMean - preMean;
    const improvePct = preMean > 0 ? ((diff / preMean) * 100) : 0;

    Logger.log("║  " + gKey + " " + gInfo.name + "\t" +
      gd.pre.length + "\t" +
      preMean.toFixed(1) + "\t" +
      postMean.toFixed(1) + "\t" +
      (diff >= 0 ? "+" : "") + diff.toFixed(1) + "\t" +
      (improvePct >= 0 ? "+" : "") + improvePct.toFixed(1) + "%");
  }

  Logger.log("╚══════════════════════════════════════════════════════╝");

  // إحصائيات تفصيلية لكل مجموعة (paired correctly بالـ student ID)
  Logger.log("\n📊 إحصائيات تفصيلية لكل مجموعة:");
  for (const gKey in groups) {
    const gInfo = groups[gKey];
    const gd = groupData[gKey] || { pre: [], post: [], diffs: [] };

    if (!gd.diffs.length) continue;

    const preMean = average(gd.pre);
    const postMean = average(gd.post);
    const meanDiff = average(gd.diffs);
    const sdPre = stdDev(gd.pre);
    const sdPost = stdDev(gd.post);
    const sdDiff = stdDev(gd.diffs);
    const groupN = gd.diffs.length;

    let tVal = 0;
    if (sdDiff > 0 && groupN > 1) {
      tVal = meanDiff / (sdDiff / Math.sqrt(groupN));
    }

    const pooledSD = Math.sqrt((sdPre * sdPre + sdPost * sdPost) / 2);
    const cohensD = pooledSD > 0 ? meanDiff / pooledSD : 0;

    Logger.log("\n   ── " + gKey + ": " + gInfo.name + " (n=" + groupN + ") ──");
    Logger.log("   قبلي: M=" + preMean.toFixed(2) + " SD=" + sdPre.toFixed(2) +
      " (" + (preMean / numQ * 100).toFixed(1) + "%)");
    Logger.log("   بعدي: M=" + postMean.toFixed(2) + " SD=" + sdPost.toFixed(2) +
      " (" + (postMean / numQ * 100).toFixed(1) + "%)");
    Logger.log("   الفرق: M=" + meanDiff.toFixed(2) + " SD=" + sdDiff.toFixed(2));
    Logger.log("   t(" + (groupN - 1) + ") = " + tVal.toFixed(4) + " | Cohen's d = " + cohensD.toFixed(4));
    Logger.log("   حجم التأثير: " + getEffectLabel(cohensD));
  }
}


/**
 * استخراج مصفوفة الإجابات من سجل تفصيلي (يدعم الشكلين: مضغوط ومصفوفة)
 * @param {Object} detail - سجل تفصيلي (يحتوي على c أو correct)
 * @returns {string[]|number[]} مصفوفة إجابات
 */
function getCorrectArr(detail) {
  if (!detail) return null;
  // الشكل المضغوط: c = "110100..."
  if (typeof detail.c === "string") {
    return detail.c.split("");
  }
  // الشكل القديم: correct = [1,1,0,1,0,0,...]
  if (detail.correct) return detail.correct;
  return null;
}


/**
 * طباعة تقرير تفصيلي لكل طالبة (للنسخ في Excel/SPSS)
 * يشمل: اسم، إيميل، مجموعة، درجة قبلي/بعدي، وإجابة كل سؤال
 * @param {Object[]} preDetails
 * @param {Object[]} postDetails
 * @param {Object} config
 */
function printDetailedTracking(preDetails, postDetails, config) {
  const numQ = config.questions.length;

  // بناء خريطة من ID للبيانات
  const preMap = {};
  const postMap = {};

  if (preDetails && preDetails.length) {
    for (let i = 0; i < preDetails.length; i++) {
      preMap[preDetails[i].id] = preDetails[i];
    }
  }

  if (postDetails && postDetails.length) {
    for (let i = 0; i < postDetails.length; i++) {
      postMap[postDetails[i].id] = postDetails[i];
    }
  }

  // ─── رأس الجدول ───
  let header = "ID\tName\tEmail\tGroup\tPre\tPost\tDiff\tPre%\tPost%";
  for (let q = 1; q <= numQ; q++) {
    header += "\tPreQ" + q;
  }
  for (let q = 1; q <= numQ; q++) {
    header += "\tPostQ" + q;
  }

  Logger.log("\n╔══════════════════════════════════════════════════════╗");
  Logger.log("║    📋 تتبع تفصيلي لكل طالبة (للنسخ في Excel)       ║");
  Logger.log("╚══════════════════════════════════════════════════════╝");
  Logger.log(header);

  // ─── بيانات كل طالبة ───
  const students = getStudents();
  for (let i = 0; i < students.length; i++) {
    const sid = students[i].id;
    const pre = preMap[sid];
    const post = postMap[sid];
    const preCorr = getCorrectArr(pre);
    const postCorr = getCorrectArr(post);

    const preScore = pre ? pre.score : 0;
    const postScore = post ? post.score : 0;
    const diff = postScore - preScore;

    let row = sid + "\t" +
      students[i].name + "\t" +
      students[i].email + "\t" +
      students[i].group + "\t" +
      preScore + "\t" +
      postScore + "\t" +
      (diff >= 0 ? "+" : "") + diff + "\t" +
      (preScore / numQ * 100).toFixed(0) + "\t" +
      (postScore / numQ * 100).toFixed(0);

    // إجابات القبلي لكل سؤال (1=صح، 0=غلط)
    for (let q = 0; q < numQ; q++) {
      row += "\t" + (preCorr && preCorr[q] !== undefined ? preCorr[q] : "-");
    }

    // إجابات البعدي لكل سؤال (1=صح، 0=غلط)
    for (let q = 0; q < numQ; q++) {
      row += "\t" + (postCorr && postCorr[q] !== undefined ? postCorr[q] : "-");
    }

    Logger.log(row);
  }

  Logger.log("\n✅ تم طباعة بيانات " + students.length + " طالبة (" + numQ + " سؤال × قبلي وبعدي)");
  Logger.log("💡 انسخ الجدول أعلاه والصقه في Excel/Google Sheets");
}