// Standalone converter (spec §5). Always-available, independent of the meal-
// planning flow. For any ingredient, exposes whichever conversions it supports:
// g ↔ ml when density is known, g ↔ pieces when piece weights are known.
import { useMemo, useState } from "react";
import { useDB } from "../../store/DB";
import {
  gramsToMl,
  gramsToPieces,
  mlToGrams,
  piecesToGrams,
  pieceLabels,
  supportsPieces,
  supportsVolume,
} from "../../lib/conversion";
import { Field } from "../ui";
import type { Ingredient } from "../../types";

export function ConverterPage() {
  const { db } = useDB();
  const sorted = useMemo(
    () => [...db.ingredients].sort((a, b) => a.name.localeCompare(b.name)),
    [db.ingredients],
  );
  const [id, setId] = useState(sorted[0]?.id ?? "");
  const ingredient = db.ingredients.find((i) => i.id === id);

  return (
    <div>
      <h1>Converter</h1>
      <p className="page-sub">
        On-the-go unit conversions for any ingredient. Grams are the source of truth; volume and
        piece conversions appear only when the ingredient carries the data.
      </p>

      <div className="card">
        <Field label="Ingredient">
          <select value={id} onChange={(e) => setId(e.target.value)} style={{ minWidth: 280 }}>
            {sorted.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
                {i.name_local ? ` · ${i.name_local}` : ""}
              </option>
            ))}
          </select>
        </Field>

        {ingredient && (
          <>
            {supportsVolume(ingredient) ? (
              <VolumeConverter ingredient={ingredient} />
            ) : (
              <p className="small muted" style={{ marginTop: 14 }}>
                No density on this ingredient → volume conversion unavailable. Add{" "}
                <code>density g/ml</code> on the Ingredients page to enable it.
              </p>
            )}

            {supportsPieces(ingredient) ? (
              <PieceConverter ingredient={ingredient} />
            ) : (
              <p className="small muted">
                No piece weights on this ingredient → piece conversion unavailable.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function VolumeConverter({ ingredient }: { ingredient: Ingredient }) {
  const [ml, setMl] = useState(100);
  const [grams, setGrams] = useState(() => mlToGrams(100, ingredient) ?? 0);

  return (
    <div style={{ marginTop: 16 }}>
      <h3>Volume ↔ mass (density {ingredient.density_g_per_ml} g/ml)</h3>
      <div className="row">
        <Field label="millilitres">
          <input
            type="number"
            value={ml}
            onChange={(e) => {
              const v = +e.target.value;
              setMl(v);
              setGrams(Math.round((mlToGrams(v, ingredient) ?? 0) * 10) / 10);
            }}
          />
        </Field>
        <span style={{ alignSelf: "center", paddingTop: 14 }}>↔</span>
        <Field label="grams">
          <input
            type="number"
            value={grams}
            onChange={(e) => {
              const v = +e.target.value;
              setGrams(v);
              setMl(Math.round((gramsToMl(v, ingredient) ?? 0) * 10) / 10);
            }}
          />
        </Field>
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
    <div style={{ marginTop: 16 }}>
      <h3>Pieces ↔ mass</h3>
      <div className="row">
        <Field label="count">
          <input
            type="number"
            value={count}
            onChange={(e) => {
              const v = +e.target.value;
              setCount(v);
              setGrams(Math.round((piecesToGrams(v, label, ingredient) ?? 0) * 10) / 10);
            }}
          />
        </Field>
        <Field label="of">
          <select
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              setGrams(Math.round((piecesToGrams(count, e.target.value, ingredient) ?? 0) * 10) / 10);
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
