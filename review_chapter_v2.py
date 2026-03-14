import re

with open(r'الفصل_الثالث\الفصل_الثالث_كامل.txt', 'r', encoding='utf-8') as f:
    text = f.read()

lines = text.split('\n')
print(f'Total lines: {len(lines)}')
print(f'Total chars: {len(text)}')
print()

issues = []

# Check for wrong grade level
if 'الثاني الثانوي' in text:
    issues.append('ERROR: Found "الثاني الثانوي" (should be الأول)')

# Check key terms
count_first = text.count('الصف الأول الثانوي')
print(f'"الصف الأول الثانوي" mentioned: {count_first} times')

count_21 = text.count('21')
print(f'"21" mentioned: {count_21} times')

count_80 = text.count('80')
print(f'"80" (sample size) mentioned: {count_80} times')

count_20 = text.count('(20)')
print(f'"(20)" mentioned: {count_20} times')

# Check sections
sections = [
    'أولاً: منهج البحث',
    'ثانياً: مجتمع البحث',
    'ثالثاً: التصميم التجريبي',
    'رابعاً: إعداد قائمة معايير',
    'خامساً: التصميم التعليمي',
    'سادساً: تنفيذ التجربة',
    'سابعاً: الأساليب الإحصائية',
]
print('\nTop-level sections:')
for s in sections:
    if s in text:
        print(f'  FOUND: {s}')
    else:
        issues.append(f'MISSING section: {s}')

# Check Khames stages
stages = [
    'المرحلة الأولى: التخطيط',
    'المرحلة الثانية: التحليل',
    'المرحلة الثالثة: تصميم المحتوى',
    'المرحلة الرابعة: تطوير المحتوى',
    'المرحلة الخامسة: تقويم المحتوى',
    'المرحلة السادسة: النشر',
]
print('\nKhames model stages:')
for s in stages:
    if s in text:
        print(f'  FOUND: {s}')
    else:
        issues.append(f'MISSING stage: {s}')

# Check table numbering
table_nums = re.findall(r'جدول \((\d+)\)', text)
print(f'\nTables found: {len(table_nums)}')
table_nums_int = [int(x) for x in table_nums]
unique_tables = sorted(set(table_nums_int))
print(f'Unique table numbers: {unique_tables}')
expected = list(range(1, max(unique_tables)+1)) if unique_tables else []
missing_tables = set(expected) - set(unique_tables)
if missing_tables:
    issues.append(f'Missing table numbers: {sorted(missing_tables)}')

# Check instrument sub-sections
instrument_sections = [
    'الهدف من الاختبار',
    'المهارات المقاسة',
    'نوع الاختبار ومفرداته',
    'جدول المواصفات',
    'صدق الاختبار',
    'تعليمات الاختبار',
    'تقدير الدرجة',
    'ثبات الاختبار',
    'الزمن اللازم',
    'الهدف من المقياس',
    'أبعاد المقياس',
    'نوع المقياس ومفرداته',
    'صدق المقياس',
    'تعليمات المقياس',
    'ثبات المقياس',
]
print('\nInstrument sub-sections:')
for s in instrument_sections:
    if s in text:
        print(f'  FOUND: {s}')
    else:
        issues.append(f'MISSING instrument section: {s}')

# Check key phrases (Doctor's style)
key_phrases = [
    'قام الباحث',
    'ومن ثَمَّ فقد أصبح',
    'وهو معامل ثبات يشير',
    'عدد العينة الاستطلاعية',
    'صدق الاتساق الداخلي',
    'التجزئة النصفية',
    'معاملات السهولة والصعوبة',
    'معاملات التمييز',
]
print('\nDoctor-style phrases:')
for p in key_phrases:
    count = text.count(p)
    if count > 0:
        print(f'  FOUND ({count}x): {p}')
    else:
        issues.append(f'MISSING phrase: {p}')

# Check placeholders
placeholder_count = text.count('[يُستكمل]')
print(f'\nPlaceholders [يُستكمل]: {placeholder_count}')

image_placeholders = text.count('[صورة:')
print(f'Image placeholders [صورة:]: {image_placeholders}')

# Check for "قام الباحث" vs "تم" at start of sentences
starts_with_tam = len(re.findall(r'(?:^|\n)تم ', text))
starts_with_qam = len(re.findall(r'قام الباحث', text))
print(f'\nSentences starting with "تم": {starts_with_tam}')
print(f'"قام الباحث" occurrences: {starts_with_qam}')

if issues:
    print('\n=== ISSUES ===')
    for i in issues:
        print(f'  - {i}')
else:
    print('\nNo consistency issues found!')
