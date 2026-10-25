// 长时间跑一遍，输出行为统计：掉头/消失的比例、蓄力拍几下、朝向是否与位移同向
import { registerFont, bootSite } from './_env.mjs';

registerFont();
const { pump, state } = await bootSite(1200, 700);

const FRAMES = Number(process.argv[2] || 60000);
let prev = '';
let returns = 0, vanishes = 0;
let windups = 0, windStartPhase = 0, beats = [];
let enterX = 0, enterDir = 0, enterKind = ''; // 'in' | 'out'
const heading = { inOk: 0, inBad: 0, outOk: 0, outBad: 0 };

for (let f = 0; f < FRAMES; f++) {
  pump(1);
  const s = state;

  // 进入 in/out 的第一帧还没做投影，要等一帧再记起点，否则会把模型跳变算成反向
  if (prev !== 'in' && s.mode === 'in') { enterKind = 'in'; enterX = NaN; }
  if (prev !== 'out' && s.mode === 'out') { enterKind = 'out'; enterX = NaN; }
  // 进入 in/out 的那一帧还没做投影，等下一帧（prev 已经是该模式）再记起点
  if ((enterKind === 'in' && s.mode === 'in' && prev === 'in' && Number.isNaN(enterX)) ||
      (enterKind === 'out' && s.mode === 'out' && prev === 'out' && Number.isNaN(enterX))) {
    enterX = s.x; enterDir = s.dir;
  }
  if (s.mode === 'in' && enterKind === 'in' && prev === 'in') {
    const d = s.x - enterX;
    if (Math.abs(d) > 20) { (Math.sign(d) === enterDir ? heading.inOk++ : heading.inBad++); enterKind = ''; }
  }
  if (s.mode === 'out' && enterKind === 'out' && prev === 'out') {
    const d = s.x - enterX;
    if (Math.abs(d) > 20) { (Math.sign(d) === enterDir ? heading.outOk++ : heading.outBad++); enterKind = ''; }
  }

  if (prev !== 'windup' && s.mode === 'windup') { windups++; windStartPhase = s.phase; }
  if (prev === 'windup' && s.mode === 'out') beats.push((s.phase - windStartPhase) / (2 * Math.PI * 1.5));

  if (prev === 'out' && s.mode === 'in') returns++;
  if (prev === 'out' && s.mode === 'off') vanishes++;

  prev = s.mode;
}

console.log('帧数', FRAMES, '（约', (FRAMES / 60).toFixed(0), '秒）');
console.log('游远之后：掉头回来', returns, '次 | 隐入深海', vanishes, '次');
console.log('蓄力', windups, '次，每次尾鳍完整摆动', beats.length ? (beats.reduce((a, b) => a + b, 0) / beats.length).toFixed(2) : '-', '个');
console.log('朝向与位移同向（头在前）：游近', heading.inOk, '次 / 反向', heading.inBad, '| 游远', heading.outOk, '次 / 反向', heading.outBad);
