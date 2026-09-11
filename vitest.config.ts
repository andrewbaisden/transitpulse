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
  },
});
