// Coin Rush — the tiny agent-built game behind this entry's video.
// Day one: one player, three coins, an empty map. Day seven: the same map
// and the same start, after a week of daily updates — coins everywhere,
// patrolling enemies, sparkles, a score bar. The video cuts between the
// two builds at identical moments so the change is the whole story.
//
// This program is the entry's bot: when the grader runs it, it copies
// VIDEO.json from the repository root to /output/VIDEO.json, where the
// gate reads the TikTok address. Node 22+, standard library only, no
// network, no wall clock, deterministic.
//
// Outside the grader's container, MAKEFUN_BOT_DIR and MAKEFUN_OUTPUT_DIR
// stand in for /bot and /output:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface Vec {
  x: number;
  y: number;
}

export interface BuildConfig {
  label: string;
  coins: Vec[];
  enemies: Vec[];
  sparkles: number;
  playerSpeed: number;
}

export const BOARD_COLS = 9;
export const BOARD_ROWS = 9;
export const PLAYER_START: Vec = { x: 0, y: 4 };

// The map never changes: the same nine columns, the same start square.
export const DAY_ONE: BuildConfig = {
  label: 'day one',
  coins: [
    { x: 3, y: 4 },
    { x: 5, y: 2 },
    { x: 7, y: 6 },
  ],
  enemies: [],
  sparkles: 0,
  playerSpeed: 1,
};

export const DAY_SEVEN: BuildConfig = {
  label: 'day seven',
  coins: [
    { x: 1, y: 1 },
    { x: 2, y: 3 },
    { x: 3, y: 4 },
    { x: 3, y: 7 },
    { x: 4, y: 1 },
    { x: 4, y: 6 },
    { x: 5, y: 2 },
    { x: 5, y: 5 },
    { x: 6, y: 0 },
    { x: 6, y: 8 },
    { x: 7, y: 3 },
    { x: 7, y: 6 },
    { x: 8, y: 2 },
    { x: 8, y: 7 },
  ],
  enemies: [
    { x: 2, y: 6 },
    { x: 4, y: 3 },
    { x: 5, y: 7 },
    { x: 6, y: 4 },
    { x: 7, y: 1 },
  ],
  sparkles: 40,
  playerSpeed: 2,
};

// The player's route through the map, in cell coordinates — the video
// renders this exact path for both builds, so the day-one and day-seven
// shots are identical moments.
export const WAYPOINTS: Vec[] = [
  { x: 0, y: 4 },
  { x: 3, y: 4 },
  { x: 5, y: 2 },
  { x: 7, y: 6 },
  { x: 8, y: 7 },
];

// Position along the route at a given phase (0..1), in cell units.
export function pathPoint(phase: number): Vec {
  const pts = WAYPOINTS;
  const lens: number[] = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const len = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    lens.push(len);
    total += len;
  }
  let d = phase * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const t = lens[i] === 0 ? 0 : Math.min(1, d / lens[i]);
      return {
        x: pts[i].x + (pts[i + 1].x - pts[i].x) * t,
        y: pts[i].y + (pts[i + 1].y - pts[i].y) * t,
      };
    }
    d -= lens[i];
  }
  return pts[pts.length - 1];
}

// The path phase at which the player passes within 0.7 cells of a coin
// (null when the coin is never that close — it stays on the board).
export function collectPhase(coin: Vec): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  for (let p = 0; p <= 1.0001; p += 0.005) {
    const pos = pathPoint(p);
    const d = Math.hypot(pos.x - coin.x, pos.y - coin.y);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return bestD < 0.7 ? best : null;
}

// How many coins the player has collected by a given point along the
// path. The video's score bar is this number over the collectable coins;
// day one tops out at 3, day seven higher.
export function scoreAt(cfg: BuildConfig, phase: number): number {
  let score = 0;
  for (const coin of cfg.coins) {
    const p = collectPhase(coin);
    if (p !== null && phase >= p) score++;
  }
  return score;
}

// Deterministic patrol: an enemy drifts one cell sideways on a fixed
// four-tick cycle — same input tick, same position, every run.
export function enemyAt(e: Vec, tick: number): Vec {
  const dx = tick % 4 < 2 ? 1 : -1;
  return { x: e.x + dx, y: e.y };
}

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(OUTPUT_DIR, { recursive: true });
try {
  copyFileSync(join(BOT_DIR, 'VIDEO.json'), join(OUTPUT_DIR, 'VIDEO.json'));
} catch (err) {
  console.error(
    `VIDEO.json could not be copied from ${BOT_DIR}: ${(err as Error).message}`,
  );
  process.exit(1);
}
