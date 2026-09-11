import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { config } from "dotenv";
import { afterEach } from "vitest";

config({ path: ".env.test", override: true });

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
