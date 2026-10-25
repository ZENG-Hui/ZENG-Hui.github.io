import { registerFont, bootSite } from './_env.mjs';
registerFont();
const { pump, state } = await bootSite(1200, 700);
let prev = '', rec = null;
const out = [];
for (let f = 0; f < 20000; f++) {
  pump(1);
  const s = state;
  if (prev !== 'in' && s.mode === 'in') rec = { x0: s.x, dir: s.dir, fade: s.fade, vpX: s.vpX };
  if (rec && s.mode === 'in' && Math.abs(s.x - rec.x0) > 20) {
    out.push({ ...rec, x1: s.x, moved: Math.round(s.x - rec.x0), ok: Math.sign(s.x - rec.x0) === rec.dir });
    rec = null;
  }
  prev = s.mode;
}
out.forEach((o) => console.log('dir', o.dir, 'fade', o.fade, '| x', Math.round(o.x0), '->', Math.round(o.x1), '| moved', o.moved, o.ok ? 'OK' : 'REVERSE', '| vpX', Math.round(o.vpX)));
