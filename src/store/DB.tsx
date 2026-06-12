// ─────────────────────────────────────────────────────────────────────────────
// Database context. Holds the whole DB in React state, persists every change to
// localStorage, and exposes typed mutators. Components never touch localStorage
// directly — they go through these helpers.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type {
  Database,
  Ingredient,
  LogEntry,
  MealPlan,
  Member,
  Recipe,
  WeightEntry,
} from "../types";
import { indexIngredients, type IngredientIndex } from "../lib/nutrition";
import { loadDatabase, resetDatabase, saveDatabase } from "../lib/storage";

interface DBContextValue {
  db: Database;
  index: IngredientIndex;
  setDb: (db: Database) => void;
  reset: () => void;

  upsertIngredient: (ing: Ingredient) => void;
  deleteIngredient: (id: string) => void;

  upsertRecipe: (r: Recipe) => void;
  deleteRecipe: (id: string) => void;

  upsertMember: (m: Member) => void;
  deleteMember: (id: string) => void;

  upsertPlan: (p: MealPlan) => void;
  deletePlan: (id: string) => void;

  addLog: (e: LogEntry) => void;
  deleteLog: (id: string) => void;

  addWeight: (w: WeightEntry) => void;
  deleteWeight: (id: string) => void;
}

const DBContext = createContext<DBContextValue | null>(null);

export function DBProvider({ children }: { children: ReactNode }) {
  const [db, setDbState] = useState<Database>(() => loadDatabase());

  useEffect(() => {
    saveDatabase(db);
  }, [db]);

  const setDb = useCallback((next: Database) => setDbState(next), []);
  const reset = useCallback(() => setDbState(resetDatabase()), []);

  const upsertIngredient = useCallback((ing: Ingredient) => {
    setDbState((d) => ({
      ...d,
      ingredients: upsertById(d.ingredients, ing),
    }));
  }, []);
  const deleteIngredient = useCallback((id: string) => {
    setDbState((d) => ({ ...d, ingredients: d.ingredients.filter((x) => x.id !== id) }));
  }, []);

  const upsertRecipe = useCallback((r: Recipe) => {
    setDbState((d) => ({ ...d, recipes: upsertById(d.recipes, r) }));
  }, []);
  const deleteRecipe = useCallback((id: string) => {
    setDbState((d) => ({ ...d, recipes: d.recipes.filter((x) => x.id !== id) }));
  }, []);

  const upsertMember = useCallback((m: Member) => {
    setDbState((d) => ({
      ...d,
      household: { members: upsertById(d.household.members, m) },
    }));
  }, []);
  const deleteMember = useCallback((id: string) => {
    setDbState((d) => ({
      ...d,
      household: { members: d.household.members.filter((x) => x.id !== id) },
    }));
  }, []);

  const upsertPlan = useCallback((p: MealPlan) => {
    setDbState((d) => ({ ...d, plans: upsertById(d.plans, p) }));
  }, []);
  const deletePlan = useCallback((id: string) => {
    setDbState((d) => ({ ...d, plans: d.plans.filter((x) => x.id !== id) }));
  }, []);

  const addLog = useCallback((e: LogEntry) => {
    setDbState((d) => ({ ...d, logs: [...d.logs, e] }));
  }, []);
  const deleteLog = useCallback((id: string) => {
    setDbState((d) => ({ ...d, logs: d.logs.filter((x) => x.id !== id) }));
  }, []);

  const addWeight = useCallback((w: WeightEntry) => {
    setDbState((d) => ({ ...d, weights: [...d.weights, w] }));
  }, []);
  const deleteWeight = useCallback((id: string) => {
    setDbState((d) => ({ ...d, weights: d.weights.filter((x) => x.id !== id) }));
  }, []);

  const index = useMemo(() => indexIngredients(db.ingredients), [db.ingredients]);

  const value: DBContextValue = {
    db,
    index,
    setDb,
    reset,
    upsertIngredient,
    deleteIngredient,
    upsertRecipe,
    deleteRecipe,
    upsertMember,
    deleteMember,
    upsertPlan,
    deletePlan,
    addLog,
    deleteLog,
    addWeight,
    deleteWeight,
  };

  return <DBContext.Provider value={value}>{children}</DBContext.Provider>;
}

export function useDB(): DBContextValue {
  const ctx = useContext(DBContext);
  if (!ctx) throw new Error("useDB must be used within a DBProvider");
  return ctx;
}

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx === -1) return [...list, item];
  const copy = list.slice();
  copy[idx] = item;
  return copy;
}
