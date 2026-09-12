// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useLiveServiceStatus, useLiveStatusStore } from "@/lib/live-status-store";

describe("live-status-store", () => {
  beforeEach(() => {
    useLiveStatusStore.setState({ overrides: {} });
  });

  it("falls back to the initial values with no override present", () => {
    const initial = {
      status: "GOOD_SERVICE" as const,
      description: null,
      recordedAt: new Date("2026-09-11T08:00:00Z"),
    };
    const { result } = renderHook(() => useLiveServiceStatus("central-id", initial));

    expect(result.current).toEqual({ ...initial, isLive: false });
  });

  it("returns the live override once setOverride is called for that lineId", () => {
    const initial = {
      status: "GOOD_SERVICE" as const,
      description: null,
      recordedAt: new Date("2026-09-11T08:00:00Z"),
    };
    const override = {
      status: "SEVERE_DELAYS" as const,
      description: "Signal failure",
      recordedAt: new Date("2026-09-12T09:00:00Z"),
    };

    const { result } = renderHook(() => useLiveServiceStatus("central-id", initial));

    act(() => {
      useLiveStatusStore.getState().setOverride("central-id", override);
    });

    expect(result.current).toEqual({ ...override, isLive: true });
  });

  it("does not affect other lineIds", () => {
    const initial = {
      status: "GOOD_SERVICE" as const,
      description: null,
      recordedAt: new Date("2026-09-11T08:00:00Z"),
    };

    act(() => {
      useLiveStatusStore.getState().setOverride("other-line-id", {
        status: "SUSPENDED",
        description: "Track fire",
        recordedAt: new Date(),
      });
    });

    const { result } = renderHook(() => useLiveServiceStatus("central-id", initial));
    expect(result.current).toEqual({ ...initial, isLive: false });
  });
});
