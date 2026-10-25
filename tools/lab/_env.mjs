// 离线渲染环境：伪造 DOM + 注册字体 + 路径解析
// 所有脚本都从这里拿 canvas 和站点路径，不写死绝对路径。
import { createCanvas, Path2D as NPath2D, GlobalFonts } from '@napi-rs/canvas';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';

export const LAB = dirname(fileURLToPath(import.meta.url));
export const SITE = join(LAB, '..', '..');
export const OUT = join(LAB, 'out');

globalThis.Path2D = NPath2D;

const FONT_CANDIDATES = [
  'C:/Windows/Fonts/msyh.ttc',
  'C:/Windows/Fonts/segoeui.ttf',
  '/System/Library/Fonts/PingFang.ttc',
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
];

export function registerFont(name = 'Ui') {
  for (const f of FONT_CANDIDATES) {
    if (!existsSync(f)) continue;
    try { GlobalFonts.registerFromPath(f, name); return f; } catch { /* 换下一个 */ }
  }
  return null;
}

// 起一个假浏览器，返回 { main, pump, state }
// main: 供截图用；pump(n): 走 n 帧（每帧 16.7ms）；state: ocean.js 的内部状态
export async function bootSite(width = 1200, height = 700) {
  const main = createCanvas(width, height);
  main.style = {};
  let queue = [];
  let clock = 0;

  globalThis.window = {
    innerWidth: width,
    innerHeight: height,
    devicePixelRatio: 1,
    matchMedia: (q) => ({ matches: false, media: q, addEventListener() {}, addListener() {} }),
    requestAnimationFrame: (cb) => { queue.push(cb); return queue.length; },
    cancelAnimationFrame: () => { queue = []; },
    addEventListener: () => {},
  };
  globalThis.document = {
    readyState: 'complete',
    hidden: false,
    getElementById: (id) => (id === 'ocean' ? main : null),
    createElement: () => { const c = createCanvas(4, 4); c.style = {}; return c; },
    addEventListener: () => {},
  };

  await import(pathToFileURL(join(SITE, 'assets', 'js', 'orca-logo.js')).href + '?t=' + Date.now());
  globalThis.window.OrcaBits = globalThis.OrcaBits;
  await import(pathToFileURL(join(SITE, 'assets', 'js', 'ocean.js')).href + '?t=' + Date.now());

  const pump = (n = 1) => {
    for (let i = 0; i < n; i++) {
      clock += 16.7;
      const cbs = queue;
      queue = [];
      for (const cb of cbs) cb(clock);
    }
  };

  const dbg = globalThis.window.__ocean;
  return { main, pump, state: dbg.state, cfg: dbg.cfg, dbg };
}

// 只加载渲染器（画静态帧用）
export async function bootRenderer() {
  await import(pathToFileURL(join(SITE, 'assets', 'js', 'orca-logo.js')).href + '?t=' + Date.now());
  return globalThis.OrcaBits.create({ makeCanvas: (w, h) => createCanvas(w, h) });
}

export function savePng(canvas, name) {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  const p = join(OUT, name);
  writeFileSync(p, canvas.toBuffer('image/png'));
  console.log('wrote', p);
  return p;
}

// 拼图：把若干张 canvas 摆成网格，每张带一行说明
export function sheet(tiles, { cols = 3, w = 380, h = 222, gap = 12, label = '' } = {}) {
  const rows = Math.ceil(tiles.length / cols);
  const out = createCanvas(cols * (w + gap) + gap, rows * (h + 26 + gap) + gap);
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, out.width, out.height);
  tiles.forEach((t, i) => {
    const cx = gap + (i % cols) * (w + gap);
    const cy = gap + Math.floor(i / cols) * (h + 26 + gap);
    if (t.canvas) ctx.drawImage(t.canvas, 0, 0, t.canvas.width, t.canvas.height, cx, cy, w, h);
    else { ctx.fillStyle = '#05070a'; ctx.fillRect(cx, cy, w, h); }
    ctx.fillStyle = '#8fb0cc';
    ctx.font = 'bold 15px Ui';
    ctx.fillText(t.label || '', cx + 6, cy + h + 18);
  });
  return out;
}
