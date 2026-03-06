import os
import json
from pathlib import Path
from docx import Document
import logging

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent.resolve()
DOCX_DIR = BASE_DIR / 'outputs' / 'docx'
JSON_PATH = BASE_DIR / 'outputs' / 'json' / 'assignments.json'

def heal_json():
    if not DOCX_DIR.exists():
        logger.error(f"DOCX directory not found: {DOCX_DIR}")
        return

    # Load existing JSON
    data = {}
    if JSON_PATH.exists():
        with open(JSON_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
        logger.info(f"Loaded {len(data)} existing entries from JSON.")

    healed_count = 0
    
    # Walk through DOCX files
    for root, dirs, files in os.walk(DOCX_DIR):
        for f in files:
            if not f.endswith('.docx'):
                continue
            
            path = Path(root) / f
            student_name = path.parent.name
            
            # Filename format: M1_2026-03-02 14_58.docx
            # Milestone is first part
            milestone = f.split('_')[0]
            
            # Construct JSON key (matches logic in generate_assignments.py)
            # file_id = f"{sname}_{m}_{sub_date_safe}"
            # sub_date_safe = sub_date.replace('/', '-').replace(':', '-').replace(' ', '_')
            date_part = f.split('_', 1)[1].replace('.docx', '')
            # The date in filename has ' ' and '_' for ':'
            # Actually generate_assignments uses: sub_date_safe = sub_date.replace('/', '-').replace(':', '-').replace(' ', '_')
            # Filename is saved as: f"{milestone}_{sub_date_safe}.docx"
            key = f"{student_name}_{milestone}_{date_part}"
            
            if key in data:
                continue
                
            try:
                doc = Document(path)
                content = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
                
                # Reconstruct minimum metadata from path and filename
                # We don't have all original metadata (skill, flow, profile) 
                # but we can fill it with placeholders or inferred values
                
                # Try to parse date back
                # 2026-03-02 14_58 -> 2026-03-02 14:58
                display_date = date_part.replace('_', ':') # approximate
                
                entry = {
                    "content": content,
                    "metadata": {
                        "sid": "KNOWN_FROM_DOCX", # Placeholder
                        "sname": student_name,
                        "milestone": milestone,
                        "date": display_date,
                        "healed": True
                    },
                    "prompts": {
                        "system": "HEALED_FROM_DOCX",
                        "user": "HEALED_FROM_DOCX"
                    }
                }
                
                data[key] = entry
                healed_count += 1
                logger.info(f"  Healed: {key}")
                
            except Exception as e:
                logger.error(f"  Failed to heal {path}: {e}")

    # Save healed JSON
    JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    logger.info(f"\n🎉 Healing complete! Added {healed_count} missing entries.")
    logger.info(f"Total entries in JSON: {len(data)}")

if __name__ == "__main__":
    heal_json()
