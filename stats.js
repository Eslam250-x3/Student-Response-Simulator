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
  const cohensDz = sdDiff > 0 ? meanDiff / sdDiff : 0; // d_z للتصميم المتكرر
  const etaSq = (tValue * tValue) / (tValue * tValue + df);
  const pValue = approxPValue(tValue, df);

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
  Logger.log("║  Cohen's d_s (pooled) = " + cohensD.toFixed(4));
  Logger.log("║  Cohen's d_z (repeated) = " + cohensDz.toFixed(4));
  Logger.log("║  η² = " + etaSq.toFixed(4));
  Logger.log("║  حجم التأثير: " + getEffectLabel(cohensD));
  Logger.log("║                                                      ║");
  Logger.log("║  " + (pValue < 0.005 ? "✅✅ دال عند 0.005 ✅✅" : "⚠️ تحقق يدوياً"));
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
  //  Two-Way ANOVA (التصميم العاملي 2x2)
  // ══════════════════════════════════════════════════════
  if (config.settings.groups) {
    printTwoWayANOVA(preDetails, postDetails, config);
  }

  // ══════════════════════════════════════════════════════
  //  تكافؤ المجموعات قبليا (One-Way ANOVA)
  // ══════════════════════════════════════════════════════
  printBaselineEquivalence(preDetails, config);

  // ══════════════════════════════════════════════════════
  //  معامل الثبات KR-20
  // ══════════════════════════════════════════════════════
  Logger.log("\n╔══════════════════════════════════════════════════════════════╗");
  Logger.log("║              معامل الثبات (KR-20)                           ║");
  Logger.log("╠══════════════════════════════════════════════════════════════╣");
  printKR20(preDetails, numQ, "القبلي");
  printKR20(postDetails, numQ, "البعدي");
  Logger.log("╚══════════════════════════════════════════════════════════════╝");

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
 * Two-Way ANOVA للتصميم العاملي 2x2
 * العامل A: نوع التعلم (تنافسي/تعاوني) -- G1,G2 vs G3,G4
 * العامل B: الضغط الزمني (بدون/بضغط) -- G1,G3 vs G2,G4
 * يحسب: SS لكل عامل + التفاعل + الخطأ، F-ratio، partial eta-squared
 * @param {Object[]} preDetails
 * @param {Object[]} postDetails
 * @param {Object} config
 */
function printTwoWayANOVA(preDetails, postDetails, config) {
  const numQ = config.questions.length;

  // بناء خريطة الدرجات بالـ ID
  const preById = {};
  const postById = {};
  if (preDetails && preDetails.length) {
    for (let i = 0; i < preDetails.length; i++) preById[preDetails[i].id] = preDetails[i].score;
  }
  if (postDetails && postDetails.length) {
    for (let i = 0; i < postDetails.length; i++) postById[postDetails[i].id] = postDetails[i].score;
  }

  // حساب فرق كل طالبة (gain score) وتصنيفها
  // العامل A: competitive(0) = G1,G2 / cooperative(1) = G3,G4
  // العامل B: noPress(0) = G1,G3 / press(1) = G2,G4
  const cells = { "0_0": [], "0_1": [], "1_0": [], "1_1": [] };
  const factorMap = {
    "G1": { a: 0, b: 0 }, "G2": { a: 0, b: 1 },
    "G3": { a: 1, b: 0 }, "G4": { a: 1, b: 1 }
  };

  const students = getStudents();
  for (let i = 0; i < students.length; i++) {
    const sid = students[i].id;
    const g = students[i].group;
    if (preById[sid] === undefined || postById[sid] === undefined) continue;
    const gain = postById[sid] - preById[sid];
    const f = factorMap[g];
    if (f) cells[f.a + "_" + f.b].push(gain);
  }

  // حساب المتوسطات
  const cellMeans = {};
  const allGains = [];
  for (const key in cells) {
    cellMeans[key] = cells[key].length ? average(cells[key]) : 0;
    for (let j = 0; j < cells[key].length; j++) allGains.push(cells[key][j]);
  }
  const grandMean = allGains.length ? average(allGains) : 0;
  const N = allGains.length;

  // متوسطات هامشية
  const meanA0 = average(cells["0_0"].concat(cells["0_1"]));
  const meanA1 = average(cells["1_0"].concat(cells["1_1"]));
  const meanB0 = average(cells["0_0"].concat(cells["1_0"]));
  const meanB1 = average(cells["0_1"].concat(cells["1_1"]));

  const nA0 = cells["0_0"].length + cells["0_1"].length;
  const nA1 = cells["1_0"].length + cells["1_1"].length;
  const nB0 = cells["0_0"].length + cells["1_0"].length;
  const nB1 = cells["0_1"].length + cells["1_1"].length;

  // SS Between (Type I for balanced design)
  const SSA = nA0 * (meanA0 - grandMean) * (meanA0 - grandMean) +
    nA1 * (meanA1 - grandMean) * (meanA1 - grandMean);
  const SSB = nB0 * (meanB0 - grandMean) * (meanB0 - grandMean) +
    nB1 * (meanB1 - grandMean) * (meanB1 - grandMean);

  // SS Interaction
  let SSAxB = 0;
  for (const key in cells) {
    const n_ij = cells[key].length;
    if (!n_ij) continue;
    const parts = key.split("_");
    const margA = (parts[0] === "0") ? meanA0 : meanA1;
    const margB = (parts[1] === "0") ? meanB0 : meanB1;
    const interaction = cellMeans[key] - margA - margB + grandMean;
    SSAxB += n_ij * interaction * interaction;
  }

  // SS Error (within cells)
  let SSE = 0;
  for (const key in cells) {
    for (let j = 0; j < cells[key].length; j++) {
      SSE += (cells[key][j] - cellMeans[key]) * (cells[key][j] - cellMeans[key]);
    }
  }

  const dfA = 1, dfB = 1, dfAxB = 1;
  const dfE = N - 4;

  const MSA = dfA > 0 ? SSA / dfA : 0;
  const MSB = dfB > 0 ? SSB / dfB : 0;
  const MSAxB = dfAxB > 0 ? SSAxB / dfAxB : 0;
  const MSE = dfE > 0 ? SSE / dfE : 0;

  const FA = MSE > 0 ? MSA / MSE : 0;
  const FB = MSE > 0 ? MSB / MSE : 0;
  const FAxB = MSE > 0 ? MSAxB / MSE : 0;

  const etaA = SSA / (SSA + SSE);
  const etaB = SSB / (SSB + SSE);
  const etaAxB = SSAxB / (SSAxB + SSE);

  Logger.log("\n╔══════════════════════════════════════════════════════════════╗");
  Logger.log("║      Two-Way ANOVA (2x2 Factorial Design - Gain Scores)     ║");
  Logger.log("╠══════════════════════════════════════════════════════════════╣");
  Logger.log("║  Source\t\tSS\tdf\tMS\tF\tp-eta2  ║");
  Logger.log("╠══════════════════════════════════════════════════════════════╣");
  Logger.log("║  A (نوع التعلم)\t" + SSA.toFixed(2) + "\t" + dfA + "\t" + MSA.toFixed(2) + "\t" +
    FA.toFixed(4) + "\t" + etaA.toFixed(4));
  Logger.log("║  B (ضغط زمني)\t" + SSB.toFixed(2) + "\t" + dfB + "\t" + MSB.toFixed(2) + "\t" +
    FB.toFixed(4) + "\t" + etaB.toFixed(4));
  Logger.log("║  A x B (تفاعل)\t" + SSAxB.toFixed(2) + "\t" + dfAxB + "\t" + MSAxB.toFixed(2) + "\t" +
    FAxB.toFixed(4) + "\t" + etaAxB.toFixed(4));
  Logger.log("║  Error\t\t" + SSE.toFixed(2) + "\t" + dfE + "\t" + MSE.toFixed(2));
  Logger.log("╠══════════════════════════════════════════════════════════════╣");

  // F critical ديناميكي حسب درجات الحرية الفعلية
  const Fcrit05 = approxFCritical(dfA, dfE, 0.05);
  const Fcrit01 = approxFCritical(dfA, dfE, 0.01);
  Logger.log("║  F critical (0.05, " + dfA + ", " + dfE + ") = " + Fcrit05.toFixed(2));
  Logger.log("║  F critical (0.01, " + dfA + ", " + dfE + ") = " + Fcrit01.toFixed(2));
  Logger.log("║");
  Logger.log("║  A (نوع التعلم): F=" + FA.toFixed(2) + " | p " + estimateFPValue(FA, dfA, dfE) + " " +
    (FA > Fcrit01 ? "** دال عند 0.01" : FA > Fcrit05 ? "* دال عند 0.05" : "غير دال"));
  Logger.log("║  B (ضغط زمني):  F=" + FB.toFixed(2) + " | p " + estimateFPValue(FB, dfB, dfE) + " " +
    (FB > Fcrit01 ? "** دال عند 0.01" : FB > Fcrit05 ? "* دال عند 0.05" : "غير دال"));
  Logger.log("║  A x B (تفاعل): F=" + FAxB.toFixed(2) + " | p " + estimateFPValue(FAxB, dfAxB, dfE) + " " +
    (FAxB > Fcrit01 ? "** دال عند 0.01" : FAxB > Fcrit05 ? "* دال عند 0.05" : "غير دال"));
  Logger.log("╠══════════════════════════════════════════════════════════════╣");
  Logger.log("║  متوسطات الخلايا (Gain Scores):");
  Logger.log("║                  بدون ضغط\tبضغط زمني");
  Logger.log("║  تنافسي\t  " + cellMeans["0_0"].toFixed(2) + " (n=" + cells["0_0"].length + ")\t" +
    cellMeans["0_1"].toFixed(2) + " (n=" + cells["0_1"].length + ")");
  Logger.log("║  تعاوني\t  " + cellMeans["1_0"].toFixed(2) + " (n=" + cells["1_0"].length + ")\t" +
    cellMeans["1_1"].toFixed(2) + " (n=" + cells["1_1"].length + ")");
  Logger.log("╚══════════════════════════════════════════════════════════════╝");
}


/**
 * One-Way ANOVA لتحقق تكافؤ المجموعات الاربع قبليا
 * @param {Object[]} preDetails
 * @param {Object} config
 */
function printBaselineEquivalence(preDetails, config) {
  if (!preDetails || !preDetails.length) return;

  const groups = config.settings.groups;
  const groupScores = {};
  const students = getStudents();
  const preById = {};
  for (let i = 0; i < preDetails.length; i++) preById[preDetails[i].id] = preDetails[i].score;

  for (let i = 0; i < students.length; i++) {
    const g = students[i].group;
    const score = preById[students[i].id];
    if (score === undefined) continue;
    if (!groupScores[g]) groupScores[g] = [];
    groupScores[g].push(score);
  }

  // حساب One-Way ANOVA
  const allScores = [];
  const groupKeys = [];
  for (const g in groupScores) {
    groupKeys.push(g);
    for (let j = 0; j < groupScores[g].length; j++) allScores.push(groupScores[g][j]);
  }
  const grandMean = average(allScores);
  const N = allScores.length;
  const k = groupKeys.length;

  let SSB = 0;
  for (let g = 0; g < groupKeys.length; g++) {
    const gKey = groupKeys[g];
    const gMean = average(groupScores[gKey]);
    SSB += groupScores[gKey].length * (gMean - grandMean) * (gMean - grandMean);
  }

  let SSW = 0;
  for (let g = 0; g < groupKeys.length; g++) {
    const gKey = groupKeys[g];
    const gMean = average(groupScores[gKey]);
    for (let j = 0; j < groupScores[gKey].length; j++) {
      SSW += (groupScores[gKey][j] - gMean) * (groupScores[gKey][j] - gMean);
    }
  }

  const dfB = k - 1;
  const dfW = N - k;
  const MSB_val = dfB > 0 ? SSB / dfB : 0;
  const MSW_val = dfW > 0 ? SSW / dfW : 0;
  const F = MSW_val > 0 ? MSB_val / MSW_val : 0;

  Logger.log("\n╔══════════════════════════════════════════════════════════════╗");
  Logger.log("║    One-Way ANOVA: تكافؤ المجموعات في الاختبار القبلي        ║");
  Logger.log("╠══════════════════════════════════════════════════════════════╣");
  for (let g = 0; g < groupKeys.length; g++) {
    const gKey = groupKeys[g];
    Logger.log("║  " + gKey + ": M=" + average(groupScores[gKey]).toFixed(2) +
      " SD=" + stdDev(groupScores[gKey]).toFixed(2) + " (n=" + groupScores[gKey].length + ")");
  }
  Logger.log("╠══════════════════════════════════════════════════════════════╣");
  Logger.log("║  F(" + dfB + "," + dfW + ") = " + F.toFixed(4));
  // F critical ديناميكي
  const Fcrit = approxFCritical(dfB, dfW, 0.05);
  Logger.log("║  F critical (0.05, " + dfB + ", " + dfW + ") = " + Fcrit.toFixed(2));
  Logger.log("║  p " + estimateFPValue(F, dfB, dfW));
  const sig = F > Fcrit ? "** المجموعات غير متكافئة!" : "المجموعات متكافئة قبليا";
  Logger.log("║  " + (F > Fcrit ? "⚠️ " : "✅ ") + sig);
  Logger.log("╚══════════════════════════════════════════════════════════════╝");
}


/**
 * حساب معامل ثبات KR-20 (Kuder-Richardson formula 20)
 * للاختبارات ثنائية الاستجابة (0/1)
 * @param {Object[]} details - بيانات تفصيلية (preDetails أو postDetails)
 * @param {number} numQ - عدد الأسئلة
 * @param {string} label - اسم المرحلة
 */
function printKR20(details, numQ, label) {
  if (!details || details.length < 2) return;

  const n = details.length;
  // بناء مصفوفة الاستجابات
  const responses = [];
  const scores = [];
  for (let i = 0; i < n; i++) {
    const corr = getCorrectArr(details[i]);
    if (!corr || corr.length < numQ) continue;
    const row = [];
    let total = 0;
    for (let q = 0; q < numQ; q++) {
      const val = parseInt(corr[q]) || 0;
      row.push(val);
      total += val;
    }
    responses.push(row);
    scores.push(total);
  }

  if (responses.length < 2) return;
  const validN = responses.length;

  // حساب pq لكل سؤال
  let sumPQ = 0;
  for (let q = 0; q < numQ; q++) {
    let correct = 0;
    for (let i = 0; i < validN; i++) correct += responses[i][q];
    const p = correct / validN;
    sumPQ += p * (1 - p);
  }

  // تباين الدرجة الكلية
  const varTotal = variance(scores);
  // KR-20 = (k / (k-1)) * (1 - sumPQ / varTotal)
  const kr20 = varTotal > 0 ? (numQ / (numQ - 1)) * (1 - sumPQ / varTotal) : 0;

  Logger.log("\n║  KR-20 (" + label + "): " + kr20.toFixed(4) +
    " " + getReliabilityLabel(kr20));
}

function getReliabilityLabel(r) {
  if (r >= 0.90) return "(ممتاز)";
  if (r >= 0.80) return "(جيد جدا)";
  if (r >= 0.70) return "(مقبول)";
  if (r >= 0.60) return "(ضعيف)";
  return "(غير مقبول)";
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