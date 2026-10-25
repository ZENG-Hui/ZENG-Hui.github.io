// 生命周期连拍：从深海浮起 -> 巡游 -> 蓄力 -> 游回深海
// 直接驱动真实的 ocean.js，所以看到的就是线上的行为
import { createCanvas } from '@napi-rs/canvas';
import { registerFont, bootSite, sheet, savePng } from './_env.mjs';

registerFont();
const { main, pump, state } = await bootSite(1200, 700);
const W = 1200, H = 700;
const tiles = [];

function snap(label) {
  const c = createCanvas(W, H);
  c.getContext('2d').drawImage(main, 0, 0);
  tiles.push({ canvas: c, label });
}

// 浮起
while (!(state.mode === 'in' && state.inT > 0.05)) pump(1);
for (const z of [0.40, 0.62, 0.88]) {
  let g = 0;
  while (state.mode === 'in' && Math.abs(state.zoom - z) > 0.04 && g++ < 3000) pump(1);
  snap('in  zoom ' + state.zoom.toFixed(2));
}

// 巡游
while (state.mode !== 'swim') pump(1);
pump(180);
snap('swim  朝向 ' + state.dir);

// 蓄力
while (state.mode !== 'windup') pump(1);
pump(60);
snap('windup  尾鳍加速');

// 游回深海
while (state.mode !== 'out') pump(1);
for (const z of [0.62, 0.42]) {
  let g = 0;
  while (state.mode === 'out' && Math.abs(state.zoom - z) > 0.05 && g++ < 4000) pump(1);
  snap('out  zoom ' + state.zoom.toFixed(2));
}

savePng(sheet(tiles, { cols: 3, w: 380, h: 222 }), 'lifecycle.png');
