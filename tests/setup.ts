import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { config } from "dotenv";
import { afterEach } from "vitest";

// override: false (dotenv's default) — a plain local `pnpm test` has no
// DATABASE_URL etc. pre-set, so .env.test's local docker-compose values
// (port 5435) fill in normally. CI's workflow sets its own DATABASE_URL
// (the GH Actions postgres service, port 5432) before invoking `pnpm
// test`; overriding it here would silently point every test at a port
// nothing listens on in CI, which is exactly what an earlier
// `override: true` did — every DB-touching test failed with ECONNREFUSED
// in CI, every time, invisibly, since a plain local run never has
// anything to override in the first place.
config({ path: ".env.test", override: false });

// RTL's auto-cleanup only registers when it detects `afterEach` on the
// global object, which requires vitest's `test.globals: true` — we don't
// set that (explicit imports are clearer), so register cleanup manually.
afterEach(() => {
  cleanup();
});

// jsdom doesn't implement these, but Radix UI (Dialog/Popover, used by the
// shadcn Command palette) calls them during mount/interaction in tests.
if (typeof window !== "undefined") {
  window.HTMLElement.prototype.scrollIntoView ??= () => {};
  window.HTMLElement.prototype.hasPointerCapture ??= () => false;
  window.HTMLElement.prototype.setPointerCapture ??= () => {};
  window.HTMLElement.prototype.releasePointerCapture ??= () => {};

  if (typeof window.ResizeObserver === "undefined") {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
}
