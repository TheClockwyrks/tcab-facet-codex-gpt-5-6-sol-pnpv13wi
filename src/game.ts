import type {
  Game,
  InitApi,
  RenderApi,
  UpdateApi,
} from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import { ParticleSimulator } from "@clockwyrks/particle-runtime";
import type { ParticleSystem } from "@clockwyrks/particle-runtime";
import * as K from "./constants";

export type GemKind = (typeof K.GEM_KINDS)[number];
export type Cut = "plain" | "brilliant" | "star" | "prism";
export type Screen =
  "title" | "howto" | "playing" | "paused" | "levelclear" | "gameover";
export type Phase = "idle" | "swapping" | "resolving";
export type PointerDevice = "mouse" | "pen" | "touch";
export interface CellRef {
  readonly col: number;
  readonly row: number;
}
export interface GemState {
  readonly col: number;
  readonly row: number;
  readonly kind: GemKind | null;
  readonly cut: Cut;
  readonly strain: number;
  readonly fell: number;
}
export interface BoardState {
  readonly cols: number;
  readonly rows: number;
  readonly cells: readonly GemState[];
}
export interface RefusalState {
  readonly a: CellRef;
  readonly b: CellRef;
  readonly timer: number;
}
export interface PointerState {
  readonly x: number;
  readonly y: number;
  readonly down: boolean;
  readonly device: PointerDevice;
}
export interface FacetState {
  readonly screen: Screen;
  readonly menuIndex: number;
  readonly board: BoardState;
  readonly phase: Phase;
  readonly chainStep: number;
  readonly swapTimer: number;
  readonly stepTimer: number;
  readonly score: number;
  readonly level: number;
  readonly levelScore: number;
  readonly lastCleared: number;
  readonly lastPoints: number;
  readonly lastWaves: number;
  readonly moveScore: number;
  readonly bestMove: number;
  readonly bestChain: number;
  readonly selection: CellRef | null;
  readonly offer: CellRef | null;
  readonly refusal: RefusalState | null;
  readonly armedTarget: string | null;
  readonly pointer: PointerState;
  readonly simTime: number;
  readonly muted: boolean;
  readonly refillKinds: readonly string[];
}
interface Internal extends FacetState {
  readonly _swap?: readonly [CellRef, CellRef];
  readonly _prism?: GemKind | "all" | null;
}
interface Target {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
interface Run {
  readonly cells: readonly CellRef[];
  readonly kind: GemKind;
  readonly horizontal: boolean;
}
export interface FacetDebugApi {
  readonly version: number;
  reset(s: DeepReadonly<FacetState>): FacetState;
  reconcile(s: DeepReadonly<FacetState>): FacetState;
  snapshot(s: DeepReadonly<FacetState>): unknown;
  setScreen(s: DeepReadonly<FacetState>, screen: Screen): FacetState;
  setMenuIndex(s: DeepReadonly<FacetState>, index: number): FacetState;
  loadBoard(s: DeepReadonly<FacetState>, rows: readonly string[]): FacetState;
  dealBoard(s: DeepReadonly<FacetState>): FacetState;
  clearBoard(s: DeepReadonly<FacetState>): FacetState;
  setGem(
    s: DeepReadonly<FacetState>,
    col: number,
    row: number,
    token: string,
  ): FacetState;
  setRefillKinds(
    s: DeepReadonly<FacetState>,
    col: number,
    kinds: string,
  ): FacetState;
  clearRefillKinds(s: DeepReadonly<FacetState>): FacetState;
  setScore(s: DeepReadonly<FacetState>, points: number): FacetState;
  setLevel(s: DeepReadonly<FacetState>, level: number): FacetState;
  setLevelScore(s: DeepReadonly<FacetState>, points: number): FacetState;
  setBestChain(s: DeepReadonly<FacetState>, n: number): FacetState;
  setBestMove(s: DeepReadonly<FacetState>, points: number): FacetState;
  setMoveScore(s: DeepReadonly<FacetState>, points: number): FacetState;
  setSelection(
    s: DeepReadonly<FacetState>,
    col: number,
    row: number,
  ): FacetState;
  clearSelection(s: DeepReadonly<FacetState>): FacetState;
  setOffer(s: DeepReadonly<FacetState>, col: number, row: number): FacetState;
  clearOffer(s: DeepReadonly<FacetState>): FacetState;
  clearRefusal(s: DeepReadonly<FacetState>): FacetState;
  clearChain(s: DeepReadonly<FacetState>): FacetState;
  requestSwap(
    s: DeepReadonly<FacetState>,
    ca: number,
    ra: number,
    cb: number,
    rb: number,
  ): FacetState;
  pointerDown(
    s: DeepReadonly<FacetState>,
    x: number,
    y: number,
    d?: PointerDevice,
  ): FacetState;
  pointerMove(
    s: DeepReadonly<FacetState>,
    x: number,
    y: number,
    d?: PointerDevice,
  ): FacetState;
  pointerUp(s: DeepReadonly<FacetState>, d?: PointerDevice): FacetState;
}

export const BACKGROUND = "#07101f";
const images = new Map<string, ImageBitmap>();
let auraSimulator: ParticleSimulator | null = null;
export const cellX = (c: number): number =>
  K.BOARD_CX - ((K.GRID_COLS - 1) * K.CELL_PITCH) / 2 + c * K.CELL_PITCH;
export const cellY = (r: number): number =>
  K.BOARD_CY - ((K.GRID_ROWS - 1) * K.CELL_PITCH) / 2 + r * K.CELL_PITCH;
const id = (c: number, r: number): string => `${c},${r}`;
const valid = (c: number, r: number): boolean =>
  Number.isInteger(c) &&
  Number.isInteger(r) &&
  c >= 0 &&
  c < 8 &&
  r >= 0 &&
  r < 8;
const gem = (
  b: DeepReadonly<BoardState>,
  c: number,
  r: number,
): DeepReadonly<GemState> | undefined => b.cells[r * b.cols + c];
const copy = (s: DeepReadonly<FacetState>): Internal => ({
  ...s,
  board: { ...s.board, cells: s.board.cells.map((g) => ({ ...g })) },
  refillKinds: [...s.refillKinds],
});
const opening = (muted = false): Internal => ({
  screen: "title",
  menuIndex: 0,
  board: { cols: 0, rows: 0, cells: [] },
  phase: "idle",
  chainStep: 0,
  swapTimer: 0,
  stepTimer: 0,
  score: 0,
  level: 1,
  levelScore: 0,
  lastCleared: 0,
  lastPoints: 0,
  lastWaves: 0,
  moveScore: 0,
  bestMove: 0,
  bestChain: 0,
  selection: null,
  offer: null,
  refusal: null,
  armedTarget: null,
  pointer: { x: 0, y: 0, down: false, device: "mouse" },
  simTime: 0,
  muted,
  refillKinds: Array<string>(8).fill(""),
});
const letters: Record<string, GemKind> = {
  R: "ruby",
  A: "amber",
  C: "citrine",
  J: "jade",
  B: "beryl",
  S: "sapphire",
  M: "amethyst",
};
function token(t: string, col: number, row: number): GemState {
  const m = /^([RACJBSMX])([0-3])([bs]?)$/.exec(t);
  if (!m || (m[1] === "X" && m[3]))
    throw new Error(`Facet: invalid gem token ${t}`);
  if (m[1] === "X")
    return { col, row, kind: null, cut: "prism", strain: +m[2], fell: 0 };
  return {
    col,
    row,
    kind: letters[m[1]],
    cut: m[3] === "b" ? "brilliant" : m[3] === "s" ? "star" : "plain",
    strain: +m[2],
    fell: 0,
  };
}
function parseBoard(rows: readonly string[]): BoardState {
  if (rows.length !== 8) throw new Error("Facet: board must have 8 rows");
  const cells: GemState[] = [];
  rows.forEach((line, r) => {
    const ts = line.trim().split(/\s+/);
    if (ts.length !== 8) throw new Error("Facet: board row must have 8 cells");
    ts.forEach((t, c) => cells.push(token(t, c, r)));
  });
  return { cols: 8, rows: 8, cells };
}

function runs(b: DeepReadonly<BoardState>): Run[] {
  const out: Run[] = [];
  for (const horizontal of [true, false]) {
    const outer = horizontal ? b.rows : b.cols,
      inner = horizontal ? b.cols : b.rows;
    for (let o = 0; o < outer; o++)
      for (let i = 0; i < inner;) {
        const kind = gem(b, horizontal ? i : o, horizontal ? o : i)?.kind;
        let e = i + 1;
        while (
          kind &&
          e < inner &&
          gem(b, horizontal ? e : o, horizontal ? o : e)?.kind === kind
        )
          e++;
        if (kind && e - i >= 3) {
          const cells: CellRef[] = [];
          for (let n = i; n < e; n++)
            cells.push({ col: horizontal ? n : o, row: horizontal ? o : n });
          out.push({ cells, kind, horizontal });
        }
        i = e;
      }
  }
  return out;
}
function exchange(
  b: DeepReadonly<BoardState>,
  a: CellRef,
  z: CellRef,
): BoardState {
  const cells = b.cells.map((g) => ({ ...g, fell: 0 }));
  const ia = a.row * 8 + a.col,
    iz = z.row * 8 + z.col,
    ga = cells[ia],
    gz = cells[iz];
  cells[ia] = { ...gz, col: a.col, row: a.row };
  cells[iz] = { ...ga, col: z.col, row: z.row };
  return { cols: 8, rows: 8, cells };
}
const productive = (
  b: DeepReadonly<BoardState>,
  a: CellRef,
  z: CellRef,
): boolean =>
  gem(b, a.col, a.row)?.cut === "prism" ||
  gem(b, z.col, z.row)?.cut === "prism" ||
  runs(exchange(b, a, z)).length > 0;
function anyMove(b: DeepReadonly<BoardState>): boolean {
  if (b.cols !== 8) return false;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      for (const [dc, dr] of [
        [1, 0],
        [0, 1],
      ])
        if (
          valid(c + dc, r + dr) &&
          productive(b, { col: c, row: r }, { col: c + dc, row: r + dr })
        )
          return true;
  return false;
}
function deal(): BoardState {
  for (;;) {
    const cells: GemState[] = [];
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        let opts = [...K.GEM_KINDS];
        opts = opts.filter(
          (k) =>
            !(
              c > 1 &&
              cells[r * 8 + c - 1].kind === k &&
              cells[r * 8 + c - 2].kind === k
            ) &&
            !(
              r > 1 &&
              cells[(r - 1) * 8 + c].kind === k &&
              cells[(r - 2) * 8 + c].kind === k
            ),
        );
        cells.push({
          col: c,
          row: r,
          kind: opts[Math.floor(Math.random() * opts.length)],
          cut: "plain",
          strain: 0,
          fell: r + 1 + Math.floor(Math.random() * 3),
        });
      }
    const b = { cols: 8, rows: 8, cells };
    if (anyMove(b)) return b;
  }
}
function swap(s: DeepReadonly<FacetState>, a: CellRef, z: CellRef): Internal {
  if (!valid(a.col, a.row) || !valid(z.col, z.row))
    throw new Error("Facet: cell outside board");
  if (
    Math.abs(a.col - z.col) + Math.abs(a.row - z.row) !== 1 ||
    s.phase !== "idle" ||
    !productive(s.board, a, z)
  )
    return { ...copy(s), refusal: { a, b: z, timer: 0 } };
  const ga = gem(s.board, a.col, a.row)!,
    gz = gem(s.board, z.col, z.row)!;
  const p =
    ga.cut === "prism" && gz.cut === "prism"
      ? "all"
      : ga.cut === "prism"
        ? gz.kind
        : gz.cut === "prism"
          ? ga.kind
          : null;
  return {
    ...copy(s),
    board: exchange(s.board, a, z),
    phase: "swapping",
    swapTimer: 0,
    moveScore: 0,
    refusal: null,
    _swap: [a, z],
    _prism: p,
  };
}

function resolve(s: DeepReadonly<Internal>): Internal {
  const rs = s.chainStep === 1 && s._prism ? [] : runs(s.board),
    waves = new Map<string, number>();
  if (s.chainStep === 1 && s._prism)
    for (const g of s.board.cells)
      if (s._prism === "all" || g.kind === s._prism || g.cut === "prism")
        waves.set(id(g.col, g.row), 0);
      else;
  else
    for (const run of rs)
      for (const p of run.cells) waves.set(id(p.col, p.row), 0);
  const q = [...waves.keys()];
  for (let i = 0; i < q.length; i++) {
    const [c, r] = q[i].split(",").map(Number),
      g = gem(s.board, c, r)!,
      w = waves.get(q[i])!,
      add: CellRef[] = [];
    if (g.cut === "brilliant")
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          if (dx || dy) add.push({ col: c + dx, row: r + dy });
    if (g.cut === "star") {
      for (let n = 0; n < 8; n++) {
        add.push({ col: n, row: r });
        add.push({ col: c, row: n });
      }
    }
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ])
      if (gem(s.board, c + dx, r + dy)?.strain === 3)
        add.push({ col: c + dx, row: r + dy });
    for (const p of add)
      if (valid(p.col, p.row) && !waves.has(id(p.col, p.row))) {
        waves.set(id(p.col, p.row), w + 1);
        q.push(id(p.col, p.row));
      }
  }
  if (!waves.size)
    return { ...copy(s), phase: "idle", chainStep: 0, stepTimer: 0 };
  const gone = new Set(waves.keys()),
    mult = Math.min(s.chainStep, 8),
    points = s.board.cells
      .filter((g) => gone.has(id(g.col, g.row)))
      .reduce((n, g) => n + (g.strain === 3 ? 20 : 10) * mult, 0);
  const left: (GemState | null)[] = s.board.cells.map((g) => {
    if (gone.has(id(g.col, g.row))) return null;
    const near = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].some(([dx, dy]) => gone.has(id(g.col + dx, g.row + dy)));
    return {
      ...g,
      strain: near ? Math.min(3, g.strain + 1) : g.strain,
      fell: 0,
    };
  });
  const made = new Map<string, GemState>(),
    sw = s._swap ?? [];
  const place = (run: Run): CellRef =>
    sw.find((p) => run.cells.some((x) => x.col === p.col && x.row === p.row)) ??
    run.cells[Math.floor((run.cells.length - 1) / 2)];
  for (const run of rs)
    if (run.cells.length >= 4) {
      const p = place(run);
      made.set(id(p.col, p.row), {
        ...p,
        kind: run.cells.length >= 5 ? null : run.kind,
        cut: run.cells.length >= 5 ? "prism" : "brilliant",
        strain: 0,
        fell: 0,
      });
    }
  for (const h of rs.filter((r) => r.horizontal))
    for (const v of rs.filter((r) => !r.horizontal))
      for (const p of h.cells)
        if (
          v.cells.some((x) => x.col === p.col && x.row === p.row) &&
          made.get(id(p.col, p.row))?.cut !== "prism"
        )
          made.set(id(p.col, p.row), {
            ...p,
            kind: h.kind,
            cut: "star",
            strain: 0,
            fell: 0,
          });
  for (const g of made.values()) left[g.row * 8 + g.col] = g;
  const cells: GemState[] = Array(64);
  for (let c = 0; c < 8; c++) {
    const col = left.filter((g): g is GemState => Boolean(g && g.col === c));
    let target = 7;
    for (let i = col.length - 1; i >= 0; i--) {
      const g = col[i];
      cells[target * 8 + c] = { ...g, row: target, fell: target - g.row };
      target--;
    }
    for (let r = target; r >= 0; r--) {
      const posed = s.refillKinds[c]?.[r],
        kind = posed
          ? letters[posed]
          : K.GEM_KINDS[Math.floor(Math.random() * 7)];
      if (!kind) throw new Error("Facet: invalid refill kind");
      cells[r * 8 + c] = {
        col: c,
        row: r,
        kind,
        cut: "plain",
        strain: 0,
        fell: target + 2,
      };
    }
  }
  return {
    ...copy(s),
    board: { cols: 8, rows: 8, cells },
    stepTimer: 0,
    score: s.score + points,
    levelScore: s.levelScore + points,
    moveScore: s.moveScore + points,
    lastCleared: waves.size,
    lastPoints: points,
    lastWaves: Math.max(...waves.values()),
    bestChain: Math.max(s.bestChain, s.chainStep),
  };
}
const fall = (s: DeepReadonly<FacetState>): number =>
  Math.max(0, ...s.board.cells.map((g) => g.fell));
const hold = (s: DeepReadonly<FacetState>): number =>
  s.lastWaves * K.WAVE_SECONDS +
  fall(s) * K.FALL_SECONDS_PER_ROW +
  K.STEP_SECONDS;
function targets(screen: Screen): Target[] {
  if (screen === "playing")
    return [{ id: "pause", x: 1070, y: 30, w: 150, h: 72 }];
  if (screen === "howto") return [{ id: "back", x: 48, y: 620, w: 150, h: 72 }];
  if (["title", "paused", "levelclear", "gameover"].includes(screen))
    return [0, 1].map((i) => ({
      id: `menu-${i}`,
      x: 490,
      y: 445 + i * 86,
      w: 300,
      h: 72,
    }));
  return [];
}
const inside = (x: number, y: number, t: Target): boolean =>
  x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h;
function hit(x: number, y: number): CellRef | null {
  let best: CellRef | null = null,
    d0 = Infinity;
  for (let r = 7; r >= 0; r--)
    for (let c = 7; c >= 0; c--) {
      const d = Math.hypot(x - cellX(c), y - cellY(r));
      if (d <= K.GEM_HIT_R && d < d0) {
        best = { col: c, row: r };
        d0 = d;
      }
    }
  return best;
}
function choose(s: Internal, n: number): Internal {
  if (s.screen === "title")
    return n
      ? { ...s, screen: "howto", armedTarget: null }
      : { ...opening(s.muted), screen: "playing", board: deal() };
  if (s.screen === "paused")
    return n
      ? {
          ...s,
          screen: "title",
          board: { cols: 0, rows: 0, cells: [] },
          phase: "idle",
          menuIndex: 0,
        }
      : { ...s, screen: "playing", menuIndex: 0 };
  if (s.screen === "levelclear")
    return n
      ? {
          ...s,
          screen: "title",
          board: { cols: 0, rows: 0, cells: [] },
          menuIndex: 0,
        }
      : {
          ...s,
          screen: "playing",
          level: s.level + 1,
          levelScore: 0,
          bestChain: 0,
          bestMove: 0,
          board: deal(),
        };
  if (s.screen === "gameover")
    return n
      ? {
          ...s,
          screen: "title",
          board: { cols: 0, rows: 0, cells: [] },
          menuIndex: 0,
        }
      : { ...opening(s.muted), screen: "playing", board: deal() };
  return s;
}
function pDown(
  s0: DeepReadonly<FacetState>,
  x: number,
  y: number,
  d: PointerDevice,
): Internal {
  const s = { ...copy(s0), pointer: { x, y, down: true, device: d } };
  const t = targets(s.screen).find((q) => inside(x, y, q));
  if (t)
    return {
      ...s,
      armedTarget: t.id,
      menuIndex: t.id.startsWith("menu-") ? +t.id.slice(5) : s.menuIndex,
    };
  if (s.screen !== "playing" || s.phase !== "idle")
    return { ...s, armedTarget: null };
  const c = hit(x, y);
  if (!c) return { ...s, selection: null, offer: null };
  if (!s.selection) return { ...s, selection: c, offer: null };
  if (c.col === s.selection.col && c.row === s.selection.row)
    return { ...s, offer: null };
  if (
    Math.abs(c.col - s.selection.col) + Math.abs(c.row - s.selection.row) ===
    1
  )
    return { ...s, offer: c };
  return { ...s, selection: c, offer: null };
}
function pMove(
  s0: DeepReadonly<FacetState>,
  x: number,
  y: number,
  d: PointerDevice,
): Internal {
  let s = { ...copy(s0), pointer: { x, y, down: s0.pointer.down, device: d } };
  const t = targets(s.screen).find((q) => inside(x, y, q));
  if (!s.pointer.down && t?.id.startsWith("menu-"))
    s = { ...s, menuIndex: +t.id.slice(5) };
  if (s.screen === "playing" && s.pointer.down && s.selection) {
    const c = hit(x, y);
    if (c && c.col === s.selection.col && c.row === s.selection.row)
      s = { ...s, offer: null };
    else if (
      c &&
      Math.abs(c.col - s.selection.col) + Math.abs(c.row - s.selection.row) ===
        1
    )
      s = { ...s, offer: c };
  }
  return s;
}
function pUp(s0: DeepReadonly<FacetState>, d: PointerDevice): Internal {
  let s = { ...copy(s0), pointer: { ...s0.pointer, down: false, device: d } };
  const t = targets(s.screen).find((q) => inside(s.pointer.x, s.pointer.y, q)),
    armed = s.armedTarget;
  if (armed && t?.id === armed) {
    s = { ...s, armedTarget: null };
    if (armed.startsWith("menu-")) return choose(s, +armed.slice(5));
    if (armed === "pause") return { ...s, screen: "paused", menuIndex: 0 };
    if (armed === "back") return { ...s, screen: "title", menuIndex: 1 };
  }
  s = { ...s, armedTarget: null };
  if (s.screen === "playing" && s.selection && s.offer)
    return { ...swap(s, s.selection, s.offer), selection: null, offer: null };
  return s;
}

function snap(s: DeepReadonly<FacetState>): unknown {
  return {
    version: 1,
    screen: s.screen,
    menuIndex: s.menuIndex,
    score: s.score,
    level: s.level,
    levelScore: s.levelScore,
    levelTarget: 2000 * s.level,
    phase: s.phase,
    chainStep: s.chainStep,
    multiplier: Math.min(s.chainStep, 8),
    swapTimer: s.swapTimer,
    stepTimer: s.stepTimer,
    stepHold: hold(s),
    board: {
      cols: s.board.cols,
      rows: s.board.rows,
      cells: s.board.cells.map((g) => ({
        ...g,
        x: cellX(g.col),
        y: cellY(g.row),
      })),
    },
    selection: s.selection,
    offer: s.offer,
    refusal: s.refusal ? { a: s.refusal.a, b: s.refusal.b } : null,
    lastCleared: s.lastCleared,
    lastPoints: s.lastPoints,
    lastWaves: s.lastWaves,
    lastFall: fall(s),
    moveScore: s.moveScore,
    bestMove: s.bestMove,
    bestChain: s.bestChain,
    legalSwap: anyMove(s.board),
    refillKinds: [...s.refillKinds],
    pointer: { ...s.pointer },
    armedTarget: s.armedTarget,
    targets: targets(s.screen),
    muted: s.muted,
    simTime: s.simTime,
  };
}
const checkCell = (c: number, r: number): void => {
  if (!valid(c, r)) throw new Error("Facet: cell outside board");
};
function debug(): FacetDebugApi {
  return {
    version: 1,
    reset: (s) => opening(s.muted),
    reconcile: copy,
    snapshot: snap,
    setScreen: (s, screen) => ({ ...copy(s), screen }),
    setMenuIndex: (s, menuIndex) => {
      if (!Number.isInteger(menuIndex) || menuIndex < 0)
        throw new Error("Facet: invalid menu index");
      return { ...copy(s), menuIndex };
    },
    loadBoard: (s, rows) => ({ ...copy(s), board: parseBoard(rows) }),
    dealBoard: (s) => ({ ...copy(s), board: deal() }),
    clearBoard: (s) => ({ ...copy(s), board: { cols: 0, rows: 0, cells: [] } }),
    setGem: (s, c, r, t) => {
      checkCell(c, r);
      if (!s.board.cells.length) throw new Error("Facet: no board");
      const cells = s.board.cells.map((g) => ({ ...g }));
      cells[r * 8 + c] = token(t, c, r);
      return { ...copy(s), board: { cols: 8, rows: 8, cells } };
    },
    setRefillKinds: (s, c, kinds) => {
      if (
        c < 0 ||
        c >= 8 ||
        !Number.isInteger(c) ||
        !/^[RACJBSM]*$/.test(kinds)
      )
        throw new Error("Facet: invalid refill");
      const a = [...s.refillKinds];
      a[c] = kinds;
      return { ...copy(s), refillKinds: a };
    },
    clearRefillKinds: (s) => ({
      ...copy(s),
      refillKinds: Array<string>(8).fill(""),
    }),
    setScore: (s, score) => ({ ...copy(s), score }),
    setLevel: (s, level) => {
      if (!Number.isInteger(level) || level < 1)
        throw new Error("Facet: invalid level");
      return { ...copy(s), level };
    },
    setLevelScore: (s, levelScore) => ({ ...copy(s), levelScore }),
    setBestChain: (s, bestChain) => {
      if (!Number.isInteger(bestChain) || bestChain < 0)
        throw new Error("Facet: invalid chain");
      return { ...copy(s), bestChain };
    },
    setBestMove: (s, bestMove) => ({ ...copy(s), bestMove }),
    setMoveScore: (s, moveScore) => ({ ...copy(s), moveScore }),
    setSelection: (s, c, r) => {
      checkCell(c, r);
      return { ...copy(s), selection: { col: c, row: r } };
    },
    clearSelection: (s) => ({ ...copy(s), selection: null }),
    setOffer: (s, c, r) => {
      checkCell(c, r);
      return { ...copy(s), offer: { col: c, row: r } };
    },
    clearOffer: (s) => ({ ...copy(s), offer: null }),
    clearRefusal: (s) => ({ ...copy(s), refusal: null }),
    clearChain: (s) => ({
      ...copy(s),
      phase: "idle",
      chainStep: 0,
      swapTimer: 0,
      stepTimer: 0,
    }),
    requestSwap: (s, ca, ra, cb, rb) =>
      swap(s, { col: ca, row: ra }, { col: cb, row: rb }),
    pointerDown: (s, x, y, d = "mouse") => pDown(s, x, y, d),
    pointerMove: (s, x, y, d = "mouse") => pMove(s, x, y, d),
    pointerUp: (s, d = "mouse") => pUp(s, d),
  };
}

function text(
  c: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  color = "#eaffff",
): void {
  c.font = `700 ${size}px Trebuchet MS,sans-serif`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = color;
  c.shadowColor = "#48dce8";
  c.shadowBlur = 9;
  c.fillText(value, x, y);
  c.shadowBlur = 0;
}
function button(
  c: CanvasRenderingContext2D,
  t: Target,
  label: string,
  on: boolean,
): void {
  c.fillStyle = on ? "#174f67" : "#0b263b";
  c.fillRect(t.x, t.y, t.w, t.h);
  c.strokeStyle = on ? "#ffe28a" : "#3ca9ba";
  c.lineWidth = on ? 3 : 1;
  c.strokeRect(t.x, t.y, t.w, t.h);
  text(c, label, t.x + t.w / 2, t.y + t.h / 2, 24, on ? "#fff0b5" : "#d9f9ff");
}
function board(s: DeepReadonly<FacetState>, c: CanvasRenderingContext2D): void {
  if (!s.board.cells.length) return;
  const fr = images.get("gems/board-frame.png");
  if (fr) c.drawImage(fr, 344, 100, 592, 592);
  for (const g of s.board.cells) {
    let x = cellX(g.col),
      y = cellY(g.row);
    if (s.offer && s.selection) {
      if (g.col === s.selection.col && g.row === s.selection.row) {
        x = cellX(s.offer.col);
        y = cellY(s.offer.row);
      } else if (g.col === s.offer.col && g.row === s.offer.row) {
        x = cellX(s.selection.col);
        y = cellY(s.selection.row);
      }
    }
    if (s.phase === "resolving") {
      const p = Math.max(
        0,
        Math.min(
          1,
          (s.stepTimer - s.lastWaves * K.WAVE_SECONDS) /
            Math.max(0.001, g.fell * K.FALL_SECONDS_PER_ROW),
        ),
      );
      y -= g.fell * 72 * (1 - p) ** 2;
    }
    const path =
        g.cut === "prism"
          ? `gems/prism-turn/frame-${Math.floor(s.simTime * 8) % 6}.png`
          : `gems/${g.kind}-${g.strain}.png`,
      im = images.get(path);
    if (im) {
      c.imageSmoothingEnabled = false;
      c.drawImage(im, x - 32, y - 32, 64, 64);
    }
    if (g.cut === "brilliant" || g.cut === "star") {
      const ov = images.get(`gems/${g.cut}.png`);
      if (ov) c.drawImage(ov, x - 32, y - 32);
      c.strokeStyle = `rgba(110,240,255,${0.5 + Math.sin(s.simTime * 5 + g.col) * 0.2})`;
      c.beginPath();
      c.arc(x, y, 33, 0, Math.PI * 2);
      c.stroke();
    }
  }
  if (auraSimulator) {
    auraSimulator.step(1000 / 60);
    const particles = auraSimulator.capture();
    for (const g of s.board.cells.filter((x) => x.cut !== "plain")) {
      const ox = cellX(g.col) - 32;
      const oy = cellY(g.row) + 32;
      for (const p of particles) {
        const rgb = p.color.map((v) => Math.round(v * 255));
        c.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${p.opacity * 0.48})`;
        c.beginPath();
        c.arc(
          ox + p.position[0] / 2,
          oy - p.position[1] / 2,
          Math.max(1, p.size * 2),
          0,
          Math.PI * 2,
        );
        c.fill();
      }
    }
  }
  if (s.selection) {
    c.strokeStyle = "#fff09b";
    c.lineWidth = 4;
    c.strokeRect(
      cellX(s.selection.col) - 35,
      cellY(s.selection.row) - 35,
      70,
      70,
    );
  }
  if (s.refusal)
    for (const p of [s.refusal.a, s.refusal.b]) {
      const x = cellX(p.col),
        y = cellY(p.row);
      c.strokeStyle = "#ff4f70";
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(x - 20, y - 20);
      c.lineTo(x + 20, y + 20);
      c.moveTo(x + 20, y - 20);
      c.lineTo(x - 20, y + 20);
      c.stroke();
    }
}
function render(
  s: DeepReadonly<FacetState>,
  c: CanvasRenderingContext2D,
): void {
  const g = c.createRadialGradient(640, 390, 40, 640, 390, 650);
  g.addColorStop(0, "#11324a");
  g.addColorStop(1, BACKGROUND);
  c.fillStyle = g;
  c.fillRect(0, 0, 1280, 720);
  for (let i = 0; i < 55; i++) {
    c.fillStyle = "rgba(110,235,250,.12)";
    c.fillRect((i * 193) % 1280, (i * 83) % 720, 2, 2);
  }
  if (s.board.cells.length && s.screen !== "title" && s.screen !== "howto") {
    board(s, c);
    text(c, `SCORE  ${s.score}`, 170, 58, 26, "#f7e7ad");
    text(c, `LEVEL  ${s.level}`, 640, 42, 24);
    c.fillStyle = "#112d42";
    c.fillRect(490, 72, 300, 14);
    c.fillStyle = "#55e0c1";
    c.fillRect(490, 72, 300 * Math.min(1, s.levelScore / (s.level * 2000)), 14);
    if (s.phase === "resolving")
      text(c, `CHAIN ×${Math.min(s.chainStep, 8)}`, 960, 58, 26, "#ffcb7b");
  }
  if (s.screen === "playing") {
    button(c, targets(s.screen)[0], K.PAUSE_LABEL, s.armedTarget === "pause");
    return;
  }
  if (s.screen === "title") {
    text(c, K.TITLE_TEXT, 640, 205, 104);
    text(c, K.TAGLINE_TEXT, 640, 300, 22, "#f2cc7b");
  }
  if (s.screen === "howto") {
    c.fillStyle = "rgba(5,17,34,.96)";
    c.fillRect(225, 42, 830, 620);
    text(c, "HOW TO PLAY", 640, 86, 38, "#ffe59a");
    [
      "Drag a gem onto its neighbor and release to swap.",
      "Make lines of 3+. Empty swaps are refused.",
      "Clears strain neighbors; flawed stones burst for double.",
      "4 makes a BRILLIANT. Crosses make a STAR.",
      "5+ makes a PRISM: swap it to clear one kind.",
      "Falling matches chain and multiply points.",
      "Reach the target; no legal move ends the round.",
      "Pointer: mouse, pen or touch • ↑↓ • ↵/Space",
      "Esc/P pause • M mute • Esc back",
    ].forEach((v, i) => text(c, v, 640, 155 + i * 48, 20));
    button(c, targets(s.screen)[0], K.BACK_LABEL, s.armedTarget === "back");
    return;
  }
  if (s.screen !== "title") {
    c.fillStyle = "rgba(2,7,18,.72)";
    c.fillRect(0, 0, 1280, 720);
  }
  let title = "",
    items: readonly string[] = [];
  if (s.screen === "title") items = K.TITLE_ITEMS;
  if (s.screen === "paused") {
    title = K.PAUSED_TITLE_TEXT;
    items = K.PAUSED_ITEMS;
  }
  if (s.screen === "levelclear") {
    title = K.LEVELCLEAR_TITLE_TEXT;
    items = K.LEVELCLEAR_ITEMS;
  }
  if (s.screen === "gameover") {
    title = K.GAMEOVER_TITLE_TEXT;
    items = K.GAMEOVER_ITEMS;
  }
  if (title) text(c, title, 640, 225, 48, "#fff0b0");
  if (s.screen === "levelclear")
    text(
      c,
      `LEVEL ${s.level} • LONGEST CHAIN ${s.bestChain} • BEST MOVE ${s.bestMove}`,
      640,
      335,
      19,
    );
  if (s.screen === "gameover")
    text(c, `SCORE ${s.score} • LEVEL ${s.level}`, 640, 335, 24);
  items.forEach((v, i) =>
    button(c, targets(s.screen)[i], v, s.menuIndex === i),
  );
}

export const game: Game<FacetState, FacetDebugApi> = {
  async initialize(
    api: InitApi<FacetState>,
  ): Promise<[FacetState, FacetDebugApi]> {
    K.ACTIONS.forEach((n) =>
      api.input.register(n, { keys: [...K.BINDINGS[n]] }),
    );
    const paths = [
      "gems/board-frame.png",
      "gems/brilliant.png",
      "gems/star.png",
      ...K.GEM_KINDS.flatMap((k) =>
        [0, 1, 2, 3].map((n) => `gems/${k}-${n}.png`),
      ),
      ...K.GEM_KINDS.flatMap((k) =>
        [0, 1, 2, 3].map((n) => `gems/break/${k}/frame-${n}.png`),
      ),
      ...[0, 1, 2, 3, 4, 5].map((n) => `gems/prism-turn/frame-${n}.png`),
    ];
    await Promise.all(
      paths.map(async (p) => images.set(p, await api.assets.loadImage(p))),
    );
    const systems = await Promise.all(
      ["clear-burst", "flawed-detonation", "cut-flash", "cut-aura"].map(
        async (n) =>
          JSON.parse(
            await (await api.assets.load(`fx/${n}.system.json`)).text(),
          ) as ParticleSystem,
      ),
    );
    auraSimulator = new ParticleSimulator(systems[3]);
    const cues: Record<string, string> = {
      select: "select.wav",
      swap: "swap.wav",
      refuse: "refuse.wav",
      clear: "shatter.wav",
      land: "land.wav",
      flaw: "flaw.wav",
      cut: "cut.wav",
      levelup: "levelup.wav",
      gameover: "gameover.wav",
      titlemusic: "title-theme.wav",
      playmusic: "play-bed.wav",
    };
    await Promise.all(
      Object.entries(cues).map(([n, f]) => api.audio.load(n, `audio/${f}`)),
    );
    await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        api.audio.load(`chain-${i + 1}`, `audio/chain-${i + 1}.wav`),
      ),
    );
    const ds: [
      string,
      (s: DeepReadonly<FacetState>) => string | number | boolean,
    ][] = [
      ["screen", (s) => s.screen],
      ["phase", (s) => s.phase],
      ["board", (s) => `${s.board.cols}x${s.board.rows}`],
      ["score", (s) => s.score],
      ["level", (s) => `${s.levelScore}/${s.level * 2000}`],
      ["chain", (s) => `${s.chainStep} x${Math.min(s.chainStep, 8)}`],
      ["cleared", (s) => s.lastCleared],
      ["points", (s) => s.lastPoints],
      ["waves/fall", (s) => `${s.lastWaves}/${fall(s)}`],
      [
        "selection",
        (s) => (s.selection ? id(s.selection.col, s.selection.row) : "-"),
      ],
      ["offer", (s) => (s.offer ? id(s.offer.col, s.offer.row) : "-")],
      ["best", (s) => `${s.bestMove}/${s.bestChain}`],
      ["legal swap", (s) => anyMove(s.board)],
      [
        "pointer",
        (s) =>
          `${s.pointer.x.toFixed(0)},${s.pointer.y.toFixed(0)} ${s.pointer.device}`,
      ],
    ];
    ds.forEach(([n, f]) => api.diagnostics.register(n, f));
    return [opening(), debug()];
  },
  update(state, api: UpdateApi, dt: number): FacetState {
    let s: Internal = {
      ...copy(state),
      simTime: state.simTime + dt,
      muted: api.audio.muted(),
    };
    if (s.screen === "title") {
      if (!api.audio.looping("titlemusic")) api.audio.loop("titlemusic");
      api.audio.stop("playmusic");
    } else if (
      ["playing", "paused", "levelclear", "gameover"].includes(s.screen)
    ) {
      api.audio.stop("titlemusic");
      if (!api.audio.looping("playmusic")) api.audio.loop("playmusic");
    } else {
      api.audio.stop("titlemusic");
      api.audio.stop("playmusic");
    }
    if (api.input.pressed("mute")) {
      api.audio.setMuted(!s.muted);
      s = { ...s, muted: !s.muted };
    }
    const p = api.input.pointer();
    s = { ...s, pointer: { x: p.x, y: p.y, down: p.down, device: p.device } };
    for (const e of api.input.pointerSamples())
      if (e.primary) {
        const hadSelection = Boolean(s.selection);
        const hadRefusal = Boolean(s.refusal);
        s =
          e.type === "down"
            ? pDown(s, e.x, e.y, e.device)
            : e.type === "move"
              ? pMove(s, e.x, e.y, e.device)
              : pUp(s, e.device);
        if (!hadSelection && s.selection) api.audio.play("select");
        if (!hadRefusal && s.refusal) api.audio.play("refuse");
      }
    const menu =
      s.screen === "title"
        ? K.TITLE_ITEMS
        : s.screen === "paused"
          ? K.PAUSED_ITEMS
          : s.screen === "levelclear"
            ? K.LEVELCLEAR_ITEMS
            : s.screen === "gameover"
              ? K.GAMEOVER_ITEMS
              : [];
    if (api.input.pressed("up"))
      s = {
        ...s,
        menuIndex: menu.length
          ? (s.menuIndex + menu.length - 1) % menu.length
          : 0,
      };
    if (api.input.pressed("down"))
      s = {
        ...s,
        menuIndex: menu.length ? (s.menuIndex + 1) % menu.length : 0,
      };
    if (api.input.pressed("confirm")) s = choose(s, s.menuIndex);
    if (api.input.pressed("pause")) {
      if (s.screen === "playing") s = { ...s, screen: "paused", menuIndex: 0 };
      else if (s.screen === "paused")
        s = { ...s, screen: "playing", menuIndex: 0 };
    }
    if (api.input.pressed("back")) {
      if (s.screen === "howto") s = { ...s, screen: "title", menuIndex: 1 };
      else if (s.screen === "gameover")
        s = { ...s, screen: "title", menuIndex: 0 };
    }
    if (s.screen !== "playing") return s;
    if (s.refusal)
      s =
        s.refusal.timer + dt >= K.REFUSAL_SECONDS
          ? { ...s, refusal: null }
          : { ...s, refusal: { ...s.refusal, timer: s.refusal.timer + dt } };
    if (s.phase === "swapping") {
      if (s.swapTimer + dt >= K.SWAP_SECONDS) {
        s = resolve({ ...s, phase: "resolving", chainStep: 1, swapTimer: 0 });
        api.audio.play("swap");
        api.audio.play("clear");
        api.audio.play("chain-1");
      } else s = { ...s, swapTimer: s.swapTimer + dt };
    } else if (s.phase === "resolving") {
      if (s.stepTimer + dt >= hold(s)) {
        if (runs(s.board).length) {
          s = resolve({
            ...s,
            chainStep: s.chainStep + 1,
            stepTimer: 0,
            _prism: null,
          });
          api.audio.play("clear");
          api.audio.play(`chain-${Math.min(s.chainStep, 8)}`);
        } else {
          s = {
            ...s,
            phase: "idle",
            chainStep: 0,
            stepTimer: 0,
            bestMove: Math.max(s.bestMove, s.moveScore),
            _swap: undefined,
          };
          if (s.levelScore >= s.level * 2000) {
            s = { ...s, screen: "levelclear", menuIndex: 0 };
            api.audio.play("levelup");
          } else if (!anyMove(s.board)) {
            s = { ...s, screen: "gameover", menuIndex: 0 };
            api.audio.play("gameover");
          }
        }
      } else s = { ...s, stepTimer: s.stepTimer + dt };
    }
    return s;
  },
  render(state, api: RenderApi): void {
    render(state, api.ctx);
  },
};
