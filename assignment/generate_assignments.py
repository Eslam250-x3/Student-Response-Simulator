import json
import os
import hashlib
import random
from api_adapter import APIAdapter

class AssignmentGenerator:
    def __init__(self, config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            self.config = json.load(f)
        
        self.api = APIAdapter(self.config)
        self.load_data()
        self.ensure_dirs()

    def load_data(self):
        # Paths relative to script location or as per config
        base_dir = os.path.dirname(os.path.abspath(__file__))
        sim_path = os.path.join(base_dir, self.config['input']['simulation_data'])
        const_path = os.path.join(base_dir, self.config['input']['constants'])
        examples_path = os.path.join(base_dir, 'examples_pool.json')

        with open(sim_path, 'r', encoding='utf-8') as f:
            self.students_data = json.load(f)['students']
        with open(const_path, 'r', encoding='utf-8') as f:
            self.constants = json.load(f)
        with open(examples_path, 'r', encoding='utf-8') as f:
            self.examples_pool = json.load(f)

        # Load Gradebook for target quality
        self.gradebook = {}
        gradebook_path = os.path.join(base_dir, self.config['input']['gradebook_csv'])
        if os.path.exists(gradebook_path):
            import csv
            with open(gradebook_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    self.gradebook[row['ID']] = {
                        "percentage": float(row['Percentage']) if row['Percentage'] else 0,
                        "grade": row['Grade'],
                        "lateness": {
                            "M1": row.get('M1_Late', 'لا'),
                            "M2": row.get('M2_Late', 'لا'),
                            "M3": row.get('M3_Late', 'لا'),
                            "M4": row.get('M4_Late', 'لا'),
                            "M5": row.get('M5_Late', 'لا')
                        },
                        "dates": {
                            "M1": row.get('M1_Date', ''),
                            "M2": row.get('M2_Date', ''),
                            "M3": row.get('M3_Date', ''),
                            "M4": row.get('M4_Date', ''),
                            "M5": row.get('M5_Date', '')
                        }
                    }

        # Load task descriptions
        self.tasks_info = {}
        for m in ['M1', 'M2', 'M3', 'M4', 'M5']:
            with open(os.path.join(base_dir, 'tasks', f'{m}.json'), 'r', encoding='utf-8') as f:
                self.tasks_info[m] = json.load(f)

    def ensure_dirs(self):
        os.makedirs('outputs/docx', exist_ok=True)
        os.makedirs('outputs/json', exist_ok=True)

    def get_seed(self, identifier):
        return int(hashlib.md5(identifier.encode()).hexdigest(), 16) % (10**8)

    def generate_student_profile(self, student_id):
        seed = self.get_seed(student_id)
        random.seed(seed)
        styles = self.config['realism']['writingStyles']
        interests = self.config['realism'].get('interests', [])
        return {
            "writing_style": random.choice(styles),
            "interest": random.choice(interests) if interests else "عام",
            "m3_selection": random.sample(list(self.examples_pool.keys()), 3)
        }

    def build_prompt(self, student, milestone, profile, skill):
        task = self.tasks_info[milestone]
        is_time_pressure = student['group'] in ['G2', 'G4']
        
        # Base Persona
        system_prompt = "أنت طالب مصري في الصف الأول الثانوي (15-16 سنة). اكتب بأسلوب مراهق ذكي يحاول حل واجبه المدرسي بجدية."
        system_prompt += " استخدم لغة عربية فصحى بسيطة مناسبة لعمرك، وتجنب استخدام مصطلحات معقدة جداً أو احترافية إلا إذا كنت تستشهد بمصدر."
        system_prompt += " اجعل نبرتك تعكس تساؤلات وميول جيلك."
        
        # Style Adjustment based on skill
        if skill > 0.7:
            system_prompt += " أنت طالب متميز، كتابتك منظمة وعميقة."
        elif skill < 0.4:
            system_prompt += " أنت طالب مستواك ضعيف، قد ترتكب بعض الأخطاء الإملائية البسيطة وتكون جملك غير مكتملة أحياناً."
        else:
            system_prompt += " أنت طالب متوسط المستوى، شرحك واضح وبسيط."

        # Style & Interest Adjustment based on Profile
        system_prompt += f" أسلوبك في الكتابة هو: {profile['writing_style']}."
        system_prompt += f" أنت طالب مهتم بـ {profile['interest']}، لذا حاول ربط أفكارك بهذا الاهتمام كلما أمكن بشكل طبيعي."

        # Flow State Description
        flow_idx = student.get('flow_idx', 0.5)
        if flow_idx > 0.8:
            system_prompt += " أنت الآن في حالة 'تدفق ذهني' عالية جداً، تشعر بالتركيز الشديد والاستمتاع والاندماج التام في الكتابة."
        elif flow_idx < 0.3:
            system_prompt += " أنت تشعر ببعض التشتت أو الملل، وقد تبدو كتابتك أقل حماساً أو تفتقر للتفاصيل الإبداعية."

        # Prompt Content
        prompt = ""

        # Target Quality & Lateness from Gradebook
        target = self.gradebook.get(student['id'], {})
        if target:
            is_late = target['lateness'].get(milestone, 'لا') == 'نعم'
            sub_date = target['dates'].get(milestone, '')
            
            prompt += f"**درجة الجودة المستهدفة لعملك هي: {target['percentage']}% (تقدير {target['grade']})**\n"
            if is_late:
                prompt += f"**تنبيه: أنت تسلم هذا العمل متأخراً (تاريخ التسليم الفعلي: {sub_date})**\n"
                system_prompt += " أنت تسلم المهمة بعد الموعد النهائي، لذا قد تبدو نبرتك في المقدمة أو الخاتمة معتذرة قليلاً أو متوترة بسبب التأخير."
            prompt += "\n"
        
        prompt += f"الوصف: {task['description']}\n"
        
        # Shuffle instructions for diversity
        instructions = task['instructions'].copy()
        random.seed(self.get_seed(student['id'] + milestone))
        random.shuffle(instructions)
        prompt += "التعليمات (يجب الالتزام بها جميعاً):\n" + "\n".join([f"- {i}" for i in instructions]) + "\n"
        
        # Time Pressure
        if is_time_pressure:
            prompt += "\n**ملاحظة هامة:** أنت تعمل تحت ضغط زمني شديد وموعد تسليم قريب جداً. اجعل إجابتك مباشرة، قصيرة، وربما سريعة في صياغتها."
        else:
            prompt += "\n**ملاحظة هامة:** لديك متسع من الوقت للبحث والتفكير. اجعل إجابتك مستفيضة ومنسقة بعناية."

        # M2 Specific: Give them pooled examples
        if milestone == 'M2':
            prompt += "\nاستلهم من الأحداث التالية (لا تنسخها حرفياً، رتبها بأسلوبك):\n"
            for category in self.examples_pool:
                ex = random.choice(self.examples_pool[category])
                prompt += f"- {category}: {ex['title']} ({ex['date']})\n"

        # M3 Specific: Selection
        if milestone == 'M3':
             prompt += f"\nالتحليل المطلوب للقضايا التالية: {', '.join(profile['m3_selection'])}."

        prompt += f"\nعدد الكلمات المطلوب تقريباً: {task['minWords']}-{task['maxWords']} كلمة."
        
        return system_prompt, prompt

    def run(self):
        outputs_json = {}
        progress_path = 'progress.json'
        if os.path.exists(progress_path):
            with open(progress_path, 'r', encoding='utf-8') as f:
                progress = json.load(f)
        else:
            progress = {}

        # G3 and G4 Team Mapping
        teams = {}
        for s in self.students_data:
            if s['group'] in ['G3', 'G4']:
                team_id = f"{s['group']}_Team_{s.get('team_id', 'unknown')}"
                if team_id not in teams:
                    teams[team_id] = []
                teams[team_id].append(s)

        outputs_count = 0
        limit = 5  # Test limit

        # Main Loop logic
        for s in self.students_data:
            if outputs_count >= limit:
                break

            sid = s['id']
            sname = s.get('name', 'Unknown')
            group = s['group']
            is_dropout = sid in self.constants.get('DROPOUT_IDS', [])
            
            # Milestones for this student
            milestones = ['M1', 'M2'] if is_dropout else ['M1', 'M2', 'M3', 'M4', 'M5']
            
            # Profile
            profile = self.generate_student_profile(sid)

            for m in milestones:
                job_id = f"{sid}_{m}"
                
                # If team-based, we use a single job per team
                if group in ['G3', 'G4']:
                    team_id = f"{group}_Team_{s.get('team_id', 'unknown')}"
                    job_id = f"{team_id}_{m}"

                if job_id in progress:
                    continue

                print(f"Generating {job_id}...")
                
                # Calculate Skill & Flow based on Learning Curve (M1=0 ... M5=1.0)
                m_idx = int(m[1]) - 1
                ratios = [0.0, 0.4, 0.7, 0.9, 1.0]
                skill = s['preSkill'] + (s['postSkill'] - s['preSkill']) * ratios[m_idx]
                flow = s['preFlowLevel'] + (s['postFlowLevel'] - s['preFlowLevel']) * ratios[m_idx]

                # Update student object for prompt builder
                s_task = s.copy()
                s_task['flow_idx'] = flow

                sys_p, p = self.build_prompt(s_task, m, profile, skill)
                
                # Dynamic Temperature & Seed
                job_seed = self.get_seed(job_id)
                temp = 0.6 + (job_seed % 25) / 100.0 # Range 0.6 to 0.85
                
                try:
                    content = self.api.call_ai(p, sys_p, temperature=temp, seed=job_seed)
                    
                    # Naming logic: Name_Milestone_Date
                    sub_date = self.gradebook.get(sid, {}).get('dates', {}).get(m, 'NoDate').replace('/', '-').replace(':', '-')
                    file_id = f"{sname}_{m}_{sub_date}"
                    if group in ['G3', 'G4']:
                        team_id = f"{group}_Team_{s.get('team_id', 'unknown')}"
                        file_id = f"{team_id}_{m}_{sub_date}"

                    # Store result
                    outputs_json[file_id] = {
                        "content": content,
                        "metadata": {
                            "sid": sid if group in ['G1', 'G2'] else None,
                            "sname": sname,
                            "team": team_id if group in ['G3', 'G4'] else None,
                            "milestone": m,
                            "date": sub_date,
                            "skill": skill,
                            "style": profile['writing_style'],
                            "is_late": self.gradebook.get(sid, {}).get('lateness', {}).get(m, 'لا'),
                            "submission_date": self.gradebook.get(sid, {}).get('dates', {}).get(m, '')
                        }
                    }
                    
                    # Mark progress
                    progress[job_id] = True
                    outputs_count += 1
                    with open(progress_path, 'w', encoding='utf-8') as f:
                        json.dump(progress, f)
                    
                    if outputs_count >= limit:
                        break
                        
                except Exception as e:
                    print(f"Failed to generate {job_id}: {e}")
                    continue

        # Save result
        with open('outputs/json/assignments.json', 'w', encoding='utf-8') as f:
            json.dump(outputs_json, f, ensure_ascii=False, indent=2)

        print("Generation complete!")

if __name__ == "__main__":
    gen = AssignmentGenerator(os.path.join(os.path.dirname(__file__), 'config.json'))
    gen.run()
