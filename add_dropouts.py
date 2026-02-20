"""
إضافة الطالبات المتسربات (STD-081 → STD-096) إلى simulation_data.json
يتم توليد بيانات قبلية فقط (MCQ + Flow) — البعدي يبقى null لأنهم متسربات.
"""
import json
import os
import numpy as np
from scipy import stats as sp_stats

# ─── بيانات المتسربات (من students.js) ───────────────────────
DROPOUT_STUDENTS = [
    # G1 — 3 متسربات (مجموعة مرنة)
    {"id": "STD-081", "name": "لجين صالح",    "email": "lujain.saleh.r@gmail.com",    "group": "G1"},
    {"id": "STD-082", "name": "غادة نبيل",    "email": "ghada.nabil.h@gmail.com",     "group": "G1"},
    {"id": "STD-083", "name": "رشا أنور",     "email": "rasha.anwar.m@gmail.com",     "group": "G1"},
    # G2 — 5 متسربات (مجموعة ضغط زمني)
    {"id": "STD-084", "name": "ميار حمدي",    "email": "mayar.hamdi.s@gmail.com",     "group": "G2"},
    {"id": "STD-085", "name": "نيرة سامي",    "email": "nayera.sami.k@gmail.com",     "group": "G2"},
    {"id": "STD-086", "name": "إيمان زكي",    "email": "iman.zaki.f@gmail.com",       "group": "G2"},
    {"id": "STD-087", "name": "أسماء حافظ",   "email": "asmaa.hafez.n@gmail.com",     "group": "G2"},
    {"id": "STD-088", "name": "دعاء رمضان",   "email": "doaa.ramadan.y@gmail.com",    "group": "G2"},
    # G3 — 3 متسربات (مجموعة مرنة)
    {"id": "STD-089", "name": "سلوى ممدوح",   "email": "salwa.mamdouh.t@gmail.com",   "group": "G3"},
    {"id": "STD-090", "name": "هند ماهر",     "email": "hend.maher.g@gmail.com",      "group": "G3"},
    {"id": "STD-091", "name": "رانيا فريد",   "email": "rania.farid.z@gmail.com",     "group": "G3"},
    # G4 — 5 متسربات (مجموعة ضغط زمني)
    {"id": "STD-092", "name": "عزة طلعت",     "email": "azza.talaat.b@gmail.com",     "group": "G4"},
    {"id": "STD-093", "name": "منار شوقي",    "email": "manar.shawki.r@gmail.com",    "group": "G4"},
    {"id": "STD-094", "name": "نادين عصام",   "email": "nadine.essam.l@gmail.com",    "group": "G4"},
    {"id": "STD-095", "name": "شهد كمال",     "email": "shahd.kamal.w@gmail.com",     "group": "G4"},
    {"id": "STD-096", "name": "فاطمة سعيد",   "email": "fatima.saeed.q@gmail.com",    "group": "G4"},
]

# ─── نفس الإعدادات من generate_simulation.py ─────────────────
SETTINGS = {
    "preTest":  {"meanSkill": 0.45, "skillSpread": 0.20, "minSkill": 0.10, "maxSkill": 0.85},
    "postTest": {"meanSkill": 0.62, "skillSpread": 0.16, "minSkill": 0.25, "maxSkill": 0.92},
    "improvement": {"base": 0.15, "variation": 0.06, "weakBonus": 0.5},
    "behavior": {
        "consistencyMin": 0.55, "consistencyMax": 0.95,
        "fatigueMax": 0.12, "fatigueStartQuestion": 20,
        "guessingBase": 0.25, "discrimination": 1.7,
        "consistencyFactor": 0.25,
        "probMin": 0.08, "probMax": 0.96,
        "attractBase": 0.55, "attractSkillFactor": 0.25
    },
    "groupEffects": {
        "G1": {"improvementBonus": 0.02,  "skillSpreadMod": 0.0},
        "G2": {"improvementBonus": 0.00,  "skillSpreadMod": 0.02},
        "G3": {"improvementBonus": 0.07,  "skillSpreadMod": -0.01},
        "G4": {"improvementBonus": 0.04,  "skillSpreadMod": 0.01}
    },
    "flowPre":  {"meanFlow": 0.50, "flowSpread": 0.12, "minFlow": 0.25, "maxFlow": 0.75},
    "flowPost": {"meanFlow": 0.68, "flowSpread": 0.10, "minFlow": 0.35, "maxFlow": 0.90},
    "flowImprovement": {"base": 0.15, "variation": 0.08, "weakBonus": 0.4},
    "flowGroupEffects": {
        "G1": {"improvementBonus": 0.04},
        "G2": {"improvementBonus": -0.02},
        "G3": {"improvementBonus": 0.07},
        "G4": {"improvementBonus": 0.02}
    },
    "flowBehavior": {"noiseLevel": 0.18, "consistencyMin": 0.55, "consistencyMax": 0.95},
    "flowChoices": ["دائماً", "غالباً", "أحياناً", "نادراً", "أبداً"]
}


def irt_3pl(skill, difficulty, discrimination=1.7, guessing=0.25):
    exponent = discrimination * (skill - difficulty)
    exponent = np.clip(exponent, -10, 10)
    return guessing + (1 - guessing) / (1 + np.exp(-exponent))


def generate_mcq_responses_for_dropout(rng, skill, consistency, questions, q_discriminations):
    beh = SETTINGS["behavior"]
    num_q = len(questions)
    responses = []
    correct_arr = []
    score = 0

    orig_diffs = [q["difficulty"] for q in questions]
    n_q = len(questions)
    rank_order = np.argsort(np.argsort(orig_diffs))
    irt_diffs = []
    for r in rank_order:
        quantile = (r + 0.5) / n_q
        z = float(sp_stats.norm.ppf(quantile))
        irt_diffs.append(z * 1.2)

    for qi, q in enumerate(questions):
        irt_difficulty = irt_diffs[qi]
        fatigue = 0
        if qi >= beh["fatigueStartQuestion"]:
            prog = (qi - beh["fatigueStartQuestion"]) / max(1, num_q - beh["fatigueStartQuestion"])
            fatigue = beh["fatigueMax"] * prog

        irt_ability = (skill - 0.5) * 2.8 - fatigue
        a = q_discriminations[qi]
        c = q.get("guessing", beh["guessingBase"])
        prob = irt_3pl(irt_ability, irt_difficulty, a, c)
        noise = rng.normal(0, (1 - consistency) * 0.04)
        prob = np.clip(prob + noise, beh["probMin"], beh["probMax"])

        is_correct = rng.random() < prob
        correct_arr.append(1 if is_correct else 0)
        if is_correct:
            score += 1
            responses.append(int(q["correctAnswer"]))
        else:
            wrong_choices = [c for c in range(q["numChoices"]) if c != q["correctAnswer"]]
            attractive = q.get("attractiveWrong", wrong_choices[0])
            attract_prob = beh["attractBase"] - skill * beh["attractSkillFactor"]
            attract_prob = np.clip(attract_prob, 0.15, 0.70)
            if attractive in wrong_choices and rng.random() < attract_prob:
                responses.append(int(attractive))
            else:
                responses.append(int(rng.choice(wrong_choices)))

    return {"score": score, "correct": correct_arr, "responses": responses}


def generate_flow_responses_for_dropout(rng, flow_level, flow_consistency, flow_items, neg_items_set):
    beh = SETTINGS["flowBehavior"]
    noise = beh["noiseLevel"]
    choices_labels = SETTINGS["flowChoices"]
    responses = []
    scores = []
    dim_drift = {}

    for i, item in enumerate(flow_items):
        is_neg = item["id"] in neg_items_set or item.get("isNegative", False)
        dim = item.get("dimension", f"D{i // 7 + 1}")
        if dim not in dim_drift:
            dim_drift[dim] = (rng.random() - 0.5) * 0.30
        position_effect = (rng.random() - 0.5) * 0.10 * (i / len(flow_items))
        item_noise = (rng.random() - 0.5) * noise * 2.5
        cons_noise = (rng.random() - 0.5) * (1 - flow_consistency) * 1.5
        adjusted = flow_level + dim_drift[dim] + position_effect + cons_noise
        raw = adjusted * 4 + 1 + item_noise
        effective_score = int(np.clip(np.round(raw), 1, 5))
        raw_choice = (6 - effective_score) if is_neg else effective_score
        choice_index = 5 - raw_choice
        choice_index = int(np.clip(choice_index, 0, 4))
        responses.append(choices_labels[choice_index])
        scores.append(effective_score)

    return {"totalScore": int(sum(scores)), "responses": responses}


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    sim_path = os.path.join(script_dir, "simulation_data.json")
    config_path = os.path.join(script_dir, "extracted_config.json")

    # تحميل البيانات الحالية
    with open(sim_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # التحقق من عدم وجود المتسربات بالفعل
    existing_ids = {s["id"] for s in data["students"]}
    new_students = [s for s in DROPOUT_STUDENTS if s["id"] not in existing_ids]
    if not new_students:
        print("✅ المتسربات موجودات بالفعل في الملف!")
        return

    # تحميل الإعدادات (الأسئلة + بنود التدفق)
    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    questions = config["questions"]
    flow_items = config["flow"]["items"]
    neg_items_set = set(config["flow"].get("negativeItems", []))

    # استخدام نفس الـ seed من الملف الأصلي لضمان التناسق
    original_seed = data["metadata"]["seed"]
    rng = np.random.default_rng(original_seed + 1000)  # offset لتجنب التطابق

    # توليد discrimination values (نفس التوزيع)
    q_discriminations = np.clip(
        rng.lognormal(mean=np.log(2.0), sigma=0.45, size=len(questions)),
        0.8, 4.0
    ).tolist()

    pre = SETTINGS["preTest"]
    gfx = SETTINGS["groupEffects"]
    flow_pre_cfg = SETTINGS["flowPre"]
    flow_beh = SETTINGS["flowBehavior"]
    beh = SETTINGS["behavior"]

    print(f"📊 إضافة {len(new_students)} طالبة متسربة...")
    print(f"🎲 Seed أصلي: {original_seed}, Seed المتسربات: {original_seed + 1000}")
    print()

    for s in new_students:
        g = gfx.get(s["group"], {"improvementBonus": 0, "skillSpreadMod": 0})

        # Pre-test MCQ skill — المتسربون أضعف (انحياز سالب)
        pre_skill = rng.normal(pre["meanSkill"] - 0.12, pre["skillSpread"])
        pre_skill = float(np.clip(pre_skill, pre["minSkill"], pre["maxSkill"]))

        # Pre-test flow level
        pre_flow = rng.normal(flow_pre_cfg["meanFlow"], flow_pre_cfg["flowSpread"])
        pre_flow = float(np.clip(pre_flow, flow_pre_cfg["minFlow"], flow_pre_cfg["maxFlow"]))

        # Consistency
        consistency = float(rng.uniform(beh["consistencyMin"], beh["consistencyMax"]))
        flow_cons = float(rng.uniform(flow_beh["consistencyMin"], flow_beh["consistencyMax"]))

        # توليد استجابات MCQ قبلية
        mcq_pre = generate_mcq_responses_for_dropout(rng, pre_skill, consistency, questions, q_discriminations)

        # توليد استجابات Flow قبلية
        flow_pre = generate_flow_responses_for_dropout(rng, pre_flow, flow_cons, flow_items, neg_items_set)

        student_data = {
            "id": s["id"],
            "name": s["name"],
            "email": s["email"],
            "group": s["group"],
            "isDropout": True,

            # MCQ — قبلي فقط
            "mcq_pre_score": mcq_pre["score"],
            "mcq_post_score": None,
            "mcq_pre_responses": mcq_pre["responses"],
            "mcq_post_responses": None,
            "mcq_pre_correct": mcq_pre["correct"],
            "mcq_post_correct": None,

            # Flow — قبلي فقط
            "flow_pre_score": flow_pre["totalScore"],
            "flow_post_score": None,
            "flow_pre_responses": flow_pre["responses"],
            "flow_post_responses": None,

            # Profile
            "preSkill": round(pre_skill, 4),
            "postSkill": None,
            "preFlowLevel": round(pre_flow, 4),
            "postFlowLevel": None
        }

        data["students"].append(student_data)
        print(f"  ✅ {s['id']} | {s['name']} | {s['group']} | MCQ قبلي: {mcq_pre['score']}/30 | Flow قبلي: {flow_pre['totalScore']}")

    # تحديث عدد الطلاب
    data["metadata"]["numStudents"] = len(data["students"])

    # حفظ
    class NumpyEncoder(json.JSONEncoder):
        def default(self, obj):
            if isinstance(obj, (np.integer,)): return int(obj)
            if isinstance(obj, (np.floating,)): return float(obj)
            if isinstance(obj, (np.bool_,)): return bool(obj)
            if isinstance(obj, np.ndarray): return obj.tolist()
            return super().default(obj)

    with open(sim_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, cls=NumpyEncoder)

    size_kb = os.path.getsize(sim_path) / 1024
    print(f"\n{'═' * 50}")
    print(f"✅ تم إضافة {len(new_students)} طالبة متسربة بنجاح!")
    print(f"📊 إجمالي الطلاب الآن: {len(data['students'])} (80 أساسية + 16 متسربة)")
    print(f"📄 الملف: {sim_path}")
    print(f"📦 الحجم: {size_kb:.1f} KB")
    print(f"{'═' * 50}")


if __name__ == "__main__":
    main()
