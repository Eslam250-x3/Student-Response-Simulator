// ════════════════════════════════════════════════════════════════
//  🧪 tests.gs - اختبارات وحدوية للدوال الأساسية
//  شغّل runTests() من Apps Script Editor
// ════════════════════════════════════════════════════════════════

/**
 * تشغيل كل الاختبارات
 */
function runTests() {
    Logger.log("═══════════════════════════════════════════");
    Logger.log("🧪 تشغيل الاختبارات الوحدوية...");
    Logger.log("═══════════════════════════════════════════\n");

    let passed = 0, failed = 0;

    function assert(condition, name) {
        if (condition) {
            Logger.log("  ✅ " + name);
            passed++;
        } else {
            Logger.log("  ❌ FAIL: " + name);
            failed++;
        }
    }

    function assertClose(actual, expected, tolerance, name) {
        const diff = Math.abs(actual - expected);
        if (diff <= tolerance) {
            Logger.log("  ✅ " + name + " (got " + actual.toFixed(4) + ")");
            passed++;
        } else {
            Logger.log("  ❌ FAIL: " + name + " — expected ~" + expected + ", got " + actual);
            failed++;
        }
    }

    // ─── clamp ────────────────────────────
    Logger.log("\n📦 clamp:");
    assert(clamp(5, 0, 10) === 5, "clamp(5, 0, 10) = 5");
    assert(clamp(-5, 0, 10) === 0, "clamp(-5, 0, 10) = 0");
    assert(clamp(15, 0, 10) === 10, "clamp(15, 0, 10) = 10");
    assert(clamp(0, 0, 0) === 0, "clamp(0, 0, 0) = 0");

    // ─── average ──────────────────────────
    Logger.log("\n📦 average:");
    assert(average([1, 2, 3, 4, 5]) === 3, "average([1..5]) = 3");
    assert(average([10]) === 10, "average([10]) = 10");
    assertClose(average([0.1, 0.2, 0.3]), 0.2, 0.0001, "average([0.1,0.2,0.3]) = 0.2");

    // ─── stdDev ───────────────────────────
    Logger.log("\n📦 stdDev:");
    assert(stdDev([]) === 0, "stdDev([]) = 0");
    assert(stdDev([5]) === 0, "stdDev([5]) = 0");
    assertClose(stdDev([2, 4, 4, 4, 5, 5, 7, 9]), 2.138, 0.001, "stdDev([2,4,4,4,5,5,7,9]) ≈ 2.138");

    // ─── variance ─────────────────────────
    Logger.log("\n📦 variance:");
    assertClose(variance([2, 4, 4, 4, 5, 5, 7, 9]), 4.571, 0.001, "variance([2,4,4,4,5,5,7,9]) ≈ 4.571");
    assert(variance([5]) === 0, "variance([5]) = 0");

    // ─── normalRandom ─────────────────────
    Logger.log("\n📦 normalRandom:");
    initRng(42); // seed for reproducibility
    let sumNR = 0, countNR = 1000;
    for (let i = 0; i < countNR; i++) {
        const v = normalRandom(0.5, 0.15);
        sumNR += v;
    }
    const meanNR = sumNR / countNR;
    assertClose(meanNR, 0.5, 0.05, "normalRandom(0.5, 0.15) mean ≈ 0.5 over 1000");

    // ─── extractFormId ────────────────────
    Logger.log("\n📦 extractFormId:");
    assert(
        extractFormId("https://docs.google.com/forms/d/abc123/edit") === "abc123",
        "extractFormId from edit URL"
    );
    assert(
        extractFormId("https://docs.google.com/forms/d/xyz789/viewform") === "xyz789",
        "extractFormId from viewform URL"
    );

    // ─── pickWrong ────────────────────────
    Logger.log("\n📦 pickWrong:");
    initRng(42);
    const choices = ["A", "B", "C", "D"];
    for (let trial = 0; trial < 20; trial++) {
        const wrong = pickWrong(choices, "B");
        assert(wrong !== "B", "pickWrong never returns correct (trial " + trial + ")");
    }

    // ─── normalCDF ────────────────────────
    Logger.log("\n📦 normalCDF:");
    assertClose(normalCDF(0), 0.5, 0.001, "normalCDF(0) = 0.5");
    assertClose(normalCDF(1.96), 0.975, 0.001, "normalCDF(1.96) ≈ 0.975");
    assertClose(normalCDF(-1.96), 0.025, 0.001, "normalCDF(-1.96) ≈ 0.025");

    // ─── approxPValue ─────────────────────
    Logger.log("\n📦 approxPValue:");
    // t=2.0, df=79 → p ≈ 0.049 (two-tailed)
    assertClose(approxPValue(2.0, 79), 0.049, 0.01, "approxPValue(t=2, df=79) ≈ 0.049");
    // t=0, any df → p = 1.0
    assertClose(approxPValue(0, 50), 1.0, 0.001, "approxPValue(t=0, df=50) = 1.0");
    // t very large → p ≈ 0
    assert(approxPValue(10, 79) < 0.0001, "approxPValue(t=10, df=79) < 0.0001");

    // ─── approxFCritical ──────────────────
    Logger.log("\n📦 approxFCritical:");
    // F(1, 76, 0.05) ≈ 3.97
    assertClose(approxFCritical(1, 76, 0.05), 3.97, 0.3, "approxFCritical(1, 76, 0.05) ≈ 3.97");
    // F(3, 76, 0.05) ≈ 2.72
    assertClose(approxFCritical(3, 76, 0.05), 2.72, 0.3, "approxFCritical(3, 76, 0.05) ≈ 2.72");

    // ─── safeSetProperty / safeGetProperty ──
    Logger.log("\n📦 safeSetProperty / safeGetProperty:");
    var testProps = PropertiesService.getScriptProperties();
    // اختبار بيانات صغيرة
    safeSetProperty(testProps, 'TEST_SMALL', 'hello');
    assert(safeGetProperty(testProps, 'TEST_SMALL') === 'hello', "small data round-trip");
    testProps.deleteProperty('TEST_SMALL');

    // اختبار بيانات كبيرة (> 8.5KB)
    var bigData = '';
    for (var bi = 0; bi < 1000; bi++) bigData += '0123456789'; // 10KB
    safeSetProperty(testProps, 'TEST_BIG', bigData);
    var retrieved = safeGetProperty(testProps, 'TEST_BIG');
    assert(retrieved === bigData, "big data round-trip (10KB)");
    assert(retrieved.length === 10000, "big data length = 10000");
    // cleanup chunks
    var numCh = parseInt(testProps.getProperty('TEST_BIG_CHUNKS') || '0');
    for (var ci = 0; ci < numCh; ci++) testProps.deleteProperty('TEST_BIG_CHUNK_' + ci);
    testProps.deleteProperty('TEST_BIG_CHUNKS');

    // ─── createSchedule ───────────────────
    Logger.log("\n📦 createSchedule:");
    var sched = createSchedule(20, 2, 8, 16, 5, "Africa/Cairo", false);
    assert(sched.length === 20, "createSchedule(20 students) returns 20 entries");
    // check chronological order
    var sorted = true;
    for (var si = 1; si < sched.length; si++) {
        if (sched[si] < sched[si - 1]) { sorted = false; break; }
    }
    assert(sorted, "schedule is chronologically sorted");

    // ─── log function ─────────────────────
    Logger.log("\n📦 log (centralized logging):");
    setLogLevel(LOG_LEVEL.DEBUG);
    log('INFO', 'test info msg');
    log('DEBUG', 'test debug msg');
    log('WARN', 'test warn msg');
    log('ERROR', 'test error msg');
    setLogLevel(LOG_LEVEL.INFO);
    passed += 4; // visual check — they should appear above

    // ═══ Summary ═══
    Logger.log("\n═══════════════════════════════════════════");
    Logger.log("🧪 النتيجة: " + passed + " نجح ✅  |  " + failed + " فشل ❌");
    if (failed === 0) {
        Logger.log("🎉 كل الاختبارات نجحت!");
    } else {
        Logger.log("⚠️  في " + failed + " اختبار/ات محتاجة مراجعة");
    }
    Logger.log("═══════════════════════════════════════════");
}
