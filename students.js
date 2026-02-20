// ════════════════════════════════════════════════════════════════
//  👩‍🎓 students.gs - بيانات الطالبات (80 طالبة - 4 مجموعات)
//  💡 الأفضل: خزّن البيانات في Google Sheet بدل الكود
//     شغّل exportStudentsToSheet() لنقلها تلقائياً
//     ثم ضع الـ Sheet ID في Script Properties بمفتاح STUDENTS_SHEET_ID
// ════════════════════════════════════════════════════════════════

/**
 * تحميل بيانات الطالبات (من Sheet أو من البيانات الافتراضية)
 * @returns {Object[]} قائمة الطالبات
 */
function getStudents() {
  // محاولة القراءة من Google Sheet (أفضل للخصوصية)
  const sheetId = PropertiesService.getScriptProperties().getProperty('STUDENTS_SHEET_ID');
  if (sheetId) {
    try {
      return loadStudentsFromSheet(sheetId);
    } catch (e) {
      Logger.log("⚠️ فشل تحميل الطالبات من Sheet (" + e.message + ") — استخدام البيانات الافتراضية");
    }
  }
  return getDefaultStudents();
}

/**
 * تحميل الطالبات من Google Sheet
 * الشيت لازم يكون فيه أعمدة: ID, Name, Email, Group (الصف الأول header)
 * @param {string} sheetId - معرف الشيت
 * @returns {Object[]}
 */
function loadStudentsFromSheet(sheetId) {
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheetByName("Students") || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) throw new Error("الشيت فارغ أو لا يحتوي على بيانات");

  // تحديد أعمدة من الرأس
  const header = data[0].map(function (h) { return String(h).trim().toLowerCase(); });
  const idCol = Math.max(header.indexOf("id"), 0);
  const nameCol = Math.max(header.indexOf("name"), 1);
  const emailCol = Math.max(header.indexOf("email"), 2);
  const groupCol = Math.max(header.indexOf("group"), 3);

  const students = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[idCol]) continue; // تخطي الصفوف الفارغة
    students.push({
      id: String(row[idCol]).trim(),
      name: String(row[nameCol]).trim(),
      email: String(row[emailCol]).trim(),
      group: String(row[groupCol]).trim()
    });
  }
  Logger.log("✅ تم تحميل " + students.length + " طالبة من Sheet");
  return students;
}

/**
 * تصدير بيانات الطالبات الافتراضية إلى Google Sheet جديد
 * ثم ضع الـ Sheet ID في Script Properties
 */
function exportStudentsToSheet() {
  const students = getDefaultStudents();
  const ss = SpreadsheetApp.create("بيانات الطالبات — محاكاة الاختبار");
  const sheet = ss.getActiveSheet();
  sheet.setName("Students");

  const header = ["ID", "Name", "Email", "Group"];
  const allRows = students.map(function (s) { return [s.id, s.name, s.email, s.group]; });
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  sheet.getRange(2, 1, allRows.length, header.length).setValues(allRows);
  sheet.getRange(1, 1, 1, header.length).setFontWeight("bold").setBackground("#4a86c8").setFontColor("white");
  sheet.setFrozenRows(1);

  const sheetId = ss.getId();
  PropertiesService.getScriptProperties().setProperty('STUDENTS_SHEET_ID', sheetId);

  Logger.log("═══════════════════════════════════════════");
  Logger.log("✅ تم تصدير " + students.length + " طالبة في Google Sheet!");
  Logger.log("📊 " + ss.getUrl());
  Logger.log("🔑 Sheet ID: " + sheetId);
  Logger.log("✅ تم حفظ الـ ID في Script Properties تلقائياً");
  Logger.log("💡 الآن يمكنك حذف البيانات من students.js واستخدام الشيت فقط");
  Logger.log("═══════════════════════════════════════════");
}

/**
 * بيانات الطالبات الافتراضية الـ 80 (أسماء بنات مصرية + إيميلات Gmail)
 * @returns {Object[]} قائمة الطالبات
 */
function getDefaultStudents() {
  return [

    // ══════════════════════════════════════════
    //  المجموعة الأولى (G1): تنافسي بدون ضغط زمني
    // ══════════════════════════════════════════
    { id: "STD-001", name: "نورهان أحمد", email: "nourhan.ahmed84@gmail.com", group: "G1" },
    { id: "STD-002", name: "سارة محمود", email: "sara.mahmoud91@gmail.com", group: "G1" },
    { id: "STD-003", name: "مريم حسن", email: "mariam.hassan55@gmail.com", group: "G1" },
    { id: "STD-004", name: "هدى إبراهيم", email: "huda.ibrahim22@gmail.com", group: "G1" },
    { id: "STD-005", name: "آية عبدالرحمن", email: "aya.abdelrahman7@gmail.com", group: "G1" },
    { id: "STD-006", name: "رنا محمد", email: "rana.mohamed.k3@gmail.com", group: "G1" },
    { id: "STD-007", name: "دينا سعيد", email: "dina.saeed40@gmail.com", group: "G1" },
    { id: "STD-008", name: "نهى عادل", email: "noha.adel.m@gmail.com", group: "G1" },
    { id: "STD-009", name: "شيماء طارق", email: "shimaa.tarek19@gmail.com", group: "G1" },
    { id: "STD-010", name: "إسراء حسين", email: "esraa.hussein33@gmail.com", group: "G1" },
    { id: "STD-011", name: "ريهام مصطفى", email: "reham.mostafa5@gmail.com", group: "G1" },
    { id: "STD-012", name: "منى جمال", email: "mona.gamal.a@gmail.com", group: "G1" },
    { id: "STD-013", name: "سلمى عمر", email: "salma.omar61@gmail.com", group: "G1" },
    { id: "STD-014", name: "لمياء فتحي", email: "lamiaa.fathy8@gmail.com", group: "G1" },
    { id: "STD-015", name: "أميرة ياسر", email: "amira.yasser12@gmail.com", group: "G1" },
    { id: "STD-016", name: "حنان وليد", email: "hanan.waleed.s@gmail.com", group: "G1" },
    { id: "STD-017", name: "عبير خالد", email: "abeer.khaled44@gmail.com", group: "G1" },
    { id: "STD-018", name: "رشا أشرف", email: "rasha.ashraf9@gmail.com", group: "G1" },
    { id: "STD-019", name: "علا حمدي", email: "ola.hamdy.m@gmail.com", group: "G1" },
    { id: "STD-020", name: "نجلاء سامي", email: "naglaa.samy27@gmail.com", group: "G1" },

    // ══════════════════════════════════════════
    //  المجموعة الثانية (G2): تنافسي بضغط زمني
    // ══════════════════════════════════════════
    { id: "STD-021", name: "فاطمة علي", email: "fatma.ali.k2@gmail.com", group: "G2" },
    { id: "STD-022", name: "زينب عبدالله", email: "zeinab.abdallah6@gmail.com", group: "G2" },
    { id: "STD-023", name: "هبة الله ماجد", email: "heba.maged31@gmail.com", group: "G2" },
    { id: "STD-024", name: "ندى رمضان", email: "nada.ramadan.h@gmail.com", group: "G2" },
    { id: "STD-025", name: "روان كمال", email: "rawan.kamal18@gmail.com", group: "G2" },
    { id: "STD-026", name: "جنى هشام", email: "ganna.hesham4@gmail.com", group: "G2" },
    { id: "STD-027", name: "بسمة نبيل", email: "basma.nabil.r@gmail.com", group: "G2" },
    { id: "STD-028", name: "ملك أيمن", email: "malak.ayman50@gmail.com", group: "G2" },
    { id: "STD-029", name: "تقى شريف", email: "toqa.sherif23@gmail.com", group: "G2" },
    { id: "STD-030", name: "لجين سمير", email: "logain.samir.a@gmail.com", group: "G2" },
    { id: "STD-031", name: "ياسمين وائل", email: "yasmin.wael37@gmail.com", group: "G2" },
    { id: "STD-032", name: "حبيبة عصام", email: "habiba.essam11@gmail.com", group: "G2" },
    { id: "STD-033", name: "مها رضا", email: "maha.reda.m@gmail.com", group: "G2" },
    { id: "STD-034", name: "داليا منير", email: "dalia.mounir66@gmail.com", group: "G2" },
    { id: "STD-035", name: "سمر حسام", email: "samar.hossam.k@gmail.com", group: "G2" },
    { id: "STD-036", name: "نور عماد", email: "nour.emad42@gmail.com", group: "G2" },
    { id: "STD-037", name: "إيمان بدر", email: "eman.badr.s@gmail.com", group: "G2" },
    { id: "STD-038", name: "هند صلاح", email: "hend.salah15@gmail.com", group: "G2" },
    { id: "STD-039", name: "ميرنا جابر", email: "mirna.gaber29@gmail.com", group: "G2" },
    { id: "STD-040", name: "كريمة ناصر", email: "karima.nasser.h@gmail.com", group: "G2" },

    // ══════════════════════════════════════════
    //  المجموعة الثالثة (G3): تعاوني بدون ضغط زمني
    // ══════════════════════════════════════════
    { id: "STD-041", name: "ياسمين خالد", email: "yasmin.khaled77@gmail.com", group: "G3" },
    { id: "STD-042", name: "هاجر عبدالعزيز", email: "hagar.abdelaziz3@gmail.com", group: "G3" },
    { id: "STD-043", name: "رحمة طه", email: "rahma.taha.n@gmail.com", group: "G3" },
    { id: "STD-044", name: "أمل فاروق", email: "amal.farouk58@gmail.com", group: "G3" },
    { id: "STD-045", name: "سهام عبدالحميد", email: "seham.abdelhamid@gmail.com", group: "G3" },
    { id: "STD-046", name: "وفاء محسن", email: "wafaa.mohsen.s@gmail.com", group: "G3" },
    { id: "STD-047", name: "ثريا كرم", email: "soraya.karam20@gmail.com", group: "G3" },
    { id: "STD-048", name: "نسمة أنور", email: "nesma.anwar.r@gmail.com", group: "G3" },
    { id: "STD-049", name: "جيهان فوزي", email: "gehan.fawzy14@gmail.com", group: "G3" },
    { id: "STD-050", name: "عزة سيد", email: "azza.sayed.m7@gmail.com", group: "G3" },
    { id: "STD-051", name: "سحر عبدالفتاح", email: "sahar.abdelfatah@gmail.com", group: "G3" },
    { id: "STD-052", name: "إنجي حازم", email: "engy.hazem36@gmail.com", group: "G3" },
    { id: "STD-053", name: "مروة شوقي", email: "marwa.shawky.a@gmail.com", group: "G3" },
    { id: "STD-054", name: "غادة رفعت", email: "ghada.refaat45@gmail.com", group: "G3" },
    { id: "STD-055", name: "صفاء عاطف", email: "safaa.atef.h@gmail.com", group: "G3" },
    { id: "STD-056", name: "هالة مجدي", email: "hala.magdy82@gmail.com", group: "G3" },
    { id: "STD-057", name: "لبنى حمدان", email: "lobna.hamdan.k@gmail.com", group: "G3" },
    { id: "STD-058", name: "رانيا شعبان", email: "rania.shaaban53@gmail.com", group: "G3" },
    { id: "STD-059", name: "سوزان هاني", email: "suzan.hany.m@gmail.com", group: "G3" },
    { id: "STD-060", name: "نيفين بهاء", email: "neveen.bahaa10@gmail.com", group: "G3" },

    // ══════════════════════════════════════════
    //  المجموعة الرابعة (G4): تعاوني بضغط زمني
    // ══════════════════════════════════════════
    { id: "STD-061", name: "هاجر عبدالله", email: "hagar.abdallah3@gmail.com", group: "G4" },
    { id: "STD-062", name: "جومانا عادل", email: "gomana.adel17@gmail.com", group: "G4" },
    { id: "STD-063", name: "رقية حسني", email: "roqaya.hosny.s@gmail.com", group: "G4" },
    { id: "STD-064", name: "ضحى عبدالناصر", email: "doha.abdelnaser@gmail.com", group: "G4" },
    { id: "STD-065", name: "تسنيم فؤاد", email: "tasneem.fouad48@gmail.com", group: "G4" },
    { id: "STD-066", name: "أروى مدحت", email: "arwa.medhat.a@gmail.com", group: "G4" },
    { id: "STD-067", name: "فرح زكريا", email: "farah.zakaria26@gmail.com", group: "G4" },
    { id: "STD-068", name: "سندس خيري", email: "sondos.khairy.r@gmail.com", group: "G4" },
    { id: "STD-069", name: "ابتسام عوض", email: "ebtesam.awad60@gmail.com", group: "G4" },
    { id: "STD-070", name: "آلاء ثروت", email: "alaa.tharwat.n@gmail.com", group: "G4" },
    { id: "STD-071", name: "كوثر جلال", email: "kawthar.galal35@gmail.com", group: "G4" },
    { id: "STD-072", name: "خلود يحيى", email: "kholoud.yehia.m@gmail.com", group: "G4" },
    { id: "STD-073", name: "بثينة حمزة", email: "buthaina.hamza8@gmail.com", group: "G4" },
    { id: "STD-074", name: "سمية رجب", email: "somaya.ragab.s@gmail.com", group: "G4" },
    { id: "STD-075", name: "وجدان صبحي", email: "wegdan.sobhy22@gmail.com", group: "G4" },
    { id: "STD-076", name: "نرمين شاكر", email: "nermeen.shaker.a@gmail.com", group: "G4" },
    { id: "STD-077", name: "تغريد لطفي", email: "taghreed.lotfy41@gmail.com", group: "G4" },
    { id: "STD-078", name: "ولاء حسان", email: "walaa.hassan.k@gmail.com", group: "G4" },
    { id: "STD-079", name: "أمنية رأفت", email: "omneya.raafat16@gmail.com", group: "G4" },
    { id: "STD-080", name: "يمنى ممدوح", email: "yomna.mamdouh.s@gmail.com", group: "G4" },

    // ══════════════════════════════════════════
    //  المتسربون (Dropouts) — يظهرون في القبلي فقط
    //  يُستثنَون تلقائياً من البعدي عبر DROPOUT_IDS في submit_from_json.js
    // ══════════════════════════════════════════

    // G1 — 4 متسربات
    { id: "STD-081", name: "لجين صالح",    email: "lujain.saleh.r@gmail.com",    group: "G1" },
    { id: "STD-082", name: "غادة نبيل",    email: "ghada.nabil.h@gmail.com",     group: "G1" },
    { id: "STD-083", name: "رشا أنور",     email: "rasha.anwar.m@gmail.com",     group: "G1" },
    { id: "STD-084", name: "ميار حمدي",    email: "mayar.hamdi.s@gmail.com",     group: "G1" },

    // G2 — 4 متسربات
    { id: "STD-085", name: "نيرة سامي",    email: "nayera.sami.k@gmail.com",     group: "G2" },
    { id: "STD-086", name: "إيمان زكي",    email: "iman.zaki.f@gmail.com",       group: "G2" },
    { id: "STD-087", name: "أسماء حافظ",   email: "asmaa.hafez.n@gmail.com",     group: "G2" },
    { id: "STD-088", name: "دعاء رمضان",   email: "doaa.ramadan.y@gmail.com",    group: "G2" },

    // G3 — 4 متسربات
    { id: "STD-089", name: "سلوى ممدوح",   email: "salwa.mamdouh.t@gmail.com",   group: "G3" },
    { id: "STD-090", name: "هند ماهر",     email: "hend.maher.g@gmail.com",      group: "G3" },
    { id: "STD-091", name: "رانيا فريد",   email: "rania.farid.z@gmail.com",     group: "G3" },
    { id: "STD-092", name: "عزة طلعت",     email: "azza.talaat.b@gmail.com",     group: "G3" },

    // G4 — 4 متسربات
    { id: "STD-093", name: "منار شوقي",    email: "manar.shawki.r@gmail.com",    group: "G4" },
    { id: "STD-094", name: "نادين عصام",   email: "nadine.essam.l@gmail.com",    group: "G4" },
    { id: "STD-095", name: "شهد كمال",     email: "shahd.kamal.w@gmail.com",     group: "G4" },
    { id: "STD-096", name: "فاطمة سعيد",   email: "fatima.saeed.q@gmail.com",    group: "G4" }

  ];
}
