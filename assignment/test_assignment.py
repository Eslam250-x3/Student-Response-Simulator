import unittest
import os
import sys
import copy
from pathlib import Path
from unittest.mock import patch, Mock

import requests

BASE_DIR = Path(__file__).parent.resolve()
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from api_adapter import APIAdapter
from generate_assignments import AssignmentGenerator


class TestAssignmentGenerator(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config_path = BASE_DIR / 'config.json'
        # Tests should not depend on network credentials.
        cls.gen = AssignmentGenerator(cls.config_path, require_api=False)

    def test_get_seed_consistency(self):
        """Test that get_seed returns the same value for the same input."""
        seed1 = self.gen.get_seed("STD-001_M1")
        seed2 = self.gen.get_seed("STD-001_M1")
        self.assertEqual(seed1, seed2)
        
        seed3 = self.gen.get_seed("STD-002_M1")
        self.assertNotEqual(seed1, seed3)

    def test_job_list_deduplication(self):
        """Test that G3/G4 teams are deduplicated."""
        jobs = self.gen._build_job_list()

        g3_team_ids = set()
        for sid, gb in self.gen.gradebook.items():
            if gb.get("group") == "G3":
                g3_team_ids.add(self.gen._team_code("G3", gb.get("team", "")))
        g3_m1_job_ids = [j['job_id'] for j in jobs if j['group'] == 'G3' and j['milestone'] == 'M1']

        # One job per team (no duplicates, no missing teams).
        self.assertEqual(len(g3_m1_job_ids), len(set(g3_m1_job_ids)))
        self.assertEqual(set(g3_m1_job_ids), {f"{team_id}_M1" for team_id in g3_team_ids})

    def test_validate_output_logic(self):
        """Test validation boundaries for M1 using task-config-driven lengths."""
        task = self.gen.tasks_info['M1']
        min_w = int(task['minWords'] * 0.7)
        max_w = int(task['maxWords'] * 1.4)

        # Case 1: Too short
        is_val, reason = self.gen.validate_output("كلمة واحدة", "M1")
        self.assertFalse(is_val)
        self.assertIn("Too short", reason)

        # Case 2: Valid length and paragraph structure
        target_words = min(max(min_w + 10, 240), max_w - 10)
        words_per_paragraph = max(1, target_words // 4)
        paragraph = ("كلمة " * words_per_paragraph).strip()
        valid_text = "\n\n".join([paragraph] * 4)

        # Pad if integer division made it slightly shorter than target.
        while len(valid_text.split()) < target_words:
            valid_text += " كلمة"

        is_val, reason = self.gen.validate_output(valid_text, "M1")
        self.assertTrue(is_val, f"Validation should pass but failed: {reason}")

    def test_build_prompt_quality_and_gender(self):
        """Test that build_prompt includes rubric, gender logic, and Phase 7 quality fixes."""
        student = self.gen.students_data[0] # نورهان أحمد (famous female name)
        profile = self.gen.generate_student_profile(student['id'])
        sys_p, p = self.gen.build_prompt(student, 'M1', profile, 0.5)
        
        # 1. Rubric & Welcome
        self.assertIn("معايير التقييم", p)
        self.assertIn("مستودع المعرفة التنافسي", p)
        
        # 2. Gender (Phase 7)
        self.assertIn("أنتِ طالبة مصرية", sys_p)
        self.assertIn("مراهقة ذكية", sys_p)
        
        # 3. Quality Constraints (Phase 7)
        self.assertIn("اكتبي الإجابة مباشرة وبالعربية فقط", sys_p)
        self.assertIn("لا تستخدمي علامات التنسيق", sys_p)
        self.assertIn("لا تضعي النص بين علامات اقتباس", sys_p)
        self.assertIn("يجب أن يكون طول النص بين", p)

    def test_docx_output_path_structure(self):
        """DOCX path should be nested as outputs/docx/<group>/<submitter>/<file>.docx."""
        metadata = {
            "group": "G1",
            "submitter_name": "نورهان أحمد",
            "milestone": "M3",
            "submission_date": "2026-03-11 15:55",
        }
        out_path = self.gen._build_docx_output_path(metadata)
        self.assertEqual(out_path.parent.parent.name, "G1")
        self.assertEqual(out_path.parent.name, "نورهان أحمد")
        self.assertTrue(out_path.name.startswith("M3_"))
        self.assertTrue(out_path.name.endswith(".docx"))

    def test_collaborative_groups_have_participants(self):
        """G3/G4 team mapping should provide participants list for shared submissions."""
        g3_keys = [k for k in self.gen.team_members.keys() if k.startswith("G3_Team_")]
        self.assertTrue(g3_keys)
        first_team_members = self.gen.team_members[g3_keys[0]]
        participant_names = sorted({
            member.get('name', 'Unknown').strip() or 'Unknown'
            for member in first_team_members
        })
        self.assertGreaterEqual(len(participant_names), 2)

    def test_team_submitter_is_earliest_by_gradebook_date(self):
        """Submitter for collaborative team should match earliest milestone date in gradebook."""
        team_code = sorted([k for k in self.gen.team_members.keys() if k.startswith("G3_Team_")])[0]
        members = self.gen.team_members[team_code]
        milestone = "M1"

        dated = []
        for member in members:
            sid = member["id"]
            dt = self.gen._parse_datetime(self.gen.gradebook.get(sid, {}).get("dates", {}).get(milestone, ""))
            if dt:
                dated.append((dt, sid))
        self.assertTrue(dated)
        dated.sort(key=lambda x: x[0])
        expected_sid = dated[0][1]

        self.assertEqual(
            self.gen.team_submitter_by_milestone[(team_code, milestone)],
            expected_sid,
        )

    def test_m3_prompt_and_output_no_intro(self):
        """M3 should instruct direct start and reject preface-only starts."""
        student = self.gen.students_data[0]
        profile = self.gen.generate_student_profile(student['id'])
        _, m3_prompt = self.gen.build_prompt(student, "M3", profile, 0.5)
        self.assertIn("بدون أي مقدمة", m3_prompt)

        # M3 used to have markdown titles, now forbidden
        content = "القضية الأولى: موت الدماغ\nنص..."
        stripped = self.gen._strip_m3_intro(content)
        self.assertTrue("القضية الأولى" in stripped)

    def test_require_api_flag_controls_key_requirement(self):
        """Test that require_api=False allows initialization without API key."""
        with patch.dict(os.environ, {"GEMINI_API_KEY": ""}):
            gen = AssignmentGenerator(self.config_path, require_api=False)
            self.assertIsNone(gen.api)

            with self.assertRaises(ValueError):
                AssignmentGenerator(self.config_path, require_api=True)


if __name__ == '__main__':
    unittest.main()
