import { describe, expect, it, vi } from "vitest";
import type { InitApi } from "@clockwyrks/simple-2d";
import { cellX, cellY, game, type FacetState } from "./game";

function api(): InitApi<FacetState> {
  return {
    input: { register: vi.fn(), layout: () => null },
    audio: { define: vi.fn(), load: vi.fn().mockResolvedValue(undefined) },
    assets: {
      loadImage: vi.fn().mockResolvedValue({}),
      loadAudio: vi.fn(),
      load: vi.fn().mockResolvedValue(
        new Blob([
          JSON.stringify({
            dimensions: 2,
            field: { width: 128, height: 128 },
            durationMs: 1000,
            fps: 30,
            loop: true,
            emitters: [],
          }),
        ]),
      ),
      resolve: (p: string) => `assets/${p}`,
    },
    diagnostics: { register: vi.fn() },
    events: { on: vi.fn(() => vi.fn()), emit: vi.fn() },
    viewport: vi.fn(),
  } as unknown as InitApi<FacetState>;
}
const rows = [
  "R0 A0 C0 J0 B0 S0 M0 R0",
  "A0 C0 J0 B0 S0 M0 R0 A0",
  "C0 J0 B0 S0 M0 R0 A0 C0",
  "J0 B0 S0 M0 R0 A0 C0 J0",
  "B0 S0 M0 R0 A0 C0 J0 B0",
  "S0 M0 R0 A0 C0 J0 B0 S0",
  "M0 R0 A0 C0 J0 B0 S0 M0",
  "R0 A0 C0 J0 B0 S0 M0 R0",
];

describe("Facet", () => {
  it("initializes complete title state and canonical geometry", async () => {
    const [state, debug] = await game.initialize(api());
    expect(debug.snapshot(state)).toMatchObject({
      version: 1,
      screen: "title",
      level: 1,
      score: 0,
    });
    expect(state.refillKinds).toHaveLength(8);
    expect([cellX(0), cellY(0), cellX(7), cellY(7)]).toEqual([
      388, 144, 892, 648,
    ]);
  });
  it("loads notation without mutating the input", async () => {
    const [state, debug] = await game.initialize(api());
    const next = debug.loadBoard(state, rows);
    expect(state.board.cells).toHaveLength(0);
    expect(next.board.cells).toHaveLength(64);
    expect(next.board.cells[0]).toMatchObject({
      kind: "ruby",
      strain: 0,
      cut: "plain",
    });
  });
  it("refuses distant swaps and poses pointer selection immediately", async () => {
    const [base, debug] = await game.initialize(api());
    const state = debug.setScreen(debug.loadBoard(base, rows), "playing");
    expect(debug.requestSwap(state, 0, 0, 2, 0).refusal).not.toBeNull();
    const selected = debug.pointerDown(state, cellX(3), cellY(4), "touch");
    expect(selected.selection).toEqual({ col: 3, row: 4 });
    expect(selected.pointer.device).toBe("touch");
  });
});
