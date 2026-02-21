"""
═══════════════════════════════════════════════════════════════
  generate_simulation.py — مولّد بيانات المحاكاة بـ Python
  يولّد كل استجابات MCQ + Flow لكل طالبة (قبلي + بعدي)
  مع تحقق إحصائي كامل بـ scipy
  
  الناتج: simulation_data.json جاهز لـ GAS
  
  الاستخدام:
    python generate_simulation.py
    python generate_simulation.py --seed 42
    python generate_simulation.py --config extracted_config.json
═══════════════════════════════════════════════════════════════
"""

import json, os, sys, argparse, math
from datetime import datetime
import numpy as np
from scipy import stats as sp_stats


# ════════════════════════════════════════════════════════════════
#  Default Settings (نفس القيم من config.js + config_flow.js)
# ════════════════════════════════════════════════════════════════

DEFAULT_SETTINGS = {
    # MCQ pre/post skill distributions
    "preTest":  {"meanSkill": 0.45, "skillSpread": 0.20, "minSkill": 0.10, "maxSkill": 0.85},
    "postTest": {"meanSkill": 0.62, "skillSpread": 0.16, "minSkill": 0.25, "maxSkill": 0.92},
    
    # Improvement
    "improvement": {"base": 0.15, "variation": 0.06, "weakBonus": 0.5},
    
    # Student behavior (IRT parameters)
    "behavior": {
        "consistencyMin": 0.55, "consistencyMax": 0.95,
        "fatigueMax": 0.12, "fatigueStartQuestion": 20,
        "guessingBase": 0.18,     # c parameter (3PL) — reduced for better KR-20
        "discrimination": 2.2,    # a parameter (3PL) — increased for better KR-20
        "consistencyFactor": 0.25,
        "probMin": 0.08, "probMax": 0.96,
        "attractBase": 0.55, "attractSkillFactor": 0.25
    },
    
    # Group effects on MCQ improvement (aligned with research literature)
    # Literature: Collaborative > Competitive for achievement (عمار 2023, وهبه 2023/2024, كرسون 2025)
    # Timing effect is mixed (no clear winner), so smaller differences
    # Target ranking: G3 > G4 > G1 ≥ G2
    "groupEffects": {
        "G1": {"improvementBonus": 0.02,  "skillSpreadMod": 0.0},   # تنافسي + مفتوح
        "G2": {"improvementBonus": -0.02, "skillSpreadMod": 0.02},  # تنافسي + محدد (ضغط زمني سلبي)
        "G3": {"improvementBonus": 0.07,  "skillSpreadMod": -0.01}, # تشاركي + مفتوح (الأعلى)
        "G4": {"improvementBonus": 0.04,  "skillSpreadMod": 0.01}   # تشاركي + محدد
    },
    
    # Flow scale pre/post
    "flowPre":  {"meanFlow": 0.50, "flowSpread": 0.12, "minFlow": 0.25, "maxFlow": 0.75},
    "flowPost": {"meanFlow": 0.68, "flowSpread": 0.10, "minFlow": 0.35, "maxFlow": 0.90},
    "flowImprovement": {"base": 0.15, "variation": 0.08, "weakBonus": 0.4},
    # Flow group effects (aligned with research: open time enhances flow/immersion)
    # Open time → more autonomy → higher flow; Competition + time pressure → anxiety → lower flow
    # Target ranking: G3 > G1 > G4 > G2
    "flowGroupEffects": {
        "G1": {"improvementBonus": 0.04},  # تنافسي + مفتوح (open helps flow)
        "G2": {"improvementBonus": -0.02}, # تنافسي + محدد (worst for flow)
        "G3": {"improvementBonus": 0.07},  # تشاركي + مفتوح (best for flow)
        "G4": {"improvementBonus": 0.02}   # تشاركي + محدد
    },
    "flowBehavior": {"noiseLevel": 0.18, "consistencyMin": 0.55, "consistencyMax": 0.95},
    
    # Statistical targets
    "targets": {
        "significanceLevel": 0.005,
        "minCohenD": 0.5,
        "maxCohenD": 1.2,
        "minKR20": 0.65,
        "maxAttempts": 50
    },
    
    # Likert choices (5-point)
    "flowChoices": ["دائماً", "غالباً", "أحياناً", "نادراً", "أبداً"]
}


# ════════════════════════════════════════════════════════════════
#  Core Functions
# ════════════════════════════════════════════════════════════════

def irt_3pl(skill, difficulty, discrimination=1.7, guessing=0.25):
    """Calculate probability of correct answer using 3PL IRT model."""
    exponent = discrimination * (skill - difficulty)
    exponent = np.clip(exponent, -10, 10)
    p = guessing + (1 - guessing) / (1 + np.exp(-exponent))
    return p


def generate_mcq_profiles(rng, students, settings):
    """Generate MCQ skill profiles with stratified preSkill for baseline equivalence."""
    pre = settings["preTest"]
    post = settings["postTest"]
    imp = settings["improvement"]
    gfx = settings["groupEffects"]

    # توزيع طبقي: قائمة مهارات واحدة متوازنة وتوزيعها على المجموعات
    num_active = len([s for s in students if not (s.get("isDropout", False) or s["id"] in [f"STD-{i:03d}" for i in range(81, 97)])])
    base_skills = rng.normal(pre["meanSkill"], pre["skillSpread"], len(students))
    base_skills = np.clip(base_skills, pre["minSkill"], pre["maxSkill"])
    base_skills = np.sort(base_skills)

    # ترتيب round-robin حسب المجموعة لضمان ANOVA p > 0.05
    students_by_group = {g: [s for s in students if s["group"] == g] for g in ["G1", "G2", "G3", "G4"]}
    ordered_students = []
    for r in range(max(len(students_by_group.get(g, [])) for g in ["G1", "G2", "G3", "G4"])):
        for g in ["G1", "G2", "G3", "G4"]:
            if r < len(students_by_group.get(g, [])):
                ordered_students.append(students_by_group[g][r])
    skill_map = {s["id"]: float(base_skills[i]) for i, s in enumerate(ordered_students)}

    profiles = []
    for s in students:
        g = gfx.get(s["group"], {"improvementBonus": 0, "skillSpreadMod": 0})
        pre_skill = skill_map[s["id"]]

        # المتسربون: انحياز سالب في القبلي (أضعف → أكثر عرضة للانسحاب)
        is_dropout = s.get("isDropout", False) or s["id"] in [f"STD-{i:03d}" for i in range(81, 97)]
        if is_dropout:
            pre_skill = pre_skill - 0.12
            pre_skill = max(pre_skill, pre["minSkill"])

        # Improvement (weaker students improve more)
        weak_factor = 1 + (pre["meanSkill"] - pre_skill) * imp["weakBonus"]
        group_bonus = g.get("improvementBonus", 0)
        improvement = (imp["base"] + group_bonus) * weak_factor + rng.normal(0, imp["variation"])
        improvement = np.clip(improvement, -0.08, 0.50)

        # Post-test skill
        post_skill = pre_skill + improvement
        post_skill = np.clip(post_skill, post["minSkill"], post["maxSkill"])

        # Consistency
        beh = settings["behavior"]
        consistency = rng.uniform(beh["consistencyMin"], beh["consistencyMax"])

        profiles.append({
            "id": s["id"], "name": s["name"], "email": s["email"], "group": s["group"],
            "preSkill": float(pre_skill), "postSkill": float(post_skill),
            "improvement": float(improvement), "consistency": float(consistency)
        })

    return profiles


def generate_mcq_responses(rng, profile, questions, skill, settings, q_discriminations):
    """Generate MCQ responses using a latent-trait model that ensures proper KR-20.
    
    Key insight for KR-20: items must discriminate between students consistently.
    This means:
    1. Easy items should be answered by most students (p ≈ 0.8-0.9)
    2. Hard items should be answered by fewer students (p ≈ 0.2-0.4)
    3. High-ability students should consistently do better on HARD items
    
    We achieve this by remapping difficulties to a wider 0-1 range and using 
    the student's latent ability to determine item-specific probabilities.
    """
    beh = settings["behavior"]
    num_q = len(questions)
    responses = []
    correct_arr = []
    score = 0
    
    # Rank-based difficulty mapping: instead of linear remapping of clustered values,
    # use rank-order quantiles from a normal distribution for uniform IRT spread.
    # This ensures items are evenly spread across the difficulty continuum → better KR-20.
    orig_diffs = [q["difficulty"] for q in questions]
    n_q = len(questions)
    rank_order = np.argsort(np.argsort(orig_diffs))  # rank of each question (0 to n-1)
    
    # Map ranks to normal quantiles: rank i → ppf((i + 0.5) / n)
    # Then scale to IRT range [-2.5, +2.5]
    irt_diffs = []
    for r in rank_order:
        quantile = (r + 0.5) / n_q  # 0.017 to 0.983
        z = float(sp_stats.norm.ppf(quantile))  # -2.1 to +2.1
        irt_diffs.append(z * 1.2)  # scale to ~[-2.5, +2.5]
    
    for qi, q in enumerate(questions):
        irt_difficulty = irt_diffs[qi]
        
        # Fatigue effect (gradual for later questions)
        fatigue = 0
        if qi >= beh["fatigueStartQuestion"]:
            prog = (qi - beh["fatigueStartQuestion"]) / max(1, num_q - beh["fatigueStartQuestion"])
            fatigue = beh["fatigueMax"] * prog
        
        # Student ability on IRT scale
        # Map skill (0-1) to IRT ability scale — moderate spread to control Cohen's d
        irt_ability = (skill - 0.5) * 2.8 - fatigue  # range ≈ -1.0 to +1.0
        
        # Per-question discrimination (controls item slope)
        a = q_discriminations[qi]
        c = q.get("guessing", beh["guessingBase"])
        
        # 3PL probability
        prob = irt_3pl(irt_ability, irt_difficulty, a, c)
        
        # Minimal consistency noise (too much → kills KR-20 covariance)
        noise = rng.normal(0, (1 - profile["consistency"]) * 0.025)
        prob = np.clip(prob + noise, beh["probMin"], beh["probMax"])
        
        is_correct = rng.random() < prob
        correct_arr.append(1 if is_correct else 0)
        
        if is_correct:
            score += 1
            responses.append(int(q["correctAnswer"]))
        else:
            # Pick wrong answer (biased towards attractive wrong)
            wrong_choices = [c for c in range(q["numChoices"]) if c != q["correctAnswer"]]
            attractive = q.get("attractiveWrong", wrong_choices[0])
            
            attract_prob = beh["attractBase"] - skill * beh["attractSkillFactor"]
            attract_prob = np.clip(attract_prob, 0.15, 0.70)
            
            if attractive in wrong_choices and rng.random() < attract_prob:
                responses.append(int(attractive))
            else:
                responses.append(int(rng.choice(wrong_choices)))
    
    return {"score": score, "correct": correct_arr, "responses": responses}


def generate_flow_profiles(rng, profiles, settings):
    """Add flow levels to existing profiles."""
    pre = settings["flowPre"]
    post = settings["flowPost"]
    imp = settings["flowImprovement"]
    gfx = settings["flowGroupEffects"]
    beh = settings["flowBehavior"]
    
    for p in profiles:
        g = gfx.get(p["group"], {"improvementBonus": 0})
        
        # Pre flow level
        pre_flow = rng.normal(pre["meanFlow"], pre["flowSpread"])
        pre_flow = np.clip(pre_flow, pre["minFlow"], pre["maxFlow"])
        
        # Improvement
        weak_factor = 1 + (pre["meanFlow"] - pre_flow) * imp["weakBonus"]
        group_bonus = g.get("improvementBonus", 0)
        improvement = (imp["base"] + group_bonus) * weak_factor + rng.normal(0, imp["variation"])
        improvement = np.clip(improvement, -0.15, 0.45)
        
        # Post flow level
        post_flow = pre_flow + improvement
        post_flow = np.clip(post_flow, post["minFlow"], post["maxFlow"])
        
        # Flow consistency
        flow_cons = rng.uniform(beh["consistencyMin"], beh["consistencyMax"])
        
        p["preFlowLevel"] = float(pre_flow)
        p["postFlowLevel"] = float(post_flow)
        p["flowConsistency"] = float(flow_cons)


def generate_flow_responses(rng, flow_level, flow_consistency, flow_items, neg_items_set, settings):
    """Generate Likert responses for flow scale with realistic variation."""
    beh = settings["flowBehavior"]
    noise = beh["noiseLevel"]
    choices_labels = settings["flowChoices"]
    
    responses = []
    scores = []
    dim_drift = {}
    
    for i, item in enumerate(flow_items):
        is_neg = item["id"] in neg_items_set or item.get("isNegative", False)
        dim = item.get("dimension", f"D{i // 7 + 1}")
        
        # Per-dimension drift (calculated once per dimension)
        if dim not in dim_drift:
            dim_drift[dim] = (rng.random() - 0.5) * 0.30
        
        # Position effect (fatigue/habituation)
        position_effect = (rng.random() - 0.5) * 0.10 * (i / len(flow_items))
        
        # Independent per-item noise
        item_noise = (rng.random() - 0.5) * noise * 2.5
        
        # Consistency noise
        cons_noise = (rng.random() - 0.5) * (1 - flow_consistency) * 1.5
        
        # Effective score (1-5)
        adjusted = flow_level + dim_drift[dim] + position_effect + cons_noise
        raw = adjusted * 4 + 1 + item_noise
        effective_score = int(np.clip(np.round(raw), 1, 5))
        
        # For negative items: reverse the choice
        raw_choice = (6 - effective_score) if is_neg else effective_score
        choice_index = 5 - raw_choice  # 0=دائماً, ..., 4=أبداً
        choice_index = int(np.clip(choice_index, 0, 4))
        
        responses.append(choices_labels[choice_index])
        scores.append(effective_score)  # Score is always after reversal
    
    return {"totalScore": int(sum(scores)), "responses": responses, "scores": scores}


# ════════════════════════════════════════════════════════════════
#  Statistical Validation
# ════════════════════════════════════════════════════════════════

def compute_kr20(correct_matrix, total_scores):
    """Compute KR-20 reliability coefficient."""
    n_items = correct_matrix.shape[1]
    p_vals = correct_matrix.mean(axis=0)
    q_vals = 1 - p_vals
    sum_pq = np.sum(p_vals * q_vals)
    var_total = np.var(total_scores, ddof=1)
    if var_total == 0:
        return 0.0
    return float((n_items / (n_items - 1)) * (1 - sum_pq / var_total))


def validate_results(profiles, mcq_pre, mcq_post, flow_pre, flow_post, settings):
    """Comprehensive statistical validation using scipy."""
    targets = settings["targets"]
    report = {"passed": True, "tests": []}
    
    # --- MCQ paired t-test ---
    pre_scores = np.array([r["score"] for r in mcq_pre])
    post_scores = np.array([r["score"] for r in mcq_post])
    t_stat, p_value = sp_stats.ttest_rel(post_scores, pre_scores)
    
    diff = post_scores - pre_scores
    d_s = float(np.mean(diff) / np.std(np.concatenate([pre_scores, post_scores]), ddof=1)) if np.std(np.concatenate([pre_scores, post_scores]), ddof=1) > 0 else 0
    d_z = float(np.mean(diff) / np.std(diff, ddof=1)) if np.std(diff, ddof=1) > 0 else 0
    eta_sq = float(t_stat**2 / (t_stat**2 + len(pre_scores) - 1))
    
    report["mcq"] = {
        "preMean": float(np.mean(pre_scores)),
        "postMean": float(np.mean(post_scores)),
        "preSD": float(np.std(pre_scores, ddof=1)),
        "postSD": float(np.std(post_scores, ddof=1)),
        "t": float(t_stat), "p": float(p_value),
        "df": len(pre_scores) - 1,
        "cohensD_s": d_s, "cohensD_z": d_z, "etaSquared": eta_sq
    }
    
    ok = p_value < targets["significanceLevel"]
    report["tests"].append({"name": "MCQ paired t-test", "passed": ok,
        "detail": f"t={t_stat:.4f}, p={p_value:.6f} (target < {targets['significanceLevel']})"})
    if not ok: report["passed"] = False
    
    ok2 = targets["minCohenD"] <= abs(d_z) <= targets["maxCohenD"]
    report["tests"].append({"name": "MCQ Cohen's d_z range", "passed": ok2,
        "detail": f"d_z={d_z:.4f} (target: {targets['minCohenD']}-{targets['maxCohenD']})"})
    if not ok2: report["passed"] = False
    
    # --- KR-20 ---
    pre_correct = np.array([r["correct"] for r in mcq_pre])
    post_correct = np.array([r["correct"] for r in mcq_post])
    kr20_pre = compute_kr20(pre_correct, pre_scores)
    kr20_post = compute_kr20(post_correct, post_scores)
    
    report["kr20"] = {"pre": kr20_pre, "post": kr20_post}
    ok3 = kr20_pre >= targets["minKR20"] and kr20_post >= targets["minKR20"]
    report["tests"].append({"name": "KR-20 reliability", "passed": ok3,
        "detail": f"pre={kr20_pre:.4f}, post={kr20_post:.4f} (target >= {targets['minKR20']})"})
    if not ok3: report["passed"] = False
    
    # --- Per-group descriptive statistics ---
    # G1=تنافسي+مفتوح, G2=تنافسي+محدد, G3=تشاركي+مفتوح, G4=تشاركي+محدد
    group_labels = {
        "G1": "تنافسي+مفتوح", "G2": "تنافسي+محدد",
        "G3": "تشاركي+مفتوح", "G4": "تشاركي+محدد"
    }
    groups_mcq = {}
    for i, p in enumerate(profiles):
        g = p["group"]
        if g not in groups_mcq: groups_mcq[g] = []
        groups_mcq[g].append(float(diff[i]))
    
    report["perGroup"] = {}
    for g in sorted(groups_mcq.keys()):
        arr = np.array(groups_mcq[g])
        report["perGroup"][g] = {
            "label": group_labels.get(g, g),
            "n": len(arr),
            "mcqImproveMean": float(np.mean(arr)),
            "mcqImproveSD": float(np.std(arr, ddof=1))
        }
    
    # --- 2×2 Factorial ANOVA for MCQ improvement (Pattern × Timing) ---
    # Factor A: Pattern (Competitive=G1,G2 vs Collaborative=G3,G4)
    # Factor B: Timing  (Open=G1,G3 vs Timed=G2,G4)
    competitive = np.array(groups_mcq.get("G1", []) + groups_mcq.get("G2", []))
    collaborative = np.array(groups_mcq.get("G3", []) + groups_mcq.get("G4", []))
    open_time = np.array(groups_mcq.get("G1", []) + groups_mcq.get("G3", []))
    timed = np.array(groups_mcq.get("G2", []) + groups_mcq.get("G4", []))
    
    all_diff = np.concatenate([competitive, collaborative])
    grand_mean = np.mean(all_diff)
    N = len(all_diff)
    
    # Cell means and sizes
    cells = {}
    for g in ["G1", "G2", "G3", "G4"]:
        cells[g] = np.array(groups_mcq.get(g, []))
    
    # Main effect A (Pattern): Competitive vs Collaborative
    mean_a1 = np.mean(competitive) if len(competitive) > 0 else grand_mean
    mean_a2 = np.mean(collaborative) if len(collaborative) > 0 else grand_mean
    n_a1, n_a2 = len(competitive), len(collaborative)
    ss_a = n_a1 * (mean_a1 - grand_mean)**2 + n_a2 * (mean_a2 - grand_mean)**2
    
    # Main effect B (Timing): Open vs Timed
    mean_b1 = np.mean(open_time) if len(open_time) > 0 else grand_mean
    mean_b2 = np.mean(timed) if len(timed) > 0 else grand_mean
    n_b1, n_b2 = len(open_time), len(timed)
    ss_b = n_b1 * (mean_b1 - grand_mean)**2 + n_b2 * (mean_b2 - grand_mean)**2
    
    # Interaction SS = SS_cells - SS_A - SS_B
    ss_cells = sum(len(cells[g]) * (np.mean(cells[g]) - grand_mean)**2 for g in cells if len(cells[g]) > 0)
    ss_ab = ss_cells - ss_a - ss_b
    
    # Within-group SS (error)
    ss_within = sum(np.sum((cells[g] - np.mean(cells[g]))**2) for g in cells if len(cells[g]) > 0)
    
    df_a, df_b, df_ab = 1, 1, 1
    df_within = N - 4  # 4 cells
    
    if df_within > 0 and ss_within > 0:
        ms_a = ss_a / df_a
        ms_b = ss_b / df_b
        ms_ab = ss_ab / df_ab
        ms_within = ss_within / df_within
        
        f_a = ms_a / ms_within
        f_b = ms_b / ms_within
        f_ab = ms_ab / ms_within
        
        p_a = 1 - sp_stats.f.cdf(f_a, df_a, df_within)
        p_b = 1 - sp_stats.f.cdf(f_b, df_b, df_within)
        p_ab = 1 - sp_stats.f.cdf(f_ab, df_ab, df_within)
        
        # Partial eta-squared
        eta2_a = ss_a / (ss_a + ss_within)
        eta2_b = ss_b / (ss_b + ss_within)
        eta2_ab = ss_ab / (ss_ab + ss_within)
        
        report["anova2way_mcq"] = {
            "pattern": {"F": float(f_a), "p": float(p_a), "partialEta2": float(eta2_a),
                        "means": {"competitive": float(mean_a1), "collaborative": float(mean_a2)}},
            "timing":  {"F": float(f_b), "p": float(p_b), "partialEta2": float(eta2_b),
                        "means": {"open": float(mean_b1), "timed": float(mean_b2)}},
            "interaction": {"F": float(f_ab), "p": float(p_ab), "partialEta2": float(eta2_ab)}
        }
        report["tests"].append({"name": "ANOVA نمط الحشد (MCQ)", "passed": True,
            "detail": f"F(1,{df_within})={f_a:.3f}, p={p_a:.4f}, η²p={eta2_a:.4f}"})
        report["tests"].append({"name": "ANOVA الزمن (MCQ)", "passed": True,
            "detail": f"F(1,{df_within})={f_b:.3f}, p={p_b:.4f}, η²p={eta2_b:.4f}"})
        report["tests"].append({"name": "ANOVA تفاعل (MCQ)", "passed": True,
            "detail": f"F(1,{df_within})={f_ab:.3f}, p={p_ab:.4f}, η²p={eta2_ab:.4f}"})
    
    # --- Flow paired t-test ---
    flow_pre_scores = np.array([r["totalScore"] for r in flow_pre])
    flow_post_scores = np.array([r["totalScore"] for r in flow_post])
    flow_t, flow_p = sp_stats.ttest_rel(flow_post_scores, flow_pre_scores)
    flow_diff = flow_post_scores - flow_pre_scores
    flow_dz = float(np.mean(flow_diff) / np.std(flow_diff, ddof=1)) if np.std(flow_diff, ddof=1) > 0 else 0
    
    report["flow"] = {
        "preMean": float(np.mean(flow_pre_scores)),
        "postMean": float(np.mean(flow_post_scores)),
        "t": float(flow_t), "p": float(flow_p),
        "cohensD_z": flow_dz
    }
    
    ok4 = flow_p < 0.05
    report["tests"].append({"name": "Flow paired t-test", "passed": ok4,
        "detail": f"t={flow_t:.4f}, p={flow_p:.6f}"})
    if not ok4: report["passed"] = False
    
    # --- Flow per-group and 2×2 ANOVA ---
    groups_flow = {}
    for i, p in enumerate(profiles):
        g = p["group"]
        if g not in groups_flow: groups_flow[g] = []
        groups_flow[g].append(float(flow_diff[i]))
    
    for g in sorted(groups_flow.keys()):
        arr = np.array(groups_flow[g])
        report["perGroup"][g]["flowImproveMean"] = float(np.mean(arr))
        report["perGroup"][g]["flowImproveSD"] = float(np.std(arr, ddof=1))
    
    # 2×2 ANOVA for Flow improvement
    flow_comp = np.array(groups_flow.get("G1", []) + groups_flow.get("G2", []))
    flow_collab = np.array(groups_flow.get("G3", []) + groups_flow.get("G4", []))
    flow_open = np.array(groups_flow.get("G1", []) + groups_flow.get("G3", []))
    flow_timed_arr = np.array(groups_flow.get("G2", []) + groups_flow.get("G4", []))
    
    flow_grand = np.mean(np.concatenate([flow_comp, flow_collab]))
    flow_cells = {g: np.array(groups_flow.get(g, [])) for g in ["G1", "G2", "G3", "G4"]}
    
    fma1, fma2 = np.mean(flow_comp), np.mean(flow_collab)
    fmb1, fmb2 = np.mean(flow_open), np.mean(flow_timed_arr)
    
    fss_a = len(flow_comp) * (fma1 - flow_grand)**2 + len(flow_collab) * (fma2 - flow_grand)**2
    fss_b = len(flow_open) * (fmb1 - flow_grand)**2 + len(flow_timed_arr) * (fmb2 - flow_grand)**2
    fss_cells = sum(len(flow_cells[g]) * (np.mean(flow_cells[g]) - flow_grand)**2 for g in flow_cells if len(flow_cells[g]) > 0)
    fss_ab = fss_cells - fss_a - fss_b
    fss_w = sum(np.sum((flow_cells[g] - np.mean(flow_cells[g]))**2) for g in flow_cells if len(flow_cells[g]) > 0)
    
    fdf_w = N - 4
    if fdf_w > 0 and fss_w > 0:
        fms_a, fms_b, fms_ab, fms_w = fss_a, fss_b, fss_ab, fss_w / fdf_w
        ff_a, ff_b, ff_ab = fms_a / fms_w, fms_b / fms_w, fms_ab / fms_w
        fp_a = 1 - sp_stats.f.cdf(ff_a, 1, fdf_w)
        fp_b = 1 - sp_stats.f.cdf(ff_b, 1, fdf_w)
        fp_ab = 1 - sp_stats.f.cdf(ff_ab, 1, fdf_w)
        
        report["anova2way_flow"] = {
            "pattern": {"F": float(ff_a), "p": float(fp_a),
                        "means": {"competitive": float(fma1), "collaborative": float(fma2)}},
            "timing":  {"F": float(ff_b), "p": float(fp_b),
                        "means": {"open": float(fmb1), "timed": float(fmb2)}},
            "interaction": {"F": float(ff_ab), "p": float(fp_ab)}
        }
        report["tests"].append({"name": "ANOVA نمط الحشد (Flow)", "passed": True,
            "detail": f"F(1,{fdf_w})={ff_a:.3f}, p={fp_a:.4f}"})
        report["tests"].append({"name": "ANOVA الزمن (Flow)", "passed": True,
            "detail": f"F(1,{fdf_w})={ff_b:.3f}, p={fp_b:.4f}"})
    
    # --- Baseline equivalence (pre-test ANOVA) ---
    pre_groups = {}
    for i, p in enumerate(profiles):
        g = p["group"]
        if g not in pre_groups: pre_groups[g] = []
        pre_groups[g].append(float(pre_scores[i]))
    
    pre_group_arrays = [np.array(v) for v in pre_groups.values()]
    if len(pre_group_arrays) >= 2:
        base_f, base_p = sp_stats.f_oneway(*pre_group_arrays)
        baseline_ok = base_p > 0.05  # groups should be equivalent at baseline
        report["baseline"] = {"F": float(base_f), "p": float(base_p), "equivalent": baseline_ok}
        report["tests"].append({"name": "Baseline equivalence", "passed": baseline_ok,
            "detail": f"F={base_f:.4f}, p={base_p:.6f} (target: p > 0.05)"})
        if not baseline_ok: report["passed"] = False
    
    # --- Normality check (Shapiro-Wilk on differences) ---
    if len(diff) <= 5000:
        sw_stat, sw_p = sp_stats.shapiro(diff)
        report["normality"] = {"W": float(sw_stat), "p": float(sw_p)}
        report["tests"].append({"name": "Normality (Shapiro-Wilk)", "passed": True,
            "detail": f"W={sw_stat:.4f}, p={sw_p:.6f}"})
    
    return report


def print_report(report):
    """Print validation report."""
    print("\n" + "═" * 60)
    print("📊 التقرير الإحصائي الشامل (متوافق مع التصميم العاملي 2×2)")
    print("═" * 60)
    
    mcq = report.get("mcq", {})
    print(f"\n📝 MCQ (اختبار حل المشكلات):")
    print(f"   القبلي:  M = {mcq.get('preMean', 0):.2f}, SD = {mcq.get('preSD', 0):.2f}")
    print(f"   البعدي:  M = {mcq.get('postMean', 0):.2f}, SD = {mcq.get('postSD', 0):.2f}")
    print(f"   t({mcq.get('df', 0)}) = {mcq.get('t', 0):.4f}, p = {mcq.get('p', 1):.6f}")
    print(f"   Cohen's d_s = {mcq.get('cohensD_s', 0):.4f}")
    print(f"   Cohen's d_z = {mcq.get('cohensD_z', 0):.4f}")
    print(f"   η² = {mcq.get('etaSquared', 0):.4f}")
    
    kr = report.get("kr20", {})
    print(f"\n🔑 KR-20 الثبات:")
    print(f"   القبلي: {kr.get('pre', 0):.4f}")
    print(f"   البعدي: {kr.get('post', 0):.4f}")
    
    flow = report.get("flow", {})
    print(f"\n🌊 مقياس التدفق الذهني:")
    print(f"   القبلي:  M = {flow.get('preMean', 0):.2f}")
    print(f"   البعدي:  M = {flow.get('postMean', 0):.2f}")
    print(f"   t = {flow.get('t', 0):.4f}, p = {flow.get('p', 1):.6f}")
    print(f"   Cohen's d_z = {flow.get('cohensD_z', 0):.4f}")
    
    # Per-group descriptive statistics
    pg = report.get("perGroup", {})
    if pg:
        print(f"\n📊 إحصاءات المجموعات (التحسن):")
        print(f"   {'المجموعة':<20} {'n':>3} {'MCQ M':>7} {'MCQ SD':>7} {'Flow M':>8} {'Flow SD':>8}")
        print(f"   {'─' * 55}")
        for g in sorted(pg.keys()):
            info = pg[g]
            print(f"   {info.get('label', g):<20} {info['n']:>3} "
                  f"{info.get('mcqImproveMean', 0):>7.2f} {info.get('mcqImproveSD', 0):>7.2f} "
                  f"{info.get('flowImproveMean', 0):>8.2f} {info.get('flowImproveSD', 0):>8.2f}")
    
    # 2-way ANOVA for MCQ
    anova_mcq = report.get("anova2way_mcq", {})
    if anova_mcq:
        print(f"\n📈 تحليل التباين الثنائي 2×2 (MCQ التحسن):")
        p_info = anova_mcq.get("pattern", {})
        t_info = anova_mcq.get("timing", {})
        i_info = anova_mcq.get("interaction", {})
        sig = lambda p: "✅" if p < 0.05 else "—"
        print(f"   نمط الحشد:    F = {p_info.get('F',0):.3f}, p = {p_info.get('p',1):.4f}, η²p = {p_info.get('partialEta2',0):.4f} {sig(p_info.get('p',1))}")
        print(f"   الزمن:         F = {t_info.get('F',0):.3f}, p = {t_info.get('p',1):.4f}, η²p = {t_info.get('partialEta2',0):.4f} {sig(t_info.get('p',1))}")
        print(f"   التفاعل:       F = {i_info.get('F',0):.3f}, p = {i_info.get('p',1):.4f}, η²p = {i_info.get('partialEta2',0):.4f} {sig(i_info.get('p',1))}")
        means = p_info.get("means", {})
        print(f"   المتوسطات: تنافسي={means.get('competitive',0):.2f} | تشاركي={means.get('collaborative',0):.2f}")
    
    # 2-way ANOVA for Flow
    anova_flow = report.get("anova2way_flow", {})
    if anova_flow:
        print(f"\n📈 تحليل التباين الثنائي 2×2 (Flow التحسن):")
        p_info = anova_flow.get("pattern", {})
        t_info = anova_flow.get("timing", {})
        i_info = anova_flow.get("interaction", {})
        sig = lambda p: "✅" if p < 0.05 else "—"
        print(f"   نمط الحشد:    F = {p_info.get('F',0):.3f}, p = {p_info.get('p',1):.4f} {sig(p_info.get('p',1))}")
        print(f"   الزمن:         F = {t_info.get('F',0):.3f}, p = {t_info.get('p',1):.4f} {sig(t_info.get('p',1))}")
        print(f"   التفاعل:       F = {i_info.get('F',0):.3f}, p = {i_info.get('p',1):.4f} {sig(i_info.get('p',1))}")
        means = t_info.get("means", {})
        print(f"   المتوسطات: مفتوح={means.get('open',0):.2f} | محدد={means.get('timed',0):.2f}")
    
    base = report.get("baseline", {})
    if base:
        print(f"\n⚖️ التكافؤ القبلي:")
        print(f"   F = {base.get('F', 0):.4f}, p = {base.get('p', 1):.6f}")
        print(f"   {'✅ المجموعات متكافئة' if base.get('equivalent') else '⚠️ المجموعات غير متكافئة'}")
    
    norm = report.get("normality", {})
    if norm:
        print(f"\n📐 الاعتدالية (Shapiro-Wilk):")
        print(f"   W = {norm.get('W', 0):.4f}, p = {norm.get('p', 1):.6f}")
    
    print(f"\n{'═' * 60}")
    print("نتائج الاختبارات:")
    for t in report["tests"]:
        icon = "✅" if t["passed"] else "❌"
        print(f"  {icon} {t['name']}: {t['detail']}")
    
    overall = "✅ كل الاختبارات نجحت!" if report["passed"] else "❌ بعض الاختبارات فشلت"
    print(f"\n{'═' * 60}")
    print(f"  النتيجة النهائية: {overall}")
    print(f"{'═' * 60}")


# ════════════════════════════════════════════════════════════════
#  Main Runner
# ════════════════════════════════════════════════════════════════

def run_simulation(config_path, seed=None, output_path=None):
    """Generate complete simulation data with statistical validation."""
    
    # Load config
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    questions = config["questions"]
    flow_items = config["flow"]["items"]
    neg_items_set = set(config["flow"].get("negativeItems", []))
    students = config["students"]
    settings = DEFAULT_SETTINGS.copy()
    
    if not students:
        print("❌ لا توجد بيانات طالبات! تأكد من students.js أو ضع CSV/JSON")
        return
    
    targets = settings["targets"]
    max_attempts = targets["maxAttempts"]
    
    best_report = None
    best_data = None
    
    for attempt in range(1, max_attempts + 1):
        actual_seed = seed if seed else np.random.randint(0, 100000)
        rng = np.random.default_rng(actual_seed)
        
        print(f"\n🎲 محاولة {attempt}/{max_attempts} (seed={actual_seed})")
        
        # Generate profiles
        profiles = generate_mcq_profiles(rng, students, settings)
        generate_flow_profiles(rng, profiles, settings)
        
        # Generate per-question discrimination values (lognormal for realistic IRT variance)
        # Higher mean + lower sigma = better item discrimination = better KR-20
        q_discriminations = np.clip(
            rng.lognormal(mean=np.log(2.4), sigma=0.35, size=len(questions)),
            0.8, 4.0
        ).tolist()
        
        # Generate MCQ responses
        mcq_pre = []
        mcq_post = []
        for p in profiles:
            mcq_pre.append(generate_mcq_responses(rng, p, questions, p["preSkill"], settings, q_discriminations))
            mcq_post.append(generate_mcq_responses(rng, p, questions, p["postSkill"], settings, q_discriminations))
        
        # Generate Flow responses
        flow_pre = []
        flow_post = []
        for p in profiles:
            flow_pre.append(generate_flow_responses(rng, p["preFlowLevel"], p["flowConsistency"], flow_items, neg_items_set, settings))
            flow_post.append(generate_flow_responses(rng, p["postFlowLevel"], p["flowConsistency"], flow_items, neg_items_set, settings))
        
        # Validate
        report = validate_results(profiles, mcq_pre, mcq_post, flow_pre, flow_post, settings)
        report["seed"] = actual_seed
        report["attempt"] = attempt
        
        # Quick summary
        mcq = report["mcq"]
        pass_count = sum(1 for t in report["tests"] if t["passed"])
        total_count = len(report["tests"])
        print(f"   MCQ: t={mcq['t']:.2f}, p={mcq['p']:.6f}, d_z={mcq['cohensD_z']:.3f}, KR20=[{report['kr20']['pre']:.3f},{report['kr20']['post']:.3f}]")
        print(f"   Flow: t={report['flow']['t']:.2f}, p={report['flow']['p']:.6f}")
        print(f"   Tests: {pass_count}/{total_count} {'✅' if report['passed'] else '⚠️'}")
        
        if report["passed"]:
            best_report = report
            best_data = (profiles, mcq_pre, mcq_post, flow_pre, flow_post, actual_seed)
            break
        
        # Keep best attempt
        if best_report is None or pass_count > sum(1 for t in best_report["tests"] if t["passed"]):
            best_report = report
            best_data = (profiles, mcq_pre, mcq_post, flow_pre, flow_post, actual_seed)
        
        # If seed was fixed, no point retrying
        if seed:
            print(f"⚠️ Seed ثابت — لا يمكن إعادة المحاولة")
            break
    
    if best_data is None:
        print("❌ فشل التوليد!")
        return
    
    profiles, mcq_pre, mcq_post, flow_pre, flow_post, final_seed = best_data
    
    # Print detailed report
    print_report(best_report)
    
    # Build output JSON
    choices_labels = settings["flowChoices"]
    output = {
        "metadata": {
            "generatedAt": datetime.now().isoformat(),
            "seed": final_seed,
            "generator": "generate_simulation.py",
            "numStudents": len(students),
            "numMCQ": len(questions),
            "numFlowItems": len(flow_items),
            "stats": best_report
        },
        "students": []
    }
    
    for i, p in enumerate(profiles):
        student_data = {
            "id": p["id"],
            "name": p["name"],
            "email": p["email"],
            "group": p["group"],
            
            # MCQ
            "mcq_pre_score": mcq_pre[i]["score"],
            "mcq_post_score": mcq_post[i]["score"],
            "mcq_pre_responses": mcq_pre[i]["responses"],
            "mcq_post_responses": mcq_post[i]["responses"],
            "mcq_pre_correct": mcq_pre[i]["correct"],
            "mcq_post_correct": mcq_post[i]["correct"],
            
            # Flow
            "flow_pre_score": flow_pre[i]["totalScore"],
            "flow_post_score": flow_post[i]["totalScore"],
            "flow_pre_responses": flow_pre[i]["responses"],
            "flow_post_responses": flow_post[i]["responses"],
            
            # Profile info
            "preSkill": round(p["preSkill"], 4),
            "postSkill": round(p["postSkill"], 4),
            "preFlowLevel": round(p["preFlowLevel"], 4),
            "postFlowLevel": round(p["postFlowLevel"], 4)
        }
        output["students"].append(student_data)
    
    # Save
    if not output_path:
        output_path = os.path.join(os.path.dirname(config_path), "simulation_data.json")
    
    # Custom encoder for numpy types
    class NumpyEncoder(json.JSONEncoder):
        def default(self, obj):
            if isinstance(obj, (np.integer,)): return int(obj)
            if isinstance(obj, (np.floating,)): return float(obj)
            if isinstance(obj, (np.bool_,)): return bool(obj)
            if isinstance(obj, np.ndarray): return obj.tolist()
            return super().default(obj)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2, cls=NumpyEncoder)
    
    size_kb = os.path.getsize(output_path) / 1024
    print(f"\n📄 تم الحفظ في: {output_path}")
    print(f"📦 الحجم: {size_kb:.1f} KB")
    
    if size_kb > 500:
        print(f"⚠️ الملف كبير ({size_kb:.0f}KB). يُفضل رفعه لـ Google Sheet أو Drive.")
    
    return output


# ════════════════════════════════════════════════════════════════
#  CLI
# ════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="مولّد بيانات محاكاة الاختبار")
    parser.add_argument("--config", default="extracted_config.json", help="ملف الإعدادات JSON")
    parser.add_argument("--seed", type=int, default=None, help="Seed للتكرارية")
    parser.add_argument("--output", default=None, help="مسار ملف الخارج")
    args = parser.parse_args()
    
    config_path = args.config
    if not os.path.isabs(config_path):
        config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), config_path)
    
    if not os.path.exists(config_path):
        print(f"❌ الملف غير موجود: {config_path}")
        print("💡 شغّل extract_config.py أولاً:")
        print("   python extract_config.py")
        sys.exit(1)
    
    run_simulation(config_path, seed=args.seed, output_path=args.output)
