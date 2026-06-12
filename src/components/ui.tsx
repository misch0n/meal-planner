// Small shared presentational helpers used across pages.
import type { ReactNode } from "react";
import type { MacroTargets, NutrientProfile } from "../types";

export function MacroDisplay({ p }: { p: NutrientProfile | MacroTargets }) {
  return (
    <div className="macros">
      <div className="macro kcal">
        <span className="v">{Math.round(p.kcal)}</span>
        <span className="l">kcal</span>
      </div>
      <div className="macro protein">
        <span className="v">{Math.round(p.protein)}</span>
        <span className="l">protein g</span>
      </div>
      <div className="macro carb">
        <span className="v">{Math.round(p.carb)}</span>
        <span className="l">carb g</span>
      </div>
      <div className="macro fat">
        <span className="v">{Math.round(p.fat)}</span>
        <span className="l">fat g</span>
      </div>
    </div>
  );
}

/** A labelled progress bar comparing a consumed/planned value to a target. */
export function TargetBar({
  label,
  value,
  target,
  kind,
}: {
  label: string;
  value: number;
  target: number;
  kind: "kcal" | "protein" | "carb" | "fat";
}) {
  const pct = target > 0 ? (value / target) * 100 : 0;
  const over = pct > 105;
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="spread small">
        <span style={{ textTransform: "capitalize" }}>{label}</span>
        <span className="muted">
          {Math.round(value)} / {Math.round(target)} ({Math.round(pct)}%)
        </span>
      </div>
      <div className={`bar ${kind} ${over ? "over" : ""}`}>
        <span style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="col">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function Tags({ tags }: { tags: string[] }) {
  return (
    <span>
      {tags.map((t) => (
        <span key={t} className="tag">
          {t}
        </span>
      ))}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="note-box">{children}</div>;
}
