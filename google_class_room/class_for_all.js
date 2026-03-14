/**
 * سكريبت آلي لإنشاء فصول جوجل كلاس روم كاملة من الصفر
 * بما في ذلك المحتويات والمهام الخاصة بمشروع الأخلاق البيوطبية
 * 
 * !!!!! هام جداً !!!!!
 * قبل تشغيل هذا السكريبت:
 * 1. افتح محرر Google Apps Script (script.google.com)
 * 2. من القائمة اليسرى، اختر "Services" (الخدمات) +
 * 3. أضف خدمة "Google Classroom API" وقم بتفعيلها
 * 4. احفظ المشروع
 * 5. شغّل إحدى الدوال: createGroup1, createGroup2, createGroup3, أو createGroup4
 * 6. سيتم إنشاء فصل جديد كامل تلقائياً!
 * 
 * أنواع المجموعات:
 * - createGroup1: تنافسي مفتوح (بدون ضغط زمني)
 * - createGroup2: تنافسي مقيد (بضغط زمني)
 * - createGroup3: تعاوني مفتوح (بدون ضغط زمني)
 * - createGroup4: تعاوني مقيد (بضغط زمني)
 */

// ============================================================================
// إعدادات المجموعات الأربع
// ============================================================================

/** تاريخ بداية التجربة - متطابق مع 1 - Gradebook.csv و generate_tasks_gradebook.py */
const START_DATE = new Date('2026-02-22');

const GROUP1_CONFIG = {
  name: 'المجموعة الأولى - تنافسي مفتوح',
  section: 'تنافسي - بدون ضغط زمني',
  description: 'بيئة تعلم تنافسية مع مرونة زمنية كاملة لبناء دليل شامل للأخلاق البيوطبية',
  isCompetitive: true,
  hasTimePressure: false,
  totalDays: 21,
  collaborationNote: null
};

const GROUP2_CONFIG = {
  name: 'المجموعة الثانية - تنافسي مقيد',
  section: 'تنافسي - بضغط زمني',
  description: 'بيئة تعلم تنافسية مقيدة بجدول زمني للعمل الفردي المكثف',
  isCompetitive: true,
  hasTimePressure: true,
  totalDays: 21,
  collaborationNote: null
};

const GROUP3_CONFIG = {
  name: 'المجموعة الثالثة - تعاوني مفتوح',
  section: 'تعاوني - بدون ضغط زمني',
  description: 'بيئة تعلم تعاونية مع مرونة زمنية كاملة',
  isCompetitive: false,
  hasTimePressure: false,
  totalDays: 21,
  collaborationNote: 'تعاوني - العمل في مجموعات'
};

const GROUP4_CONFIG = {
  name: 'المجموعة الرابعة - تعاوني مقيد',
  section: 'تعاوني - بضغط زمني',
  description: 'بيئة تعلم تعاونية مقيدة بجدول زمني للعمل الجماعي المكثف',
  isCompetitive: false,
  hasTimePressure: true,
  totalDays: 21,
  collaborationNote: 'تعاوني - العمل في مجموعات'
};

// ============================================================================
// الدوال الرئيسية لإنشاء المجموعات الأربع
// ============================================================================

/**
 * إنشاء المجموعة الأولى: تنافسي مفتوح
 */
function createGroup1() {
  createClassroomWithConfig(GROUP1_CONFIG);
}

/**
 * إنشاء المجموعة الثانية: تنافسي مقيد
 */
function createGroup2() {
  createClassroomWithConfig(GROUP2_CONFIG);
}

/**
 * إنشاء المجموعة الثالثة: تعاوني مفتوح
 */
function createGroup3() {
  createClassroomWithConfig(GROUP3_CONFIG);
}

/**
 * إنشاء المجموعة الرابعة: تعاوني مقيد
 */
function createGroup4() {
  createClassroomWithConfig(GROUP4_CONFIG);
}

/**
 * الدالة الأساسية: إنشاء فصل مع الإعدادات المحددة
 */
function createClassroomWithConfig(config) {
  Logger.log('🚀 بدء إنشاء فصل دراسي جديد كامل...');
  Logger.log('='.repeat(60));
  
  // 1. إنشاء الفصل الدراسي
  const courseId = createNewCourse(config);
  
  if (!courseId) {
    Logger.log('❌ فشل إنشاء الفصل. توقف السكريبت.');
    return;
  }
  
  Logger.log(`✅ تم إنشاء الفصل بنجاح!`);
  Logger.log(`🆔 Course ID: ${courseId}`);
  Logger.log(`🔗 رابط الفصل: https://classroom.google.com/c/${courseId}`);
  Logger.log('='.repeat(60));
  
  // انتظار قصير للتأكد من إنشاء الفصل
  Utilities.sleep(2000);
  
  // 2. إضافة جميع المحتويات للفصل
  setupClassroomContent(courseId, config);
  
  Logger.log('');
  Logger.log('='.repeat(60));
  Logger.log('🎉 تم إنشاء الفصل الدراسي بالكامل بنجاح!');
  Logger.log(`🔗 افتح الفصل الآن: https://classroom.google.com/c/${courseId}`);
  Logger.log('='.repeat(60));
}

/**
 * 1. إنشاء فصل دراسي جديد
 * @return {string} معرّف الفصل (Course ID)
 */
function createNewCourse(config) {
  try {
    Logger.log('📚 جاري إنشاء فصل دراسي جديد...');
    Logger.log(`📋 نوع المجموعة: ${config.name}`);
    
    const course = {
      name: config.name,
      section: config.section,
      description: config.description,
      descriptionHeading: 'مرحباً بكم في مشروع الأخلاق البيوطبية! 🧬',
      room: 'قاعة الفلسفة والأخلاق',
      ownerId: 'me'
      // تم إزالة courseState: 'ACTIVE' لأن بعض الحسابات لا تدعمه مباشرة
    };
    
    const createdCourse = Classroom.Courses.create(course);
    
    Logger.log(`✅ تم إنشاء الفصل: ${createdCourse.name}`);
    Logger.log(`   Course ID: ${createdCourse.id}`);
    Logger.log(`   Course State: ${createdCourse.courseState}`);
    
    if (createdCourse.courseState !== 'ACTIVE') {
      Logger.log('⚠️ ملاحظة: قد تحتاج لتفعيل الفصل يدوياً من Classroom');
    }
    
    return createdCourse.id;
    
  } catch (e) {
    Logger.log(`❌ فشل إنشاء الفصل: ${e}`);
    Logger.log('');
    Logger.log('🔧 تأكد من:');
    Logger.log('1. ✅ تفعيل Google Classroom API من Services');
    Logger.log('2. ✅ منح الأذونات المطلوبة عند الطلب');
    Logger.log('3. ✅ حسابك لديه صلاحيات إنشاء فصول (معلم، لا طالب)');
    Logger.log('4. ✅ حساب Google Classroom مرتبط وأنشأت فصولاً من قبل');
    Logger.log('');
    return null;
  }
}

/**
 * 2. إعداد محتويات الفصل الكاملة
 * @param {string} courseId معرّف الفصل
 * @param {object} config إعدادات المجموعة
 */
function setupClassroomContent(courseId, config) {
  Logger.log('');
  Logger.log('📝 بدء إضافة المحتويات للفصل...');
  Logger.log('-'.repeat(60));
  
  // 1. نشر رسالة الترحيب
  postWelcomeAnnouncement(courseId, config);
  
  // 2. نشر المادة التعليمية
  postCourseMaterial(courseId);
  
  // 3. إنشاء الموضوع (Topic)
  const topicId = createProjectTopic(courseId);
  
  // 4. إنشاء المهام الخمسة
  createAllAssignments(courseId, topicId, config);
  
  Logger.log('-'.repeat(60));
  Logger.log('✅ تم إضافة جميع المحتويات بنجاح!');
}

/**
 * 3. نشر رسالة الترحيب
 */
function postWelcomeAnnouncement(courseId, config) {
  try {
    Logger.log('📢 جاري نشر رسالة الترحيب...');
    
    // إنشاء رسالة ترحيب مخصصة حسب نوع المجموعة
    let welcomeText = buildWelcomeMessage(config);
    
    const announcement = {
      text: welcomeText
    };
    
    Classroom.Courses.Announcements.create(announcement, courseId);
    Logger.log('   ✅ تم نشر رسالة الترحيب');
    
  } catch (e) {
    Logger.log(`   ❌ فشل نشر رسالة الترحيب: ${e}`);
  }
}

/**
 * بناء رسالة الترحيب حسب نوع المجموعة
 */
function buildWelcomeMessage(config) {
  let text = `مرحباً بكم أعزائي الطلاب! 👋\n\n`;
  
  // العنوان حسب نوع المجموعة
  if (config.isCompetitive) {
    text += `أهلاً بكم في بيئة التعلم القائمة على حشد المصادر التنافسي`;
  } else {
    text += `أهلاً بكم في بيئة التعلم القائمة على حشد المصادر التعاوني`;
  }
  
  if (config.hasTimePressure) {
    text += ` مع جدول زمني محدد للعمل المكثف.\n\n`;
  } else {
    text += ` مع المرونة الزمنية الكاملة.\n\n`;
  }
  
  // خصائص بيئة التعلم
  text += `🎯 خصائص بيئتكم:\n`;
  
  if (config.isCompetitive) {
    text += `✅ عمل فردي: كل طالب مستقل تماماً في إنجاز مهامه\n`;
    text += `✅ تقييم فردي: التميز يُقاس بجهدك الشخصي وجودة عملك\n`;
  } else {
    text += `✅ عمل جماعي: العمل في مجموعات للتعاون والتفكير الجماعي\n`;
    text += `✅ تقييم جماعي: التميز يُقاس بجودة العمل الجماعي والفردي\n`;
    if (config.collaborationNote) {
      text += `✅ ${config.collaborationNote}\n`;
    }
  }
  
  // المرونة الزمنية أو الضغط الزمني
  if (config.hasTimePressure) {
    text += `⚡ جدول زمني محدد: لكل مهمة موعد نهائي ثابت يُعد جزءاً من التحدي\n`;
    text += `⏰ إدارة الوقت: تعلم كيفية إدارة وقتك بكفاءة تحت الضغط\n`;
    text += `🎯 تركيز عالي: الالتزام بالمواعيد يبني مهارات العمل الاحترافية\n`;
  } else {
    text += `✅ مرونة زمنية كاملة: أنت تختار متى تعمل على كل مهمة\n`;
    text += `✅ تركيز على الجودة والعمق: خذ وقتك للتفكير العميق والإبداع\n`;
  }
  
  // الإطار الزمني
  text += `\n⏰ الإطار الزمني:\n`;
  text += `المدة الإجمالية: ${Math.ceil(config.totalDays / 7)} أسابيع (${config.totalDays} يوماً)\n`;
  
  if (config.hasTimePressure) {
    text += `📅 اليوم 1 (البداية) -> جداول زمنية محددة لكل مهمة -> 📅 اليوم ${config.totalDays}، 11:59 مساءً (الموعد النهائي النهائي)\n\n`;
  } else {
    text += `📅 اليوم 1 (البداية) -> ${config.totalDays} أيام من العمل الحر -> 📅 اليوم ${config.totalDays}، 11:59 مساءً (الموعد النهائي الوحيد)\n\n`;
  }
  
  // القاعدة الذهبية
  text += `🔑 القاعدة الذهبية:\n`;
  
  if (config.hasTimePressure) {
    text += `✅ مواعيد نهائية لكل مهمة فرعية (M1, M2, M3, M4): كل مهمة لها جدولها الزمني\n`;
    text += `⏰ الموعد النهائي النهائي: تسليم الدليل الكامل في نهاية اليوم ${config.totalDays}\n`;
    text += `🎯 الالتزام ضروري: الفشل في موعد واحد يؤثر على الجدول بالكامل\n`;
    text += `💪 التحدي: العمل تحت الضغط الزمني لبناء مهارات القرن الحادي والعشرين\n`;
  } else {
    text += `❌ لا توجد مواعيد نهائية للمهام الفرعية (M1, M2, M3, M4)\n`;
    text += `✅ موعد نهائي واحد فقط: تسليم الدليل الكامل في نهاية اليوم ${config.totalDays}\n`;
    text += `✅ حرية كاملة: يمكنك إنجاز المهام بأي ترتيب وفي أي وقت خلال الـ ${config.totalDays} أيام\n`;
  }
  
  text += `\n📚 هيكل المشروع:\n`;
  text += `📖 المهمة الأولى (10 نقاط)\n`;
  text += `🔍 المهمة الثانية (20 نقطة)\n`;
  text += `🧠 المهمة الثالثة ⭐ (30 نقطة)\n`;
  text += `✏️ المهمة الرابعة (15 نقطة)\n`;
  text += `📑 المهمة الخامسة (20 نقطة)\n`;
  text += `🎁 نقاط إضافية (Bonus): 5 نقاط\n`;
  text += `───────────────────────\n`;
  text += `المجموع الكلي: 100 نقطة\n\n`;
  
  // توصيات زمنية
  if (config.hasTimePressure) {
    text += `📅 الجدول الزمني المحدد:\n`;
    text += `- المهمة 1: ينتهي يوم 3\n`;
    text += `- المهمة 2: ينتهي يوم 8\n`;
    text += `- المهمة 3: ينتهي يوم 14\n`;
    text += `- المهمة 4: ينتهي يوم 17\n`;
    text += `- المهمة 5: موعد نهائي نهائي يوم ${config.totalDays}\n\n`;
  } else {
    text += `💡 توصيات زمنية (اختيارية):\n`;
    text += `- الأسبوع الأول: المهمة 1 + 2\n`;
    text += `- الأسبوع الثاني: المهمة 3\n`;
    text += `- الأسبوع الثالث: المهمة 4 + 5\n\n`;
  }
  
  text += `📊 معايير التقييم (100 نقطة):\n`;
  if (config.isCompetitive) {
    text += `40% → عمق التحليل\n`;
    text += `30% → أصالة الأفكار\n`;
    text += `20% → جودة الصياغة\n`;
    text += `10% → الاكتمال\n`;
  } else {
    text += `30% → عمق التحليل والعمل الجماعي\n`;
    text += `25% → التعاون والتفاعل مع الفريق\n`;
    text += `25% → أصالة الأفكار\n`;
    text += `15% → جودة الصياغة\n`;
    text += `5% → الاكتمال\n`;
  }
  
  text += `\n🏆 نظام المكافآت والحوافز:\n`;
  text += `🥇 أفضل 3 أدلة → 15 نقطة إضافية\n`;
  text += `🌟 أفضل مثال لكل قضية (5 فائزين) → 5 نقاط لكل فائز\n\n`;
  
  text += `💬 الدعم المتاح لك:\n`;
  text += `🕐 ساعات مكتبية افتراضية: كل أربعاء من 7-8 مساءً\n`;
  text += `📝 نماذج وأمثلة: متاحة في قسم "الموارد"\n`;
  text += `❓ قسم الأسئلة الشائعة (FAQs): يُحدَّث أسبوعياً\n`;
  text += `💬 قسم التعليقات: الرد خلال 24 ساعة\n\n`;
  
  text += `بالتوفيق للجميع، وأتطلع لرؤية إبداعاتكم! ✨`;
  
  return text;
}

/**
 * 4. نشر المادة التعليمية
 */
function postCourseMaterial(courseId) {
  try {
    Logger.log('📖 جاري نشر المادة التعليمية...');
    
    const material = {
      title: '📚 المحتوى الدراسي: الأخلاق البيوطبية - المفاهيم والمعايير الأساسية',
      description: `عزيزي الطالب،
هذا المحتوى هو الأساس النظري لجميع المهام القادمة. يُرجى قراءته بعناية وتمعن.

📖 محتويات المادة:
1. مفهوم الأخلاق البيوطبية (Bioethics)
2. المعايير الأربعة للأخلاقيات الطبية الحديثة:
    ✅ مبدأ المنفعة (Beneficence)
    ⛔ مبدأ عدم إلحاق الأذى (Non-maleficence)
    🗣️ مبدأ احترام الاستقلالية (Autonomy)
    ⚖️ مبدأ العدالة (Justice)
3. خمس قضايا أخلاقية رئيسية:
    🫀 زراعة الأعضاء
    💊 الموت الرحيم (Euthanasia)
    🧠 موت الدماغ
    🔬 أخلاقيات البحث العلمي على البشر
    📝 الموافقة المستنيرة (Informed Consent)

📑 المرفقات:
(ملاحظة: يمكنك إضافة ملف PDF يدوياً لاحقاً: "كتاب الفلسفة والمنطق - الصف الأول الثانوي")

💡 نصائح للقراءة الفعالة:
✅ اقرأ بتأنٍّ
✅ دوّن ملاحظاتك
✅ ضع خطاً تحت المفاهيم
✅ فكر في أمثلة
✅ اطرح أسئلة

📌 ملاحظة هامة: هذا المحتوى سيكون مرجعك الأساسي في جميع المهام!`,
      state: 'PUBLISHED'
    };
    
    Classroom.Courses.CourseWorkMaterials.create(material, courseId);
    Logger.log('   ✅ تم نشر المادة التعليمية');
    
  } catch (e) {
    Logger.log(`   ❌ فشل نشر المادة التعليمية: ${e}`);
  }
}

/**
 * 5. إنشاء موضوع (Topic) للمشروع
 */
function createProjectTopic(courseId) {
  try {
    Logger.log('🏷️ جاري إنشاء الموضوع (Topic)...');
    
    const topic = {
      name: 'المشروع: بناء دليل شامل للأخلاق البيوطبية'
    };
    
    const createdTopic = Classroom.Courses.Topics.create(topic, courseId);
    Logger.log(`   ✅ تم إنشاء الموضوع: ${createdTopic.name}`);
    
    return createdTopic.topicId;
    
  } catch (e) {
    Logger.log(`   ❌ فشل إنشاء الموضوع: ${e}`);
    return null;
  }
}

/**
 * حساب المواعيد النهائية للمهام حسب نوع المجموعة
 */
function calculateDueDates(config) {
  const dates = {};
  
  if (config.hasTimePressure) {
    // المجموعات المقيدة: مواعيد نهائية محددة (متطابقة مع Gradebook)
    const baseDate = new Date(START_DATE);
    
    // المهمة 1: يوم 3
    const task1Date = new Date(baseDate);
    task1Date.setDate(baseDate.getDate() + 3);
    dates.task1 = {
      year: task1Date.getFullYear(),
      month: task1Date.getMonth() + 1,
      day: task1Date.getDate()
    };
    
    // المهمة 2: يوم 8
    const task2Date = new Date(baseDate);
    task2Date.setDate(baseDate.getDate() + 8);
    dates.task2 = {
      year: task2Date.getFullYear(),
      month: task2Date.getMonth() + 1,
      day: task2Date.getDate()
    };
    
    // المهمة 3: يوم 14
    const task3Date = new Date(baseDate);
    task3Date.setDate(baseDate.getDate() + 14);
    dates.task3 = {
      year: task3Date.getFullYear(),
      month: task3Date.getMonth() + 1,
      day: task3Date.getDate()
    };
    
    // المهمة 4: يوم 17
    const task4Date = new Date(baseDate);
    task4Date.setDate(baseDate.getDate() + 17);
    dates.task4 = {
      year: task4Date.getFullYear(),
      month: task4Date.getMonth() + 1,
      day: task4Date.getDate()
    };
    
    // المهمة 5: يوم 21 (النهائي)
    const task5Date = new Date(baseDate);
    task5Date.setDate(baseDate.getDate() + 21);
    dates.task5 = {
      year: task5Date.getFullYear(),
      month: task5Date.getMonth() + 1,
      day: task5Date.getDate()
    };
    
  } else {
    // المجموعات المفتوحة: فقط المهمة الخامسة لها موعد نهائي (متطابق مع Gradebook)
    const baseDate = new Date(START_DATE);
    const task5Date = new Date(baseDate);
    task5Date.setDate(baseDate.getDate() + config.totalDays);
    dates.task5 = {
      year: task5Date.getFullYear(),
      month: task5Date.getMonth() + 1,
      day: task5Date.getDate()
    };
    
    // المهام 1-4 بدون مواعيد
    dates.task1 = null;
    dates.task2 = null;
    dates.task3 = null;
    dates.task4 = null;
  }
  
  return dates;
}

/**
 * دوال بناء أوصاف المهام - فردية (تنافسي)
 */
function getTask1Individual(config) {
  let desc = `بعد قراءتك للمحتوى الدراسي، اكتب ملخصاً بأسلوبك الشخصي يُظهر فهمك العميق للمعايير الأربعة للأخلاقيات الطبية.

📝 المطلوب منك:
- نوع الملف: Word (.docx) أو Google Doc
- المحتوى: 4 فقرات (واحدة لكل معيار)
- طول كل فقرة: 80-100 كلمة
- الأسلوب: بأسلوبك الخاص (ليس نسخ ولصق!)

📋 ما يجب أن تتضمنه كل فقرة:
- ما المعيار؟ (تعريفك)
- لماذا هو مهم؟
- مثال بسيط يوضحه.

💡 مثال توضيحي:
"مبدأ المنفعة (Beneficence) يعني أن على الطبيب أن يفعل ما يحقق المصلحة والخير للمريض. فمثلاً، عندما يصف الطبيب دواءً معيناً، يجب أن يكون هدفه الأساسي هو تحسين صحة المريض وتخفيف معاناته..."

🎯 معايير التقييم (10 نقاط):
| المعيار | النقاط | الوصف |
|---------|--------|-------|
| **الفهم الصحيح** | 5 | هل فهم المعيار بدقة؟ |
| **الوضوح** | 3 | هل الشرح واضح ومباشر؟ |
| **الأسلوب الشخصي** | 2 | هل كتب بأسلوبه أم نسخ؟ |

📤 شكل التسليم:
- ملف Word (.docx) أو Google Doc
- اسم الملف: \`اسمك_Milestone1\`
- حجم الخط: 14
- نوع الخط: Simplified Arabic أو Arial

${config.hasTimePressure ? getTimeGuidanceText(1, 24, false) : '⏰ الموعد النهائي: مفتوح (بدون deadline محدد)\n\n💡 نصيحة: هذه المهمة بسيطة لكنها أساسية - خذ وقتك لفهم المعايير جيداً!'}`;
  return desc;
}

function getTask2Individual(config) {
  let desc = `ابحث عن 5 أمثلة واقعية معاصرة (مثال واحد لكل قضية أخلاقية) من الأحداث والقضايا الحديثة في مجال الطب والأخلاق البيوطبية.

🔎 المطلوب منك:
- نوع الملف: Word (.docx) أو Google Doc
- المحتوى: 5 أمثلة واقعية موثقة (مثال لكل قضية من القضايا الخمس).

📋 ما يجب أن يتضمنه كل مثال:
- وصف الحالة/المثال (50-70 كلمة)
- المصدر (رابط أو اسم المرجع)
- القضية الأخلاقية المرتبطة
- تاريخ الحدث (من آخر 5 سنوات: 2020-2025)

📌 القضايا الخمس:
1. زراعة الأعضاء
2. الموت الرحيم (Euthanasia)
3. موت الدماغ
4. أخلاقيات البحث العلمي على البشر
5. الموافقة المستنيرة (Informed Consent)

💡 مثال توضيحي:
"المثال الأول: زراعة الأعضاء

الوصف:
في عام 2023، أُجريت أول عملية زراعة قلب خنزير معدل وراثياً لمريض بشري في مستشفى ميريلاند الأمريكي.
المريض كان في حالة حرجة ولم يكن مؤهلاً لزراعة قلب بشري. العملية أثارت جدلاً أخلاقياً حول استخدام أعضاء
حيوانية معدلة جينياً للبشر، ومدى أمانها وقبولها أخلاقياً.

المصدر: https://www.bbc.com/arabic/science-and-tech-59940588
القضية: زراعة الأعضاء
التاريخ: يناير 2023"

⚠️ شروط الأمثلة:
- ✅ لم تُذكر في الكتاب المدرسي
- ✅ معاصرة
- ✅ موثقة

🔍 محركات بحث موصى بها:
- Google News (الأخبار الحديثة)
- BBC Arabic
- Al Jazeera
- Nature Arabic

🎯 معايير التقييم (20 نقطة):
| المعيار | النقاط | الوصف |
|---------|--------|-------|
| **أصالة الأمثلة** | 8 | أمثلة جديدة غير مكررة |
| **مناسبة القضية** | 6 | ارتباط واضح بالقضايا |
| **التوثيق** | 4 | مصادر موثوقة وواضحة |
| **التنوع** | 2 | تنوع في المصادر والسياقات |

${config.hasTimePressure ? getTimeGuidanceText(2, 48, false) : '⏰ الموعد النهائي: مفتوح\n\n💡 نصائح: استخدم Google News، ابحث بالإنجليزية أيضاً للنتائج الأكثر!'}`;
  return desc;
}

function getTask3Individual(config) {
  let desc = `هنا ستُظهر قدرتك على التفكير الأخلاقي النقدي وحل المشكلات المعقدة.

⭐ لماذا هذه المهمة هي الأهم؟
هنا ستُظهر قدرتك على التفكير الأخلاقي وحل المشكلات - المهارات الأساسية في هذا البحث!

الوصف:
اختر 3 أمثلة من المهمة الثانية وحللها تحليلاً أخلاقياً شاملاً ومتعمقاً باستخدام المعايير الأربعة.

📊 المطلوب منك:
- نوع الملف: Word (.docx) أو Google Doc
- المحتوى: 3 تحليلات أخلاقية متعمقة (طول كل تحليل: 200-250 كلمة)

🔍 هيكل كل تحليل (5 عناصر):
1️⃣ تحديد المشكلة الأخلاقية (50 كلمة)
   - ما المشكلة الأخلاقية في هذه الحالة؟
   - من الأطراف المعنية؟
   - ما الصراع الأخلاقي الأساسي؟

2️⃣ ربط بالمعايير الأخلاقية (80 كلمة)
   - حدد معيارين على الأقل من المعايير الأربعة
   - وضح كيف ينطبق كل معيار على الحالة
   - هل يوجد تعارض بين المعايير؟ وضح

3️⃣ فرض الفروض وتقييمها (50 كلمة)
   - ما الحلول الممكنة؟
   - ما إيجابيات وسلبيات كل حل؟

4️⃣ الوصول للحل الصحيح (40 كلمة)
   - ما الحل الأنسب أخلاقياً؟
   - لماذا هو الأفضل؟
   - كيف يحترم المعايير الأخلاقية؟

5️⃣ رأيك الشخصي المُبرر (30 كلمة)
   - ما موقفك من هذه القضية؟
   - ما الأساس الأخلاقي لموقفك؟

🎯 معايير التقييم (30 نقطة = 10 لكل تحليل):

| المعيار | ممتاز (9-10) | جيد جداً (7-8) | جيد (5-6) |
|---------|-------------|---------------|----------|
| **تحديد المشكلة** | واضح جداً ودقيق | واضح | عام، غير دقيق |
| **الربط بالمعايير** | 3-4 معايير بعمق | معياران بتفصيل | معيار واحد |
| **فرض الفروض** | عدة حلول + تقييم | حلان + تقييم | حل واحد |
| **الوصول للحل** | مبتكر ومبرر | منطقي ومبرر | حل عام |
| **الرأي الشخصي** | مبرر أخلاقياً | واضح | عام |

💡 نصائح للتميز:
- ✅ اقرأ المثال أكثر من مرة
- ✅ ارجع للمعايير في الكتاب
- ✅ فكر من زوايا متعددة
- ✅ استخدم لغة أكاديمية واضحة
- ✅ هذه المهمة تحتاج تفكيراً عميقاً

${config.hasTimePressure ? getTimeGuidanceText(3, 48, false) : '⏰ الموعد النهائي: مفتوح\n\n🆘 الدعم: نماذج تحليلات متاحة في قسم "نماذج" / ساعات المكتب للمناقشة'}`;
  return desc;
}

function getTask4Individual(config) {
  let desc = `راجع جميع المهام السابقة (المهمة 1، 2، 3) بعين ناقدة وحسّنها بناءً على ما تعلمته وتطور فهمك.

🔄 المطلوب منك:

1. مراجعة المهمة الأولى:
   - هل فهمي للمعايير دقيق؟
   - هل يمكن تحسين الصياغة؟
   - هل الأمثلة واضحة؟

2. مراجعة المهمة الثانية:
   - هل الأمثلة قوية؟
   - هل يمكن إيجاد أمثلة أفضل؟
   - هل التوثيق كامل؟

3. مراجعة المهمة الثالثة:
   - هل التحليل عميق بما فيه الكفاية؟
   - هل ربطت بالمعايير بشكل كافٍ؟
   - هل الحلول مبررة؟

4. كتابة تقرير مراجعة (200 كلمة):

📋 هيكل التقرير:
📌 ما راجعته:
- قائمة بالنقاط التي راجعتها

✨ التحسينات التي أجريتها:
- في المهمة 1: ...
- في المهمة 2: ...
- في المهمة 3: ...

📈 لماذا أصبح عملي أفضل:
- ما تعلمته من المراجعة
- كيف تطور تفكيري الأخلاقي

🎯 معايير التقييم (15 نقطة):
| المعيار | النقاط | الوصف |
|---------|--------|-------|
| **جودة التحسينات الفعلية** | 9 | هل تم تحسين العمل فعلياً؟ |
| **تقرير المراجعة** | 6 | هل التقرير واضح ومكتمل؟ |

${config.hasTimePressure ? getTimeGuidanceText(4, 24, false) : '⏰ الموعد النهائي: مفتوح'}

💡 أهمية هذه المهمة:
المراجعة الذاتية مهارة حيوية! تُظهر قدرتك على التعلم المستمر والتطوير الذاتي.`;
  return desc;
}

function getTask5Individual(config) {
  let desc = `اجمع كل عملك السابق في دليل واحد منظم ومتكامل ومُنسَّق يمثل منتجك النهائي.

📘 المطلوب منك:
دليل كامل شامل يجمع جميع المهام (بعد تحسينها) + مقدمة + خاتمة + فهرس.

📋 هيكل الدليل النهائي:

📗 دليل الأخلاق البيوطبية

├─ 📄 الغلاف
│  ├─ عنوان الدليل
│  ├─ اسمك الكامل
│  ├─ الصف والفصل
│  └─ التاريخ
│
├─ 📋 فهرس المحتويات (Table of Contents)
│  └─ أرقام الصفحات
│
├─ 📖 المقدمة (100 كلمة)
│  ├─ عن ماذا يدور الدليل؟
│  ├─ لماذا الأخلاق البيوطبية مهمة؟
│  └─ ماذا ستجد في هذا الدليل؟
│
├─ 📚 القسم الأول: المعايير الأربعة
│  └─ (من Milestone 1 بعد التحسين)
│
├─ 🔍 القسم الثاني: الأمثلة الواقعية
│  └─ (من Milestone 2 بعد التحسين)
│
├─ 🧠 القسم الثالث: التحليلات الأخلاقية
│  └─ (من Milestone 3 بعد التحسين)
│
├─ ✍️ القسم الرابع: رحلة التطوير
│  └─ (تقرير المراجعة من Milestone 4)
│
├─ 🎓 الخاتمة (150 كلمة)
│  ├─ ما تعلمته من هذا المشروع
│  ├─ كيف تطور تفكيري الأخلاقي
│  ├─ أهمية هذه المعرفة في حياتي
│  └─ تأملات شخصية
│
└─ 📚 المراجع والمصادر
  └─ قائمة بجميع المصادر المستخدمة

🎨 معايير التنسيق:
- ✅ غلاف احترافي
- ✅ فهرس محتويات مع أرقام صفحات
- ✅ عناوين واضحة ومرتبة (Heading 1, 2, 3)
- ✅ ترقيم صفحات
- ✅ خط موحد (Simplified Arabic حجم 14)
- ✅ مسافات مناسبة بين الفقرات
- ✅ هوامش: 2.5 سم من كل جانب

🎯 معايير التقييم (20 نقطة):
| المعيار | النقاط | الوصف |
|---------|--------|-------|
| **الاكتمال والشمولية** | 6 | هل يحتوي جميع الأجزاء؟ |
| **التنظيم والتنسيق** | 6 | هل الترتيب منطقي ومنسق؟ |
| **الجودة العامة** | 6 | هل يعكس جهداً حقيقياً؟ |
| **الإبداع** | 2 | لمسات إبداعية؟ |

📤 شكل التسليم:
- ملف PDF واحد (يُفضّل) أو Word
- اسم الملف: \`اسمك_الدليل_النهائي\`
- الحجم: 12-20 صفحة (تقريباً)

${config.hasTimePressure ? getTimeGuidanceText(5, 24, false) : '⏰ الموعد النهائي: مفتوح (يُفضّل خلال 4 أسابيع من البداية)'}

🏆 معايير الجودة الاستثنائية:
للحصول على درجة ممتازة، يجب أن يكون الدليل:
- ✅ متكامل وشامل
- ✅ منظم بشكل احترافي
- ✅ يُظهر تطوراً واضحاً في التفكير
- ✅ يحتوي تحليلات عميقة
- ✅ موثّق بدقة

💡 نصيحة نهائية:
هذا هو منتجك النهائي الذي يمثل شهراً كاملاً من العمل - اجعله يعكس أفضل ما لديك! 🌟`;
  return desc;
}

/**
 * دوال بناء أوصاف المهام - تعاونية
 */
function getTask1Collaborative(config) {
  let desc = `كفريق، اكتبوا ملخصاً مشتركاً للمعايير الأربعة في ملف Google Doc واحد.

👥 توزيع المهام:
- **الفريق 4 أعضاء:** كل عضو = معيار واحد
- **الفريق 5 أعضاء:** العضو 5 = المقدمة + الخاتمة + المراجعة

📝 المطلوب:
- ملف Google Doc مشترك (جمع جميع الأعضاء على التحرير)
- كل عضو يكتب فقرة عن معياره (80-100 كلمة)
- 4 فقرات إجمالاً

🔄 آلية العمل الجماعي:

**الخطوة 1: الاجتماع التمهيدي (30 دقيقة)**
- تعارف وتوزيع الأدوار
- توزيع المعايير على الأعضاء
- الاتفاق على موعد التسليم الداخلي

**الخطوة 2: العمل الفردي**
- كل عضو يكتب فقرة عن المعيار المُكلف به
- 80-100 كلمة

**الخطوة 3: التجميع في Google Doc واحد**
- المنسق ينشئ ملف Google Doc
- يمنح جميع الأعضاء صلاحية التحرير
- كل عضو يضيف جزءه

**الخطوة 4: اجتماع المراجعة (30 دقيقة)**
- قراءة العمل كاملاً
- التأكد من التناسق
- تحسين الصياغة

**الخطوة 5: المراجع يراجع + التسليم**
- المراجع يتأكد من الجودة
- المنسق يسلّم نيابة عن الجميع

📊 معايير التقييم (10 نقاط - موحدة للفريق):
| المعيار | النقاط | الوصف |
|---------|--------|-------|
| **الفهم الصحيح للمعايير** | 4 | هل فهمت المعايير بدقة؟ |
| **التناسق بين الأجزاء** | 3 | هل الأجزاء متناسقة؟ |
| **مساهمة جميع الأعضاء** | 2 | هل ساهم الجميع؟ |
| **الوضوح** | 1 | هل اللغة واضحة؟ |

📤 التسليم:
- رابط Google Doc (مع صلاحية المشاهدة)
- اسم الملف: \`اسم_الفريق_M1\`
- يسلمه المنسق فقط

${config.hasTimePressure ? getTimeGuidanceText(1, 36, true) : '⏰ الوقت المتاح: أسبوع (يُفضّل)'}`;
  return desc;
}

function getTask2Collaborative(config) {
  let desc = `كفريق، اجمعوا 10 أمثلة واقعية (مثالين لكل عضو).

📝 التوزيع:
**فريق من 5 أعضاء:**
- العضو 1: مثالين (مثلاً: زراعة أعضاء + موت رحيم)
- العضو 2: مثالين
- العضو 3: مثالين
- العضو 4: مثالين
- العضو 5: مثالين
───────────────────────────
المجموع: 10 أمثلة

🔄 آلية العمل:

**الخطوة 1: اجتماع توزيع المهام (20 دقيقة)**
- توزيع القضايا الخمس
- كل عضو مسؤول عن قضيتين
- الاتفاق على معايير الاختيار

**الخطوة 2: البحث الفردي**
- بحث مستقل عن مثالين
- توثيق دقيق

**الخطوة 3: اجتماع المشاركة (30 دقيقة)**
- كل عضو يعرض أمثلته
- الفريق يناقش ويختار الأفضل
- المنسق يدوّن القرارات

**الخطوة 4: التجميع في Google Doc**
- الباحث الرئيسي ينظم الأمثلة
- تأكد من عدم التكرار

**الخطوة 5: المراجعة الجماعية**
- التأكد من جودة التوثيق
- التأكد من التنوع

⚠️ شروط الأمثلة:
- ✅ لم تُذكر في الكتاب المدرسي
- ✅ معاصرة (2020-2025)
- ✅ موثقة
- ✅ واضحة الارتباط بالقضية الأخلاقية

📊 التقييم (20 نقطة - للفريق):
| المعيار | النقاط |
|---------|--------|
| أصالة الأمثلة | 8 |
| المناسبة | 6 |
| التوثيق | 4 |
| التنوع | 2 |

${config.hasTimePressure ? getTimeGuidanceText(2, 48, true) : '⏰ الوقت المتاح: أسبوع (يُفضّل)'}`;
  return desc;
}

function getTask3Collaborative(config) {
  let desc = `اختاروا 6 أمثلة من M2 وحللوها في عرض تقديمي جماعي (Google Slides).

📊 هيكل العرض التقديمي:

**Google Slides (9 شرائح)**

├─ Slide 1: الغلاف
│  └─ عنوان + اسم الفريق + أسماء الأعضاء
│
├─ Slide 2: مقدمة
│  └─ نظرة عامة على الأخلاق البيوطبية
│
├─ Slides 3-8: التحليلات (6 شرائح)
│  ├─ كل عضو مسؤول عن شريحة واحدة
│  └─ هيكل كل شريحة:
│      ├─ وصف المثال
│      ├─ المشكلة الأخلاقية
│      ├─ المعايير المتعلقة
│      ├─ التعارضات
│      └─ الحل المقترح
│
└─ Slide 9: الخاتمة الجماعية
  └─ ما تعلمه الفريق

🎨 معايير التصميم:
- تناسق في الألوان والخطوط
- استخدام صور وأيقونات مناسبة
- عدم الازدحام بالنصوص
- انسجام بين جميع الشرائح

🔄 آلية العمل:

**الأسبوع الأول:**
- اجتماع لاختيار الأمثلة الستة
- توزيع الأمثلة (كل عضو = مثال واحد)
- كل عضو يبدأ تحليل مثاله

**الأسبوع الثاني:**
- المصمم ينشئ قالب العرض الموحد
- كل عضو يضيف شريحته
- اجتماع للمراجعة الأولية

**الأسبوع الثالث:**
- المراجعة الجماعية الشاملة
- التأكد من التناسق
- إضافة اللمسات النهائية

📊 التقييم (30 نقطة - للفريق):
| المعيار | النقاط |
|---------|--------|
| عمق التحليلات | 12 |
| التناسق والتكامل | 9 |
| جودة التصميم | 6 |
| المشاركة المتوازنة | 3 |

${config.hasTimePressure ? getTimeGuidanceText(3, 60, true) : '⏰ الوقت المتاح: 3 أسابيع (يُفضّل)'}`;
  return desc;
}

function getTask4Collaborative(config) {
  let desc = `راجعوا جميع المهام السابقة (M1, M2, M3) كفريق.

🔄 المطلوب:
1. اجتماع مراجعة شامل (30 دقيقة)
2. مراجعة M1, M2, M3
3. تقرير مراجعة جماعي (200 كلمة)

📋 هيكل التقرير الجماعي:
- ما راجع الفريق
- التحسينات التي أجروها
- كيف تطور عمل الفريق

📊 التقييم (15 نقطة - للفريق):
| المعيار | النقاط |
|---------|--------|
| التحسينات | 10 |
| التقرير | 5 |

${config.hasTimePressure ? getTimeGuidanceText(4, 36, true) : '⏰ الوقت المتاح: أسبوع (يُفضّل)'}`;
  return desc;
}

function getTask5Collaborative(config) {
  let desc = `العرض التقديمي النهائي الكامل.

📘 المطلوب:
- عرض Google Slides كامل (15-20 شريحة)
- يجمع كل أعمال الفريق
- تصميم احترافي
- مقدمة وخاتمة قوية

📋 هيكل العرض:
1. الغلاف
2. المقدمة
3. القسم الأول: المعايير
4. القسم الثاني: الأمثلة
5. القسم الثالث: التحليلات
6. القسم الرابع: رحلة التطوير
7. الخاتمة الجماعية
8. المراجع

🎨 معايير التصميم:
- تصميم احترافي ومتناسق
- استخدام صور وأيقونات
- عدم الازدحام
- ألوان مناسبة

📊 التقييم (20 نقطة - للفريق):
| المعيار | النقاط |
|---------|--------|
| الاكتمال | 6 |
| التنسيق | 6 |
| الجودة | 6 |
| الإبداع | 2 |

${config.hasTimePressure ? getTimeGuidanceText(5, 24, true) : '⏰ الوقت المتاح: أسبوع (يُفضّل)'}`;
  return desc;
}

/**
 * دالة مساعدة: إضافة توجيهات زمنية للمهام المقيدة
 */
function getTimeGuidanceText(taskNum, hours, isTeam) {
  const teamNote = isTeam ? ' (كل فرد يعمل بالتوازي)' : '';
  const deadlineHour = 23;
  const deadlineMin = 59;
  const DUE_DAYS = [null, 3, 8, 14, 17, 21];
  const deadlineDay = DUE_DAYS[taskNum] || 21;
  
  return `
⏰⏰⏰ موعد نهائي صارم: اليوم ${deadlineDay} - الساعة ${deadlineHour}:${deadlineMin}

⏱️ الخطة الزمنية الموصى بها:
• الساعات 1-3: ${taskNum === 1 ? 'قراءة مركزة' : taskNum === 2 ? 'بحث مكثف' : taskNum === 3 ? 'تحليل متعمق' : taskNum === 4 ? 'مراجعة شاملة' : 'تجميع نهائي'}${teamNote}
• الساعات 4-8: كتابة المسودة
• الساعات 9-${hours - 2}: مراجعة وتحسين
• الساعة ${hours}: التسليم النهائي ⏰

⚡ استراتيجية السرعة:
✅ ابدأ فوراً (لا تنتظر!)
✅ اعمل بتركيز عالي
✅ راقب الساعة دائماً
✅ ${isTeam ? 'تواصلو باستمرار عبر WhatsApp' : 'لا تضيع الوقت في التنظيم'}

⚠️ سياسة التأخير:
• تأخير 0-6 ساعات: خصم 30%
• تأخير 6-24 ساعة: خصم 60%
• تأخير أكثر من 24 ساعة: صفر

🏆 مكافأة خاصة:
أول ${isTeam ? 'فريق' : '3 طلاب'} يسلم عملاً ممتازاً في الوقت المحدد = ${isTeam ? '25' : '20'} نقطة إضافية!`;
}

/**
 * 6. إنشاء جميع المهام (الواجبات)
 */
function createAllAssignments(courseId, topicId, config) {
  Logger.log('📝 جاري إنشاء المهام...');
  
  // حساب المواعيد النهائية حسب نوع المجموعة
  const dates = calculateDueDates(config);
  const finalDueTime = { hours: 23, minutes: 59 };
  
  // المهمة 1: حسب نوع المجموعة
  const task1Desc = config.isCompetitive 
    ? getTask1Individual(config)
    : getTask1Collaborative(config);
    
  createAssignment(courseId, topicId, {
    title: '📖 المهمة الأولى: ملخص للمعايير الأربعة',
    description: task1Desc,
    maxPoints: 10,
    dueDate: dates.task1,
    dueTime: dates.task1 ? finalDueTime : null
  });
  Utilities.sleep(2000);
  
  // المهمة 2: حسب نوع المجموعة
  const task2Desc = config.isCompetitive
    ? getTask2Individual(config)
    : getTask2Collaborative(config);
    
  createAssignment(courseId, topicId, {
    title: '🔍 المهمة الثانية: البحث عن أمثلة واقعية',
    description: task2Desc,
    maxPoints: 20,
    dueDate: dates.task2,
    dueTime: dates.task2 ? finalDueTime : null
  });
  Utilities.sleep(2000);
  
  // المهمة 3: حسب نوع المجموعة
  const task3Desc = config.isCompetitive
    ? getTask3Individual(config)
    : getTask3Collaborative(config);
    
  createAssignment(courseId, topicId, {
    title: '🧠 المهمة الثالثة: تحليل أخلاقي متعمق ⭐',
    description: task3Desc,
    maxPoints: 30,
    dueDate: dates.task3,
    dueTime: dates.task3 ? finalDueTime : null
  });
  Utilities.sleep(2000);
  
  // المهمة 4: حسب نوع المجموعة
  const task4Desc = config.isCompetitive
    ? getTask4Individual(config)
    : getTask4Collaborative(config);
    
  createAssignment(courseId, topicId, {
    title: '✏️ المهمة الرابعة: مراجعة ذاتية وتطوير',
    description: task4Desc,
    maxPoints: 15,
    dueDate: dates.task4,
    dueTime: dates.task4 ? finalDueTime : null
  });
  Utilities.sleep(2000);
  
  // المهمة 5: حسب نوع المجموعة
  const task5Desc = config.isCompetitive
    ? getTask5Individual(config)
    : getTask5Collaborative(config);
    
  createAssignment(courseId, topicId, {
    title: '📑 المهمة النهائية: الدليل الشامل',
    description: task5Desc,
    maxPoints: 20,
    dueDate: dates.task5,
    dueTime: dates.task5 ? finalDueTime : null
  });
  
  Logger.log('   ✅ تم إنشاء جميع المهام (5 مهام)');
}

/**
 * دالة مساعدة: إنشاء مهمة واحدة
 */
function createAssignment(courseId, topicId, assignmentData) {
  try {
    const assignment = {
      title: assignmentData.title,
      description: assignmentData.description,
      maxPoints: assignmentData.maxPoints,
      workType: 'ASSIGNMENT',
      state: 'PUBLISHED',
      topicId: topicId
    };
    
    // إضافة تاريخ التسليم إذا كان موجوداً
    if (assignmentData.dueDate) {
      assignment.dueDate = assignmentData.dueDate;
      assignment.dueTime = assignmentData.dueTime;
    }
    
    Classroom.Courses.CourseWork.create(assignment, courseId);
    Logger.log(`   ✅ تم إنشاء المهمة: "${assignmentData.title}" (${assignmentData.maxPoints} نقطة)`);
    
  } catch (e) {
    Logger.log(`   ❌ فشل إنشاء المهمة "${assignmentData.title}": ${e}`);
  }
}

/**
 * إنشاء جميع المجموعات الأربع دفعة واحدة
 */
function createAllGroups() {
  Logger.log('🚀 بدء إنشاء جميع المجموعات الأربع...');
  Logger.log('='.repeat(60));

  createGroup1();
  Logger.log('⏳ انتظار 5 ثواني قبل المجموعة التالية...');
  Utilities.sleep(5000);

  createGroup2();
  Logger.log('⏳ انتظار 5 ثواني قبل المجموعة التالية...');
  Utilities.sleep(5000);

  createGroup3();
  Logger.log('⏳ انتظار 5 ثواني قبل المجموعة التالية...');
  Utilities.sleep(5000);

  createGroup4();

  Logger.log('='.repeat(60));
  Logger.log('🎉 تم إنشاء جميع المجموعات الأربع بنجاح!');
}

/**
 * دالة مساعدة: عرض جميع الفصول الموجودة
 */
function listAllCourses() {
  try {
    Logger.log('🔍 جاري البحث عن جميع الفصول المتاحة...');
    
    const response = Classroom.Courses.list({
      pageSize: 100,
      courseStates: ['ACTIVE']
    });
    
    const courses = response.courses;
    
    if (!courses || courses.length === 0) {
      Logger.log('❌ لم يتم العثور على أي فصول دراسية.');
      return;
    }
    
    Logger.log(`✅ تم العثور على ${courses.length} فصل/فصول`);
    Logger.log('='.repeat(60));
    
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      Logger.log('');
      Logger.log(`📚 الفصل رقم ${i + 1}:`);
      Logger.log(`   الاسم: ${course.name}`);
      Logger.log(`   🆔 Course ID: ${course.id}`);
      Logger.log(`   🔗 الرابط: https://classroom.google.com/c/${course.id}`);
      Logger.log('-'.repeat(60));
    }
    
  } catch (e) {
    Logger.log(`❌ خطأ في عرض الفصول: ${e}`);
  }
}