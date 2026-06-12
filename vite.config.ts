/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Deployed to GitHub Pages at https://<user>.github.io/meal-planner/
// The base path must match the repository name for assets to resolve.
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES ? "/meal-planner/" : "/",
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
