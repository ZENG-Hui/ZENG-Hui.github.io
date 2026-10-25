// 朝向对照：dir=1 朝右，dir=-1 朝左（镜像是布局的最后一步）
import { createCanvas } from '@napi-rs/canvas';
import { registerFont, bootRenderer, sheet, savePng } from './_env.mjs';

registerFont();
const orca = await bootRenderer();

const W = 460, H = 300, SC = 2.0;
const tiles = [];
for (const [dir, label] of [[1, 'dir +1  朝右 →'], [-1, 'dir -1  ← 朝左']]) {
  const c = createCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, W, H);
  orca.render(ctx, {
    x: W / 2, y: H / 2, scale: SC, cell: 4.2, phase: 4.712,
    look: 0, fin: 0, dir, zoom: 1, appear: 1, time: 1, trail: [],
  });
  tiles.push({ canvas: c, label });
}
savePng(sheet(tiles, { cols: 2, w: 460, h: 300 }), 'headings.png');
