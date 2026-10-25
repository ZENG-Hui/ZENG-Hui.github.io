// 胸鳍三态：向上 / 平 / 向下（fin = 1 / 0 / -1）
import { createCanvas } from '@napi-rs/canvas';
import { registerFont, bootRenderer, sheet, savePng } from './_env.mjs';

registerFont();
const orca = await bootRenderer();

const W = 420, H = 300, SC = 2.0;
const tiles = [];
for (const [fin, label] of [[1, 'fin +1（上摆）'], [0, 'fin 0（平）'], [-1, 'fin -1（下摆）']]) {
  const c = createCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, W, H);
  orca.render(ctx, {
    x: W / 2, y: H / 2, scale: SC, cell: 4.2, phase: 4.712,
    look: 0, fin, dir: 1, zoom: 1, appear: 1, time: 1, trail: [],
  });
  tiles.push({ canvas: c, label });
}
savePng(sheet(tiles, { cols: 3, w: 420, h: 300 }), 'fin-frames.png');
