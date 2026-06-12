// Data & backup (spec §3). JSON export/import is the backup mechanism, the
// migration path, and insurance against "clear browsing data". Also hosts the
// required CIQUAL attribution (spec §4).
import { useRef, useState } from "react";
import { useDB } from "../../store/DB";
import { exportDatabase, importDatabase, downloadDatabase } from "../../lib/storage";

export function DataPage() {
  const { db, setDb, reset } = useDB();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  const onImportFile = async (file: File) => {
    const text = await file.text();
    const result = importDatabase(text);
    if (result.ok && result.db) {
      setDb(result.db);
      setStatus("Import successful — database replaced.");
    } else {
      setStatus(`Import failed: ${result.error}`);
    }
  };

  const counts = {
    ingredients: db.ingredients.length,
    recipes: db.recipes.length,
    members: db.household.members.length,
    plans: db.plans.length,
    logs: db.logs.length,
    weights: db.weights.length,
  };

  return (
    <div>
      <h1>Data &amp; Backup</h1>
      <p className="page-sub">
        The entire database lives in your browser's local storage. Export regularly — clearing
        browsing data wipes everything otherwise.
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Current database</h2>
        <div className="macros">
          {Object.entries(counts).map(([k, v]) => (
            <div className="macro" key={k}>
              <span className="v">{v}</span>
              <span className="l">{k}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Backup</h2>
        <div className="toolbar">
          <button className="primary" onClick={() => downloadDatabase(db)}>
            Download JSON backup
          </button>
          <button onClick={() => fileRef.current?.click()}>Import JSON…</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportFile(f);
              e.target.value = "";
            }}
          />
          <button
            className="danger"
            onClick={() => {
              if (confirm("Reset to the seed database? This discards all local data.")) {
                reset();
                setStatus("Database reset to seed.");
              }
            }}
          >
            Reset to seed
          </button>
        </div>
        {status && <p className="small">{status}</p>}
        <p className="disclaimer">
          Importing replaces the current database entirely. Download a backup first if unsure.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Raw export (read-only)</h2>
        <pre className="export">{exportDatabase(db).slice(0, 4000)}</pre>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Credits &amp; data sources</h2>
        <p className="small">
          Nutrition data derived from <strong>Anses. Ciqual French food composition table</strong>{" "}
          (French <em>Open Licence</em> / Etalab) and the public-domain{" "}
          <strong>USDA FoodData Central</strong>. Manual entries cover items without coverage.
          Density and piece-weight conversion data are sourced separately from standard food
          references. The bundled dataset in this build is a curated starter sample, not the full
          CIQUAL table.
        </p>
        <p className="disclaimer">
          Daily-needs calculations use the Mifflin-St Jeor equation — a general estimate for
          able-bodied adults, not medical advice.
        </p>
      </div>
    </div>
  );
}
