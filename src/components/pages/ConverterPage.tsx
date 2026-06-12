// Standalone converter (spec §5). On-the-go unit conversions for any ingredient.
// Primary use: turn everyday VOLUMETRIC kitchen measures (teaspoon, tablespoon,
// cup, 1/4 cup …) into grams using the ingredient's density. Also exposes
// piece → mass where piece weights exist. Grams are the source of truth.
import { useMemo, useState } from "react";
import { useDB } from "../../store/DB";
import {
  gramsToPieces,
  piecesToGrams,
  pieceLabels,
  supportsPieces,
  supportsVolume,
} from "../../lib/conversion";
import { VOLUME_MEASURES, SYSTEM_LABEL, type VolumeMeasure } from "../../lib/measures";
import { Field } from "../ui";
import type { Ingredient } from "../../types";

// Solids/powders pack differently, so volume→mass is approximate for them.
const APPROXIMATE_CATEGORIES = new Set(["grain", "nut", "spice", "sweetener"]);

const round1 = (n: number) => Math.round(n * 10) / 10;

export function ConverterPage() {
  const { db } = useDB();
  const sorted = useMemo(
    () => [...db.ingredients].sort((a, b) => a.name.localeCompare(b.name)),
    [db.ingredients],
  );
  // Default to the first ingredient that actually has density (a liquid/staple).
  const firstWithDensity = sorted.find((i) => i.density_g_per_ml) ?? sorted[0];
  const [id, setId] = useState(firstWithDensity?.id ?? "");
  const ingredient = db.ingredients.find((i) => i.id === id);

  return (
    <div>
      <h1>Converter</h1>
      <p className="page-sub">
        Stop measuring 5 ml of oil — convert standard kitchen measures straight to grams. Volume
        conversions appear for any ingredient that carries density data.
      </p>

      <div className="card">
        <Field label="Ingredient">
          <select value={id} onChange={(e) => setId(e.target.value)} style={{ minWidth: 300 }}>
            {sorted.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
                {i.density_g_per_ml ? "" : "  (no density)"}
              </option>
            ))}
          </select>
        </Field>

        {ingredient && (
          <>
            {supportsVolume(ingredient) ? (
              <MeasureConverter ingredient={ingredient} />
            ) : (
              <p className="small muted" style={{ marginTop: 14 }}>
                No density on this ingredient → volume conversion unavailable. Add a{" "}
                <code>density g/ml</code> value on the Ingredients page to enable it.
              </p>
            )}

            {supportsPieces(ingredient) && <PieceConverter ingredient={ingredient} />}
          </>
        )}
      </div>
    </div>
  );
}

function MeasureConverter({ ingredient }: { ingredient: Ingredient }) {
  const density = ingredient.density_g_per_ml!;
  const [measureIdx, setMeasureIdx] = useState(
    VOLUME_MEASURES.findIndex((m) => m.label.startsWith("1 tablespoon")),
  );
  const [count, setCount] = useState(1);
  const measure = VOLUME_MEASURES[measureIdx];
  const grams = count * measure.ml * density;
  const approximate = APPROXIMATE_CATEGORIES.has(ingredient.category);

  // Group measures by system for an <optgroup> dropdown.
  const grouped = useMemo(() => {
    const g: Record<string, { idx: number; m: VolumeMeasure }[]> = {};
    VOLUME_MEASURES.forEach((m, idx) => {
      (g[m.system] ??= []).push({ idx, m });
    });
    return g;
  }, []);

  return (
    <div style={{ marginTop: 16 }}>
      <h3>Volume → grams (density {density} g/ml)</h3>

      <div className="row" style={{ alignItems: "flex-end" }}>
        <Field label="Quantity">
          <input
            type="number"
            step="any"
            value={count}
            onChange={(e) => setCount(+e.target.value)}
            style={{ width: 90 }}
          />
        </Field>
        <Field label="Measure">
          <select
            value={measureIdx}
            onChange={(e) => setMeasureIdx(+e.target.value)}
            style={{ minWidth: 200 }}
          >
            {Object.entries(grouped).map(([system, items]) => (
              <optgroup key={system} label={SYSTEM_LABEL[system as VolumeMeasure["system"]]}>
                {items.map(({ idx, m }) => (
                  <option key={idx} value={idx}>
                    {m.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <div style={{ paddingBottom: 8, fontSize: 18 }}>=</div>
        <div className="macro kcal" style={{ paddingBottom: 4 }}>
          <span className="v">{round1(grams)}</span>
          <span className="l">grams</span>
        </div>
      </div>

      {approximate && (
        <p className="small" style={{ color: "var(--warn)" }}>
          ⚠ {ingredient.category} is a solid/powder — volume↔mass depends on how it's packed, so
          treat this as an estimate.
        </p>
      )}

      <h4 style={{ margin: "16px 0 6px", fontSize: 12, color: "var(--muted)" }}>
        Quick reference (per 1 measure)
      </h4>
      <div className="card" style={{ padding: 0, marginBottom: 0, overflow: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Measure</th>
              <th className="num">ml</th>
              <th className="num">grams</th>
            </tr>
          </thead>
          <tbody>
            {VOLUME_MEASURES.map((m) => (
              <tr key={m.label}>
                <td>{m.label}</td>
                <td className="num">{round1(m.ml)}</td>
                <td className="num">{round1(m.ml * density)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PieceConverter({ ingredient }: { ingredient: Ingredient }) {
  const labels = pieceLabels(ingredient);
  const [label, setLabel] = useState(labels[0]);
  const [count, setCount] = useState(1);
  const [grams, setGrams] = useState(() => piecesToGrams(1, labels[0], ingredient) ?? 0);

  return (
    <div style={{ marginTop: 20 }}>
      <h3>Pieces ↔ grams</h3>
      <div className="row">
        <Field label="count">
          <input
            type="number"
            value={count}
            onChange={(e) => {
              const v = +e.target.value;
              setCount(v);
              setGrams(round1(piecesToGrams(v, label, ingredient) ?? 0));
            }}
          />
        </Field>
        <Field label="of">
          <select
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              setGrams(round1(piecesToGrams(count, e.target.value, ingredient) ?? 0));
            }}
          >
            {labels.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </Field>
        <span style={{ alignSelf: "center", paddingTop: 14 }}>↔</span>
        <Field label="grams">
          <input
            type="number"
            value={grams}
            onChange={(e) => {
              const v = +e.target.value;
              setGrams(v);
              setCount(Math.round((gramsToPieces(v, label, ingredient) ?? 0) * 100) / 100);
            }}
          />
        </Field>
      </div>
    </div>
  );
}
