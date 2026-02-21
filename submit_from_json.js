// ════════════════════════════════════════════════════════════════
//  📤 submit_from_json.gs — إرسال البيانات المُولّدة من Python إلى الفورم
//  يقرأ simulation_data.json من Google Drive ويرسل الاستجابات
//
//  الطريقة السريعة (كل شيء دفعة واحدة):
//    1. ارفع simulation_data.json لـ Google Drive
//    2. انسخ File ID وضعه في SIMULATION_FILE_ID أدناه
//    3. شغّل submitAllFromJSON()
//
//  الطريقة المجدوَلة (قبلي الآن، بعدي بعد فترة):
//    1. ارفع simulation_data.json لـ Google Drive
//    2. عدّل SIMULATION_FILE_ID و MCQ_FORM_URL و FLOW_FORM_URL
//    3. عدّل SCHEDULE_CONFIG حسب رغبتك
//    4. شغّل runPreTestJSON()  ← يبدأ القبلي بجدول زمني تلقائي
//    5. بعد اكتمال القبلي شغّل runPostTestJSON() ← يبدأ البعدي
// ════════════════════════════════════════════════════════════════

// ─── إعدادات الملف والفورمات ────────────────────────────────────
const SIMULATION_FILE_ID = "1ccff7iMjZFCI3sWOkulnhbWLnVtCOfoB";  // ← ضع هنا ID ملف الـ JSON من Google Drive

// فورم MCQ
const MCQ_FORM_URL = "https://docs.google.com/forms/d/1YJHSGmT7_YwkL-0Yr0zEUB8fA4RcudQX5czbLQXLzEQ/edit";        // ← رابط فورم الاختبار MCQ

// فورم Flow
const FLOW_FORM_URL = "https://docs.google.com/forms/d/15hcLGKlOsg0xbIZy_vDIoyYv866KEKEQSQF-HSafUZ4/edit";

// ─── إعدادات الجدولة (للطريقة المجدوَلة) ───────────────────────
const SCHEDULE_CONFIG = {
    numDays: 4,                  // عدد أيام التوزيع
    startHour: 9,                // ساعة بداية النافذة اليومية (24h)
    endHour: 22,                 // ساعة نهاية النافذة اليومية
    triggerIntervalMinutes: 5,   // كم دقيقة بين كل تشغيل تلقائي للـ Trigger
    timezone: "Africa/Cairo",    // المنطقة الزمنية
    mcqToFlowGapHours: 2,        // فجوة ساعتين بين MCQ و Flow لنفس الطالب
    mcqToFlowVariationMin: 30,   // تذبذب عشوائي ± دقيقة حول الفجوة
    maxRetries: 3,               // حد المحاولات قبل تجاوز الطالب
    maxPerRun: 3                 // أقصى عدد ردود في كل تشغيل للـ Trigger
};

// DROPOUT_IDS → معرف في constants.js (مولّد من constants.json)

// safeSetProperty / safeGetProperty → معرفتان في utils.js

// ─── الأدوات المساعدة ──────────────────────────────────────────

/**
 * يتحقق من تطابق بنية الفورم مع simulation_data قبل الإرسال.
 * يمنع إرسال بيانات خاطئة عند اختلاف ترتيب الأسئلة أو عددها.
 * @param {Object} data - بيانات المحاكاة (من loadSimulationData)
 * @param {string} [checkForm] - "mcq" | "flow" | "both" (افتراضي: both)
 * @returns {{valid: boolean, errors: string[]}}
 */
function verifyFormStructure(data, checkForm) {
    const errors = [];
    const meta = data.metadata || {};
    const expectedMCQ = meta.numMCQ || 30;
    const expectedFlow = meta.numFlowItems || 56;
    const checkMCQ = !checkForm || checkForm === "mcq" || checkForm === "both";
    const checkFlow = !checkForm || checkForm === "flow" || checkForm === "both";

    function countFormItems(form, itemType) {
        const items = form.getItems();
        let count = 0;
        let badChoices = [];
        for (let i = 0; i < items.length; i++) {
            const t = items[i].getType();
            if (t === FormApp.ItemType.MULTIPLE_CHOICE || t === FormApp.ItemType.LIST) {
                const choices = t === FormApp.ItemType.MULTIPLE_CHOICE
                    ? items[i].asMultipleChoiceItem().getChoices()
                    : items[i].asListItem().getChoices();
                count++;
                if (itemType === "mcq" && choices.length !== 4) {
                    badChoices.push("سؤال " + count + ": " + choices.length + " خيارات بدل 4");
                }
                if (itemType === "flow" && choices.length !== 5) {
                    badChoices.push("بند " + count + ": " + choices.length + " خيارات بدل 5");
                }
            }
        }
        return { count: count, badChoices: badChoices };
    }

    if (checkMCQ && MCQ_FORM_URL) {
        try {
            const form = FormApp.openByUrl(MCQ_FORM_URL);
            const result = countFormItems(form, "mcq");
            if (result.count !== expectedMCQ) {
                errors.push("فورم MCQ: عدد الأسئلة " + result.count + " (المتوقع من simulation_data: " + expectedMCQ + ")");
            }
            if (result.badChoices.length > 0) {
                errors.push("فورم MCQ: " + result.badChoices.slice(0, 3).join("؛ ") + (result.badChoices.length > 3 ? "..." : ""));
            }
        } catch (e) {
            errors.push("فورم MCQ: فشل فتح الفورم — " + e.message);
        }
    }

    if (checkFlow && FLOW_FORM_URL) {
        try {
            const form = FormApp.openByUrl(FLOW_FORM_URL);
            const result = countFormItems(form, "flow");
            if (result.count !== expectedFlow) {
                errors.push("فورم Flow: عدد البنود " + result.count + " (المتوقع من simulation_data: " + expectedFlow + ")");
            }
            if (result.badChoices.length > 0) {
                errors.push("فورم Flow: " + result.badChoices.slice(0, 3).join("؛ ") + (result.badChoices.length > 3 ? "..." : ""));
            }
        } catch (e) {
            errors.push("فورم Flow: فشل فتح الفورم — " + e.message);
        }
    }

    if (errors.length > 0) {
        Logger.log("❌ تحقق البنية فشل:");
        for (let j = 0; j < errors.length; j++) Logger.log("   • " + errors[j]);
        Logger.log("💡 تأكد أن الفورمات مُنشأة من createMCQForm/createFlowForm ونفس config المستخدم في generate_simulation.");
    }
    return { valid: errors.length === 0, errors: errors };
}

/**
 * تحميل بيانات المحاكاة من Google Drive JSON
 */
function loadSimulationData() {
    const fileId = SIMULATION_FILE_ID || PropertiesService.getScriptProperties().getProperty("SIMULATION_FILE_ID");
    if (!fileId) {
        throw new Error("❌ ضع SIMULATION_FILE_ID في الكود أو في Script Properties");
    }

    const file = DriveApp.getFileById(fileId);
    const content = file.getBlob().getDataAsString("UTF-8");
    return JSON.parse(content);
}

/**
 * يولّد وقت عشوائي في ساعات النهار فقط (startHour → endHour)
 * مع هامش كافٍ لاستيعاب فجوة الساعتين (MCQ → Flow)
 * @param {number} baseMs - وقت البداية بالميلي ثانية
 * @param {number} numDays - التوزيع على كم يوم
 * @returns {number} وقت بالميلي ثانية
 */
function getRandomDaytimeMs(baseMs, numDays) {
    const nowDate = new Date(baseMs);
    const dayOffset = Math.floor(Math.random() * numDays);
    const d = new Date(baseMs);
    d.setDate(d.getDate() + dayOffset);

    const maxHour = SCHEDULE_CONFIG.endHour - SCHEDULE_CONFIG.mcqToFlowGapHours - 1;
    let minHour = SCHEDULE_CONFIG.startHour;
    let minMin = 0;

    // إذا اليوم = اليوم الحالي، لا نجدول في الماضي
    if (dayOffset === 0) {
        minHour = nowDate.getHours();
        minMin = nowDate.getMinutes() + 2;
        if (minMin >= 60) { minHour++; minMin = 0; }
        if (minHour > maxHour) {
            d.setDate(d.getDate() + 1);
            minHour = SCHEDULE_CONFIG.startHour;
            minMin = 0;
        }
    }

    const hourRange = maxHour - minHour;
    const randomHour = hourRange <= 0 ? minHour : minHour + Math.floor(Math.random() * (hourRange + 1));
    const randomMin = (dayOffset === 0 && randomHour === minHour) ? minMin : Math.floor(Math.random() * 60);
    const randomSec = Math.floor(Math.random() * 60);
    d.setHours(randomHour, randomMin, randomSec, 0);

    const result = d.getTime();
    return result < baseMs ? baseMs + 120000 : result;
}

/**
 * إرسال استجابة MCQ لطالبة واحدة
 */
function submitMCQResponse(form, student, phase) {
    const responsesKey = "mcq_" + phase + "_responses";
    const answers = student[responsesKey];
    if (!answers || answers.length === 0) {
        Logger.log("⚠️ لا توجد استجابات MCQ " + phase + " لـ " + student.id);
        return false;
    }

    const items = form.getItems();
    const formResponse = form.createResponse();

    // أول عنصر = الإيميل (إذا كان موجود)
    let startIdx = 0;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (item.getType() === FormApp.ItemType.TEXT) {
            // حقل الإيميل
            formResponse.withItemResponse(item.asTextItem().createResponse(student.email));
            continue;
        }

        if (item.getType() === FormApp.ItemType.MULTIPLE_CHOICE ||
            item.getType() === FormApp.ItemType.LIST) {
            if (startIdx < answers.length) {
                const choiceIdx = answers[startIdx];
                const choices = item.asMultipleChoiceItem ?
                    item.asMultipleChoiceItem().getChoices() :
                    item.asListItem().getChoices();

                if (choiceIdx >= 0 && choiceIdx < choices.length) {
                    const choiceValue = choices[choiceIdx].getValue();
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
    const responsesKey = "flow_" + phase + "_responses";
    const answers = student[responsesKey];
    if (!answers || answers.length === 0) {
        Logger.log("⚠️ لا توجد استجابات Flow " + phase + " لـ " + student.id);
        return false;
    }

    const items = form.getItems();
    const formResponse = form.createResponse();
    let answerIdx = 0;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (item.getType() === FormApp.ItemType.TEXT) {
            formResponse.withItemResponse(item.asTextItem().createResponse(student.email));
            continue;
        }

        if (item.getType() === FormApp.ItemType.MULTIPLE_CHOICE ||
            item.getType() === FormApp.ItemType.LIST ||
            item.getType() === FormApp.ItemType.SCALE) {
            if (answerIdx < answers.length) {
                const answer = answers[answerIdx];

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
    const data = loadSimulationData();
    const verification = verifyFormStructure(data, "both");
    if (!verification.valid) {
        Logger.log("🛑 تم إيقاف الإرسال — راجع الأخطاء أعلاه");
        return;
    }
    const students = data.students;

    Logger.log("═══════════════════════════════════════════");
    Logger.log("📤 بدء إرسال " + students.length + " طالبة");
    Logger.log("📊 Seed: " + data.metadata.seed);
    Logger.log("═══════════════════════════════════════════");

    // تخزين الحالة للاستكمال
    let state = {
        totalStudents: students.length,
        currentPhase: "mcq_pre",
        currentIndex: 0,
        completed: { mcq_pre: 0, mcq_post: 0, flow_pre: 0, flow_post: 0 }
    };

    // استرجاع الحالة السابقة إن وجدت
    const savedState = PropertiesService.getScriptProperties().getProperty("SUBMIT_STATE");
    if (savedState) {
        state = JSON.parse(savedState);
        Logger.log("♻️ استكمال من الحالة السابقة: " + state.currentPhase + " #" + state.currentIndex);
    }

    const phases = ["mcq_pre", "mcq_post", "flow_pre", "flow_post"];
    const phaseIdx = phases.indexOf(state.currentPhase);

    for (let pi = phaseIdx; pi < phases.length; pi++) {
        const phase = phases[pi];
        const isMCQ = phase.startsWith("mcq");
        const testPhase = phase.endsWith("pre") ? "pre" : "post";

        const formUrl = isMCQ ? MCQ_FORM_URL : FLOW_FORM_URL;
        if (!formUrl) {
            Logger.log("⚠️ رابط الفورم غير محدد لـ " + phase);
            continue;
        }

        const form = FormApp.openByUrl(formUrl);
        Logger.log("\n📋 " + phase + " — " + (isMCQ ? "MCQ" : "Flow") + " " + testPhase);

        const startIdx = (pi === phaseIdx) ? state.currentIndex : 0;

        for (let i = startIdx; i < students.length; i++) {
            try {
                let success;
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
    const data = loadSimulationData();
    const verification = verifyFormStructure(data, "mcq");
    if (!verification.valid) {
        Logger.log("🛑 تم إيقاف الإرسال — راجع الأخطاء أعلاه");
        return;
    }
    const form = FormApp.openByUrl(MCQ_FORM_URL);

    Logger.log("📋 إرسال MCQ لـ " + data.students.length + " طالبة...");

    for (let i = 0; i < data.students.length; i++) {
        const s = data.students[i];
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
    const data = loadSimulationData();
    const verification = verifyFormStructure(data, "flow");
    if (!verification.valid) {
        Logger.log("🛑 تم إيقاف الإرسال — راجع الأخطاء أعلاه");
        return;
    }
    const form = FormApp.openByUrl(FLOW_FORM_URL);

    Logger.log("🌊 إرسال Flow لـ " + data.students.length + " طالبة...");

    for (let i = 0; i < data.students.length; i++) {
        const s = data.students[i];
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
 * استدعاء التحقق من القائمة (يعرض النتيجة في Log)
 */
function verifyFormsFromMenu() {
    const data = loadSimulationData();
    const v = verifyFormStructure(data, "both");
    if (v.valid) {
        Logger.log("✅ التحقق: الفورمات متطابقة مع simulation_data");
    }
}

/**
 * عرض ملخص البيانات المُحمّلة (بدون إرسال)
 */
function previewData() {
    const data = loadSimulationData();
    const stats = data.metadata.stats;

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
    for (let i = 0; i < Math.min(3, data.students.length); i++) {
        const s = data.students[i];
        Logger.log("  " + s.id + " | " + s.name + " | " + s.group +
            " | MCQ: " + s.mcq_pre_score + "→" + s.mcq_post_score +
            " | Flow: " + s.flow_pre_score + "→" + s.flow_post_score);
    }
    Logger.log("═══════════════════════════════════════════");
}

// ════════════════════════════════════════════════════════════════
//  الطريقة المجدوَلة — Smart Queue (فجوة ساعتين بين MCQ و Flow)
//  لكل طالب: MCQ في وقت عشوائي نهاري + Flow بعده بـ 2 ساعة ± 30 دقيقة
// ════════════════════════════════════════════════════════════════

// ─── إدارة الـ Trigger ────────────────────────────────────────

/**
 * ينشئ Trigger يستدعي processSmartQueue كل intervalMinutes دقيقة
 */
function setupJSONTrigger(intervalMinutes) {
    cleanupJSONTriggers();
    ScriptApp.newTrigger("processSmartQueue")
        .timeBased()
        .everyMinutes(intervalMinutes)
        .create();
    Logger.log("⏱️ تم إنشاء مؤقت كل " + intervalMinutes + " دقيقة");
}

/**
 * يحذف كل الـ Triggers المرتبطة بـ processSmartQueue
 */
function cleanupJSONTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    for (let i = 0; i < triggers.length; i++) {
        if (triggers[i].getHandlerFunction() === "processSmartQueue") {
            ScriptApp.deleteTrigger(triggers[i]);
        }
    }
}

// ─── بناء الطابور الذكي ───────────────────────────────────────

/**
 * يبني قائمة الانتظار الذكية لمرحلة معينة (pre/post)
 * لكل طالب: entry للـ MCQ + entry للـ Flow بعد فجوة ساعتين
 * @param {Object[]} students - قائمة الطلاب من JSON
 * @param {string} testPhase - "pre" أو "post"
 * @param {boolean} excludeDropouts - استثناء DROPOUT_IDS
 * @returns {Object[]} الطابور مرتباً زمنياً
 */
function buildSmartQueue(students, testPhase, excludeDropouts) {
    const queue = [];
    const now = new Date().getTime();
    const gapMs = SCHEDULE_CONFIG.mcqToFlowGapHours * 60 * 60 * 1000;
    const variationMs = SCHEDULE_CONFIG.mcqToFlowVariationMin * 60 * 1000;
    const tz = SCHEDULE_CONFIG.timezone;

    for (let i = 0; i < students.length; i++) {
        const s = students[i];

        // استثناء المتسربين في البعدي
        if (excludeDropouts && DROPOUT_IDS.indexOf(s.id) !== -1) continue;

        // وقت MCQ: عشوائي نهاري خلال numDays أيام
        const mcqTime = getRandomDaytimeMs(now, SCHEDULE_CONFIG.numDays);

        // وقت Flow: MCQ + gap ± variation عشوائي
        const variation = (Math.random() - 0.5) * 2 * variationMs;
        const flowTime = mcqTime + gapMs + variation;

        queue.push({
            id: s.id,
            phase: "mcq_" + testPhase,
            time: mcqTime,
            timeStr: Utilities.formatDate(new Date(mcqTime), tz, "yyyy-MM-dd HH:mm:ss"),
            done: false,
            retryCount: 0
        });
        queue.push({
            id: s.id,
            phase: "flow_" + testPhase,
            time: flowTime,
            timeStr: Utilities.formatDate(new Date(flowTime), tz, "yyyy-MM-dd HH:mm:ss"),
            done: false,
            retryCount: 0
        });
    }

    queue.sort(function (a, b) { return a.time - b.time; });
    return queue;
}

// ─── بدء القبلي ───────────────────────────────────────────────

/**
 * يبدأ التطبيق القبلي بجدول زمني ذكي.
 * لكل طالب: MCQ قبلي ثم Flow قبلي بعد ساعتين.
 * بعد الاكتمال شغّل runPostTestJSON() لبدء البعدي.
 */
function runPreTestJSON() {
    const props = PropertiesService.getScriptProperties();
    const state = props.getProperty("JSON_STATE") || "IDLE";

    if (state === "PRE_RUNNING" || state === "POST_RUNNING") {
        Logger.log("❌ فيه محاكاة مجدوَلة شغّالة! استخدم checkJSONStatus() أو resetJSONState()");
        return;
    }

    if (state === "PRE_DONE" || state === "POST_DONE") {
        Logger.log("⚠️ تحذير: فيه ردود قبلية متبعتة قبل كده!");
        Logger.log("⚠️ لو شغّلت تاني هيتبعت ردود مكررة في Google Forms.");
        Logger.log("💡 لو متأكد، شغّل resetJSONState() الأول ثم أعد التشغيل.");
        Logger.log("💡 وتأكد إنك مسحت الردود القديمة من الفورم.");
        return;
    }

    const fileId = SIMULATION_FILE_ID || props.getProperty("SIMULATION_FILE_ID");
    if (!fileId) { Logger.log("❌ ضع SIMULATION_FILE_ID في أعلى الملف"); return; }
    if (!MCQ_FORM_URL) { Logger.log("❌ ضع MCQ_FORM_URL في أعلى الملف"); return; }
    if (!FLOW_FORM_URL) { Logger.log("⚠️ FLOW_FORM_URL فارغ — سيتم تخطي مقياس التدفق"); }

    const lockKey = "JSON_LAST_START_PRE";
    const lastStart = parseInt(props.getProperty(lockKey) || "0");
    if (Date.now() - lastStart < 60000) {
        Logger.log("❌ انتظر دقيقة على الأقل قبل إعادة التشغيل");
        return;
    }

    Logger.log("📂 جارٍ تحميل simulation_data.json...");
    let data;
    try { data = loadSimulationData(); } catch (e) {
        Logger.log("❌ فشل تحميل الملف: " + e.message); return;
    }

    const verification = verifyFormStructure(data, "both");
    if (!verification.valid) {
        Logger.log("🛑 تم إيقاف البدء — راجع الأخطاء أعلاه");
        return;
    }

    const lightStudents = data.students.map(function (s) {
        return { id: s.id, email: s.email, mcq_pre_responses: s.mcq_pre_responses, flow_pre_responses: s.flow_pre_responses };
    });
    safeSetProperty(props, "STUDENTS_CACHE_PRE", JSON.stringify(lightStudents));

    const queue = buildSmartQueue(data.students, "pre", false);

    Logger.log("═══════════════════════════════════════════");
    Logger.log("🚀 بدء التطبيق القبلي (Pre-Test) — Smart Queue");
    Logger.log("👩‍🎓 عدد الطلاب: " + data.students.length);
    Logger.log("📋 إجمالي مهام الطابور: " + queue.length + " (MCQ + Flow)");
    Logger.log("⏰ MCQ → Flow: فجوة " + SCHEDULE_CONFIG.mcqToFlowGapHours + "h ± " + SCHEDULE_CONFIG.mcqToFlowVariationMin + " دقيقة");
    Logger.log("📅 أول موعد: " + queue[0].timeStr);
    Logger.log("📅 آخر موعد: " + queue[queue.length - 1].timeStr);
    Logger.log("═══════════════════════════════════════════");

    safeSetProperty(props, "SMART_QUEUE", JSON.stringify(queue));
    props.setProperty("JSON_PHASE", "PRE");
    props.setProperty("JSON_STATE", "PRE_RUNNING");
    props.setProperty("JSON_FILE_ID", fileId);
    props.setProperty(lockKey, String(Date.now()));

    setupJSONTrigger(SCHEDULE_CONFIG.triggerIntervalMinutes);

    Logger.log("✅ تم البدء! الردود ستُرسَل تلقائياً حسب الجدول.");
    Logger.log("💡 تابع بـ: checkJSONStatus()");
    Logger.log("💡 بعد الاكتمال شغّل: runPostTestJSON()");
}

// ─── بدء البعدي ───────────────────────────────────────────────

/**
 * يبدأ التطبيق البعدي بعد اكتمال القبلي.
 * يُرسل MCQ بعدي + Flow بعدي — مع استثناء الـ DROPOUT_IDS تلقائياً.
 */
function runPostTestJSON() {
    const props = PropertiesService.getScriptProperties();
    const state = props.getProperty("JSON_STATE") || "IDLE";

    if (state === "PRE_RUNNING" || state === "POST_RUNNING") {
        Logger.log("❌ فيه محاكاة مجدوَلة شغّالة! استخدم checkJSONStatus()");
        return;
    }
    if (state !== "PRE_DONE") {
        Logger.log("⚠️ لازم التطبيق القبلي يخلص الأول!");
        if (state === "IDLE") Logger.log("💡 شغّل runPreTestJSON() للبدء");
        if (state === "POST_DONE") Logger.log("✅ المحاكاة اكتملت! شغّل resetJSONState() لو حابب تبدأ من جديد");
        return;
    }

    const fileId = SIMULATION_FILE_ID || props.getProperty("JSON_FILE_ID") || props.getProperty("SIMULATION_FILE_ID");
    if (!fileId) { Logger.log("❌ ضع SIMULATION_FILE_ID في أعلى الملف"); return; }

    const lockKey = "JSON_LAST_START_POST";
    const lastStart = parseInt(props.getProperty(lockKey) || "0");
    if (Date.now() - lastStart < 60000) {
        Logger.log("❌ انتظر دقيقة على الأقل قبل إعادة التشغيل");
        return;
    }

    Logger.log("📂 جارٍ تحميل simulation_data.json...");
    let data;
    try { data = loadSimulationData(); } catch (e) {
        Logger.log("❌ فشل تحميل الملف: " + e.message); return;
    }

    const verification = verifyFormStructure(data, "both");
    if (!verification.valid) {
        Logger.log("🛑 تم إيقاف البدء — راجع الأخطاء أعلاه");
        return;
    }

    const lightStudents = data.students.map(function (s) {
        return { id: s.id, email: s.email, mcq_post_responses: s.mcq_post_responses, flow_post_responses: s.flow_post_responses };
    });
    safeSetProperty(props, "STUDENTS_CACHE_POST", JSON.stringify(lightStudents));

    // بناء الطابور مع استثناء المتسربين
    const queue = buildSmartQueue(data.students, "post", true);
    const activeStudents = data.students.length - DROPOUT_IDS.length;

    Logger.log("═══════════════════════════════════════════");
    Logger.log("🚀 بدء التطبيق البعدي (Post-Test) — Smart Queue");
    Logger.log("👩‍🎓 إجمالي الطلاب: " + data.students.length + " | فاعلون: " + activeStudents + " | مستبعدون: " + DROPOUT_IDS.length);
    Logger.log("📋 إجمالي مهام الطابور: " + queue.length + " (MCQ + Flow)");
    Logger.log("📅 أول موعد: " + queue[0].timeStr);
    Logger.log("📅 آخر موعد: " + queue[queue.length - 1].timeStr);
    Logger.log("═══════════════════════════════════════════");

    safeSetProperty(props, "SMART_QUEUE", JSON.stringify(queue));
    props.setProperty("JSON_PHASE", "POST");
    props.setProperty("JSON_STATE", "POST_RUNNING");
    props.setProperty("JSON_FILE_ID", fileId);
    props.setProperty(lockKey, String(Date.now()));

    setupJSONTrigger(SCHEDULE_CONFIG.triggerIntervalMinutes);

    Logger.log("✅ تم البدء! تابع بـ: checkJSONStatus()");
}

// ─── معالج الـ Trigger ─────────────────────────────────────────

/**
 * يُستدعى تلقائياً كل triggerIntervalMinutes دقيقة.
 * يرسل الردود التي حان وقتها — كل مهمة (MCQ أو Flow) مستقلة.
 * حماية retryCount: بعد maxRetries فشل يتجاوز الطالب بدون توقف النظام.
 */
function processSmartQueue() {
    const props = PropertiesService.getScriptProperties();
    const state = props.getProperty("JSON_STATE");
    if (state !== "PRE_RUNNING" && state !== "POST_RUNNING") return;

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return;

    try {
        const phase = props.getProperty("JSON_PHASE"); // "PRE" أو "POST"

        let queue;
        try {
            queue = JSON.parse(safeGetProperty(props, "SMART_QUEUE") || "[]");
        } catch (e) {
            Logger.log("❌ خطأ في قراءة الطابور: " + e.message);
            return;
        }

        const now = Date.now();
        const startTime = Date.now();
        const MAX_RUNTIME_MS = 5 * 60 * 1000;
        const maxPerRun = SCHEDULE_CONFIG.maxPerRun || 3;
        const maxRetries = SCHEDULE_CONFIG.maxRetries || 3;
        let sent = 0;

        // قراءة من الكاش بدلاً من Drive API (تجنب استنزاف الحصة)
        const students = JSON.parse(safeGetProperty(props, "STUDENTS_CACHE_" + phase) || "[]");
        const studentMap = {};
        for (let j = 0; j < students.length; j++) {
            studentMap[students[j].id] = students[j];
        }

        // فتح الفورمات مرة واحدة
        let mcqForm = null;
        let flowForm = null;
        let flowActive = !!(FLOW_FORM_URL);
        if (MCQ_FORM_URL) {
            try { mcqForm = FormApp.openByUrl(MCQ_FORM_URL); } catch (e) {
                Logger.log("❌ فشل فتح فورم MCQ: " + e.message); return;
            }
        }
        if (flowActive) {
            try { flowForm = FormApp.openByUrl(FLOW_FORM_URL); } catch (e) {
                Logger.log("⚠️ فشل فتح فورم Flow — سيتم تخطيه: " + e.message);
                flowActive = false;
            }
        }

        for (let i = 0; i < queue.length; i++) {
            const item = queue[i];
            if (item.done || item.time > now) continue;
            if (sent >= maxPerRun) break;
            if (Date.now() - startTime > MAX_RUNTIME_MS) {
                Logger.log("⏰ توقف مبكر — اقتراب من حد الـ 6 دقائق");
                break;
            }

            const student = studentMap[item.id];
            if (!student) {
                item.done = true; // طالب غير موجود في JSON
                continue;
            }

            const isMCQ = item.phase.indexOf("mcq") !== -1;
            const testPhase = item.phase.indexOf("pre") !== -1 ? "pre" : "post";

            try {
                let ok = false;
                if (isMCQ && mcqForm) {
                    ok = submitMCQResponse(mcqForm, student, testPhase);
                } else if (!isMCQ && flowActive && flowForm) {
                    ok = submitFlowResponse(flowForm, student, testPhase);
                } else if (!isMCQ && !flowActive) {
                    ok = true; // Flow غير مفعّل، تجاوز صامت
                }

                if (ok !== false) {
                    item.done = true;
                    sent++;
                    Logger.log("✅ [" + item.phase + "] " + item.id + " | " + item.timeStr);
                }

            } catch (e) {
                item.retryCount = (item.retryCount || 0) + 1;
                Logger.log("❌ [" + item.phase + "] " + item.id + " — محاولة " + item.retryCount + ": " + e.message);
                if (item.retryCount >= maxRetries) {
                    Logger.log("⚠️ تجاوز " + item.id + " [" + item.phase + "] بعد " + maxRetries + " محاولات فاشلة");
                    item.done = true;
                    sent++;
                }
            }

            if (sent < maxPerRun && sent > 0) {
                Utilities.sleep(1500 + Math.floor(Math.random() * 3000));
            }
        }

        // حفظ الطابور المحدَّث
        safeSetProperty(props, "SMART_QUEUE", JSON.stringify(queue));

        // فحص الاكتمال
        const remaining = queue.filter(function (q) { return !q.done; }).length;
        const doneCnt = queue.filter(function (q) { return q.done; }).length;

        if (remaining === 0) {
            cleanupJSONTriggers();
            if (phase === "PRE") {
                props.setProperty("JSON_STATE", "PRE_DONE");
                Logger.log("\n✅✅✅ التطبيق القبلي اكتمل! ✅✅✅");
                Logger.log("   إجمالي الردود المُرسَلة: " + doneCnt);
                Logger.log("\n💡 شغّل runPostTestJSON() عندما تكون جاهزاً للبعدي");
            } else {
                props.setProperty("JSON_STATE", "POST_DONE");
                Logger.log("\n✅✅✅ التطبيق البعدي اكتمل! المحاكاة اكتملت بالكامل ✅✅✅");
                Logger.log("   إجمالي الردود المُرسَلة: " + doneCnt);
                try {
                    const email = Session.getActiveUser().getEmail();
                    if (email) {
                        MailApp.sendEmail(email,
                            "✅ محاكاة JSON اكتملت",
                            "تم إرسال القبلي والبعدي بنجاح.\nإجمالي الردود: " + doneCnt);
                        Logger.log("📧 تم إرسال إشعار لـ " + email);
                    }
                } catch (mailErr) {
                    Logger.log("⚠️ لم يتم إرسال البريد: " + mailErr.message);
                }
            }
        } else if (sent > 0) {
            Logger.log("📊 تم: " + doneCnt + "/" + queue.length + " | متبقي: " + remaining);
        }

    } finally {
        lock.releaseLock();
    }
}

// ─── الحالة والإدارة ──────────────────────────────────────────

/**
 * يعرض حالة المحاكاة المجدوَلة والتقدم الحالي
 */
function checkJSONStatus() {
    const props = PropertiesService.getScriptProperties();
    const state = props.getProperty("JSON_STATE") || "IDLE";
    const phase = props.getProperty("JSON_PHASE") || "-";

    Logger.log("═══════════════════════════════════════════");
    Logger.log("📊 حالة المحاكاة المجدوَلة (Smart Queue)");
    Logger.log("═══════════════════════════════════════════");

    const stateLabel = {
        "IDLE": "لم تبدأ بعد",
        "PRE_RUNNING": "القبلي يعمل...",
        "PRE_DONE": "القبلي اكتمل ✅ — جاهز للبعدي",
        "POST_RUNNING": "البعدي يعمل...",
        "POST_DONE": "اكتملت بالكامل ✅"
    }[state] || state;

    Logger.log("🔄 الحالة: " + stateLabel);
    Logger.log("📋 المرحلة: " + phase);

    const queueRaw = safeGetProperty(props, "SMART_QUEUE");
    if (!queueRaw) {
        Logger.log("📭 لا يوجد طابور محفوظ");
        Logger.log("═══════════════════════════════════════════");
        return;
    }

    const queue = JSON.parse(queueRaw);
    const total = queue.length;
    const doneCnt = queue.filter(function (q) { return q.done; }).length;
    const remaining = total - doneCnt;

    // إحصاء MCQ/Flow منفصلَين
    const mcqDone = queue.filter(function (q) { return q.done && q.phase.indexOf("mcq") !== -1; }).length;
    const flowDone = queue.filter(function (q) { return q.done && q.phase.indexOf("flow") !== -1; }).length;

    Logger.log("📋 إجمالي المهام: " + total + " | تم: " + doneCnt + " | متبقي: " + remaining);
    Logger.log("   MCQ مُرسَل: " + mcqDone + " | Flow مُرسَل: " + flowDone);

    if (remaining > 0) {
        const nextItems = queue.filter(function (q) { return !q.done; });
        Logger.log("⏰ أقرب موعد متبقٍّ: " + nextItems[0].timeStr + " [" + nextItems[0].phase + "]");
        Logger.log("⏰ آخر موعد: " + nextItems[nextItems.length - 1].timeStr);
    }

    Logger.log("═══════════════════════════════════════════");
}

/**
 * يحذف كل بيانات المحاكاة المجدوَلة ويوقف الـ Trigger
 */
function resetJSONState() {
    const props = PropertiesService.getScriptProperties();
    cleanupJSONTriggers();

    props.deleteProperty("JSON_STATE");
    props.deleteProperty("JSON_PHASE");
    props.deleteProperty("JSON_FILE_ID");

    // حذف SMART_QUEUE مع دعم chunked storage
    const chunks = parseInt(props.getProperty("SMART_QUEUE_CHUNKS") || "0");
    for (let i = 0; i < chunks; i++) {
        props.deleteProperty("SMART_QUEUE_CHUNK_" + i);
    }
    props.deleteProperty("SMART_QUEUE_CHUNKS");
    props.deleteProperty("SMART_QUEUE");

    Logger.log("✅ تم مسح حالة المحاكاة المجدوَلة وإيقاف الـ Trigger");
    Logger.log("💡 يمكنك الآن تشغيل runPreTestJSON() من جديد");
}

/**
 * القائمة المخصصة
 */
function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu("📤 إرسال المحاكاة")
        .addItem("👀 معاينة البيانات", "previewData")
        .addItem("🔍 التحقق من تطابق الفورمات", "verifyFormsFromMenu")
        .addSeparator()
        .addSubMenu(
            ui.createMenu("⏱️ مجدوَل — Smart Queue (ساعتين فجوة)")
                .addItem("▶ تشغيل القبلي", "runPreTestJSON")
                .addItem("▶ تشغيل البعدي (يستثني المتسربين)", "runPostTestJSON")
                .addSeparator()
                .addItem("📊 حالة المحاكاة", "checkJSONStatus")
                .addSeparator()
                .addItem("⏹ إيقاف وإعادة تعيين", "resetJSONState")
        )
        .addSeparator()
        .addSubMenu(
            ui.createMenu("🚀 فوري (كل شيء دفعة واحدة)")
                .addItem("🚀 إرسال الكل (MCQ + Flow)", "submitAllFromJSON")
                .addItem("📝 إرسال MCQ فقط", "submitMCQOnly")
                .addItem("🌊 إرسال Flow فقط", "submitFlowOnly")
                .addSeparator()
                .addItem("♻️ مسح حالة الإرسال الفوري", "resetSubmitState")
        )
        .addToUi();
}
