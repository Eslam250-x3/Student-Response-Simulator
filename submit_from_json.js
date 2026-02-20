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
var SIMULATION_FILE_ID = "";  // ← ضع هنا ID ملف الـ JSON من Google Drive

// فورم MCQ
var MCQ_FORM_URL = "";        // ← رابط فورم الاختبار MCQ

// فورم Flow
var FLOW_FORM_URL = "";       // ← رابط فورم مقياس التدفق

// ─── إعدادات الجدولة (للطريقة المجدوَلة) ───────────────────────
var SCHEDULE_CONFIG = {
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

// ─── الطلاب المتسربون (لا يُرسَل لهم في البعدي) ──────────────
var DROPOUT_IDS = [
    "STD-081", "STD-082", "STD-083", "STD-084",
    "STD-085", "STD-086", "STD-087", "STD-088",
    "STD-089", "STD-090", "STD-091", "STD-092",
    "STD-093", "STD-094", "STD-095", "STD-096"
];

// --- Safe Property Storage (handles 9 KB GAS per-value limit) ---
// The Smart Queue for 96 students (192 entries) can exceed the 9 KB
// ScriptProperties limit, so large values are auto-split into chunks.

/**
 * Saves a large string to Script Properties safely.
 * Values larger than 8000 chars are split into KEY_CHUNK_0 / _1 / ...
 * @param {GoogleAppsScript.Properties.Properties} props
 * @param {string} key
 * @param {string} value
 */
function safeSetProperty(props, key, value) {
    var CHUNK_SIZE = 8000;
    var oldChunks = parseInt(props.getProperty(key + "_CHUNKS") || "0");
    for (var k = 0; k < oldChunks; k++) {
        props.deleteProperty(key + "_CHUNK_" + k);
    }
    props.deleteProperty(key + "_CHUNKS");
    props.deleteProperty(key);
    if (value.length <= CHUNK_SIZE) {
        props.setProperty(key, value);
    } else {
        var chunks = [];
        for (var i = 0; i < value.length; i += CHUNK_SIZE) {
            chunks.push(value.substring(i, i + CHUNK_SIZE));
        }
        for (var j = 0; j < chunks.length; j++) {
            props.setProperty(key + "_CHUNK_" + j, chunks[j]);
        }
        props.setProperty(key + "_CHUNKS", String(chunks.length));
    }
}

/**
 * Reads a string that was saved with safeSetProperty.
 * @param {GoogleAppsScript.Properties.Properties} props
 * @param {string} key
 * @returns {string|null}
 */
function safeGetProperty(props, key) {
    var chunksStr = props.getProperty(key + "_CHUNKS");
    if (!chunksStr) return props.getProperty(key);
    var n = parseInt(chunksStr);
    var result = "";
    for (var i = 0; i < n; i++) {
        result += (props.getProperty(key + "_CHUNK_" + i) || "");
    }
    return result;
}

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
 * يولّد وقت عشوائي في ساعات النهار فقط (startHour → endHour)
 * مع هامش كافٍ لاستيعاب فجوة الساعتين (MCQ → Flow)
 * @param {number} baseMs - وقت البداية بالميلي ثانية
 * @param {number} numDays - التوزيع على كم يوم
 * @returns {number} وقت بالميلي ثانية
 */
function getRandomDaytimeMs(baseMs, numDays) {
    var d = new Date(baseMs);
    // يوم عشوائي [0, numDays-1]
    d.setDate(d.getDate() + Math.floor(Math.random() * numDays));
    // الحد الأقصى للـ MCQ = endHour - gap - 1 حتى يبقى Flow داخل النافذة
    var maxHour = SCHEDULE_CONFIG.endHour - SCHEDULE_CONFIG.mcqToFlowGapHours - 1;
    var hourRange = maxHour - SCHEDULE_CONFIG.startHour;
    var randomHour = SCHEDULE_CONFIG.startHour + Math.floor(Math.random() * (hourRange + 1));
    var randomMin = Math.floor(Math.random() * 60);
    var randomSec = Math.floor(Math.random() * 60);
    d.setHours(randomHour, randomMin, randomSec, 0);
    return d.getTime();
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
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
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
    var queue = [];
    var now = new Date().getTime();
    var gapMs = SCHEDULE_CONFIG.mcqToFlowGapHours * 60 * 60 * 1000;
    var variationMs = SCHEDULE_CONFIG.mcqToFlowVariationMin * 60 * 1000;
    var tz = SCHEDULE_CONFIG.timezone;

    for (var i = 0; i < students.length; i++) {
        var s = students[i];

        // استثناء المتسربين في البعدي
        if (excludeDropouts && DROPOUT_IDS.indexOf(s.id) !== -1) continue;

        // وقت MCQ: عشوائي نهاري خلال numDays أيام
        var mcqTime = getRandomDaytimeMs(now, SCHEDULE_CONFIG.numDays);

        // وقت Flow: MCQ + gap ± variation عشوائي
        var variation = (Math.random() - 0.5) * 2 * variationMs;
        var flowTime = mcqTime + gapMs + variation;

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
    var props = PropertiesService.getScriptProperties();
    var state = props.getProperty("JSON_STATE") || "IDLE";

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

    var fileId = SIMULATION_FILE_ID || props.getProperty("SIMULATION_FILE_ID");
    if (!fileId) { Logger.log("❌ ضع SIMULATION_FILE_ID في أعلى الملف"); return; }
    if (!MCQ_FORM_URL) { Logger.log("❌ ضع MCQ_FORM_URL في أعلى الملف"); return; }
    if (!FLOW_FORM_URL) { Logger.log("⚠️ FLOW_FORM_URL فارغ — سيتم تخطي مقياس التدفق"); }

    Logger.log("📂 جارٍ تحميل simulation_data.json...");
    var data;
    try { data = loadSimulationData(); } catch (e) {
        Logger.log("❌ فشل تحميل الملف: " + e.message); return;
    }

    var queue = buildSmartQueue(data.students, "pre", false);

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
    var props = PropertiesService.getScriptProperties();
    var state = props.getProperty("JSON_STATE") || "IDLE";

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

    var fileId = SIMULATION_FILE_ID || props.getProperty("JSON_FILE_ID") || props.getProperty("SIMULATION_FILE_ID");
    if (!fileId) { Logger.log("❌ ضع SIMULATION_FILE_ID في أعلى الملف"); return; }

    Logger.log("📂 جارٍ تحميل simulation_data.json...");
    var data;
    try { data = loadSimulationData(); } catch (e) {
        Logger.log("❌ فشل تحميل الملف: " + e.message); return;
    }

    // بناء الطابور مع استثناء المتسربين
    var queue = buildSmartQueue(data.students, "post", true);
    var activeStudents = data.students.length - DROPOUT_IDS.length;

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
    var props = PropertiesService.getScriptProperties();
    var state = props.getProperty("JSON_STATE");
    if (state !== "PRE_RUNNING" && state !== "POST_RUNNING") return;

    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return;

    try {
        var phase = props.getProperty("JSON_PHASE"); // "PRE" أو "POST"

        var queue;
        try {
            queue = JSON.parse(safeGetProperty(props, "SMART_QUEUE") || "[]");
        } catch (e) {
            Logger.log("❌ خطأ في قراءة الطابور: " + e.message);
            return;
        }

        var now = Date.now();
        var startTime = Date.now();
        var MAX_RUNTIME_MS = 5 * 60 * 1000;
        var maxPerRun = SCHEDULE_CONFIG.maxPerRun || 3;
        var maxRetries = SCHEDULE_CONFIG.maxRetries || 3;
        var sent = 0;

        // تحميل الـ JSON من Drive مرة واحدة
        var data;
        try {
            data = loadSimulationData();
        } catch (e) {
            Logger.log("❌ فشل تحميل simulation_data.json: " + e.message);
            return;
        }

        // بناء map للبحث السريع بالـ ID
        var studentMap = {};
        for (var j = 0; j < data.students.length; j++) {
            studentMap[data.students[j].id] = data.students[j];
        }

        // فتح الفورمات مرة واحدة
        var mcqForm = null;
        var flowForm = null;
        if (MCQ_FORM_URL) {
            try { mcqForm = FormApp.openByUrl(MCQ_FORM_URL); } catch (e) {
                Logger.log("❌ فشل فتح فورم MCQ: " + e.message); return;
            }
        }
        var flowActive = !!(FLOW_FORM_URL);
        if (flowActive) {
            try { flowForm = FormApp.openByUrl(FLOW_FORM_URL); } catch (e) {
                Logger.log("⚠️ فشل فتح فورم Flow — سيتم تخطيه: " + e.message);
                flowActive = false;
            }
        }

        for (var i = 0; i < queue.length; i++) {
            var item = queue[i];
            if (item.done || item.time > now) continue;
            if (sent >= maxPerRun) break;
            if (Date.now() - startTime > MAX_RUNTIME_MS) {
                Logger.log("⏰ توقف مبكر — اقتراب من حد الـ 6 دقائق");
                break;
            }

            var student = studentMap[item.id];
            if (!student) {
                item.done = true; // طالب غير موجود في JSON
                continue;
            }

            var isMCQ = item.phase.indexOf("mcq") !== -1;
            var testPhase = item.phase.indexOf("pre") !== -1 ? "pre" : "post";

            try {
                var ok = false;
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
        var remaining = queue.filter(function (q) { return !q.done; }).length;
        var doneCnt = queue.filter(function (q) { return q.done; }).length;

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
                    var email = Session.getActiveUser().getEmail();
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
    var props = PropertiesService.getScriptProperties();
    var state = props.getProperty("JSON_STATE") || "IDLE";
    var phase = props.getProperty("JSON_PHASE") || "-";

    Logger.log("═══════════════════════════════════════════");
    Logger.log("📊 حالة المحاكاة المجدوَلة (Smart Queue)");
    Logger.log("═══════════════════════════════════════════");

    var stateLabel = {
        "IDLE": "لم تبدأ بعد",
        "PRE_RUNNING": "القبلي يعمل...",
        "PRE_DONE": "القبلي اكتمل ✅ — جاهز للبعدي",
        "POST_RUNNING": "البعدي يعمل...",
        "POST_DONE": "اكتملت بالكامل ✅"
    }[state] || state;

    Logger.log("🔄 الحالة: " + stateLabel);
    Logger.log("📋 المرحلة: " + phase);

    var queueRaw = safeGetProperty(props, "SMART_QUEUE");
    if (!queueRaw) {
        Logger.log("📭 لا يوجد طابور محفوظ");
        Logger.log("═══════════════════════════════════════════");
        return;
    }

    var queue = JSON.parse(queueRaw);
    var total = queue.length;
    var doneCnt = queue.filter(function (q) { return q.done; }).length;
    var remaining = total - doneCnt;

    // إحصاء MCQ/Flow منفصلَين
    var mcqDone = queue.filter(function (q) { return q.done && q.phase.indexOf("mcq") !== -1; }).length;
    var flowDone = queue.filter(function (q) { return q.done && q.phase.indexOf("flow") !== -1; }).length;

    Logger.log("📋 إجمالي المهام: " + total + " | تم: " + doneCnt + " | متبقي: " + remaining);
    Logger.log("   MCQ مُرسَل: " + mcqDone + " | Flow مُرسَل: " + flowDone);

    if (remaining > 0) {
        var nextItems = queue.filter(function (q) { return !q.done; });
        Logger.log("⏰ أقرب موعد متبقٍّ: " + nextItems[0].timeStr + " [" + nextItems[0].phase + "]");
        Logger.log("⏰ آخر موعد: " + nextItems[nextItems.length - 1].timeStr);
    }

    Logger.log("═══════════════════════════════════════════");
}

/**
 * يحذف كل بيانات المحاكاة المجدوَلة ويوقف الـ Trigger
 */
function resetJSONState() {
    var props = PropertiesService.getScriptProperties();
    cleanupJSONTriggers();

    props.deleteProperty("JSON_STATE");
    props.deleteProperty("JSON_PHASE");
    props.deleteProperty("JSON_FILE_ID");

    // حذف SMART_QUEUE مع دعم chunked storage
    var chunks = parseInt(props.getProperty("SMART_QUEUE_CHUNKS") || "0");
    for (var i = 0; i < chunks; i++) {
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
    var ui = SpreadsheetApp.getUi();
    ui.createMenu("📤 إرسال المحاكاة")
        .addItem("👀 معاينة البيانات", "previewData")
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
