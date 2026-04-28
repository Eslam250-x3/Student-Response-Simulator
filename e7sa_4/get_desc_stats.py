import pandas as pd

df = pd.read_csv("outputs/data_final.csv")
active = df[df["Is_Dropout"] == 0]

# Print Flow_Post_Total
print("Flow_Post_Total")
g = active.groupby("Group")["Flow_Post_Total"].agg(["count", "mean", "std"])
for idx, r in g.iterrows():
    print(f"G{idx}: N={int(r['count'])}, M={r['mean']:.2f}, SD={r['std']:.2f}")

# Print dimensions
for d in range(1, 9):
    print(f"\nDimension {d}")
    g = active.groupby("Group")[f"Flow_Post_D{d}"].agg(["mean", "std"])
    for idx, r in g.iterrows():
        print(f"G{idx}: M={r['mean']:.2f}, SD={r['std']:.2f}")
