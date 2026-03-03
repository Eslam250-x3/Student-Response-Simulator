// --- Global State and Configuration ---
const screens = [
    { id: 'loginScreen', name: 'تسجيل الدخول' },
    { id: 'splashScreen', name: 'البداية' },
    { id: 'preTestLinkScreen', name: 'الاختبار القبلي' },
    { id: 'objectivesScreen', name: 'الأهداف' },
    { id: 'groupSelectionScreen', name: 'اختيار المجموعة' }, // This will be skipped
    { id: 'guideScreen', name: 'دليل المجموعة التجريبية' },
    { id: 'contentScreen', name: 'المحتوى' },
    { id: 'lessonScreen', name: 'شرح الدرس' },
    { id: 'groupInfoScreen', name: 'الانضمام للمجموعة' },
    { id: 'referencesScreen', name: 'المراجع' }
];
// ===== Centralized State Management =====

// Centralized application state
const appState = {
    currentScreen: 0,
    userData: {
        studentName: null,
        group: null,
        groupType: null,
        timeType: null,
        combinedKey: null
    },
    lastActiveTime: null,
    currentClassroomLink: ''
};

// Legacy variable for backward compatibility (will be synced with appState)
let currentScreenIndex = 0;
let userSelections = {
    group: null,
    studentName: null,
    groupType: null,
    timeType: null,
    combinedKey: null
};

let currentClassroomLink = '';

// State persistence helpers
const STATE_STORAGE_KEY = 'app_session_v1';
const STATE_EXPIRY_HOURS = 24;

/**
 * Saves the current app state to localStorage
 */
function saveState() {
    try {
        appState.lastActiveTime = Date.now();
        const stateToSave = JSON.stringify(appState);
        localStorage.setItem(STATE_STORAGE_KEY, stateToSave);
        console.log('State saved successfully');
    } catch (error) {
        console.error('Error saving state to localStorage:', error);
    }
}

/**
 * Loads app state from localStorage if it exists and is not expired
 * @returns {Object|null} The loaded state object or null if not found/expired
 */
function loadState() {
    try {
        const savedState = localStorage.getItem(STATE_STORAGE_KEY);
        if (!savedState) {
            console.log('No saved state found');
            return null;
        }

        const parsedState = JSON.parse(savedState);

        // Check if state is expired (24 hours)
        if (parsedState.lastActiveTime) {
            const now = Date.now();
            const expiryTime = STATE_EXPIRY_HOURS * 60 * 60 * 1000; // 24 hours in milliseconds
            const timeDiff = now - parsedState.lastActiveTime;

            if (timeDiff > expiryTime) {
                console.log('Saved state has expired, clearing...');
                localStorage.removeItem(STATE_STORAGE_KEY);
                return null;
            }
        }

        console.log('State loaded successfully');
        return parsedState;
    } catch (error) {
        console.error('Error loading state from localStorage:', error);
        // Clear corrupted state
        localStorage.removeItem(STATE_STORAGE_KEY);
        return null;
    }
}

/**
 * Syncs appState with legacy variables for backward compatibility
 */
function syncLegacyVariables() {
    currentScreenIndex = appState.currentScreen;
    userSelections.group = appState.userData.group;
    userSelections.studentName = appState.userData.studentName;
    userSelections.groupType = appState.userData.groupType;
    userSelections.timeType = appState.userData.timeType;
    userSelections.combinedKey = appState.userData.combinedKey;
    currentClassroomLink = appState.currentClassroomLink;
}

/**
 * Restores state from saved data and updates UI
 */
function restoreState(savedState) {
    if (!savedState) return false;

    // Restore appState
    appState.currentScreen = savedState.currentScreen || 0;
    appState.userData = savedState.userData || {
        studentName: null,
        group: null,
        groupType: null,
        timeType: null,
        combinedKey: null
    };
    appState.currentClassroomLink = savedState.currentClassroomLink || '';

    // Sync with legacy variables
    syncLegacyVariables();

    // Restore UI elements
    if (appState.userData.studentName) {
        const welcomeTitle = document.getElementById('welcome-title');
        if (welcomeTitle) {
            welcomeTitle.innerHTML = `أهلاً بك مجدداً، <span class="gradient-text">${appState.userData.studentName}!</span>`;
        }
    }

    return true;
}

// --- Toast Notification System ---
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const iconMap = {
        success: 'checkmark-circle',
        error: 'close-circle',
        info: 'information-circle',
        warning: 'warning'
    };

    const colorMap = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6',
        warning: '#f59e0b'
    };

    toast.innerHTML = `
                <ion-icon name="${iconMap[type]}" style="font-size: 24px; color: ${colorMap[type]};"></ion-icon>
                <span style="flex: 1; color: #374151; font-weight: 500;">${message}</span>
            `;

    container.appendChild(toast);

    // Auto remove after duration
    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, duration);
}

// --- Confetti Animation ---
function celebrateSuccess() {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

    function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti(Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        }));
        confetti(Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        }));
    }, 250);
}

// --- Loading State Helper ---
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.classList.add('btn-loading');
        button.disabled = true;
    } else {
        button.classList.remove('btn-loading');
        button.disabled = false;
    }
}

// --- Student Data ---
let studentDatabase = [];

// Updated Classroom Data
const classroomData = {
    'competitive-open': {
        number: 'الأولى',
        name: 'تنافسي بدون ضغط زمني',
        link: 'https://classroom.google.com/c/ODIwMDY0OTU5ODIy?cjc=sclkhubr',
        code: 'sclkhubr'
    },
    'competitive-fixed': {
        number: 'الثانية',
        name: 'تنافسي مقيد',
        link: 'https://classroom.google.com/c/ODE2OTk3ODIzNDg2?cjc=zap2cudp',
        code: 'zap2cudp'
    },
    'collaborative-open': {
        number: 'الثالثة',
        name: 'تشاركي مفتوح',
        link: 'https://classroom.google.com/c/ODE2OTk3OTI5MDYz?cjc=6wasbi5g',
        code: '6wasbi5g'
    },
    'collaborative-fixed': {
        number: 'الرابعة',
        name: 'تشاركي مقيد',
        link: 'https://classroom.google.com/c/NzgxMjQ0MzEzNTc1?cjc=oststkcp',
        code: 'oststkcp'
    }
};

// Help Messages for each screen
const helpMessages = {
    'loginScreen': "أدخل اسم المستخدم وكلمة المرور للوصول إلى بيئة التعلم.",
    'splashScreen': "مرحباً بك! هذه الصفحة الرئيسية للتجربة. اقرأ المقدمة جيداً ثم اضغط 'ابدأ رحلة التعلم' للبدء.",
    'preTestLinkScreen': "أكمل الاختبار القبلي المدمج في الصفحة. إذا واجهت مشكلة، استخدم زر 'فتح في نافذة جديدة'.",
    'objectivesScreen': "تعرف على الأهداف التعليمية الخمسة للوحدة. اقرأها بعناية لتفهم ما هو متوقع منك.",
    'groupSelectionScreen': "اختر مجموعتك بعناية! كل مجموعة لها طريقة عمل مختلفة. اقرأ الوصف جيداً قبل الاختيار.",
    'guideScreen': "دليل سريع لاستخدام Google Classroom. تعرف على الأقسام الثلاثة الرئيسية للمنصة.",
    'contentScreen': "هنا ستجد المواد التعليمية والأنشطة الخاصة بالوحدة.",
    'referencesScreen': "مراجع مختارة للتعمق في موضوعات الوحدة. يمكنك الرجوع إليها لاحقاً.",
    'groupInfoScreen': "احفظ رمز الفصل الدراسي! ستحتاجه للانضمام إلى مجموعتك على Google Classroom."
};

// --- Guide Data ---
const guideData = {
    'competitive-open': {
        title: 'بيئة التعلم التنافسية المرنة',
        timeline: {
            duration: 21,
            points: [
                { day: 1, label: 'البداية', icon: 'flag' },
                { day: '1-7', label: 'الأسبوع الأول (مقترح)', description: 'قراءة المحتوى + المهمة 1 و 2', icon: 'book' },
                { day: '8-14', label: 'الأسبوع الثاني (مقترح)', description: 'المهمة 3 (التحليل الأخلاقي)', icon: 'bulb' },
                { day: '15-21', label: 'الأسبوع الثالث (مقترح)', description: 'المهمة 4 (المراجعة) + 5 (التسليم)', icon: 'checkbox' },
                { day: 21, label: 'الموعد النهائي الوحيد', icon: 'calendar' }
            ]
        },
        tasks: [
            {
                name: 'فهم المعايير الأربعة', points: 10, icon: 'reader', details: {
                    description: "كتابة ملخص واضح وموجز للمعايير الأخلاقية الأربعة الأساسية.",
                    requirements: ["4 فقرات (80-100 كلمة لكل معيار).", "يجب أن يكون الملخص بأسلوبك الشخصي.", "تسليم العمل في ملف Word أو Google Doc."],
                    evaluation: [{ item: "الفهم الصحيح والعميق للمعايير", points: 5 }, { item: "الوضوح والدقة في الصياغة", points: 3 }, { item: "الالتزام بعدد الكلمات", points: 2 }],
                    tips: ["اقرأ المحتوى جيداً قبل البدء.", "حاول استخدام أمثلة بسيطة لتوضيح فهمك.", "راجع عملك لغوياً قبل التسليم."]
                }
            },
            {
                name: 'جمع الأمثلة الواقعية', points: 20, icon: 'search', details: {
                    description: "جمع 5 أمثلة واقعية موثقة من مصادر موثوقة تتعلق بالقضايا الخمس المطروحة.",
                    requirements: ["5 أمثلة واقعية (مثال لكل قضية).", "يجب أن تكون الأمثلة من آخر 5 سنوات.", "توثيق دقيق لكل مصدر (APA)."],
                    evaluation: [{ item: "أصالة الأمثلة ومناسبتها", points: 8 }, { item: "التوثيق الدقيق للمصادر", points: 7 }, { item: "التنوع في المصادر", points: 5 }],
                    tips: ["استخدم محركات البحث الأكاديمية.", "ابحث في الأخبار والمجلات العلمية.", "لا تنسَ توثيق كل مصدر فوراً."]
                }
            },
            {
                name: 'التحليل الأخلاقي المتعمق', points: 30, icon: 'analytics', highlight: true, details: {
                    description: "اختيار 3 أمثلة من التي جمعتها وتحليلها بعمق باستخدام المعايير الأربعة.",
                    requirements: ["تحليل 3 أمثلة (200-250 كلمة لكل تحليل).", "يجب أن يتضمن التحليل العناصر الخمسة: تحديد المشكلة، المعايير، الحلول الممكنة، الحل الأنسب، رأيك الشخصي.", "يجب أن يكون التحليل متعمقاً ويعكس فهمك."],
                    evaluation: [{ item: "عمق التحليل وربطه بالمعايير", points: 25 }, { item: "وضوح ومنطقية الحجج", points: 5 }],
                    tips: ["لا تكتفِ بالوصف، بل حلل.", "كن موضوعياً في تحليلك.", "استخدم المعايير الأربعة كإطار للتحليل."]
                }
            },
            {
                name: 'المراجعة والتطوير الذاتي', points: 15, icon: 'create', details: {
                    description: "مراجعة المهام 1، 2، 3 وتحسينها بناءً على فهمك المتزايد للموضوع.",
                    requirements: ["مراجعة شاملة للمهام السابقة.", "إجراء تحسينات وتعديلات واضحة.", "كتابة تقرير موجز (200 كلمة) يوضح التحسينات التي قمت بها."],
                    evaluation: [{ item: "جودة التحسينات المضافة", points: 12 }, { item: "وضوح تقرير المراجعة", points: 3 }],
                    tips: ["اطلب من زميل مراجعة عملك.", "خذ استراحة قبل المراجعة لترى الأخطاء بشكل أوضح.", "ركز على تحسين عمق التحليل."]
                }
            },
            {
                name: 'التسليم النهائي الشامل', points: 20, icon: 'document-text', details: {
                    description: "تجميع كل المهام في دليل واحد متكامل ومنظم (10-15 صفحة).",
                    requirements: ["دليل متكامل يحتوي على جميع المهام.", "إضافة غلاف وفهرس ومقدمة وخاتمة ومراجع.", "تنسيق احترافي وواضح."],
                    evaluation: [{ item: "اكتمال الدليل وتناسقه", points: 8 }, { item: "جودة التنسيق والإخراج النهائي", points: 7 }, { item: "الجودة الشاملة للمحتوى", points: 5 }],
                    tips: ["استخدم قالبًا جاهزًا للتنسيق.", "تأكد من ترقيم الصفحات.", "دقق كل شيء مرة أخيرة قبل التسليم."]
                }
            },
            { name: 'نقاط إضافية', points: 5, icon: 'sparkles' }
        ],
        evaluation: [
            { criteria: 'عمق التحليل الأخلاقي', percentage: 40, color: 'purple' },
            { criteria: 'أصالة الأمثلة والأفكار', percentage: 30, color: 'blue' },
            { criteria: 'جودة الصياغة والعرض', percentage: 20, color: 'green' },
            { criteria: 'الاكتمال والشمولية', percentage: 10, color: 'amber' }
        ],
        goldenRule: 'موعد نهائي واحد فقط في نهاية اليوم 21. لك الحرية الكاملة في إنجاز المهام بأي ترتيب وفي أي وقت.',
        goldenTips: [
            { tip: 'ابدأ بقراءة المحتوى قبل أي شيء لبناء فهم صحيح', icon: 'book-outline' },
            { tip: 'حاول إنهاء المهام 1 و 2 في الأسبوع الأول لتحصل على دفعة معنوية', icon: 'rocket-outline' },
            { tip: 'خصص يوم كامل فقط لكتابة التحليل الأخلاقي لضمان عمق التحليل', icon: 'analytics-outline' },
            { tip: 'نظم ملفاتك من اليوم الأول لتسهيل عملية المراجعة والتجميع لاحقاً', icon: 'folder-outline' },
            { tip: 'لا تنس أن تخصص وقت للتنسيق النهائي قبل التسليم', icon: 'color-palette-outline' }
        ],
        support: [
            { channel: 'التواصل المتزامن', details: 'كل أربعاء من 7-8 مساءً', icon: 'videocam' },
            { channel: 'نماذج وأمثلة', details: 'متاحة لكل مهمة في قسم "الموارد"', icon: 'folder-open' },
            { channel: 'قسم الأسئلة الشائعة (FAQs)', details: 'يُحدَّث أسبوعياً', icon: 'help-circle' },
            { channel: 'التواصل الغير متزامن', details: 'اطرح أسئلتك في أي وقت (الرد خلال 24 ساعة)', icon: 'chatbubbles' }
        ]
    },
    'competitive-fixed': {
        title: 'تحدي حشد المصادر المُنظَّم',
        timeline: {
            duration: 21,
            points: [
                { day: 3, label: 'المهمة 1: فهم المعايير', icon: 'reader' },
                { day: 8, label: 'المهمة 2: جمع الأمثلة', icon: 'search' },
                { day: 14, label: 'المهمة 3: التحليل الأخلاقي', icon: 'analytics' },
                { day: 17, label: 'المهمة 4: المراجعة والتحسين', icon: 'create' },
                { day: 21, label: 'المهمة 5: الدليل النهائي', icon: 'document-text' }
            ]
        },
        tasks: [
            {
                name: 'فهم المعايير', points: 10, icon: 'reader', details: {
                    description: "كتابة ملخص للمعايير الأربعة. لديك 3 أيام فقط!",
                    requirements: ["4 فقرات (80-100 كلمة لكل معيار).", "الموعد النهائي: يوم 3، 11:59 م."],
                    evaluation: [{ item: "الفهم الصحيح", points: 5 }, { item: "الوضوح", points: 3 }, { item: "الالتزام بالموعد", points: 2 }],
                    tips: ["ابدأ فوراً ولا تؤجل!", "ضع خطة زمنية للأيام الثلاثة.", "سلم قبل الموعد بساعة على الأقل."]
                }
            },
            {
                name: 'جمع الأمثلة', points: 20, icon: 'search', details: {
                    description: "جمع 5 أمثلة واقعية. لديك 5 أيام لهذه المهمة.",
                    requirements: ["5 أمثلة واقعية من آخر 5 سنوات.", "الموعد النهائي: يوم 8، 11:59 م."],
                    evaluation: [{ item: "الأصالة", points: 8 }, { item: "المناسبة", points: 6 }, { item: "التوثيق", points: 4 }, { item: "الالتزام بالموعد", points: 2 }],
                    tips: ["استخدم محركات البحث الإخبارية للسرعة.", "وثّق مصادرك أثناء البحث."]
                }
            },
            {
                name: 'التحليل الأخلاقي', points: 30, icon: 'analytics', highlight: true, details: {
                    description: "تحليل 3 أمثلة بعمق. هذه المهمة الأهم وعليها 6 أيام.",
                    requirements: ["3 تحليلات متعمقة (200-250 كلمة لكل تحليل).", "الموعد النهائي: يوم 14، 11:59 م."],
                    evaluation: [{ item: "جودة التحليل", points: 24 }, { item: "الالتزام بالموعد", points: 6 }],
                    tips: ["وازن بين الجودة والسرعة.", "لا تتوقف كثيراً عند نقطة واحدة، استمر في الكتابة."]
                }
            },
            {
                name: 'المراجعة', points: 15, icon: 'create', details: {
                    description: "مراجعة وتحسين المهام السابقة خلال 3 أيام.",
                    requirements: ["مراجعة شاملة للمهام 1، 2، 3.", "كتابة تقرير مراجعة (200 كلمة).", "الموعد النهائي: يوم 17، 11:59 م."],
                    evaluation: [{ item: "جودة التحسينات", points: 11 }, { item: "التقرير", points: 2 }, { item: "الالتزام بالموعد", points: 2 }],
                    tips: ["ركز على تحسين أعمق نقطة ضعف في عملك."]
                }
            },
            {
                name: 'الدليل النهائي', points: 20, icon: 'document-text', details: {
                    description: "تجميع الدليل النهائي في 4 أيام. هذا هو الموعد النهائي الأخير!",
                    requirements: ["دليل كامل منظم (PDF يُفضَّل).", "يحتوي على جميع الأقسام.", "الموعد النهائي: يوم 21، 11:59 م."],
                    evaluation: [{ item: "الاكتمال", points: 6 }, { item: "التنسيق", points: 6 }, { item: "الجودة الشاملة", points: 6 }, { item: "الالتزام بالموعد", points: 2 }],
                    tips: ["لا تنتظر لآخر لحظة!", "خصص يوماً كاملاً للتنسيق والمراجعة النهائية."]
                }
            },
            { name: 'نقاط إضافية', points: 5, icon: 'sparkles' }
        ],
        evaluation: [
            { criteria: 'جودة المحتوى والتحليل', percentage: 40, color: 'purple' },
            { criteria: 'الالتزام الدقيق بالمواعيد', percentage: 30, color: 'red' },
            { criteria: 'الاكتمال والشمولية', percentage: 20, color: 'green' },
            { criteria: 'الأصالة والإبداع', percentage: 10, color: 'amber' }
        ],
        goldenRule: '5 مواعيد نهائية صارمة، واحد لكل مهمة. التأخير غير مقبول ويؤدي لخصم كبير. السرعة والجودة معاً هما التحدي الحقيقي!',
        goldenTips: [
            { tip: 'ابدأ فوراً ولا تؤجل أي مهمة لحظة واحدة', icon: 'flash-outline' },
            { tip: 'ضع خطة زمنية يومية لكل مهمة والتزم بها', icon: 'calendar-outline' },
            { tip: 'سلم كل مهمة قبل الموعد بساعة على الأقل', icon: 'time-outline' },
            { tip: 'ركز على الجودة لكن لا تضيع وقتاً كثيراً على التفاصيل', icon: 'speedometer-outline' },
            { tip: 'احتفظ بنسخة احتياطية من كل شيء لتجنب فقدان البيانات', icon: 'save-outline' }
        ],
        support: [
            { channel: 'التواصل المتزامن', details: 'كل أربعاء 7-8 مساءً', icon: 'videocam' },
            { channel: 'نماذج سريعة', details: 'أمثلة ونماذج لكل مهمة', icon: 'folder-open' },
            { channel: 'قسم FAQs', details: 'أسئلة شائعة محدثة', icon: 'help-circle' },
            { channel: 'التواصل الغير متزامن', details: 'رد سريع خلال 12 ساعة', icon: 'chatbubbles' }
        ]
    },
    'collaborative-open': {
        title: 'مجتمع التعلم التعاوني المرن',
        timeline: {
            duration: 21,
            points: [
                { day: 1, label: 'البداية وتوزيع الأدوار', icon: 'people' },
                { day: '1-7', label: 'الأسبوع الأول (مقترح)', description: 'الاجتماع الأول + المهمة 1 و 2', icon: 'book' },
                { day: '8-14', label: 'الأسبوع الثاني (مقترح)', description: 'المهمة 3 (التحليلات الجماعية)', icon: 'bulb' },
                { day: '15-21', label: 'الأسبوع الثالث (مقترح)', description: 'المهمة 4 (المراجعة) + 5 (العرض)', icon: 'checkbox' },
                { day: 21, label: 'الموعد النهائي الوحيد للفريق', icon: 'calendar' }
            ]
        },
        tasks: [
            {
                name: 'ملخص جماعي للمعايير', points: 10, icon: 'reader', details: {
                    description: "كفريق واحد، اكتبوا ملخصاً مشتركاً للمعايير الأربعة في ملف Google Doc واحد.",
                    requirements: ["كل عضو يكتب عن معيار واحد.", "استخدام Google Docs للكتابة المشتركة.", "يجب أن يظهر سجل التحرير مساهمة جميع الأعضاء."],
                    evaluation: [{ item: "الفهم الصحيح للمعايير", points: 4 }, { item: "التناسق بين الأجزاء", points: 3 }, { item: "مساهمة جميع الأعضاء", points: 2 }, { item: "الوضوح والصياغة", points: 1 }],
                    tips: ["اجتمعوا لتوزيع المهام أولاً.", "راجعوا عمل بعضكم البعض لضمان التناسق."]
                }
            },
            {
                name: 'مكتبة أمثلة جماعية', points: 20, icon: 'search', details: {
                    description: "كفريق، اجمعوا 10 أمثلة واقعية (مثالين لكل عضو تقريباً).",
                    requirements: ["10 أمثلة موثقة.", "كل عضو مسؤول عن مثالين على الأقل.", "تجميع الأمثلة في Google Doc واحد."],
                    evaluation: [{ item: "أصالة الأمثلة", points: 8 }, { item: "المناسبة للقضايا", points: 6 }, { item: "التوثيق الدقيق", points: 4 }, { item: "التنوع في المصادر", points: 2 }],
                    tips: ["وزعوا القضايا الخمس على أعضاء الفريق لتجنب التكرار.", "ناقشوا الأمثلة معاً لاختيار الأقوى."]
                }
            },
            {
                name: 'تحليلات جماعية', points: 30, icon: 'analytics', highlight: true, details: {
                    description: "اختاروا 6 أمثلة من المهمة الثانية وحللوها في عرض تقديمي جماعي (Google Slides).",
                    requirements: ["عرض تقديمي من 9 شرائح على الأقل.", "كل عضو مسؤول عن تحليل مثال واحد على الأقل.", "تصميم موحد وجذاب للعرض."],
                    evaluation: [{ item: "عمق التحليلات", points: 12 }, { item: "التناسق والتكامل", points: 9 }, { item: "جودة التصميم", points: 6 }, { item: "المشاركة المتوازنة", points: 3 }],
                    tips: ["ابدأوا بتصميم قالب موحد قبل أن يبدأ كل عضو بالعمل على شريحته.", "تدربوا على العرض معاً."]
                }
            },
            {
                name: 'مراجعة جماعية', points: 15, icon: 'create', details: {
                    description: "مراجعة جماعية لجميع المهام السابقة وكتابة تقرير يوضح التحسينات.",
                    requirements: ["عقد اجتماع مراجعة شامل.", "تنفيذ التحسينات المتفق عليها.", "كتابة تقرير مراجعة جماعي (200-250 كلمة)."],
                    evaluation: [{ item: "جودة التحسينات", points: 10 }, { item: "تقرير المراجعة", points: 5 }],
                    tips: ["كونوا صريحين في نقدكم البناء لعمل بعضكم البعض.", "وثقوا كل التغييرات في التقرير."]
                }
            },
            {
                name: 'العرض التقديمي النهائي', points: 20, icon: 'easel', details: {
                    description: "تجميع كل أعمال الفريق في عرض Google Slides نهائي وشامل (15-20 شريحة).",
                    requirements: ["عرض تقديمي شامل يجمع كل المهام.", "يحتوي على جميع الأقسام من الغلاف إلى المراجع.", "الموعد النهائي: يوم 21، 11:59 م."],
                    evaluation: [{ item: "الاكتمال والشمولية", points: 6 }, { item: "التنسيق والاحترافية", points: 6 }, { item: "الجودة الإجمالية", points: 6 }, { item: "الإبداع والتميز", points: 2 }],
                    tips: ["خصصوا الأدوار: شخص للتصميم، شخص للتدقيق اللغوي، إلخ.", "تأكدوا من أن العرض يحكي قصة متكاملة."]
                }
            },
            { name: 'نقاط إضافية', points: 5, icon: 'sparkles' }
        ],
        evaluation: [
            { criteria: 'التكامل والتناسق بين الأعضاء', percentage: 30, color: 'purple' },
            { criteria: 'جودة المحتوى والتحليل', percentage: 30, color: 'blue' },
            { criteria: 'المشاركة المتوازنة من الجميع', percentage: 20, color: 'green' },
            { criteria: 'الإبداع والابتكار والتميز', percentage: 20, color: 'amber' }
        ],
        goldenRule: 'موعد نهائي واحد فقط للفريق في نهاية اليوم 21. لديكم الحرية الكاملة لتنظيم عملكم كما تشاؤون. نجاحكم جماعي!',
        goldenTips: [
            { tip: 'اجتمعوا في اليوم الأول لتوزيع الأدوار بوضوح', icon: 'people-outline' },
            { tip: 'استخدموا Google Docs/Slides للعمل المشترك في الوقت الفعلي', icon: 'logo-google' },
            { tip: 'خصصوا وقتاً أسبوعياً لمراجعة تقدم الفريق', icon: 'chatbubbles-outline' },
            { tip: 'كونوا صريحين في توزيع المهام والمسؤوليات', icon: 'checkmark-done-outline' },
            { tip: 'احتفلوا بإنجازاتكم الجماعية لتعزيز روح الفريق', icon: 'trophy-outline' }
        ],
        support: [
            { channel: 'التواصل المتزامن', details: 'كل أربعاء 7-8 مساءً', icon: 'videocam' },
            { channel: 'أدوات تعاون (Google)', details: 'Docs, Slides, Sheets', icon: 'logo-google' },
            { channel: 'قسم الأسئلة الشائعة (FAQs)', details: 'يُحدَّث أسبوعياً', icon: 'help-circle' },
            { channel: 'التواصل الغير متزامن', details: 'للتواصل بين الفرق', icon: 'chatbubbles' }
        ]
    },
    'collaborative-fixed': {
        title: 'فرق حشد المصادر المُنظَّمة',
        timeline: {
            duration: 21,
            points: [
                { day: 4, label: 'المهمة 1: الملخص الجماعي', icon: 'reader' },
                { day: 9, label: 'المهمة 2: مكتبة الأمثلة', icon: 'search' },
                { day: 15, label: 'المهمة 3: التحليلات الجماعية', icon: 'analytics' },
                { day: 18, label: 'المهمة 4: المراجعة الجماعية', icon: 'create' },
                { day: 21, label: 'المهمة 5: العرض النهائي', icon: 'easel' }
            ]
        },
        tasks: [
            {
                name: 'ملخص جماعي للمعايير', points: 10, icon: 'reader', details: {
                    description: "كفريق، اكتبوا ملخصاً للمعايير. لديكم 4 أيام.",
                    requirements: ["توزيع سريع للمهام.", "موعد التسليم الداخلي: يوم 4، 6 مساءً.", "الموعد الرسمي: يوم 4، 11:59 م."],
                    evaluation: [{ item: "الفهم والجودة", points: 6 }, { item: "التناسق", points: 2 }, { item: "الالتزام بالموعد", points: 2 }],
                    tips: ["اجتمعوا في اليوم الأول فوراً لتوزيع المهام.", "استخدموا مجموعة WhatsApp للتنسيق السريع."]
                }
            },
            {
                name: 'مكتبة أمثلة جماعية', points: 20, icon: 'search', details: {
                    description: "جمع 10 أمثلة واقعية كفريق. لديكم 5 أيام.",
                    requirements: ["10 أمثلة موثقة.", "الموعد النهائي: يوم 9، 11:59 م."],
                    evaluation: [{ item: "الأصالة والمناسبة", points: 14 }, { item: "التوثيق", points: 4 }, { item: "الالتزام بالموعد", points: 2 }],
                    tips: ["حددوا موعداً داخلياً للتجميع قبل الموعد الرسمي بيوم."]
                }
            },
            {
                name: 'تحليلات جماعية', points: 30, icon: 'analytics', highlight: true, details: {
                    description: "تحليل 6 أمثلة في عرض تقديمي. هذه المهمة الأهم ولها 6 أيام.",
                    requirements: ["عرض تقديمي متكامل.", "الموعد النهائي: يوم 15، 11:59 م."],
                    evaluation: [{ item: "عمق التحليل", points: 18 }, { item: "التناسق", points: 6 }, { item: "التصميم", points: 3 }, { item: "الالتزام بالموعد", points: 3 }],
                    tips: ["ابدأوا في تصميم القالب الموحد من اليوم الأول لهذه المهمة.", "عقدوا اجتماع مراجعة في منتصف المدة."]
                }
            },
            {
                name: 'مراجعة جماعية', points: 15, icon: 'create', details: {
                    description: "مراجعة سريعة للمهام السابقة وتحسينها في 3 أيام.",
                    requirements: ["تنفيذ تحسينات واضحة.", "كتابة تقرير مراجعة.", "الموعد النهائي: يوم 18، 11:59 م."],
                    evaluation: [{ item: "جودة التحسينات", points: 11 }, { item: "التقرير", points: 2 }, { item: "الالتزام بالموعد", points: 2 }],
                    tips: ["ركزوا على المهمة التي حصلت على أقل درجة لتحسينها."]
                }
            },
            {
                name: 'العرض التقديمي النهائي', points: 20, icon: 'easel', details: {
                    description: "تجميع العرض النهائي في 3 أيام. المهمة الأخيرة!",
                    requirements: ["عرض شامل ومنسق.", "الموعد النهائي: يوم 21، 11:59 م."],
                    evaluation: [{ item: "الاكتمال", points: 6 }, { item: "التنسيق", points: 6 }, { item: "الجودة", points: 5 }, { item: "الالتزام بالموعد", points: 3 }],
                    tips: ["لا تنتظروا لآخر يوم!", "سلموا قبل الموعد الرسمي بساعات لتجنب أي مشاكل تقنية."]
                }
            },
            { name: 'نقاط إضافية', points: 5, icon: 'sparkles' }
        ],
        evaluation: [
            { criteria: 'جودة العمل الجماعي', percentage: 35, color: 'purple' },
            { criteria: 'الالتزام بالمواعيد النهائية', percentage: 30, color: 'red' },
            { criteria: 'التناسق والتكامل بين الأعضاء', percentage: 20, color: 'green' },
            { criteria: 'المشاركة المتوازنة', percentage: 15, color: 'amber' }
        ],
        goldenRule: '5 مواعيد نهائية صارمة للفريق. تأخير فرد واحد يؤثر على الفريق بأكمله. التعاون والانضباط والسرعة هم مفتاح النجاح!',
        goldenTips: [
            { tip: 'اجتمعوا فوراً في اليوم الأول لتوزيع المهام دون تأخير', icon: 'flash-outline' },
            { tip: 'حددوا مواعيد داخلية للفريق قبل المواعيد الرسمية', icon: 'time-outline' },
            { tip: 'استخدموا مجموعة WhatsApp للتواصل السريع', icon: 'chatbubble-ellipses-outline' },
            { tip: 'تأكدوا من أن كل عضو يعرف موعد تسليمه بالضبط', icon: 'notifications-outline' },
            { tip: 'كونوا متسامحين لكن منضبطين مع بعضكم البعض', icon: 'heart-outline' }
        ],
        support: [
            { channel: 'التواصل المتزامن', details: 'كل أربعاء 7-8 مساءً', icon: 'videocam' },
            { channel: 'نماذج سريعة للعمل الجماعي', details: 'قوالب جاهزة للاستخدام', icon: 'folder-open' },
            { channel: 'FAQs محدثة أسبوعياً', details: 'إجابات سريعة ومركزة', icon: 'help-circle' },
            { channel: 'التواصل الغير متزامن', details: 'رد سريع خلال 12 ساعة', icon: 'chatbubbles' }
        ]
    }
};

// ===== Objectives Data =====
const objectivesData = [
    {
        icon: 'search',
        color: 'blue',
        title: 'التفسير',
        description: 'تفسر مفهوم الأخلاق التطبيقية والبيوتيقية.'
    },
    {
        icon: 'git-branch',
        color: 'green',
        title: 'التمييز',
        description: 'تميز بين مجالات الأخلاق البيوطبية.'
    },
    {
        icon: 'bulb',
        color: 'yellow',
        title: 'التدليل',
        description: 'تدلل علي القضايا الفلسفية والأخلاقية الناجمة عن الثورة البيولوجية في مجال الطب.'
    },
    {
        icon: 'construct',
        color: 'purple',
        title: 'التطبيق',
        description: 'تطبق أخلاقيات البحث المتعلقة بالوراثة البشرية.'
    },
    {
        icon: 'filter',
        color: 'red',
        title: 'الاستخلاص',
        description: 'تستخلص معايير الأخلاقيات الطبية الحديثة.'
    }
];

/**
 * Renders the learning objectives cards dynamically
 */
function renderObjectives() {
    const container = document.getElementById('objectivesContainer');
    if (!container) return;

    const html = objectivesData.map(obj => `
                <div class="option-card glass-card p-6 border-r-4 border-${obj.color}-500">
                    <div class="flex items-center mb-4">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-${obj.color}-400 to-${obj.color}-600 flex items-center justify-center ml-3">
                            <ion-icon name="${obj.icon}" class="text-white text-2xl"></ion-icon>
                        </div>
                        <h3 class="text-xl font-bold text-gray-800">${obj.title}</h3>
                    </div>
                    <p class="text-lg text-gray-700 leading-relaxed">${obj.description}</p>
                </div>
            `).join('');

    container.innerHTML = html;
}

// ===== Accessibility: Focus Trap Utility =====

// Store the element that had focus before opening modal
let lastFocusedElement = null;

// Store active focus trap cleanup function
let activeFocusTrap = null;

/**
 * Gets all focusable elements within a container
 * @param {HTMLElement} container - The container element to search within
 * @returns {Array<HTMLElement>} Array of focusable elements
 */
function getFocusableElements(container) {
    const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors))
        .filter(el => {
            // Filter out elements that are not visible
            const style = window.getComputedStyle(el);
            return style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                !el.hasAttribute('aria-hidden');
        });
}

/**
 * Traps keyboard focus within a modal element
 * @param {HTMLElement} modalElement - The modal element to trap focus within
 * @returns {Function} Cleanup function to remove the focus trap
 */
function trapFocus(modalElement) {
    if (!modalElement) return () => { };

    const focusableElements = getFocusableElements(modalElement);

    if (focusableElements.length === 0) {
        console.warn('No focusable elements found in modal');
        return () => { };
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus the first element when modal opens
    setTimeout(() => {
        firstElement.focus();
    }, 100);

    /**
     * Handles Tab key navigation within the modal
     * @param {KeyboardEvent} e - The keyboard event
     */
    function handleTabKey(e) {
        if (e.key !== 'Tab') return;

        // If only one focusable element, keep focus on it
        if (focusableElements.length === 1) {
            e.preventDefault();
            firstElement.focus();
            return;
        }

        // Check if focus is on the first element
        if (document.activeElement === firstElement && e.shiftKey) {
            // Shift+Tab from first element: go to last
            e.preventDefault();
            lastElement.focus();
        }
        // Check if focus is on the last element
        else if (document.activeElement === lastElement && !e.shiftKey) {
            // Tab from last element: go to first
            e.preventDefault();
            firstElement.focus();
        }
    }

    // Add event listener
    modalElement.addEventListener('keydown', handleTabKey);

    // Return cleanup function
    return () => {
        modalElement.removeEventListener('keydown', handleTabKey);
    };
}

// --- Test Modal Logic ---
function openTestModal() {
    const modal = document.getElementById('testModal');

    // Store the element that triggered the modal
    lastFocusedElement = document.activeElement;

    modal.classList.add('active');

    // Set up focus trap
    if (activeFocusTrap) {
        activeFocusTrap(); // Clean up any existing trap
    }
    activeFocusTrap = trapFocus(modal);
}

function closeTestModal() {
    const modal = document.getElementById('testModal');
    modal.classList.remove('active');

    // Clean up focus trap
    if (activeFocusTrap) {
        activeFocusTrap();
        activeFocusTrap = null;
    }

    // Restore focus to the element that opened the modal
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        setTimeout(() => {
            lastFocusedElement.focus();
        }, 100);
    }
    lastFocusedElement = null;
}

// --- Login Logic ---
async function fetchStudentData() {
    const loginFieldset = document.getElementById('loginFieldset');
    const loginStatus = document.getElementById('loginStatus');
    try {
        const response = await fetch('data-base.csv');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        // Basic CSV parsing
        const rows = csvText.trim().split('\n').slice(1); // Skip header and trim whitespace
        studentDatabase = rows.map(row => {
            const columns = row.split(',');
            if (columns.length < 4) return null; // Ensure row has enough columns
            const [id, name, password, group] = columns;
            return {
                id: id.trim(),
                name: name.trim(),
                password: password.trim(),
                group: group.trim()
            };
        }).filter(s => s && s.id && s.name && s.password && s.group); // Filter out invalid/empty rows

        loginFieldset.disabled = false;
        loginStatus.textContent = 'يرجى إدخال اسم المستخدم وكلمة المرور.';
        loginStatus.className = 'text-green-600 text-sm h-5';

        // Hide loader
        document.getElementById('loader').style.opacity = '0';
        document.getElementById('loader').style.visibility = 'hidden';

    } catch (error) {
        console.error('Error fetching student data:', error);
        // Display an error to the user
        document.getElementById('loader').innerHTML = `
                    <ion-icon name="close-circle-outline" class="loader-icon" style="color: #f87171;"></ion-icon>
                    <p class="loader-text">خطأ في تحميل البيانات. يرجى تحديث الصفحة.</p>
                `;
    }
}

function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const loginStatus = document.getElementById('loginStatus');
    const loginButton = document.getElementById('loginButton');
    const loginButtonText = document.getElementById('loginButtonText');

    // --- Show loading state ---
    loginButton.disabled = true;
    loginButtonText.innerHTML = `
                <ion-icon name="refresh" class="animate-spin text-2xl"></ion-icon>
                <span class="mx-2">جارِ التحقق...</span>
            `;

    // Simulate network delay for UX
    setTimeout(() => {
        const student = studentDatabase.find(s => s.name === username && s.password === password);

        // --- Reset button state ---
        loginButton.disabled = false;
        loginButtonText.innerHTML = `
                    تسجيل الدخول
                    <ion-icon name="arrow-back" class="text-2xl group-hover:translate-x-[-5px] transition-transform"></ion-icon>
                `;

        if (student) {
            // Login successful
            loginStatus.className = 'text-green-600 text-sm h-5';
            loginStatus.textContent = 'تم تسجيل الدخول بنجاح!';

            // Update appState with user data
            appState.userData.group = student.group;
            appState.userData.studentName = student.name;

            // Sync with legacy variables
            userSelections.group = student.group;
            userSelections.studentName = student.name;

            // Show success toast and celebrate
            showToast(`مرحباً بك ${student.name}! 🎉`, 'success', 2500);
            celebrateSuccess();

            // Personalize welcome screen
            document.getElementById('welcome-title').innerHTML = `أهلاً بك مجدداً، <span class="gradient-text">${student.name}!</span>`;

            // Determine the group key from the student's group number
            const groupKeys = Object.keys(classroomData);
            const groupIndex = parseInt(student.group) - 1;

            if (groupIndex >= 0 && groupIndex < groupKeys.length) {
                const groupKey = groupKeys[groupIndex];
                appState.userData.combinedKey = groupKey;
                userSelections.combinedKey = groupKey; // Sync legacy variable

                // Save state after login
                saveState();

                // Proceed to the next screen (splash screen) after a short delay
                setTimeout(() => navigateNext(), 1000);

            } else {
                loginStatus.className = 'text-red-500 text-sm h-5';
                loginStatus.textContent = 'مجموعة الطالب غير صالحة.';
                showToast('مجموعة الطالب غير صالحة', 'error');
            }

        } else {
            // Login failed
            loginStatus.className = 'text-red-500 text-sm h-5';
            loginStatus.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة.';
            showToast('اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
        }
    }, 500); // 0.5 second delay
}


// --- Navigation Logic ---
function showScreen(index) {
    if (index < 0 || index >= screens.length) return;

    // Smooth transition
    const prevScreen = document.getElementById(screens[appState.currentScreen].id);
    if (prevScreen) {
        prevScreen.style.opacity = '0';
    }

    setTimeout(() => {
        // Update appState
        appState.currentScreen = index;
        currentScreenIndex = index; // Sync legacy variable

        screens.forEach((screen, i) => {
            const el = document.getElementById(screen.id);
            if (el) {
                el.classList.toggle('active', i === index);
                if (i === index) {
                    el.style.opacity = '1';
                    // Render dynamic content when screen becomes active
                    if (screen.id === 'objectivesScreen') {
                        renderObjectives();
                    }
                }
            }
        });
        updateNavigationControls();
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Persist state after navigation
        saveState();
    }, 200);
}

// Helper function to show screen by ID
function showScreenById(screenId) {
    const index = screens.findIndex(screen => screen.id === screenId);
    if (index !== -1) {
        // Render content based on screen type
        if (screenId === 'lessonScreen') {
            renderLessonContent();
        } else if (screenId === 'objectivesScreen') {
            renderObjectives();
        }
        showScreen(index);
    }
}

function navigateNext() {
    let nextIndex = appState.currentScreen + 1;

    // Skip group selection screen if a group is already assigned
    if (screens[nextIndex] && screens[nextIndex].id === 'groupSelectionScreen' && appState.userData.group) {
        nextIndex++;
    }

    // Render objectives if we are navigating to it
    if (screens[nextIndex] && screens[nextIndex].id === 'objectivesScreen') {
        renderObjectives();
    }

    // Render the guide if we are navigating to it
    if (screens[nextIndex] && screens[nextIndex].id === 'guideScreen') {
        renderGuide();
    }

    // Prepare group info screen if we are navigating to it
    if (screens[nextIndex] && screens[nextIndex].id === 'groupInfoScreen') {
        prepareGroupInfoScreen();
    }

    if (nextIndex < screens.length) {
        showScreen(nextIndex);

        // Show helpful toast on certain screens
        if (screens[nextIndex].id === 'objectivesScreen') {
            showToast('تعرف على الأهداف التعليمية للوحدة', 'info', 3000);
        } else if (screens[nextIndex].id === 'guideScreen') {
            showToast('تفقد دليل مجموعتك بعناية', 'info', 3000);
        } else if (screens[nextIndex].id === 'groupInfoScreen') {
            setTimeout(() => celebrateSuccess(), 300);
        }
    }
}

function navigatePrevious() {
    let prevIndex = appState.currentScreen - 1;

    // Skip group selection screen if a group is already assigned
    if (screens[prevIndex] && screens[prevIndex].id === 'groupSelectionScreen' && appState.userData.group) {
        prevIndex--;
    }

    // Render objectives if we are navigating to it
    if (screens[prevIndex] && screens[prevIndex].id === 'objectivesScreen') {
        renderObjectives();
    }

    if (prevIndex >= 0) {
        showScreen(prevIndex);
    }
}

function updateNavigationControls() {
    const navControls = document.getElementById('navigationControls');
    const helpBtn = document.getElementById('helpBtn');

    // Hide navigation and help on login screen
    if (appState.currentScreen === 0) {
        if (navControls) navControls.style.display = 'none';
        if (helpBtn) helpBtn.style.display = 'none';
    } else {
        if (navControls) navControls.style.display = 'flex';
        if (helpBtn) helpBtn.style.display = 'flex';
    }

    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtnLabel = document.getElementById('prevBtnLabel');
    const nextBtnLabel = document.getElementById('nextBtnLabel');
    const indicators = document.querySelectorAll('.nav-dot');

    // Calculate next screen index (accounting for groupSelectionScreen skip)
    let nextScreenIndex = appState.currentScreen + 1;
    if (screens[nextScreenIndex] && screens[nextScreenIndex].id === 'groupSelectionScreen' && appState.userData.group) {
        nextScreenIndex++;
    }

    // Calculate previous screen index (accounting for groupSelectionScreen skip)
    let prevScreenIndex = appState.currentScreen - 1;
    if (screens[prevScreenIndex] && screens[prevScreenIndex].id === 'groupSelectionScreen' && appState.userData.group) {
        prevScreenIndex--;
    }

    // Update button states
    if (prevBtn) {
        prevBtn.disabled = appState.currentScreen === 0;
        // Update previous button label
        if (prevBtnLabel) {
            if (prevScreenIndex >= 0 && screens[prevScreenIndex]) {
                prevBtnLabel.textContent = screens[prevScreenIndex].name;
            } else {
                prevBtnLabel.textContent = '';
            }
        }
    }

    if (nextBtn) {
        nextBtn.disabled = appState.currentScreen === screens.length - 1;
        // Update next button label
        if (nextBtnLabel) {
            if (nextScreenIndex < screens.length && screens[nextScreenIndex]) {
                nextBtnLabel.textContent = screens[nextScreenIndex].name;
            } else {
                nextBtnLabel.textContent = '';
            }
        }
    }

    indicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index === appState.currentScreen);
        indicator.classList.toggle('hidden', index >= screens.findIndex(s => s.id === 'groupInfoScreen'));
    });
}

function createNavIndicators() {
    const container = document.getElementById('nav-indicators');
    if (!container) return;
    container.innerHTML = screens.map((screen, index) =>
        `<div class="nav-dot" onclick="showScreen(${index})" title="${screen.name}"></div>`
    ).join('');
}

// --- Group Selection Logic ---
function selectGroup(selectionKey) {
    document.querySelectorAll('[data-groupkey]').forEach(card => card.classList.remove('selected'));
    const selectedCard = document.querySelector(`[data-groupkey="${selectionKey}"]`);
    selectedCard.classList.add('selected');

    const [groupType, timeType] = selectionKey.split('-');
    userSelections.groupType = groupType;
    userSelections.timeType = timeType;
    userSelections.combinedKey = selectionKey;

    document.getElementById('confirmGroupBtn').disabled = false;

    // Show feedback
    showToast('تم اختيار المجموعة بنجاح!', 'success', 2000);

    // Add a subtle shake effect
    selectedCard.style.animation = 'none';
    setTimeout(() => {
        selectedCard.style.animation = 'pulse 0.5s ease-in-out';
    }, 10);
}

function prepareGroupInfoScreen() {
    if (userSelections.combinedKey) {
        const groupInfo = classroomData[userSelections.combinedKey];

        if (groupInfo) {
            document.getElementById('groupNumber').textContent = groupInfo.number;
            document.getElementById('groupName').textContent = groupInfo.name;
            document.getElementById('groupCode').textContent = groupInfo.code;
            currentClassroomLink = groupInfo.link;
            return true;
        }
    }
    return false;
}

function confirmGroupSelection() {
    if (prepareGroupInfoScreen()) {
        showToast('جاري الانتقال إلى دليل المجموعة...', 'info', 2000);
        celebrateSuccess();
        setTimeout(() => navigateNext(), 500);
    } else {
        showToast('يرجى اختيار مجموعة أولاً', 'warning');
    }
}


function openClassroomLink() {
    if (currentClassroomLink) {
        showToast('جاري فتح Google Classroom...', 'info', 2000);
        setTimeout(() => {
            window.open(currentClassroomLink, '_blank');
            showToast('تم فتح الفصل الدراسي في نافذة جديدة', 'success');
        }, 500);
    } else {
        showToast('لم يتم تحديد رابط المجموعة', 'error');
    }
}

// Copy classroom code to clipboard
function copyClassroomCode() {
    const codeElement = document.getElementById('groupCode');
    const code = codeElement.textContent;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
            showToast('تم نسخ رمز الفصل! 📋', 'success', 2000);

            // Visual feedback
            codeElement.style.transform = 'scale(1.1)';
            codeElement.style.backgroundColor = '#10b981';
            codeElement.style.color = 'white';

            setTimeout(() => {
                codeElement.style.transform = 'scale(1)';
                codeElement.style.backgroundColor = '#f3f4f6';
                codeElement.style.color = '#1f2937';
            }, 300);
        }).catch(() => {
            showToast('فشل نسخ الرمز. حاول يدوياً', 'error');
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('تم نسخ رمز الفصل! 📋', 'success', 2000);
        } catch (err) {
            showToast('فشل نسخ الرمز. حاول يدوياً', 'error');
        }
        document.body.removeChild(textArea);
    }
}

// --- Help Modal Logic ---
function toggleHelpModal() {
    const modal = document.getElementById('helpModal');
    const msgText = document.getElementById('helpMessageText');
    const currentScreenId = screens[appState.currentScreen].id;
    const isOpening = !modal.classList.contains('active');

    const defaultMessage = "لا تتوفر إرشادات خاصة لهذه الشاشة، يمكنك التواصل مع المعلم إذا واجهت مشكلة.";

    if (helpMessages[currentScreenId]) {
        msgText.textContent = helpMessages[currentScreenId];
        msgText.classList.remove('text-gray-500');
        msgText.classList.add('text-gray-600');
    } else {
        msgText.textContent = defaultMessage;
        msgText.classList.remove('text-gray-600');
        msgText.classList.add('text-gray-500');
    }

    if (isOpening) {
        // Store the element that triggered the modal
        lastFocusedElement = document.activeElement;

        modal.classList.add('active');

        // Set up focus trap
        if (activeFocusTrap) {
            activeFocusTrap(); // Clean up any existing trap
        }
        activeFocusTrap = trapFocus(modal);
    } else {
        modal.classList.remove('active');

        // Clean up focus trap
        if (activeFocusTrap) {
            activeFocusTrap();
            activeFocusTrap = null;
        }

        // Restore focus to the element that opened the modal
        if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
            setTimeout(() => {
                lastFocusedElement.focus();
            }, 100);
        }
        lastFocusedElement = null;
    }
}

// --- Guide Rendering Logic ---
function renderGuide() {
    const container = document.getElementById('guideContent');
    const groupKey = userSelections.combinedKey;

    if (!groupKey || !guideData[groupKey]) {
        container.innerHTML = `<div class="text-center text-white">خطأ: لا يمكن تحميل دليل المجموعة.</div>`;
        return;
    }

    const data = guideData[groupKey];

    container.innerHTML = `
                <div class="space-y-12">
                     <!-- Page Header -->
                    <div class="text-center">
                        <ion-icon name="compass" class="text-8xl gradient-text icon-float mb-6"></ion-icon>
                        
                        <!-- Enhanced Title with Shape -->
                        <div class="relative inline-block mb-8">
                            <div class="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 rounded-3xl blur-xl opacity-50 animate-pulse"></div>
                            <div class="relative bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white px-10 py-6 rounded-3xl shadow-2xl border-4 border-white">
                                <div class="flex items-center justify-center gap-4">
                                    <ion-icon name="rocket" class="text-5xl"></ion-icon>
                                    <h1 class="text-3xl md:text-4xl font-black">${data.title}</h1>
                                    <ion-icon name="star" class="text-5xl"></ion-icon>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-6 max-w-3xl mx-auto shadow-2xl">
                            <div class="flex items-center justify-center gap-3 mb-3">
                                <ion-icon name="alert-circle" class="text-3xl text-amber-600"></ion-icon>
                                <span class="text-2xl font-bold text-amber-800">القاعدة الذهبية</span>
                                <ion-icon name="alert-circle" class="text-3xl text-amber-600"></ion-icon>
                            </div>
                            <p class="text-xl text-gray-800 font-bold leading-relaxed">${data.goldenRule}</p>
                        </div>
                    </div>

                    <!-- Next Step & Countdown Card -->
                    <div id="nextStepCard" class="bg-white border-4 border-red-400 p-8 rounded-2xl shadow-2xl" style="display: none;">
                        <div class="flex items-center justify-center gap-3 mb-4">
                            <ion-icon name="time" class="text-5xl text-red-600 animate-pulse"></ion-icon>
                            <h2 class="text-3xl font-bold text-gray-900">⏰ خطوتك التالية</h2>
                        </div>
                        <div class="text-center">
                            <p class="text-xl text-gray-800 font-semibold mb-2">مهمتك الحالية هي:</p>
                            <p class="text-2xl font-bold gradient-text mb-4">فهم المعايير الأربعة</p>
                            <div class="bg-gradient-to-r from-red-500 to-orange-500 rounded-xl p-4 shadow-lg">
                                <p class="text-white text-sm font-semibold mb-2">⏳ الوقت المتبقي:</p>
                                <div id="countdown" class="text-5xl font-bold text-white">
                                    <!-- Countdown will be inserted here -->
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <!-- Main Content Column -->
                        <div class="lg:col-span-2 space-y-12">
                            <!-- Timeline Section -->
                            <div class="bg-white rounded-2xl p-6 shadow-lg">
                                <div class="flex items-center justify-center gap-3 mb-8">
                                    <ion-icon name="calendar" class="text-4xl text-indigo-600"></ion-icon>
                                    <h2 class="text-3xl font-bold text-gray-900">الجدول الزمني للمشروع</h2>
                                </div>
                                <div class="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-center py-3 rounded-lg mb-6">
                                    <p class="text-2xl font-bold">${data.timeline.duration} يوماً</p>
                                </div>
                                <div class="relative">
                                    <div class="absolute left-1/2 h-full w-2 bg-gradient-to-b from-purple-400 via-indigo-400 to-blue-400 rounded-full -translate-x-1/2"></div>
                                    ${data.timeline.points.map((p, index) => `
                                        <div class="flex items-center mb-8 ${index % 2 === 0 ? 'flex-row-reverse' : ''}">
                                            <div class="w-1/2 px-4">
                                                <div class="bg-gradient-to-br from-${index % 2 === 0 ? 'purple' : 'blue'}-50 to-${index % 2 === 0 ? 'indigo' : 'cyan'}-50 border-2 border-${index % 2 === 0 ? 'purple' : 'blue'}-300 p-4 rounded-xl shadow-md hover:shadow-xl transition-all ${index % 2 === 0 ? 'text-right' : 'text-left'}">
                                                    <p class="font-bold text-xl text-gray-900 mb-1">${p.label}</p>
                                                    ${p.description ? `<p class="text-gray-700 font-medium text-base">${p.description}</p>` : ''}
                                                </div>
                                            </div>
                                            <div class="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-3xl z-10 mx-4 flex-shrink-0 shadow-lg border-4 border-white">
                                                <ion-icon name="${p.icon}"></ion-icon>
                                            </div>
                                            <div class="w-1/2 px-4">
                                                <div class="bg-gradient-to-br from-amber-100 to-yellow-100 border-2 border-amber-400 px-4 py-2 rounded-xl ${index % 2 !== 0 ? 'text-right' : 'text-left'}">
                                                    <p class="text-gray-900 font-bold text-lg">📅 اليوم ${p.day}</p>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            
                            <!-- Golden Tips Carousel -->
                            <div class="bg-white rounded-2xl p-6 shadow-lg">
                                <div class="flex items-center justify-center gap-3 mb-8">
                                    <ion-icon name="bulb" class="text-4xl text-yellow-500"></ion-icon>
                                    <h2 class="text-3xl font-bold text-gray-900">💡 إرشادات لحل المهمة</h2>
                                    <ion-icon name="bulb" class="text-4xl text-yellow-500"></ion-icon>
                                </div>
                                <div class="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-2xl p-8 shadow-inner">
                                    <div id="tipsCarousel" class="relative overflow-hidden rounded-xl">
                                        <div class="tips-slider flex transition-transform duration-500 ease-in-out" style="transform: translateX(0%)">
                                            ${data.goldenTips.map((tip, index) => `
                                                <div class="min-w-full px-4 carousel-slide">
                                                    <div class="bg-white border-2 border-amber-300 rounded-xl p-8 text-center shadow-md">
                                                        <div class="bg-gradient-to-br from-yellow-400 to-amber-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                                                            <ion-icon name="${tip.icon}" class="text-5xl text-white"></ion-icon>
                                                        </div>
                                                        <p class="text-2xl font-bold text-gray-900 leading-relaxed">${tip.tip}</p>
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                        <div class="flex justify-center gap-3 mt-6">
                                            ${data.goldenTips.map((_, index) => `
                                                <button onclick="showTip(${index})" aria-label="انتقل للنصيحة ${index + 1}" class="tip-indicator w-4 h-4 rounded-full ${index === 0 ? 'bg-yellow-500 scale-125' : 'bg-gray-400'} transition-all hover:scale-110 shadow-md"></button>
                                            `).join('')}
                                        </div>
                                        <button onclick="previousTip()" aria-label="النصيحة السابقة" class="absolute left-2 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white border-2 border-purple-400 text-purple-600 hover:bg-purple-600 hover:text-white hover:scale-110 transition-all shadow-lg flex items-center justify-center">
                                            <ion-icon name="chevron-forward" class="text-3xl"></ion-icon>
                                        </button>
                                        <button onclick="nextTip()" aria-label="النصيحة التالية" class="absolute right-2 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white border-2 border-purple-400 text-purple-600 hover:bg-purple-600 hover:text-white hover:scale-110 transition-all shadow-lg flex items-center justify-center">
                                            <ion-icon name="chevron-back" class="text-3xl"></ion-icon>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Tasks Section -->
                            <div class="bg-white rounded-2xl p-6 shadow-lg">
                                <div class="flex items-center justify-center gap-3 mb-8">
                                    <ion-icon name="list" class="text-4xl text-blue-600"></ion-icon>
                                    <h2 class="text-3xl font-bold text-gray-900">📋 هيكل المشروع والمهام</h2>
                                </div>
                                <div class="task-diagram-container">
                                     <div class="task-diagram">
                                        ${data.tasks.filter(t => t.details).map((t, index) => `
                                            <div class="task-node" id="task-${index}">
                                                <div class="task-icon">
                                                    <ion-icon name="${t.icon}-outline"></ion-icon>
                                                    <div class="task-points">${t.points}</div>
                                                </div>
                                                <div class="task-header" onclick="toggleTaskDetails(${index})">
                                                    <div class="task-title">
                                                       <h3>${t.name}</h3>
                                                       <p>انقر لعرض التفاصيل</p>
                                                    </div>
                                                    <ion-icon name="chevron-down-outline" class="expand-icon"></ion-icon>
                                                </div>
                                                <div class="task-details">
                                                    <div class="prose max-w-none">
                                                         <div class="bg-white rounded-lg p-4 mb-4 border-2 border-blue-200 shadow-sm">
                                                             <h4 class="font-bold text-xl mb-3 text-blue-700 flex items-center gap-2">
                                                                 <ion-icon name="information-circle" class="text-2xl"></ion-icon>
                                                                 وصف المهمة:
                                                             </h4>
                                                             <p class="text-gray-900 font-medium text-base leading-relaxed">${t.details.description || ''}</p>
                                                         </div>
                                                         
                                                         ${t.details.requirements ? `
                                                             <div class="bg-white rounded-lg p-4 mb-4 border-2 border-green-200 shadow-sm">
                                                                 <h4 class="font-bold text-xl mb-3 text-green-700 flex items-center gap-2">
                                                                     <ion-icon name="checkmark-done-circle" class="text-2xl"></ion-icon>
                                                                     المطلوب:
                                                                 </h4>
                                                                 <ul class="list-disc space-y-2 pr-5 text-gray-900 font-medium">
                                                                     ${t.details.requirements.map(req => `<li class="text-base">${req}</li>`).join('')}
                                                                 </ul>
                                                             </div>
                                                         ` : ''}
        
                                                         ${t.details.evaluation ? `
                                                             <div class="bg-white rounded-lg p-4 mb-4 border-2 border-purple-200 shadow-sm">
                                                                 <h4 class="font-bold text-xl mb-3 text-purple-700 flex items-center gap-2">
                                                                     <ion-icon name="star" class="text-2xl"></ion-icon>
                                                                     معايير التقييم:
                                                                 </h4>
                                                                 <ul class="list-none space-y-2">
                                                                     ${t.details.evaluation.map(ev => `
                                                                         <li class="flex justify-between items-center bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg border border-purple-200">
                                                                             <span class="text-gray-900 font-semibold">${ev.item}</span>
                                                                             <span class="font-bold bg-purple-600 text-white px-3 py-1 rounded-full text-sm shadow-md">${ev.points} نقطة</span>
                                                                         </li>
                                                                     `).join('')}
                                                                 </ul>
                                                             </div>
                                                         ` : ''}
        
                                                         ${t.details.tips ? `
                                                             <div class="bg-gradient-to-br from-amber-100 to-yellow-100 border-2 border-amber-400 p-4 rounded-lg shadow-md">
                                                                 <h4 class="font-bold text-xl mb-3 text-amber-800 flex items-center gap-2">
                                                                     <ion-icon name="bulb" class="text-2xl"></ion-icon>
                                                                     💡 إرشادات لحل المهمة:
                                                                 </h4>
                                                                 <ul class="list-disc space-y-2 pr-5 text-amber-900 font-semibold">
                                                                     ${t.details.tips.map(tip => `<li class="text-base">${tip}</li>`).join('')}
                                                                 </ul>
                                                             </div>
                                                         ` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        `).join('')}
                                     </div>
                                 </div>
                            </div>
                        </div>

                        <!-- Side Column -->
                        <div class="space-y-8">
                             <!-- Evaluation Section -->
                            <div class="bg-white rounded-2xl p-6 shadow-lg border-2 border-indigo-200">
                                <div class="flex items-center justify-center gap-2 mb-6">
                                    <ion-icon name="analytics" class="text-3xl text-indigo-600"></ion-icon>
                                    <h2 class="text-2xl font-bold text-gray-900">📊 معايير التقييم</h2>
                                </div>
                                <div class="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl">
                                    <div class="relative w-full h-64 md:h-auto">
                                        <canvas id="evaluationChart"></canvas>
                                    </div>
                                </div>
                            </div>

                             <!-- Team Roles Diagram (Collaborative Groups Only) -->
                            ${groupKey === 'collaborative-open' || groupKey === 'collaborative-fixed' ? `
                            <div class="bg-white rounded-2xl p-6 shadow-lg border-2 border-teal-200">
                                <div class="flex items-center justify-center gap-2 mb-6">
                                    <ion-icon name="people" class="text-3xl text-teal-600"></ion-icon>
                                    <h2 class="text-2xl font-bold text-gray-900">👥 أدوار الفريق</h2>
                                </div>
                                <div class="bg-gradient-to-br from-teal-50 to-cyan-50 p-4 rounded-xl mb-4">
                                    <div class="relative w-full h-64 md:h-auto">
                                        <canvas id="teamRolesChart"></canvas>
                                    </div>
                                </div>
                                <div class="space-y-2" id="teamRolesLegend"></div>
                            </div>
                            ` : ''}

                            <!-- Delay Policy Diagram (Fixed Groups Only) -->
                            ${groupKey === 'competitive-fixed' || groupKey === 'collaborative-fixed' ? `
                            <div class="bg-white rounded-2xl p-6 shadow-lg border-2 border-red-200">
                                <div class="flex items-center justify-center gap-2 mb-6">
                                    <ion-icon name="warning" class="text-3xl text-red-600"></ion-icon>
                                    <h2 class="text-2xl font-bold text-gray-900">⚠️ سياسة التأخير</h2>
                                </div>
                                <div class="bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-xl border-2 border-red-200">
                                    <div class="mb-6 text-center">
                                        <p class="text-gray-900 font-bold text-lg mb-4">مثال: مهام بقيمة 10 نقاط</p>
                                        <div class="relative h-12 bg-white rounded-full overflow-hidden border-4 border-gray-200 shadow-inner">
                                            <div class="absolute inset-0 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"></div>
                                            <div class="absolute inset-0 flex items-center justify-center text-white font-bold text-xl drop-shadow-lg">
                                                <ion-icon name="star" class="text-2xl"></ion-icon>
                                                <span class="mx-1">10</span>
                                                <ion-icon name="star" class="text-2xl"></ion-icon>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="space-y-3">
                                        <div class="flex items-center justify-between p-4 bg-gradient-to-r from-green-100 to-green-50 rounded-xl border-2 border-green-400 shadow-md">
                                            <div class="flex items-center gap-2">
                                                <ion-icon name="checkmark-circle" class="text-2xl text-green-600"></ion-icon>
                                                <span class="text-gray-900 font-bold">✅ في الموعد</span>
                                            </div>
                                            <span class="text-green-700 font-bold text-lg bg-green-200 px-3 py-1 rounded-full">10 نقاط</span>
                                        </div>
                                        <div class="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-100 to-yellow-50 rounded-xl border-2 border-yellow-400 shadow-md">
                                            <div class="flex items-center gap-2">
                                                <ion-icon name="time" class="text-2xl text-yellow-600"></ion-icon>
                                                <span class="text-gray-900 font-bold">⏱️ تأخير 6-24 ساعة</span>
                                            </div>
                                            <span class="text-yellow-700 font-bold text-lg bg-yellow-200 px-3 py-1 rounded-full">-10% (9)</span>
                                        </div>
                                        <div class="flex items-center justify-between p-4 bg-gradient-to-r from-orange-100 to-orange-50 rounded-xl border-2 border-orange-400 shadow-md">
                                            <div class="flex items-center gap-2">
                                                <ion-icon name="alert" class="text-2xl text-orange-600"></ion-icon>
                                                <span class="text-gray-900 font-bold">⚠️ تأخير 1-3 أيام</span>
                                            </div>
                                            <span class="text-orange-700 font-bold text-lg bg-orange-200 px-3 py-1 rounded-full">-30% (7)</span>
                                        </div>
                                        <div class="flex items-center justify-between p-4 bg-gradient-to-r from-red-100 to-red-50 rounded-xl border-2 border-red-400 shadow-md">
                                            <div class="flex items-center gap-2">
                                                <ion-icon name="close-circle" class="text-2xl text-red-600"></ion-icon>
                                                <span class="text-gray-900 font-bold">❌ أكثر من 3 أيام</span>
                                            </div>
                                            <span class="text-red-700 font-bold text-lg bg-red-200 px-3 py-1 rounded-full">-50% (5)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            ` : ''}

                             <!-- Rewards Section -->
                            <div class="bg-white rounded-2xl p-6 shadow-lg border-2 border-yellow-200">
                                <div class="flex items-center justify-center gap-2 mb-6">
                                    <ion-icon name="trophy" class="text-3xl text-yellow-500"></ion-icon>
                                    <h2 class="text-2xl font-bold text-gray-900">🏆 المكافآت والتميز</h2>
                                </div>
                                <div class="grid grid-cols-2 gap-4 text-center">
                                    <div class="bg-gradient-to-br from-yellow-50 to-amber-100 border-2 border-yellow-400 p-5 rounded-xl shadow-md hover:scale-105 transition-all">
                                        <div class="bg-gradient-to-br from-yellow-400 to-amber-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                                            <ion-icon name="ribbon" class="text-4xl text-white"></ion-icon>
                                        </div>
                                        <p class="font-bold text-gray-900 text-lg">🥇 الأوائل</p>
                                        <p class="text-sm text-amber-700 font-bold bg-amber-200 py-1 px-3 rounded-full mt-2 inline-block">+25 نقطة</p>
                                    </div>
                                    <div class="bg-gradient-to-br from-blue-50 to-cyan-100 border-2 border-blue-400 p-5 rounded-xl shadow-md hover:scale-105 transition-all">
                                        <div class="bg-gradient-to-br from-blue-400 to-cyan-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                                            <ion-icon name="flash" class="text-4xl text-white"></ion-icon>
                                        </div>
                                        <p class="font-bold text-gray-900 text-lg">⚡ الأسرع</p>
                                        <p class="text-sm text-blue-700 font-bold bg-blue-200 py-1 px-3 rounded-full mt-2 inline-block">+10 نقاط</p>
                                    </div>
                                     <div class="bg-gradient-to-br from-purple-50 to-pink-100 border-2 border-purple-400 p-5 rounded-xl shadow-md hover:scale-105 transition-all">
                                        <div class="bg-gradient-to-br from-purple-400 to-pink-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                                            <ion-icon name="sparkles" class="text-4xl text-white"></ion-icon>
                                        </div>
                                        <p class="font-bold text-gray-900 text-lg">✨ التعاون</p>
                                        <p class="text-sm text-purple-700 font-bold bg-purple-200 py-1 px-3 rounded-full mt-2 inline-block">+10 نقاط</p>
                                    </div>
                                     <div class="bg-gradient-to-br from-pink-50 to-rose-100 border-2 border-pink-400 p-5 rounded-xl shadow-md hover:scale-105 transition-all">
                                        <div class="bg-gradient-to-br from-pink-400 to-rose-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                                            <ion-icon name="color-palette" class="text-4xl text-white"></ion-icon>
                                        </div>
                                        <p class="font-bold text-gray-900 text-lg">🎨 الإبداع</p>
                                        <p class="text-sm text-pink-700 font-bold bg-pink-200 py-1 px-3 rounded-full mt-2 inline-block">+10 نقاط</p>
                                    </div>
                                </div>
                            </div>
                             <!-- Support Section -->
                            <div class="bg-white rounded-2xl p-6 shadow-lg border-2 border-green-200">
                                <div class="flex items-center justify-center gap-2 mb-6">
                                    <ion-icon name="help-buoy" class="text-3xl text-green-600"></ion-icon>
                                    <h2 class="text-2xl font-bold text-gray-900">📞 الدعم والمساعدة</h2>
                                </div>
                                <div class="space-y-3">
                                    ${data.support.map(s => `
                                        <div class="bg-gradient-to-r from-green-50 to-teal-50 border-2 border-green-300 p-4 rounded-xl shadow-md flex items-center gap-4 transition-all hover:shadow-xl hover:scale-105 hover:border-green-500">
                                             <div class="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-teal-600 flex items-center justify-center text-white text-2xl flex-shrink-0 shadow-lg">
                                                <ion-icon name="${s.icon}"></ion-icon>
                                            </div>
                                            <div>
                                                <h4 class="text-lg font-bold text-gray-900">${s.channel}</h4>
                                                <p class="text-gray-700 font-medium text-sm">${s.details}</p>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

    renderEvaluationChart(data.evaluation);
    startCountdown(groupKey, data.timeline.points);

    // Render team roles chart for collaborative groups
    if (groupKey === 'collaborative-open' || groupKey === 'collaborative-fixed') {
        renderTeamRolesChart();
    }
}

let countdownInterval;
function startCountdown(groupKey, timelinePoints) {
    const countdownContainer = document.getElementById('countdown');
    const nextStepCard = document.getElementById('nextStepCard');

    if (countdownInterval) {
        clearInterval(countdownInterval);
    }

    if (groupKey !== 'competitive-fixed' && groupKey !== 'collaborative-fixed') {
        nextStepCard.style.display = 'none';
        return;
    }

    nextStepCard.style.display = 'block';

    // Use the project start date from configuration
    // Fallback to current date if config not loaded yet
    let projectStartDate;
    if (!projectConfig || !projectConfig.projectStartDate) {
        console.warn('Project config not loaded, using current date as fallback');
        projectStartDate = new Date();
    } else {
        projectStartDate = new Date(projectConfig.projectStartDate);
    }

    const upcomingDeadline = timelinePoints.find(point => {
        const deadlineDate = new Date(projectStartDate);
        deadlineDate.setDate(projectStartDate.getDate() + parseInt(point.day));
        deadlineDate.setHours(23, 59, 59, 999); // End of the day
        return deadlineDate > new Date();
    });

    if (!upcomingDeadline) {
        countdownContainer.innerHTML = "انتهت جميع المواعيد!";
        return;
    }

    const targetDate = new Date(projectStartDate);
    targetDate.setDate(projectStartDate.getDate() + parseInt(upcomingDeadline.day));
    targetDate.setHours(23, 59, 59, 999);

    countdownInterval = setInterval(() => {
        const now = new Date().getTime();
        const distance = targetDate - now;

        if (distance < 0) {
            clearInterval(countdownInterval);
            countdownContainer.innerHTML = "انتهى الوقت!";
            // Maybe find the *next* deadline after this one expires
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        countdownContainer.innerHTML = `${days}ي ${hours}س ${minutes}د ${seconds}ث`;

    }, 1000);
}

function renderEvaluationChart(evaluationData) {
    const ctx = document.getElementById('evaluationChart').getContext('2d');

    const labels = evaluationData.map(e => e.criteria);
    const data = evaluationData.map(e => e.percentage);

    // Define a color palette
    const backgroundColors = [
        'rgba(139, 92, 246, 0.7)',  // purple-500
        'rgba(99, 102, 241, 0.7)',  // indigo-500
        'rgba(59, 130, 246, 0.7)',  // blue-500
        'rgba(236, 72, 153, 0.7)', // pink-500
        'rgba(245, 158, 11, 0.7)'   // amber-500
    ];
    const borderColors = [
        'rgba(139, 92, 246, 1)',
        'rgba(99, 102, 241, 1)',
        'rgba(59, 130, 246, 1)',
        'rgba(236, 72, 153, 1)',
        'rgba(245, 158, 11, 1)'
    ];


    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'معايير التقييم',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            family: 'Tajawal, sans-serif',
                            size: 14,
                        },
                        color: '#374151' // gray-700
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += context.parsed + '%';
                            }
                            return label;
                        }
                    },
                    bodyFont: {
                        family: 'Tajawal, sans-serif',
                        size: 14,
                    },
                    titleFont: {
                        family: 'Tajawal, sans-serif',
                        size: 16,
                    }
                }
            },
            cutout: '60%'
        }
    });
}

function renderTeamRolesChart() {
    const ctx = document.getElementById('teamRolesChart');
    if (!ctx) return;

    const ctx2d = ctx.getContext('2d');
    const legendContainer = document.getElementById('teamRolesLegend');

    const teamRoles = [
        { role: 'المنسق', description: 'تنسيق الاجتماعات وتوزيع المهام', color: 'rgb(139, 92, 246)' },
        { role: 'الباحث', description: 'جمع الأمثلة والمصادر الموثوقة', color: 'rgb(59, 130, 246)' },
        { role: 'المحلل', description: 'إجراء التحليلات الأخلاقية', color: 'rgb(236, 72, 153)' },
        { role: 'المصمم', description: 'تصميم العروض التقديمية', color: 'rgb(245, 158, 11)' }
    ];

    const labels = teamRoles.map(r => r.role);
    const data = [25, 25, 25, 25]; // Equal distribution for demo

    new Chart(ctx2d, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'أدوار الفريق',
                data: data,
                backgroundColor: teamRoles.map(r => r.color.replace('rgb', 'rgba').replace(')', ', 0.8)')),
                borderColor: teamRoles.map(r => r.color),
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function (context) {
                            const index = context.dataIndex;
                            return teamRoles[index].description;
                        }
                    },
                    bodyFont: {
                        family: 'Tajawal, sans-serif',
                        size: 12,
                    },
                    titleFont: {
                        family: 'Tajawal, sans-serif',
                        size: 14,
                        weight: 'bold'
                    }
                }
            },
            cutout: '60%'
        }
    });

    // Custom legend with descriptions
    if (legendContainer) {
        legendContainer.innerHTML = teamRoles.map(r => `
                    <div class="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-all">
                        <div class="w-4 h-4 rounded-full" style="background-color: ${r.color}"></div>
                        <div class="flex-1">
                            <p class="font-bold text-gray-800">${r.role}</p>
                            <p class="text-sm text-gray-600">${r.description}</p>
                        </div>
                    </div>
                `).join('');
    }
}

let currentTipIndex = 0;
function showTip(index) {
    currentTipIndex = index;
    const slider = document.querySelector('.tips-slider');
    const indicators = document.querySelectorAll('.tip-indicator');

    if (slider) {
        slider.style.transform = `translateX(-${index * 100}%)`;
    }

    indicators.forEach((indicator, i) => {
        if (i === index) {
            indicator.classList.add('bg-yellow-500');
            indicator.classList.remove('bg-gray-300');
        } else {
            indicator.classList.remove('bg-yellow-500');
            indicator.classList.add('bg-gray-300');
        }
    });
}

function nextTip() {
    const data = guideData[userSelections.combinedKey];
    if (!data) return;

    currentTipIndex = (currentTipIndex + 1) % data.goldenTips.length;
    showTip(currentTipIndex);
}

function previousTip() {
    const data = guideData[userSelections.combinedKey];
    if (!data) return;

    currentTipIndex = (currentTipIndex - 1 + data.goldenTips.length) % data.goldenTips.length;
    showTip(currentTipIndex);
}

function toggleTaskDetails(index) {
    const taskNode = document.getElementById(`task-${index}`);
    if (taskNode) {
        const isExpanded = taskNode.classList.contains('expanded');

        // Close all other tasks
        document.querySelectorAll('.task-node.expanded').forEach(node => {
            node.classList.remove('expanded');
        });

        // Toggle the clicked task
        if (!isExpanded) {
            taskNode.classList.add('expanded');
        }
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', function () {
    fetchStudentData(); // Load student data on startup
    fetchLessonData(); // Load lesson data on startup
    fetchProjectConfig(); // Load project configuration on startup

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Close test modal on overlay click
    document.getElementById('testModal').addEventListener('click', function (e) {
        if (e.target === this) {
            closeTestModal();
        }
    });

    createNavIndicators();
    showScreen(0);

    // Close modal on overlay click
    document.getElementById('helpModal').addEventListener('click', function (e) {
        if (e.target === this) {
            toggleHelpModal();
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', function (e) {
        if (e.target.tagName.toLowerCase() === 'textarea' || e.target.tagName.toLowerCase() === 'input') return;

        const modal = document.getElementById('helpModal');
        if (modal.classList.contains('active') && e.key === 'Escape') {
            toggleHelpModal();
            return;
        }

        const testModal = document.getElementById('testModal');
        if (testModal.classList.contains('active') && e.key === 'Escape') {
            closeTestModal();
            return;
        }

        if (!modal.classList.contains('active')) {
            if (e.key === 'ArrowLeft') {
                if (document.dir === 'rtl') navigateNext();
                else navigatePrevious();
            }
            if (e.key === 'ArrowRight') {
                if (document.dir === 'rtl') navigatePrevious();
                else navigateNext();
            }
        }
    });
});

// ===== Lesson Data and Rendering =====

// Global variable to hold lesson data after fetching
let lessonData = null;

// Global variable to hold project configuration
let projectConfig = null;

// Async function to fetch project configuration
async function fetchProjectConfig() {
    try {
        const response = await fetch('data-start.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        projectConfig = await response.json();
        console.log('Project configuration loaded successfully');
    } catch (error) {
        console.error('Error loading project configuration:', error);
        // Fallback to current date if config fails to load
        projectConfig = {
            projectStartDate: new Date().toISOString()
        };
        console.warn('Using current date as fallback project start date');
    }
}

// Async function to fetch lesson data from JSON file
async function fetchLessonData() {
    try {
        const response = await fetch('lessons.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        lessonData = await response.json();
        console.log('Lesson data loaded successfully');

        // Auto-render if lesson screen is currently active
        if (typeof currentScreenIndex !== 'undefined' &&
            typeof screens !== 'undefined' &&
            screens[currentScreenIndex] &&
            screens[currentScreenIndex].id === 'lessonScreen') {
            renderLessonContent();
        }
    } catch (error) {
        console.error('Error loading lesson data:', error);
        // Show user-friendly error message
        const container = document.getElementById('lessonContent');
        if (container) {
            container.innerHTML = `
                        <div class="text-center p-8">
                            <div class="text-red-600 text-xl mb-4">⚠️ خطأ في تحميل البيانات</div>
                            <p class="text-gray-700">حدث خطأ أثناء تحميل محتوى الدرس. يرجى تحديث الصفحة.</p>
                        </div>
                    `;
        }
    }
}

// Icons mapping for different sections
const iconMap = {
    'definitions': '📖',
    'fields': '🏥',
    'issues': '⚠️',
    'elements': '✅',
    'standards': '⭐'
};

// Function to render the lesson content
function renderLessonContent() {
    const container = document.getElementById('lessonContent');
    if (!container) return;

    // Check if lesson data is loaded
    if (!lessonData) {
        container.innerHTML = `
                    <div class="text-center p-8">
                        <div class="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
                        <div class="text-xl text-gray-700">جاري تحميل المحتوى...</div>
                    </div>
                `;
        return;
    }

    let html = '';

    // Title Banner
    html += `
                <div class="lesson-title-banner text-white text-center">
                    <div style="position: relative; z-index: 1;">
                        <div class="flex items-center justify-center gap-4 mb-4">
                            <ion-icon name="bulb" class="text-6xl"></ion-icon>
                        </div>
                        <h1 class="text-4xl md:text-5xl font-bold mb-3">${lessonData.lesson_title}</h1>
                        <div class="w-32 h-1 bg-white/50 mx-auto rounded-full"></div>
                    </div>
                </div>
            `;

    // Introduction Card
    html += `
                <div class="intro-card">
                    <div style="position: relative; z-index: 1;">
                        <div class="flex items-center gap-3 mb-4">
                            <ion-icon name="information-circle" class="text-4xl text-blue-600"></ion-icon>
                            <h2 id="section-intro" class="text-2xl font-bold text-gray-800">مقدمة</h2>
                        </div>
                        <p class="text-lg text-gray-700 leading-relaxed">${lessonData.introduction}</p>
                    </div>
                </div>
            `;

    // Render Sections
    lessonData.sections.forEach((section, index) => {
        html += `<div class="section-card">`;

        // Section Header
        const sectionId = `section-${index + 1}`;
        html += `
                    <div class="section-header">
                        <div class="section-number">${index + 1}</div>
                        <h2 id="${sectionId}" class="text-2xl md:text-3xl font-bold text-gray-800 flex-1">${section.section_title}</h2>
                    </div>
                `;

        // Section Introduction (if exists)
        if (section.introduction) {
            html += `
                        <div class="info-box mb-4">
                            <p class="text-lg leading-relaxed">${section.introduction}</p>
                        </div>
                    `;
        }

        // Relation to Philosophy (if exists)
        if (section.relation_to_philosophy) {
            html += `
                        <div class="highlight-box">
                            <h3 class="text-xl font-bold text-gray-800 mb-2">العلاقة بالفلسفة</h3>
                            <p class="text-gray-700 leading-relaxed">${section.relation_to_philosophy}</p>
                        </div>
                    `;
        }

        // Definitions
        if (section.definitions) {
            section.definitions.forEach(def => {
                html += `
                            <div class="definition-card">
                                <div style="position: relative; z-index: 1;">
                                    <span class="term-label">${def.term}</span>
                                    <p class="text-gray-800 text-lg leading-relaxed">${def.definition.replace(/\n/g, '<br>')}</p>
                                </div>
                            </div>
                        `;
            });
        }

        // Fields (Bioethics Areas)
        if (section.fields) {
            html += `
                        <div class="diagram-container">
                            <div class="diagram-title">🏥 المجالات الثلاثة للأخلاق البيوطبية</div>
                            <div class="connection-diagram">
                    `;

            section.fields.forEach((field, idx) => {
                const icons = ['🏥', '🔬', '⚖️'];
                html += `
                            <div class="connection-node">
                                <div>
                                    <div class="text-3xl mb-2">${icons[idx]}</div>
                                    <div class="font-bold">${field.field_name}</div>
                                </div>
                            </div>
                        `;
            });

            html += `
                            </div>
                        </div>
                    `;

            // Field Details
            section.fields.forEach((field, idx) => {
                const colors = [
                    'linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%)',
                    'linear-gradient(135deg, #81ecec 0%, #00b894 100%)',
                    'linear-gradient(135deg, #fdcb6e 0%, #e17055 100%)'
                ];
                const icons = ['🏥', '🔬', '⚖️'];

                html += `
                            <div class="field-card" style="background: ${colors[idx]};">
                                <div style="position: relative; z-index: 1;">
                                    <div class="field-icon">${icons[idx]}</div>
                                    <h3 class="text-2xl font-bold mb-3">${field.field_name}</h3>
                                    <p class="text-lg leading-relaxed opacity-95">${field.description.replace(/\n/g, '<br>')}</p>
                                </div>
                            </div>
                        `;
            });
        }

        // Issues (Organ Transplant Cases)
        if (section.issues) {
            section.issues.forEach((issue, idx) => {
                const colors = [
                    'linear-gradient(135deg, #fd79a8 0%, #e84393 100%)',
                    'linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%)',
                    'linear-gradient(135deg, #fab1a0 0%, #e17055 100%)',
                    'linear-gradient(135deg, #55efc4 0%, #00b894 100%)'
                ];

                html += `
                            <div class="issue-card" style="background: ${colors[idx % colors.length]};">
                                <div style="position: relative; z-index: 1;">
                                    <h3 class="text-2xl font-bold mb-3">⚠️ ${issue.issue_title}</h3>
                                    <p class="text-lg leading-relaxed opacity-95">${issue.content.replace(/\n/g, '<br>')}</p>
                                </div>
                            </div>
                        `;
            });
        }

        // Elements (Informed Consent)
        if (section.elements) {
            html += `
                        <div class="mb-4">
                            <h3 class="text-2xl font-bold text-center text-gray-800 mb-4">${section.elements_title}</h3>
                        </div>
                        <div class="elements-grid">
                    `;

            const elementIcons = ['📢', '🧠', '👤', '🤝', '✍️'];

            section.elements.forEach((element, idx) => {
                html += `
                            <div class="element-card">
                                <div class="element-icon">${elementIcons[idx]}</div>
                                <div class="element-name">${element.name}</div>
                                <p class="text-gray-600 leading-relaxed">${element.description.replace(/\n/g, '<br>')}</p>
                            </div>
                        `;
            });

            html += `</div>`;

            // Flowchart for Informed Consent
            html += `
                        <div class="diagram-container mt-6">
                            <div class="diagram-title">📋 عملية الموافقة المستنيرة</div>
                            <div class="flowchart">
                                <div class="flowchart-item">📢 الإفصاح</div>
                                <div class="flowchart-arrow">⬇️</div>
                                <div class="flowchart-item">🧠 الفهم</div>
                                <div class="flowchart-arrow">⬇️</div>
                                <div class="flowchart-item">👤 الأهلية</div>
                                <div class="flowchart-arrow">⬇️</div>
                                <div class="flowchart-item">🤝 الطواعية</div>
                                <div class="flowchart-arrow">⬇️</div>
                                <div class="flowchart-item" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">✍️ الموافقة النهائية</div>
                            </div>
                        </div>
                    `;
        }

        // Standards (Medical Ethics Standards)
        if (section.standards) {
            section.standards.forEach((standard, idx) => {
                const colors = [
                    'linear-gradient(135deg, #55efc4 0%, #00b894 100%)',
                    'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
                    'linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%)',
                    'linear-gradient(135deg, #fdcb6e 0%, #e17055 100%)'
                ];

                html += `
                            <div class="standard-card" style="background: ${colors[idx]};">
                                <div style="position: relative; z-index: 1;">
                                    <span class="standard-number">${standard.name}</span>
                                    <p class="text-lg leading-relaxed mb-3 opacity-95">${standard.description}</p>
                        `;

                if (standard.example) {
                    html += `
                                    <div class="bg-white/20 rounded-lg p-3 mt-3">
                                        <p class="text-base leading-relaxed">💡 <strong>مثال:</strong> ${standard.example}</p>
                                    </div>
                            `;
                }

                html += `
                                </div>
                            </div>
                        `;
            });

            // Diagram for Standards
            html += `
                        <div class="diagram-container">
                            <div class="diagram-title">⚖️ أركان الأخلاقيات الطبية الحديثة</div>
                            <div class="connection-diagram">
                                <div class="connection-node" style="background: linear-gradient(135deg, #55efc4 0%, #00b894 100%);">
                                    <div>
                                        <div class="text-3xl mb-2">✨</div>
                                        <div>المنفعة</div>
                                    </div>
                                </div>
                                <div class="connection-node" style="background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);">
                                    <div>
                                        <div class="text-3xl mb-2">🛡️</div>
                                        <div>عدم إلحاق الأذى</div>
                                    </div>
                                </div>
                                <div class="connection-node" style="background: linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%);">
                                    <div>
                                        <div class="text-3xl mb-2">🗽</div>
                                        <div>احترام الاستقلالية</div>
                                    </div>
                                </div>
                                <div class="connection-node" style="background: linear-gradient(135deg, #fdcb6e 0%, #e17055 100%);">
                                    <div>
                                        <div class="text-3xl mb-2">⚖️</div>
                                        <div>المساواة والعدل</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
        }

        html += `</div>`; // Close section-card
    });

    // Back Button
    html += `
                <div class="text-center mt-8">
                    <button onclick="showScreenById('contentScreen')" class="btn-primary inline-flex items-center gap-3 group">
                        <ion-icon name="arrow-forward" class="text-2xl group-hover:translate-x-2 transition-transform"></ion-icon>
                        <span>العودة للمحتوى</span>
                    </button>
                </div>
            `;

    container.innerHTML = html;

    // Generate Table of Contents after content is rendered
    setTimeout(() => {
        generateToC();
    }, 100);
}

/**
 * Generates and renders the Table of Contents for lesson content
 */
function generateToC() {
    const container = document.getElementById('lessonContent');
    if (!container) return;

    // Find all h2 elements in the lesson content
    const headings = container.querySelectorAll('h2');
    if (headings.length === 0) return;

    // Create ToC data structure
    const tocItems = [];
    headings.forEach((heading, index) => {
        // Ensure heading has an ID
        if (!heading.id) {
            heading.id = heading.textContent.trim().replace(/\s+/g, '-').toLowerCase() || `section-${index}`;
        }

        tocItems.push({
            id: heading.id,
            text: heading.textContent.trim(),
            element: heading
        });
    });

    if (tocItems.length === 0) return;

    // Generate ToC HTML
    const tocHTML = `
                <!-- Mobile ToC Toggle Button -->
                <button id="tocMobileToggle" 
                        class="md:hidden fixed top-20 left-4 z-50 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                        onclick="toggleMobileToC()"
                        aria-label="قائمة المحتويات">
                    <ion-icon name="list" class="text-xl"></ion-icon>
                    <span>القائمة</span>
                </button>
                
                <!-- Mobile ToC Panel -->
                <div id="tocMobilePanel" 
                     class="md:hidden fixed top-32 left-4 right-4 bg-white rounded-2xl shadow-2xl p-6 z-40 max-h-[70vh] overflow-y-auto transform translate-x-[-120%] transition-transform duration-300">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-xl font-bold text-gray-800">قائمة المحتويات</h3>
                        <button onclick="toggleMobileToC()" class="text-gray-500 hover:text-gray-700">
                            <ion-icon name="close" class="text-2xl"></ion-icon>
                        </button>
                    </div>
                    <nav class="space-y-2">
                        ${tocItems.map(item => `
                            <a href="#${item.id}" 
                               onclick="toggleMobileToC(); return true;"
                               class="toc-link block px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors text-gray-700 hover:text-purple-600"
                               data-target="${item.id}">
                                ${item.text}
                            </a>
                        `).join('')}
                    </nav>
                </div>
                
                <!-- Desktop Sticky ToC Sidebar -->
                <aside id="tocDesktop" 
                       class="hidden md:block fixed top-20 right-4 w-64 max-h-[calc(100vh-6rem)] overflow-y-auto z-30">
                    <div class="bg-white rounded-2xl shadow-xl p-6 border-2 border-purple-100">
                        <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <ion-icon name="list" class="text-purple-600"></ion-icon>
                            قائمة المحتويات
                        </h3>
                        <nav class="space-y-1">
                            ${tocItems.map(item => `
                                <a href="#${item.id}" 
                                   class="toc-link block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-all border-r-2 border-transparent hover:border-purple-500"
                                   data-target="${item.id}">
                                    ${item.text}
                                </a>
                            `).join('')}
                        </nav>
                    </div>
                </aside>
            `;

    // Insert ToC at the beginning of lesson content
    container.insertAdjacentHTML('afterbegin', tocHTML);

    // Initialize IntersectionObserver for active state
    initToCObserver(tocItems);
}

/**
 * Toggles mobile ToC panel visibility
 */
function toggleMobileToC() {
    const panel = document.getElementById('tocMobilePanel');
    if (panel) {
        panel.classList.toggle('translate-x-[-120%]');
    }
}

/**
 * Initializes IntersectionObserver to highlight active ToC links
 */
function initToCObserver(tocItems) {
    if (!window.IntersectionObserver) {
        console.warn('IntersectionObserver not supported');
        return;
    }

    const observerOptions = {
        root: null,
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const targetId = entry.target.id;
            const tocLinks = document.querySelectorAll(`.toc-link[data-target="${targetId}"]`);

            tocLinks.forEach(link => {
                if (entry.isIntersecting) {
                    link.classList.add('active', 'bg-purple-100', 'text-purple-700', 'border-purple-500', 'font-semibold');
                    link.classList.remove('text-gray-700', 'hover:text-purple-600');
                } else {
                    link.classList.remove('active', 'bg-purple-100', 'text-purple-700', 'border-purple-500', 'font-semibold');
                    link.classList.add('text-gray-700');
                }
            });
        });
    }, observerOptions);

    // Observe all heading elements
    tocItems.forEach(item => {
        if (item.element) {
            observer.observe(item.element);
        }
    });
}
