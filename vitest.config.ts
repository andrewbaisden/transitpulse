import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // Component tests opt into jsdom individually via a
    // `// @vitest-environment jsdom` docblock at the top of the file.
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.ts", "tests/components/**/*.test.tsx"],
    // Integration tests under tests/unit share one Postgres test database;
    // running test files concurrently races on shared rows (e.g. the
    // "London" Network upsert). Sequential file execution avoids that
    // without weakening the idempotency guarantees being tested.
    fileParallelism: false,
    // Vitest's default per-file isolation resets globalThis between test
    // files (a fresh vm context per file), which defeats
    // src/server/db/client.ts's `globalThis.__prisma` singleton guard —
    // every file was opening its own never-closed pg.Pool. Sequentially
    // through enough files, the accumulated open connections exceeded
    // Postgres's default max_connections and started failing with
    // ECONNREFUSED (surfaced in CI, not locally, since CI first hit this
    // once an unrelated typecheck/build gap was fixed). isolate: false
    // keeps one shared module registry — and one real Prisma
    // connection — for the whole run, matching what the singleton
    // comment already intended.
    isolate: false,
  },
});
