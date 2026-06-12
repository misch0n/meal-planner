import { useState } from "react";
import { IngredientsPage } from "./components/pages/IngredientsPage";
import { ConverterPage } from "./components/pages/ConverterPage";
import { RecipesPage } from "./components/pages/RecipesPage";
import { HouseholdPage } from "./components/pages/HouseholdPage";
import { PlannerPage } from "./components/pages/PlannerPage";
import { ShoppingPage } from "./components/pages/ShoppingPage";
import { LoggerPage } from "./components/pages/LoggerPage";
import { AnalyticsPage } from "./components/pages/AnalyticsPage";
import { WeightPage } from "./components/pages/WeightPage";
import { DataPage } from "./components/pages/DataPage";

type PageId =
  | "ingredients"
  | "converter"
  | "recipes"
  | "household"
  | "planner"
  | "shopping"
  | "logger"
  | "analytics"
  | "weight"
  | "data";

const NAV: { id: PageId; label: string; icon: string }[] = [
  { id: "ingredients", label: "Ingredients", icon: "🥕" },
  { id: "converter", label: "Converter", icon: "⚖️" },
  { id: "recipes", label: "Recipes", icon: "📖" },
  { id: "household", label: "Household", icon: "👥" },
  { id: "planner", label: "Planner", icon: "🗓️" },
  { id: "shopping", label: "Shopping List", icon: "🛒" },
  { id: "logger", label: "Logger", icon: "✍️" },
  { id: "analytics", label: "Analytics", icon: "📊" },
  { id: "weight", label: "Weight", icon: "📉" },
  { id: "data", label: "Data & Backup", icon: "💾" },
];

export function App() {
  const [page, setPage] = useState<PageId>("planner");

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="brand">
          Meal Planner
          <small>Nutrition Engine · grams-only · offline</small>
        </div>
        {NAV.map((n) => (
          <button
            key={n.id}
            className={`nav-btn ${page === n.id ? "active" : ""}`}
            onClick={() => setPage(n.id)}
          >
            <span className="nav-icon">{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>
      <main className="main">
        {page === "ingredients" && <IngredientsPage />}
        {page === "converter" && <ConverterPage />}
        {page === "recipes" && <RecipesPage />}
        {page === "household" && <HouseholdPage />}
        {page === "planner" && <PlannerPage />}
        {page === "shopping" && <ShoppingPage />}
        {page === "logger" && <LoggerPage />}
        {page === "analytics" && <AnalyticsPage />}
        {page === "weight" && <WeightPage />}
        {page === "data" && <DataPage />}
      </main>
    </div>
  );
}
