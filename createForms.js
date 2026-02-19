// ════════════════════════════════════════════════════════════════
//  🏗️ createForms.gs - إنشاء الفورمين تلقائياً
//
//  الاستخدام:
//  1. شغّل createMCQForm()  ← ينشئ فورم الـ 30 سؤال
//  2. شغّل createFlowForm() ← ينشئ فورم مقياس التدفق (56 عبارة)
//  3. انسخ الـ Form ID من الـ Log وضعه في config.js / config_flow.js
// ════════════════════════════════════════════════════════════════


/**
 * إنشاء فورم اختبار حل المشكلات الأخلاقية البيوطبية (30 سؤال MCQ)
 * - سؤال Short Answer للإيميل (index 0)
 * - 30 سؤال Multiple Choice (4 خيارات لكل سؤال)
 */
function createMCQForm() {
  const config = getTestConfig();
  const questions = config.questions;
  const title = config.testInfo.title || "اختبار حل المشكلات الأخلاقية البيوطبية";

  Logger.log("🏗️ جارٍ إنشاء فورم MCQ...");

  const form = FormApp.create(title);
  form.setDescription("اختبار مهارات حل المشكلات الأخلاقية البيوطبية")
      .setIsQuiz(false)
      .setAllowResponseEdits(false)
      .setLimitOneResponsePerUser(false)
      .setShuffleQuestions(false);

  // ── سؤال الإيميل (index 0) ──
  form.addTextItem()
      .setTitle("البريد الإلكتروني")
      .setHelpText("أدخل بريدك الإلكتروني الجامعي")
      .setRequired(true);

  // ── الأسئلة الـ 30 ──
  for (var i = 0; i < questions.length; i++) {
    var q = questions[i];
    var item = form.addMultipleChoiceItem();
    item.setTitle("السؤال " + q.order + ": " + q.text)
        .setChoiceValues(q.choices)
        .setRequired(true);
  }

  var formId  = form.getId();
  var editUrl = form.getEditUrl();
  var pubUrl  = form.getPublishedUrl();

  Logger.log("═══════════════════════════════════════════════");
  Logger.log("✅ تم إنشاء فورم MCQ بنجاح!");
  Logger.log("📝 عدد الأسئلة: " + questions.length + " سؤال + سؤال الإيميل");
  Logger.log("─────────────────────────────────────────────");
  Logger.log("🔑 Form ID: " + formId);
  Logger.log("✏️  رابط التعديل: " + editUrl);
  Logger.log("🔗 رابط الملء:   " + pubUrl);
  Logger.log("─────────────────────────────────────────────");
  Logger.log("💡 ضع هذا الرابط في config.js في حقل formUrl:");
  Logger.log("   " + editUrl);
  Logger.log("═══════════════════════════════════════════════");

  return formId;
}


/**
 * إنشاء فورم مقياس التدفق النفسي (56 عبارة Likert)
 * - سؤال Short Answer للإيميل (index 0)
 * - 56 عبارة Multiple Choice (5 خيارات: دائماً / غالباً / أحياناً / نادراً / أبداً)
 */
function createFlowForm() {
  var flowConfig = getFlowConfig();
  var items      = flowConfig.items;
  var choices    = flowConfig.choices || ["دائماً", "غالباً", "أحياناً", "نادراً", "أبداً"];
  var dimensions = flowConfig.dimensions || [];

  Logger.log("🏗️ جارٍ إنشاء فورم مقياس التدفق النفسي...");

  var form = FormApp.create("مقياس التدفق النفسي");
  form.setDescription("مقياس التدفق النفسي في بيئة حشد المصادر الإلكترونية")
      .setIsQuiz(false)
      .setAllowResponseEdits(false)
      .setLimitOneResponsePerUser(false)
      .setShuffleQuestions(false);

  // ── سؤال الإيميل (index 0) ──
  form.addTextItem()
      .setTitle("البريد الإلكتروني")
      .setHelpText("أدخل بريدك الإلكتروني الجامعي")
      .setRequired(true);

  // ── بناء خريطة index للأبعاد لكل عبارة ──
  var dimMap = {};
  for (var d = 0; d < dimensions.length; d++) {
    var dim = dimensions[d];
    for (var k = 0; k < dim.items.length; k++) {
      dimMap[dim.items[k]] = dim.name;
    }
  }

  // ── الـ 56 عبارة ──
  var currentDim = "";
  for (var i = 0; i < items.length; i++) {
    var it = items[i];

    // إضافة فاصل بيان البُعد كعنوان قسم عند تغيير البُعد
    var itDim = dimMap[it.id] || "";
    if (itDim && itDim !== currentDim) {
      currentDim = itDim;
      form.addSectionHeaderItem()
          .setTitle(itDim);
    }

    form.addMultipleChoiceItem()
        .setTitle(it.id + ". " + it.text)
        .setChoiceValues(choices)
        .setRequired(true);
  }

  var formId  = form.getId();
  var editUrl = form.getEditUrl();
  var pubUrl  = form.getPublishedUrl();

  Logger.log("═══════════════════════════════════════════════");
  Logger.log("✅ تم إنشاء فورم مقياس التدفق النفسي بنجاح!");
  Logger.log("📝 عدد العبارات: " + items.length + " عبارة + سؤال الإيميل");
  Logger.log("📊 عدد الأبعاد: " + dimensions.length + " أبعاد");
  Logger.log("─────────────────────────────────────────────");
  Logger.log("🔑 Form ID: " + formId);
  Logger.log("✏️  رابط التعديل: " + editUrl);
  Logger.log("🔗 رابط الملء:   " + pubUrl);
  Logger.log("─────────────────────────────────────────────");
  Logger.log("💡 ضع هذا الرابط في config_flow.js في حقل formUrl:");
  Logger.log("   " + editUrl);
  Logger.log("═══════════════════════════════════════════════");

  return formId;
}
