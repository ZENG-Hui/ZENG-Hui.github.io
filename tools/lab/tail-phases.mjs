// 尾鳍相位对照：同一只鲸鱼在不同相位下的形状 + 相邻字位移差
// 用法：node tools/lab/tail-phases.mjs [角度1,角度2,...]
import { createCanvas } from '@napi-rs/canvas';
import { registerFont, bootRenderer, sheet, savePng } from './_env.mjs';

registerFont();
const orca = await bootRenderer();

const deg = (process.argv[2] || '-120,0,120').split(',').map(Number);
const W = 420, H = 300, SC = 2.0;
const tiles = [];

for (const d of deg) {
  // 相位取尾鳍角的极值：ang = 0.22*sin(phase/1.5)，要 sin=±1 时 phase = 2.356 / 7.069
  const phase = d === 0 ? 4.712 : (Math.sin(d * Math.PI / 180) > 0 ? 2.356 : 7.069);
  const c = createCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, W, H);
  orca.render(ctx, {
    x: W / 2, y: H / 2, scale: SC, cell: 4.2, phase,
    look: 0, fin: 0, dir: 1, zoom: 1, appear: 1, time: 1, trail: [],
  });
  tiles.push({ canvas: c, label: 'tail ' + d + '°' });
}

savePng(sheet(tiles, { cols: deg.length, w: 420, h: 300 }), 'tail-phases.png');

// 数值检查：相邻两个字的位移差，超过约半格就会看出断裂
const CELL = 4.2;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const src = await import('node:fs').then((fs) => fs.readFileSync(new URL('../../assets/js/orca-logo.js', import.meta.url), 'utf8'));
const body = src.match(/function logoXform\(x, y, phase, fin\) \{[\s\S]*?\n  \}/)[0];
const xform = new Function('clamp01', 'return (' + body + ')')(clamp01);
let worst = 0, at = null;
for (const phase of [2.356, 7.069]) {
  for (let x = -100; x <= 104; x += CELL) {
    for (let y = -76; y <= 76; y += CELL) {
      const p0 = xform(x, y, phase, 0);
      const px = xform(x + CELL, y, phase, 0);
      const py = xform(x, y + CELL, phase, 0);
      const g = Math.max(
        Math.hypot(px.x - p0.x - CELL, px.y - p0.y),
        Math.hypot(py.x - p0.x, py.y - p0.y - CELL),
      );
      if (g > worst) { worst = g; at = [x, y]; }
    }
  }
}
console.log('相邻字最大位移差', worst.toFixed(2), '单位（格子', CELL, '），位置', at);
console.log(worst < CELL * 0.55 ? '判定：不会看出断裂' : '判定：可能看出断裂，把过渡带放宽或幅度调小');
