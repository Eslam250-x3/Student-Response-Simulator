"""Extract config data from JS files and save as JSON for the Python generator."""
import re, json

def extract_config(path):
    with open(path, 'r', encoding='utf-8-sig') as f:
        txt = f.read()
    
    # --- Settings ---
    corr = [int(x) for x in re.findall(r'"correctAnswer"\s*:\s*(\d)', txt)]
    diffs = [float(x) for x in re.findall(r'"difficulty"\s*:\s*([\d.]+)', txt)]
    attrs = [int(x) for x in re.findall(r'"attractiveWrong"\s*:\s*(\d)', txt)]
    ids = re.findall(r'"id"\s*:\s*"(Q\d+)"', txt)
    
    questions = []
    for i in range(len(corr)):
        questions.append({
            "id": ids[i] if i < len(ids) else f"Q{i+1}",
            "difficulty": diffs[i] if i < len(diffs) else 0.35,
            "correctAnswer": corr[i],
            "attractiveWrong": attrs[i] if i < len(attrs) else 0,
            "numChoices": 4
        })
    return questions

def extract_flow_config(path):
    with open(path, 'r', encoding='utf-8-sig') as f:
        txt = f.read()
    
    # Negative items
    neg_match = re.search(r'"negativeItems"\s*:\s*\[([\d\s,]+)\]', txt)
    neg_items = [int(x.strip()) for x in neg_match.group(1).split(',') if x.strip()] if neg_match else []
    
    # Items count - look for items array
    item_ids = re.findall(r'"id"\s*:\s*(\d+)', txt)
    dims = re.findall(r'"dimension"\s*:\s*"([^"]+)"', txt)
    
    items = []
    for i in range(len(item_ids)):
        items.append({
            "id": int(item_ids[i]),
            "dimension": dims[i] if i < len(dims) else f"D{(i//7)+1}",
            "isNegative": int(item_ids[i]) in neg_items
        })
    
    # Choices
    choices_match = re.findall(r'"choices"\s*:\s*\[(.*?)\]', txt, re.S)
    choices = []
    if choices_match:
        choices = [c.strip().strip('"').strip("'") for c in choices_match[0].split(',')]
    
    return {
        "items": items,
        "negativeItems": neg_items,
        "choices": choices if choices else ["دائماً", "غالباً", "أحياناً", "نادراً", "أبداً"]
    }

def extract_students(path):
    with open(path, 'r', encoding='utf-8-sig') as f:
        txt = f.read()
    
    # JS uses unquoted keys: { id: "STD-001", name: "...", email: "...", group: "G1" }
    pattern = r'id:\s*"([^"]+)".*?name:\s*"([^"]+)".*?email:\s*"([^"]+)".*?group:\s*"([^"]+)"'
    matches = re.findall(pattern, txt)
    
    students = []
    for m in matches:
        students.append({
            "id": m[0],
            "name": m[1],
            "email": m[2],
            "group": m[3]
        })
    return students

if __name__ == '__main__':
    import os
    base = os.path.dirname(os.path.abspath(__file__))
    
    questions = extract_config(os.path.join(base, 'config.js'))
    flow = extract_flow_config(os.path.join(base, 'config_flow.js'))
    students = extract_students(os.path.join(base, 'students.js'))
    
    print(f"✅ Questions: {len(questions)}")
    print(f"✅ Flow items: {len(flow['items'])}")
    print(f"✅ Negative items: {flow['negativeItems']}")
    print(f"✅ Choices: {flow['choices']}")
    print(f"✅ Students: {len(students)}")
    print(f"   Groups: {dict((g, sum(1 for s in students if s['group']==g)) for g in ['G1','G2','G3','G4'])}")
    
    config_data = {
        "questions": questions,
        "flow": flow,
        "students": students
    }
    
    out = os.path.join(base, 'extracted_config.json')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(config_data, f, ensure_ascii=False, indent=2)
    print(f"\n📄 Saved to: {out}")
