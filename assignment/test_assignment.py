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

    def test_build_prompt_contains_rubric(self):
        """Test that build_prompt includes rubric and welcome message."""
        student = self.gen.students_data[0]
        profile = self.gen.generate_student_profile(student['id'])
        sys_p, p = self.gen.build_prompt(student, "M1", profile, 0.5)

        # Rubric heading and all criteria should be included.
        self.assertIn("معايير التقييم", p)
        for criterion in self.gen.tasks_info["M1"].get("rubric", {}):
            self.assertIn(criterion, p)

        # Persona elements in system prompt.
        self.assertIn("طالب مصري", sys_p)

        # Group-specific welcome in M1 prompt.
        expected_welcome_fragment = {
            "G1": "مستودع المعرفة التنافسي",
            "G2": "حشد المصادر السريع",
            "G3": "رحلة التعاون المعرفي",
            "G4": "تحدي التعاون السريع",
        }
        self.assertIn(expected_welcome_fragment[student['group']], p)

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

        with_intro = "بسم الله الرحمن الرحيم\n\nمقدمة قصيرة\n\n**القضية الأولى: موت الدماغ**\nنص..."
        stripped = self.gen._strip_m3_intro(with_intro)
        self.assertTrue(stripped.startswith("**القضية الأولى"))

        invalid = " ".join(["مقدمة"] * 500)
        is_valid, reason = self.gen.validate_output(invalid, "M3")
        self.assertFalse(is_valid)
        self.assertIn("M3 should start directly", reason)

    def test_require_api_flag_controls_key_requirement(self):
        """Test that require_api=False allows initialization without API key."""
        with patch.dict(os.environ, {"GEMINI_API_KEY": ""}):
            gen = AssignmentGenerator(self.config_path, require_api=False)
            self.assertIsNone(gen.api)

            with self.assertRaises(ValueError):
                AssignmentGenerator(self.config_path, require_api=True)

    def test_google_model_resolution_fallback(self):
        """If configured model is unavailable, adapter should choose an available Gemini model."""
        config = copy.deepcopy(self.gen.config)
        config["api"]["model"] = "gemini-1.5-flash"

        with patch.dict(os.environ, {"GEMINI_API_KEY": "test_key"}):
            adapter = APIAdapter(config)

        with patch.object(
            adapter,
            "_list_google_generate_models",
            return_value=["models/gemini-2.0-flash", "models/gemini-pro"],
        ):
            resolved = adapter._resolve_google_model(
                {"x-goog-api-key": "test_key"},
                force_refresh=True,
            )

        self.assertEqual(resolved, "models/gemini-2.0-flash")

    def test_call_ai_switches_model_after_404(self):
        """On 404 model-not-found, call_ai should refresh model list and retry with alternate model."""
        config = copy.deepcopy(self.gen.config)
        config["api"]["provider"] = "google"
        config["api"]["model"] = "gemini-1.5-flash"

        with patch.dict(os.environ, {"GEMINI_API_KEY": "test_key"}):
            adapter = APIAdapter(config)

        # First POST fails with 404, second succeeds.
        first_response = Mock()
        first_response.status_code = 404
        first_response.text = "model not found"
        http_error = requests.HTTPError("404 model not found")
        http_error.response = first_response

        post_fail = Mock()
        post_fail.raise_for_status.side_effect = http_error

        post_success = Mock()
        post_success.raise_for_status.return_value = None
        post_success.json.return_value = {
            "candidates": [
                {"content": {"parts": [{"text": "generated content"}]}}
            ]
        }

        with patch.object(
            adapter,
            "_list_google_generate_models",
            side_effect=[
                ["models/gemini-1.5-flash", "models/gemini-2.0-flash"],
                ["models/gemini-2.0-flash"],
            ],
        ), patch("api_adapter.requests.post", side_effect=[post_fail, post_success]) as post_mock, patch(
            "api_adapter.time.sleep",
            return_value=None,
        ):
            output = adapter.call_ai("prompt", "system", temperature=0.7, max_retries=1)

        self.assertEqual(output, "generated content")
        first_url = post_mock.call_args_list[0].args[0]
        second_url = post_mock.call_args_list[1].args[0]
        self.assertIn("models/gemini-1.5-flash:generateContent", first_url)
        self.assertIn("models/gemini-2.0-flash:generateContent", second_url)


if __name__ == '__main__':
    unittest.main()
