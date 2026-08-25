import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "../useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mantiene el valor inicial de inmediato", () => {
    const { result } = renderHook(() => useDebouncedValue("a", 300));
    expect(result.current).toBe("a");
  });

  it("no actualiza el valor antes de que pase el delay", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: "a" },
    });

    rerender({ value: "ab" });
    act(() => {
      vi.advanceTimersByTime(299);
    });

    expect(result.current).toBe("a");
  });

  it("actualiza el valor una vez que pasa el delay", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: "a" },
    });

    rerender({ value: "ab" });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("ab");
  });

  it("reinicia el timer si el valor cambia de nuevo antes de que expire", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: "a" },
    });

    rerender({ value: "ab" });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ value: "abc" });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // pasaron 400ms en total, pero el segundo cambio reinició el timer a los 200ms
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe("abc");
  });
});
