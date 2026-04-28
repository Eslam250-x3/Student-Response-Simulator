import pandas as pd

df = pd.read_csv("outputs/data_final.csv")
active = df[df["Is_Dropout"] == 0]

print("--- التنافسية (G1, G2) ---")
comp = active[active["Pattern"] == 1]
print(f"Task_Percentage mean: {comp['Task_Percentage'].mean():.2f}%")
print(f"Late_Count mean: {comp['Late_Count'].mean():.2f} مهام متأخرة من 5")

print("\n--- التشاركية (G3, G4) ---")
collab = active[active["Pattern"] == 2]
print(f"Task_Percentage mean: {collab['Task_Percentage'].mean():.2f}%")
print(f"Late_Count mean: {collab['Late_Count'].mean():.2f} مهام متأخرة من 5")

print("\n--- الزمن المحدد (G2, G4) ---")
lim = active[active["Timing"] == 1]
print(f"Late_Count mean: {lim['Late_Count'].mean():.2f} متأخر")

print("\n--- الزمن المفتوح (G1, G3) ---")
open_t = active[active["Timing"] == 2]
print(f"Late_Count mean: {open_t['Late_Count'].mean():.2f} متأخر")

