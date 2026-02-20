// ════════════════════════════════════════════════════════════════
//  📤 submit_from_json.gs — إرسال البيانات المُولّدة من Python إلى الفورم
//  يقرأ simulation_data.json من Google Drive ويرسل الاستجابات
//
//  الخطوات:
//  1. ارفع simulation_data.json لـ Google Drive
//  2. انسخ File ID وضعه في SIMULATION_FILE_ID
//  3. شغّل submitAllFromJSON()
// ════════════════════════════════════════════════════════════════

// ─── إعدادات ────────────────────────────────────────────────────
var SIMULATION_FILE_ID = "";  // ← ضع هنا ID ملف الـ JSON من Google Drive

// فورم MCQ
var MCQ_FORM_URL = "";        // ← رابط فورم الاختبار MCQ

// فورم Flow  
var FLOW_FORM_URL = "";       // ← رابط فورم مقياس التدفق

// ─── الأدوات المساعدة ──────────────────────────────────────────

/**
 * تحميل بيانات المحاكاة من Google Drive JSON
 */
function loadSimulationData() {
    var fileId = SIMULATION_FILE_ID || PropertiesService.getScriptProperties().getProperty("SIMULATION_FILE_ID");
    if (!fileId) {
        throw new Error("❌ ضع SIMULATION_FILE_ID في الكود أو في Script Properties");
    }

    var file = DriveApp.getFileById(fileId);
    var content = file.getBlob().getDataAsString("UTF-8");
    return JSON.parse(content);
}

/**
 * إرسال استجابة MCQ لطالبة واحدة
 */
function submitMCQResponse(form, student, phase) {
    var responsesKey = "mcq_" + phase + "_responses";
    var answers = student[responsesKey];
    if (!answers || answers.length === 0) {
        Logger.log("⚠️ لا توجد استجابات MCQ " + phase + " لـ " + student.id);
        return false;
    }

    var items = form.getItems();
    var formResponse = form.createResponse();

    // أول عنصر = الإيميل (إذا كان موجود)
    var startIdx = 0;
    for (var i = 0; i < items.length; i++) {
        var item = items[i];

        if (item.getType() === FormApp.ItemType.TEXT) {
            // حقل الإيميل
            formResponse.withItemResponse(item.asTextItem().createResponse(student.email));
            startIdx = 0;
            continue;
        }

        if (item.getType() === FormApp.ItemType.MULTIPLE_CHOICE ||
            item.getType() === FormApp.ItemType.LIST) {
            if (startIdx < answers.length) {
                var choiceIdx = answers[startIdx];
                var choices = item.asMultipleChoiceItem ?
                    item.asMultipleChoiceItem().getChoices() :
                    item.asListItem().getChoices();

                if (choiceIdx >= 0 && choiceIdx < choices.length) {
                    var choiceValue = choices[choiceIdx].getValue();
                    if (item.getType() === FormApp.ItemType.MULTIPLE_CHOICE) {
                        formResponse.withItemResponse(item.asMultipleChoiceItem().createResponse(choiceValue));
                    } else {
                        formResponse.withItemResponse(item.asListItem().createResponse(choiceValue));
                    }
                }
                startIdx++;
            }
        }
    }

    formResponse.submit();
    return true;
}

/**
 * إرسال استجابة Flow لطالبة واحدة
 */
function submitFlowResponse(form, student, phase) {
    var responsesKey = "flow_" + phase + "_responses";
    var answers = student[responsesKey];
    if (!answers || answers.length === 0) {
        Logger.log("⚠️ لا توجد استجابات Flow " + phase + " لـ " + student.id);
        return false;
    }

    var items = form.getItems();
    var formResponse = form.createResponse();
    var answerIdx = 0;

    for (var i = 0; i < items.length; i++) {
        var item = items[i];

        if (item.getType() === FormApp.ItemType.TEXT) {
            formResponse.withItemResponse(item.asTextItem().createResponse(student.email));
            continue;
        }

        if (item.getType() === FormApp.ItemType.MULTIPLE_CHOICE ||
            item.getType() === FormApp.ItemType.LIST ||
            item.getType() === FormApp.ItemType.SCALE) {
            if (answerIdx < answers.length) {
                var answer = answers[answerIdx];

                if (item.getType() === FormApp.ItemType.SCALE) {
                    formResponse.withItemResponse(item.asScaleItem().createResponse(answer));
                } else if (item.getType() === FormApp.ItemType.MULTIPLE_CHOICE) {
                    formResponse.withItemResponse(item.asMultipleChoiceItem().createResponse(answer));
                } else {
                    formResponse.withItemResponse(item.asListItem().createResponse(answer));
                }
                answerIdx++;
            }
        }
    }

    formResponse.submit();
    return true;
}


// ─── الدوال الرئيسية ──────────────────────────────────────────

/**
 * 🚀 إرسال كل البيانات — MCQ (قبلي + بعدي) + Flow (قبلي + بعدي)
 * يمكن تشغيلها من القائمة المخصصة
 */
function submitAllFromJSON() {
    var data = loadSimulationData();
    var students = data.students;

    Logger.log("═══════════════════════════════════════════");
    Logger.log("📤 بدء إرسال " + students.length + " طالبة");
    Logger.log("📊 Seed: " + data.metadata.seed);
    Logger.log("═══════════════════════════════════════════");

    // تخزين الحالة للاستكمال
    var state = {
        totalStudents: students.length,
        currentPhase: "mcq_pre",
        currentIndex: 0,
        completed: { mcq_pre: 0, mcq_post: 0, flow_pre: 0, flow_post: 0 }
    };

    // استرجاع الحالة السابقة إن وجدت
    var savedState = PropertiesService.getScriptProperties().getProperty("SUBMIT_STATE");
    if (savedState) {
        state = JSON.parse(savedState);
        Logger.log("♻️ استكمال من الحالة السابقة: " + state.currentPhase + " #" + state.currentIndex);
    }

    var phases = ["mcq_pre", "mcq_post", "flow_pre", "flow_post"];
    var phaseIdx = phases.indexOf(state.currentPhase);

    for (var pi = phaseIdx; pi < phases.length; pi++) {
        var phase = phases[pi];
        var isMCQ = phase.startsWith("mcq");
        var testPhase = phase.endsWith("pre") ? "pre" : "post";

        var formUrl = isMCQ ? MCQ_FORM_URL : FLOW_FORM_URL;
        if (!formUrl) {
            Logger.log("⚠️ رابط الفورم غير محدد لـ " + phase);
            continue;
        }

        var form = FormApp.openByUrl(formUrl);
        Logger.log("\n📋 " + phase + " — " + (isMCQ ? "MCQ" : "Flow") + " " + testPhase);

        var startIdx = (pi === phaseIdx) ? state.currentIndex : 0;

        for (var i = startIdx; i < students.length; i++) {
            try {
                var success;
                if (isMCQ) {
                    success = submitMCQResponse(form, students[i], testPhase);
                } else {
                    success = submitFlowResponse(form, students[i], testPhase);
                }

                if (success) {
                    state.completed[phase]++;
                    Logger.log("  ✅ " + students[i].id + " (" + (i + 1) + "/" + students.length + ")");
                }

                // تأخير عشوائي (1.5-4.5 ثانية)
                Utilities.sleep(1500 + Math.random() * 3000);

                // حفظ الحالة كل 5 طلاب
                if ((i + 1) % 5 === 0) {
                    state.currentPhase = phase;
                    state.currentIndex = i + 1;
                    PropertiesService.getScriptProperties().setProperty("SUBMIT_STATE", JSON.stringify(state));
                }

            } catch (e) {
                Logger.log("  ❌ خطأ في " + students[i].id + ": " + e.message);
                // حفظ الحالة والخروج للاستكمال لاحقاً
                state.currentPhase = phase;
                state.currentIndex = i;
                PropertiesService.getScriptProperties().setProperty("SUBMIT_STATE", JSON.stringify(state));
                Logger.log("💾 تم حفظ الحالة — شغّل الدالة مرة أخرى للاستكمال");
                return;
            }
        }
    }

    // اكتمل الإرسال
    PropertiesService.getScriptProperties().deleteProperty("SUBMIT_STATE");

    Logger.log("\n═══════════════════════════════════════════");
    Logger.log("🎉 تم إرسال كل البيانات بنجاح!");
    Logger.log("   MCQ قبلي: " + state.completed.mcq_pre);
    Logger.log("   MCQ بعدي: " + state.completed.mcq_post);
    Logger.log("   Flow قبلي: " + state.completed.flow_pre);
    Logger.log("   Flow بعدي: " + state.completed.flow_post);
    Logger.log("═══════════════════════════════════════════");
}

/**
 * إرسال MCQ فقط (قبلي + بعدي)
 */
function submitMCQOnly() {
    var data = loadSimulationData();
    var form = FormApp.openByUrl(MCQ_FORM_URL);

    Logger.log("📋 إرسال MCQ لـ " + data.students.length + " طالبة...");

    for (var i = 0; i < data.students.length; i++) {
        var s = data.students[i];
        submitMCQResponse(form, s, "pre");
        Logger.log("  ✅ " + s.id + " قبلي (" + (i + 1) + "/" + data.students.length + ")");
        Utilities.sleep(1500 + Math.random() * 3000);

        submitMCQResponse(form, s, "post");
        Logger.log("  ✅ " + s.id + " بعدي");
        Utilities.sleep(1500 + Math.random() * 3000);
    }

    Logger.log("🎉 تم إرسال كل MCQ!");
}

/**
 * إرسال Flow فقط (قبلي + بعدي)
 */
function submitFlowOnly() {
    var data = loadSimulationData();
    var form = FormApp.openByUrl(FLOW_FORM_URL);

    Logger.log("🌊 إرسال Flow لـ " + data.students.length + " طالبة...");

    for (var i = 0; i < data.students.length; i++) {
        var s = data.students[i];
        submitFlowResponse(form, s, "pre");
        Logger.log("  ✅ " + s.id + " قبلي (" + (i + 1) + "/" + data.students.length + ")");
        Utilities.sleep(1500 + Math.random() * 3000);

        submitFlowResponse(form, s, "post");
        Logger.log("  ✅ " + s.id + " بعدي");
        Utilities.sleep(1500 + Math.random() * 3000);
    }

    Logger.log("🎉 تم إرسال كل Flow!");
}

/**
 * إعادة ضبط حالة الإرسال
 */
function resetSubmitState() {
    PropertiesService.getScriptProperties().deleteProperty("SUBMIT_STATE");
    Logger.log("✅ تم مسح حالة الإرسال");
}

/**
 * عرض ملخص البيانات المُحمّلة (بدون إرسال)
 */
function previewData() {
    var data = loadSimulationData();
    var stats = data.metadata.stats;

    Logger.log("═══════════════════════════════════════════");
    Logger.log("📊 ملخص البيانات المُولّدة");
    Logger.log("═══════════════════════════════════════════");
    Logger.log("📅 تاريخ التوليد: " + data.metadata.generatedAt);
    Logger.log("🎲 Seed: " + data.metadata.seed);
    Logger.log("👩‍🎓 عدد الطالبات: " + data.metadata.numStudents);
    Logger.log("📝 عدد أسئلة MCQ: " + data.metadata.numMCQ);
    Logger.log("🌊 عدد بنود Flow: " + data.metadata.numFlowItems);
    Logger.log("");

    if (stats && stats.mcq) {
        Logger.log("📝 MCQ Statistics:");
        Logger.log("   t(" + stats.mcq.df + ") = " + stats.mcq.t.toFixed(4));
        Logger.log("   p = " + stats.mcq.p.toFixed(6));
        Logger.log("   Cohen's d_z = " + stats.mcq.cohensD_z.toFixed(4));
        Logger.log("   KR-20: pre=" + stats.kr20.pre.toFixed(4) + ", post=" + stats.kr20.post.toFixed(4));
    }

    if (stats && stats.flow) {
        Logger.log("\n🌊 Flow Statistics:");
        Logger.log("   t = " + stats.flow.t.toFixed(4));
        Logger.log("   p = " + stats.flow.p.toFixed(6));
    }

    // عرض أول 3 طالبات كعينة
    Logger.log("\n📋 عينة (أول 3 طالبات):");
    for (var i = 0; i < Math.min(3, data.students.length); i++) {
        var s = data.students[i];
        Logger.log("  " + s.id + " | " + s.name + " | " + s.group +
            " | MCQ: " + s.mcq_pre_score + "→" + s.mcq_post_score +
            " | Flow: " + s.flow_pre_score + "→" + s.flow_post_score);
    }
    Logger.log("═══════════════════════════════════════════");
}

/**
 * القائمة المخصصة
 */
function onOpen() {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu("📤 إرسال المحاكاة")
        .addItem("👀 معاينة البيانات", "previewData")
        .addSeparator()
        .addItem("🚀 إرسال الكل (MCQ + Flow)", "submitAllFromJSON")
        .addItem("📝 إرسال MCQ فقط", "submitMCQOnly")
        .addItem("🌊 إرسال Flow فقط", "submitFlowOnly")
        .addSeparator()
        .addItem("♻️ مسح حالة الإرسال", "resetSubmitState")
        .addToUi();
}
