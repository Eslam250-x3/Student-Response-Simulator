import pandas as pd, numpy as np
from scipy import stats

df = pd.read_csv("e7sa_4/outputs/data_final.csv")
df = df[df["Is_Dropout"] == False].copy()
print(f"N = {len(df)}")

for dv_name, dv_col in [("حل المشكلات", "PS_Post_Total"), ("التدفق الذهني", "Flow_Post_Total")]:
    print(f"\n{'='*70}")
    print(f"  Two-way ANOVA: {dv_name}")
    print(f"{'='*70}")
    
    grand_mean = df[dv_col].mean()
    N = len(df)
    n = 20
    
    mean_pat = df.groupby("Pattern")[dv_col].mean()
    mean_tim = df.groupby("Timing")[dv_col].mean()
    cell = df.groupby(["Pattern","Timing"])[dv_col]
    cell_m = cell.mean()
    
    SS_pat = n*2*sum((mean_pat[p]-grand_mean)**2 for p in mean_pat.index)
    SS_tim = n*2*sum((mean_tim[t]-grand_mean)**2 for t in mean_tim.index)
    SS_int = 0
    for p in mean_pat.index:
        for t in mean_tim.index:
            SS_int += n*(cell_m.loc[(p,t)]-mean_pat[p]-mean_tim[t]+grand_mean)**2
    SS_err = sum(cell.apply(lambda x: np.sum((x-x.mean())**2)))
    SS_tot = np.sum((df[dv_col]-grand_mean)**2)
    
    df_p,df_t,df_i,df_e,df_tot = 1,1,1,N-4,N-1
    MS_p,MS_t,MS_i,MS_e = SS_pat/df_p,SS_tim/df_t,SS_int/df_i,SS_err/df_e
    F_p,F_t,F_i = MS_p/MS_e,MS_t/MS_e,MS_i/MS_e
    p_p = 1-stats.f.cdf(F_p,df_p,df_e)
    p_t = 1-stats.f.cdf(F_t,df_t,df_e)
    p_i = 1-stats.f.cdf(F_i,df_i,df_e)
    eta_p = SS_pat/(SS_pat+SS_err)
    eta_t = SS_tim/(SS_tim+SS_err)
    eta_i = SS_int/(SS_int+SS_err)
    
    print(f"| مصدر التباين | SS | df | MS | F | Sig | η² | حجم |")
    print(f"| نمط الحشد | {SS_pat:.2f} | {df_p} | {MS_p:.2f} | {F_p:.3f} | {p_p:.3f} | {eta_p:.3f} |")
    print(f"| الزمن | {SS_tim:.2f} | {df_t} | {MS_t:.2f} | {F_t:.3f} | {p_t:.3f} | {eta_t:.3f} |")
    print(f"| نمط×زمن | {SS_int:.2f} | {df_i} | {MS_i:.2f} | {F_i:.3f} | {p_i:.3f} | {eta_i:.3f} |")
    print(f"| الخطأ | {SS_err:.2f} | {df_e} | {MS_e:.2f} |")
    print(f"| الكلي | {SS_tot:.2f} | {df_tot} |")
    
    print(f"\nMarginals: Pat: {dict(mean_pat)}, Tim: {dict(mean_tim)}")

# Pre-test
print(f"\n{'='*70}\n  Pre-test ANOVA\n{'='*70}")
for nm,col in [("PS_Pre","PS_Pre_Total"),("Flow_Pre","Flow_Pre_Total")]:
    grps = [df.loc[df["Group"]==g,col].values for g in sorted(df["Group"].unique())]
    F,p = stats.f_oneway(*grps)
    print(f"  {nm}: F={F:.3f}, p={p:.3f}")

# Levene
print(f"\n  Levene's Test")
for nm,col in [("PS_Post","PS_Post_Total"),("Flow_Post","Flow_Post_Total")]:
    grps = [df.loc[df["Group"]==g,col].values for g in sorted(df["Group"].unique())]
    L,p = stats.levene(*grps)
    print(f"  {nm}: L={L:.3f}, p={p:.3f}")

# Shapiro
print(f"\n  Shapiro-Wilk")
for nm,col in [("PS_Post","PS_Post_Total"),("Flow_Post","Flow_Post_Total")]:
    for g in sorted(df["Group"].unique()):
        v = df.loc[df["Group"]==g,col].values
        W,p = stats.shapiro(v)
        grp_name = df.loc[df["Group"]==g,"Pattern"].iloc[0] + "×" + df.loc[df["Group"]==g,"Timing"].iloc[0]
        print(f"  {nm} | G{g} ({grp_name}): W={W:.3f}, p={p:.3f}")
