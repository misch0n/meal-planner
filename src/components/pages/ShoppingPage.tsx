// Shopping list output (spec §6.4). Aggregate every planned recipe × every
// member's portion → sum grams per base ingredient across the plan → grouped by
// category. The handoff artifact: copy/download the plain export.
import { useMemo, useState } from "react";
import { useDB } from "../../store/DB";
import { buildShoppingList, formatGrams, shoppingListToText } from "../../lib/shopping";

export function ShoppingPage() {
  const { db, index } = useDB();
  const [planId, setPlanId] = useState(db.plans.at(-1)?.id ?? "");
  const plan = db.plans.find((p) => p.id === planId) ?? null;

  const result = useMemo(
    () => (plan ? buildShoppingList(plan, db.recipes, index) : null),
    [plan, db.recipes, index],
  );

  const text = result ? shoppingListToText(result.groups) : "";

  return (
    <div>
      <h1>Shopping List</h1>
      <p className="page-sub">
        Aggregated grams per base ingredient across the whole plan and all member portions. This is
        the handoff artifact — run it manually or feed it to a grocery integration.
      </p>

      {db.plans.length === 0 ? (
        <div className="note-box">No plans yet — generate one in the Planner first.</div>
      ) : (
        <div className="card">
          <div className="col">
            <label>Plan</label>
            <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
              <option value="">— select —</option>
              {db.plans.map((p) => (
                <option key={p.id} value={p.id}>
                  Week of {p.week_of} ({p.status})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {result && (
        <>
          {result.missing.length > 0 && (
            <div className="warn-box">
              {result.missing.length} referenced item(s) not found in the ingredient table.
            </div>
          )}

          {result.groups.map((g) => (
            <div className="card" key={g.category}>
              <div className="spread">
                <h2 style={{ margin: 0, textTransform: "capitalize" }}>{g.category}</h2>
                <span className="muted small">{formatGrams(g.grams)}</span>
              </div>
              <table>
                <tbody>
                  {g.lines.map((l) => (
                    <tr key={l.ingredient_id}>
                      <td>
                        {l.name}
                        {l.name_local && <span className="muted small"> · {l.name_local}</span>}
                      </td>
                      <td className="num">{formatGrams(l.grams)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <div className="card">
            <div className="spread">
              <h2 style={{ margin: 0 }}>Plain-text export</h2>
              <div className="toolbar" style={{ margin: 0 }}>
                <button onClick={() => navigator.clipboard?.writeText(text)}>Copy</button>
                <button onClick={() => downloadText(text, `shopping-${plan?.week_of}.txt`)}>
                  Download
                </button>
              </div>
            </div>
            <pre className="export">{text}</pre>
          </div>
        </>
      )}
    </div>
  );
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
