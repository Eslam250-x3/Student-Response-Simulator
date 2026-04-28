import os

sub_plans_dir = "fasl_4/master_plan/sub_plans"
files = sorted([f for f in os.listdir(sub_plans_dir) if f.endswith(".md") and not f.endswith(".bak")])

output_file = "fasl_4/الفصل_الرابع.md"

with open(output_file, "w", encoding="utf-8") as out:
    out.write("# الفصل الرابع: نتائج البحث وتفسيرها والتوصيات والمقترحات\n\n")
    out.write("---\n\n")
    for f in files:
        path = os.path.join(sub_plans_dir, f)
        with open(path, "r", encoding="utf-8") as infile:
            content = infile.read()
            # Remove the "# الساب بلان..." heading if we want it to look like a book, but keeping the actual heading.
            # actually we can just keep the whole content
            out.write(content)
            out.write("\n\n---\n\n")

print(f"تم تجميع الفصل الرابع بنجاح في {output_file}")
