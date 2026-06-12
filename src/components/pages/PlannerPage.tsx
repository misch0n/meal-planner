// Planner (spec §6.3, build step 4). Per-member constrained-random plan with
// portion-scaling to hit each member's targets. Swaps re-roll + re-balance.
// Status machine: DRAFT → APPROVED → CART_READY → ORDERED (§7).
import { useMemo, useState } from "react";
import { useDB } from "../../store/DB";
import { newId } from "../../lib/storage";
import {
  generatePlan,
  swapMeal,
  type UnbalanceableNote,
} from "../../lib/planner";
import { analyzeRecipe, scaleProfile100ToFactor } from "../../lib/nutrition";
import { computeTargets } from "../../lib/needs";
import { dateRange } from "../../lib/analytics";
import { SLOTS, type MealPlan, type PlanStatus, type Slot } from "../../types";

const STATUS_ORDER: PlanStatus[] = ["DRAFT", "APPROVED", "CART_READY", "ORDERED"];

function mondayOf(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export function PlannerPage() {
  const { db, upsertPlan, deletePlan, index, addLog } = useDB();
  const recipeById = useMemo(() => new Map(db.recipes.map((r) => [r.id, r])), [db.recipes]);
  const memberById = useMemo(
    () => new Map(db.household.members.map((m) => [m.id, m])),
    [db.household.members],
  );

  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date().toISOString().slice(0, 10)));
  const [days, setDays] = useState(7);
  const [activePlanId, setActivePlanId] = useState<string | null>(db.plans.at(-1)?.id ?? null);
  const [unbalanceable, setUnbalanceable] = useState<UnbalanceableNote[]>([]);
  const [error, setError] = useState<string | null>(null);

  const plan = db.plans.find((p) => p.id === activePlanId) ?? null;

  const generate = () => {
    setError(null);
    if (db.household.members.length === 0) {
      setError("Add at least one household member first.");
      return;
    }
    try {
      const dates = dateRange(weekStart, addDays(weekStart, days - 1));
      const { plan: p, unbalanceable: u } = generatePlan(db.recipes, db.household.members, index, {
        dates,
      });
      const stamped: MealPlan = { ...p, id: newId("plan"), week_of: weekStart };
      upsertPlan(stamped);
      setActivePlanId(stamped.id);
      setUnbalanceable(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const doSwap = (date: string, slot: Slot) => {
    if (!plan) return;
    const { plan: next, unbalanceable: u } = swapMeal(
      plan,
      date,
      slot,
      db.recipes,
      db.household.members,
      index,
    );
    upsertPlan(next);
    // Merge: keep notes for other days, replace this day's.
    setUnbalanceable((prev) => [...prev.filter((n) => n.date !== date), ...u]);
  };

  const setStatus = (status: PlanStatus) => {
    if (plan) upsertPlan({ ...plan, status });
  };

  const logDay = (date: string) => {
    if (!plan) return;
    const day = plan.days.find((d) => d.date === date);
    if (!day) return;
    for (const meal of day.meals) {
      const recipe = recipeById.get(meal.recipe_id);
      if (!recipe) continue;
      const base = analyzeRecipe(recipe, index).profile;
      for (const [memberId, portion] of Object.entries(meal.portions)) {
        if (portion <= 0) continue;
        const p = scaleProfile100ToFactor(base, portion);
        addLog({
          id: newId("log"),
          date,
          slot: meal.slot,
          member_id: memberId,
          kind: "planned",
          ref: recipe.id,
          macros: {
            kcal: Math.round(p.kcal),
            protein: Math.round(p.protein),
            carb: Math.round(p.carb),
            fat: Math.round(p.fat),
          },
          note: recipe.name,
        });
      }
    }
    alert(`Logged ${day.meals.length} planned meals for ${date}.`);
  };

  const orderedLock = plan?.status === "ORDERED";

  return (
    <div>
      <h1>Planner</h1>
      <p className="page-sub">
        Constrained-random selection, per-member portion scaling. The algorithm owns all the math —
        portions land within 0.5×–2.0× or the day is flagged unbalanceable.
      </p>

      <div className="card">
        <div className="row">
          <div className="col">
            <label>Week starts</label>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(mondayOf(e.target.value))}
            />
          </div>
          <div className="col">
            <label>Days</label>
            <input
              type="number"
              min={1}
              max={14}
              value={days}
              onChange={(e) => setDays(Math.max(1, Math.min(14, +e.target.value)))}
            />
          </div>
          <button className="primary" style={{ alignSelf: "flex-end" }} onClick={generate}>
            Generate plan
          </button>
        </div>
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      </div>

      {db.plans.length > 0 && (
        <div className="card">
          <div className="spread">
            <div className="col">
              <label>Active plan</label>
              <select value={activePlanId ?? ""} onChange={(e) => setActivePlanId(e.target.value)}>
                {db.plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    Week of {p.week_of} ({p.status})
                  </option>
                ))}
              </select>
            </div>
            {plan && (
              <div className="toolbar" style={{ margin: 0 }}>
                <span className={`pill ${plan.status.toLowerCase()}`}>{plan.status}</span>
                {nextStatus(plan.status) && (
                  <button className="primary btn-sm" onClick={() => setStatus(nextStatus(plan.status)!)}>
                    → {nextStatus(plan.status)}
                  </button>
                )}
                <button className="danger btn-sm" onClick={() => { deletePlan(plan.id); setActivePlanId(null); }}>
                  Delete
                </button>
              </div>
            )}
          </div>
          {orderedLock && (
            <div className="warn-box" style={{ marginTop: 12, marginBottom: 0 }}>
              Plan is ORDERED. Swaps are disabled — what's bought is bought. Re-generate a new plan
              for next week, or log ad-hoc changes in the Logger.
            </div>
          )}
        </div>
      )}

      {unbalanceable.length > 0 && (
        <div className="warn-box">
          <strong>Unbalanceable member-days ({unbalanceable.length})</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {unbalanceable.map((n, i) => (
              <li key={i}>
                {n.date} · {memberById.get(n.member_id)?.name ?? n.member_id}: {n.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan?.days.map((day) => (
        <div className="card" key={day.date}>
          <div className="spread">
            <h2 style={{ margin: 0 }}>{formatDay(day.date)}</h2>
            <button className="btn-sm" onClick={() => logDay(day.date)}>
              Log this day
            </button>
          </div>

          {SLOTS.map((slot) => {
            const meal = day.meals.find((m) => m.slot === slot);
            if (!meal) return null;
            const recipe = recipeById.get(meal.recipe_id);
            return (
              <div className="slot-grid" key={slot} style={{ marginTop: 10 }}>
                <div className="slot-label">{slot}</div>
                <div>
                  <div className="spread">
                    <strong>{recipe?.name ?? "⚠ missing recipe"}</strong>
                    <button
                      className="btn-sm ghost"
                      disabled={orderedLock}
                      onClick={() => doSwap(day.date, slot)}
                    >
                      ⟳ Swap
                    </button>
                  </div>
                  <div className="small muted" style={{ marginTop: 4 }}>
                    {db.household.members.map((m) => (
                      <span key={m.id} className="tag">
                        {m.name}: {meal.portions[m.id]?.toFixed(2) ?? "—"}×
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          <DaySummary plan={plan} date={day.date} />
        </div>
      ))}

      {!plan && db.plans.length === 0 && (
        <div className="note-box">No plans yet. Set a week and hit “Generate plan”.</div>
      )}
    </div>
  );
}

function DaySummary({ plan, date }: { plan: MealPlan; date: string }) {
  const { db, index } = useDB();
  const recipeById = useMemo(() => new Map(db.recipes.map((r) => [r.id, r])), [db.recipes]);
  const day = plan.days.find((d) => d.date === date)!;

  return (
    <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
      {db.household.members.map((m) => {
        let kcal = 0,
          protein = 0,
          carb = 0,
          fat = 0;
        for (const meal of day.meals) {
          const recipe = recipeById.get(meal.recipe_id);
          if (!recipe) continue;
          const portion = meal.portions[m.id] ?? 0;
          const p = scaleProfile100ToFactor(analyzeRecipe(recipe, index).profile, portion);
          kcal += p.kcal;
          protein += p.protein;
          carb += p.carb;
          fat += p.fat;
        }
        const t = computeTargets(m);
        return (
          <div key={m.id} className="spread small" style={{ marginBottom: 4 }}>
            <span style={{ minWidth: 110 }}>{m.name}</span>
            <span className="muted">
              {Math.round(kcal)}/{t.kcal} kcal · P {Math.round(protein)}/{t.protein} · C{" "}
              {Math.round(carb)}/{t.carb} · F {Math.round(fat)}/{t.fat}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function nextStatus(s: PlanStatus): PlanStatus | null {
  const i = STATUS_ORDER.indexOf(s);
  return i >= 0 && i < STATUS_ORDER.length - 1 ? STATUS_ORDER[i + 1] : null;
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatDay(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
