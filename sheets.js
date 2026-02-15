// ════════════════════════════════════════════════════════════════
//  📊 sheets.gs - تصدير النتائج في Google Sheets + القائمة المخصصة
// ════════════════════════════════════════════════════════════════


/**
 * قائمة مخصصة تظهر في Google Sheets عند فتح الملف
 */
function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('محاكاة الاختبار')
      .addItem('تشغيل القبلي', 'runPreTest')
      .addItem('تشغيل البعدي', 'runPostTest')
      .addSeparator()
      .addItem('حالة المحاكاة', 'checkStatus')
      .addItem('تصدير النتائج في Sheet', 'exportToSheet')
      .addSeparator()
      .addItem('ايقاف المحاكاة', 'stopSimulation')
      .addItem('اعادة تعيين', 'resetAll')
      .addItem('عرض خصائص التخزين', 'debugProperties')
      .addToUi();
  } catch (e) {
    // لا تفعل شيئا لو مش في Sheets context
  }
}


/**
 * تصدير كل النتائج في Google Sheet جديد (3 ورقات)
 * - Summary: الاحصائيات الرئيسية
 * - Student Data: بيانات كل طالبة
 * - Group Analysis: تقارير المجموعات
 */
function exportToSheet() {
  const props = PropertiesService.getScriptProperties();
  const state = props.getProperty('STATE') || 'IDLE';

  if (state !== 'POST_DONE') {
    Logger.log("⚠️ لازم القبلي والبعدي يخلصوا الأول! الحالة الحالية: " + state);
    return;
  }

  let config, profiles, preDetails, postDetails, preScores, postScores;
  try {
    config = JSON.parse(props.getProperty('CONFIG'));
    profiles = JSON.parse(props.getProperty('PROFILES'));
    preScores = JSON.parse(props.getProperty('PRE_SCORES') || '[]');
    postScores = JSON.parse(props.getProperty('POST_SCORES') || '[]');
    preDetails = JSON.parse(props.getProperty('PRE_DETAILS') || '[]');
    postDetails = JSON.parse(props.getProperty('POST_DETAILS') || '[]');
  } catch (e) {
    Logger.log("❌ خطأ في قراءة البيانات: " + e.message);
    return;
  }

  const numQ = config.questions.length;
  const students = getStudents();
  const ss = SpreadsheetApp.create("نتائج المحاكاة - " + Utilities.formatDate(new Date(), "Africa/Cairo", "yyyy-MM-dd HH:mm"));

  // ═══════════════════════════════════════
  //  ورقة 1: Student Data
  // ═══════════════════════════════════════
  const dataSheet = ss.getActiveSheet();
  dataSheet.setName("Student Data");

  // بناء خرائط بالـ ID
  const preMap = {};
  const postMap = {};
  for (let i = 0; i < preDetails.length; i++) preMap[preDetails[i].id] = preDetails[i];
  for (let i = 0; i < postDetails.length; i++) postMap[postDetails[i].id] = postDetails[i];

  // رأس الجدول
  const header = ["ID", "Name", "Email", "Group", "Pre", "Post", "Diff", "Pre%", "Post%"];
  for (let q = 1; q <= numQ; q++) header.push("PreQ" + q);
  for (let q = 1; q <= numQ; q++) header.push("PostQ" + q);
  dataSheet.appendRow(header);

  // البيانات
  for (let i = 0; i < students.length; i++) {
    const sid = students[i].id;
    const pre = preMap[sid];
    const post = postMap[sid];
    const preCorr = getCorrectArr(pre);
    const postCorr = getCorrectArr(post);
    const preScore = pre ? pre.score : 0;
    const postScore = post ? post.score : 0;
    const diff = postScore - preScore;

    const row = [
      sid, students[i].name, students[i].email, students[i].group,
      preScore, postScore, diff,
      +(preScore / numQ * 100).toFixed(1),
      +(postScore / numQ * 100).toFixed(1)
    ];
    for (let q = 0; q < numQ; q++) row.push(preCorr && preCorr[q] !== undefined ? +preCorr[q] : "");
    for (let q = 0; q < numQ; q++) row.push(postCorr && postCorr[q] !== undefined ? +postCorr[q] : "");
    dataSheet.appendRow(row);
  }

  // تنسيق الرأس
  dataSheet.getRange(1, 1, 1, header.length).setFontWeight("bold").setBackground("#4a86c8").setFontColor("white");
  dataSheet.setFrozenRows(1);

  // ═══════════════════════════════════════
  //  ورقة 2: Summary
  // ═══════════════════════════════════════
  const summarySheet = ss.insertSheet("Summary");

  // مطابقة بالـ ID
  const pairedPre = [], pairedPost = [], diffs = [];
  const preByIdScore = {};
  const postByIdScore = {};
  for (let i = 0; i < preDetails.length; i++) preByIdScore[preDetails[i].id] = preDetails[i].score;
  for (let i = 0; i < postDetails.length; i++) postByIdScore[postDetails[i].id] = postDetails[i].score;
  for (let i = 0; i < students.length; i++) {
    const sid = students[i].id;
    if (preByIdScore[sid] !== undefined && postByIdScore[sid] !== undefined) {
      pairedPre.push(preByIdScore[sid]);
      pairedPost.push(postByIdScore[sid]);
      diffs.push(postByIdScore[sid] - preByIdScore[sid]);
    }
  }

  const n = pairedPre.length;
  const meanPre = average(pairedPre);
  const meanPost = average(pairedPost);
  const meanDiff = average(diffs);
  const sdPre = stdDev(pairedPre);
  const sdPost = stdDev(pairedPost);
  const sdDiff = stdDev(diffs);
  const tValue = sdDiff > 0 ? meanDiff / (sdDiff / Math.sqrt(n)) : 0;
  const pooledSD = Math.sqrt((sdPre * sdPre + sdPost * sdPost) / 2);
  const cohensD = pooledSD > 0 ? meanDiff / pooledSD : 0;
  const etaSq = (tValue * tValue) / (tValue * tValue + (n - 1));

  const summaryData = [
    ["الاحصائيات الرئيسية", ""],
    ["عدد الطلاب", n],
    ["عدد الأسئلة", numQ],
    [""],
    ["المقياس", "القبلي", "البعدي"],
    ["المتوسط (M)", meanPre.toFixed(2), meanPost.toFixed(2)],
    ["الانحراف المعياري (SD)", sdPre.toFixed(2), sdPost.toFixed(2)],
    ["النسبة المئوية", (meanPre / numQ * 100).toFixed(1) + "%", (meanPost / numQ * 100).toFixed(1) + "%"],
    [""],
    ["Paired t-test", ""],
    ["Mean Diff", meanDiff.toFixed(4)],
    ["SD Diff", sdDiff.toFixed(4)],
    ["t(" + (n - 1) + ")", tValue.toFixed(4)],
    ["Cohen's d", cohensD.toFixed(4)],
    ["Eta Squared", etaSq.toFixed(4)],
    ["حجم التأثير", getEffectLabel(cohensD)]
  ];
  for (let r = 0; r < summaryData.length; r++) {
    summarySheet.appendRow(summaryData[r]);
  }
  summarySheet.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#4a86c8").setFontColor("white");
  summarySheet.getRange(5, 1, 1, 3).setFontWeight("bold").setBackground("#e8eaf6");
  summarySheet.getRange(10, 1, 1, 2).setFontWeight("bold").setBackground("#e8eaf6");

  // ═══════════════════════════════════════
  //  ورقة 3: Group Analysis
  // ═══════════════════════════════════════
  const groupSheet = ss.insertSheet("Group Analysis");
  const groups = config.settings.groups;

  // بناء بيانات المجموعات
  const groupData = {};
  for (let i = 0; i < students.length; i++) {
    const sid = students[i].id;
    const g = students[i].group;
    if (!groupData[g]) groupData[g] = { pre: [], post: [], diffs: [] };
    if (preByIdScore[sid] !== undefined && postByIdScore[sid] !== undefined) {
      groupData[g].pre.push(preByIdScore[sid]);
      groupData[g].post.push(postByIdScore[sid]);
      groupData[g].diffs.push(postByIdScore[sid] - preByIdScore[sid]);
    }
  }

  groupSheet.appendRow(["المجموعة", "الاسم", "العدد", "قبلي M", "قبلي SD", "بعدي M", "بعدي SD", "فرق M", "فرق SD", "t", "Cohen's d"]);
  groupSheet.getRange(1, 1, 1, 11).setFontWeight("bold").setBackground("#4a86c8").setFontColor("white");

  for (const gKey in groups) {
    const gd = groupData[gKey] || { pre: [], post: [], diffs: [] };
    if (!gd.diffs.length) continue;
    const gPreM = average(gd.pre);
    const gPostM = average(gd.post);
    const gDiffM = average(gd.diffs);
    const gPreSD = stdDev(gd.pre);
    const gPostSD = stdDev(gd.post);
    const gDiffSD = stdDev(gd.diffs);
    const gN = gd.diffs.length;
    const gT = gDiffSD > 0 && gN > 1 ? gDiffM / (gDiffSD / Math.sqrt(gN)) : 0;
    const gPooled = Math.sqrt((gPreSD * gPreSD + gPostSD * gPostSD) / 2);
    const gD = gPooled > 0 ? gDiffM / gPooled : 0;

    groupSheet.appendRow([
      gKey, groups[gKey].name, gN,
      +gPreM.toFixed(2), +gPreSD.toFixed(2),
      +gPostM.toFixed(2), +gPostSD.toFixed(2),
      +gDiffM.toFixed(2), +gDiffSD.toFixed(2),
      +gT.toFixed(4), +gD.toFixed(4)
    ]);
  }

  groupSheet.setFrozenRows(1);

  Logger.log("✅ تم تصدير النتائج في Google Sheet:");
  Logger.log("📊 " + ss.getUrl());
  Logger.log("💡 الشيت يحتوي على 3 ورقات: Summary, Student Data, Group Analysis");
}


/**
 * عرض كل خصائص PropertiesService واحجامها (للتشخيص)
 */
function debugProperties() {
  const props = PropertiesService.getScriptProperties();
  const all = props.getProperties();
  let totalSize = 0;

  Logger.log("═══════════════════════════════════");
  Logger.log("📦 محتويات PropertiesService:");
  Logger.log("═══════════════════════════════════");

  for (const key in all) {
    const size = all[key].length;
    totalSize += size;
    Logger.log("   " + key + ": " + (size / 1024).toFixed(1) + " KB");
  }

  Logger.log("───────────────────────────────────");
  Logger.log("   الإجمالي: " + (totalSize / 1024).toFixed(1) + " KB / 500 KB");
  Logger.log("═══════════════════════════════════");
}
