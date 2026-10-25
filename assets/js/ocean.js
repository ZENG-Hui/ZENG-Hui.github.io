/* 0/1 虎鲸的生命周期：
   黑暗里浮现 -> 游一会儿 -> 偶尔停下来看看你 -> 散回黑暗。
   全部动作只碰 transform 与画字，没有布局，没有图片。 */

(function () {
  'use strict';

  var canvas = document.getElementById('ocean');
  if (!canvas || !window.OrcaBits) return;

  var ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  var CFG = {
    cell: 4.2,          // 身体坐标里的格子边长
    lenMin: 300,
    lenMax: 560,
    lenRatio: 0.34,
    swim: 13,           // px/s
    lifeMin: 16,
    lifeMax: 28,
    gapMin: 4,
    gapMax: 10,
    fadeIn: 2.2,
    fadeOut: 2.4,
    glanceEvery: 14,
    glanceHold: 3.4,
    depthFar: 1.6,      // 游到头时离镜头远 1.6 倍
    diveSpan: 8.5,      // 去程秒数（深度线性推进，大小按 1/深度 掉）
    holdSpan: 1.2,      // 在远处待一下掉头
    riseSpan: 8.5       // 回程秒数
  };

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var vw = 0, vh = 0, len = 400, scale = 2;

  var orca = window.OrcaBits.create({
    makeCanvas: function (w, h) {
      var c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w));
      c.height = Math.max(1, Math.round(h));
      return c;
    }
  });

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var state = {
    mode: 'off',
    x: 0, y: 0,
    phase: 0,
    look: 0,
    blink: false,
    appear: 0,
    time: 0,
    speed: CFG.swim,
    timer: 3,
    glanceTimer: CFG.glanceEvery,
    glancePhase: 0,
    trail: [],
    dir: 1,
    fin: 0,
    vy: 0,
    yTarget: 0,
    yTimer: 0,
    zoom: 1,
    yOff: 0,
    turnTimer: 10,
    turnPhase: 0,
    flipped: false,
    seed: Math.random() * 6.283
  };

  function resize() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    canvas.style.width = vw + 'px';
    canvas.style.height = vh + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    len = Math.max(CFG.lenMin, Math.min(CFG.lenMax, vw * CFG.lenRatio));
    scale = len / 200;
  }

  function place() {
    // 别让尾鳍或吻部一开始就被屏幕切掉
    var left = 140 * scale + 30;
    var right = 124 * scale + 30;
    var lo = Math.max(left, vw * 0.18);
    var hi = Math.min(vw - right, vw * 0.72);
    if (hi < lo) hi = lo;
    // 随机掉头：朝右从左半场出场，朝左从右半场出场
    state.dir = Math.random() < 0.5 ? 1 : -1;
    state.x = state.dir > 0
      ? lo + Math.random() * (hi - lo) * 0.45
      : hi - Math.random() * (hi - lo) * 0.45;
    state.y = vh * (0.56 + Math.random() * 0.22);
    state.phase = Math.random() * Math.PI * 2;
    state.speed = CFG.swim * (0.75 + Math.random() * 0.6);
    state.trail.length = 0;
  }

  function restart() {
    place();
    state.mode = 'in';
    state.appear = 0;
    state.timer = 0;
    state.look = 0;
    state.glanceTimer = CFG.glanceEvery * (0.6 + Math.random() * 0.8);
    state.glancePhase = 0;
  }

  function spawnTrail() {
    var tailX = state.x - 100 * scale * 0.95 * state.dir;
    var tailY = state.y + Math.sin(state.phase - 0.9) * 4;
    state.trail.push({
      x: tailX + (Math.random() - 0.5) * 26,
      y: tailY + (Math.random() - 0.5) * 22,
      ch: Math.random() < 0.5 ? 0 : 1,
      a: 0.35 + Math.random() * 0.4,
      life: 1.6 + Math.random() * 1.4,
      vy: (Math.random() - 0.6) * 6,
      vx: -6 - Math.random() * 10
    });
    if (state.trail.length > 26) state.trail.shift();
  }

  function step(dt) {
    state.time += dt;
    if (state.mode !== 'turn') {
      if (state.zoom < 1) state.zoom = Math.min(1, state.zoom + dt * 0.35);
      state.yOff += (0 - state.yOff) * Math.min(1, dt * 1.5);
    }

    if (state.mode === 'off') {
      state.timer -= dt;
      if (state.timer <= 0) restart();
      return;
    }

    if (state.mode === 'in') {
      state.appear = Math.min(1, state.appear + dt / CFG.fadeIn);
      state.phase += dt * 0.9;
      if (state.appear >= 1) {
        state.mode = 'swim';
        state.timer = CFG.lifeMin + Math.random() * (CFG.lifeMax - CFG.lifeMin);
      }
    } else if (state.mode === 'swim') {
      state.timer -= dt;
      state.glanceTimer -= dt;

      if (state.glancePhase > 0) {
        state.glancePhase -= dt;
        state.look = Math.min(1, state.look + dt * 1.6);
        state.x += state.speed * 0.12 * dt * state.dir;
        if (state.glancePhase < 1.0) state.look = Math.max(0, state.look - dt * 1.8);
      } else {
        state.look = Math.max(0, state.look - dt * 2.2);
        state.x += state.speed * state.zoom * dt * state.dir;
        if (state.glanceTimer <= 0) {
          state.glancePhase = CFG.glanceHold;
          state.glanceTimer = CFG.glanceEvery * (0.8 + Math.random());
        }
      }

      state.phase += dt * (1.7 + state.speed / 26);
      // 追一个高度目标：真的游上去或游下来，而不是原地抖
      state.yTimer -= dt;
      if (state.yTimer <= 0 || Math.abs(state.y - state.yTarget) < 10) {
        state.yTarget = vh * (0.24 + Math.random() * 0.54);
        state.yTimer = 8 + Math.random() * 11;
      }
      var vyT = Math.max(-11, Math.min(11, (state.yTarget - state.y) * 0.55));
      state.vy += (vyT - state.vy) * Math.min(1, dt * 1.6);
      state.y += state.vy * dt;
      if (state.y < vh * 0.22) { state.y = vh * 0.22; state.vy = Math.abs(state.vy); }
      if (state.y > vh * 0.82) { state.y = vh * 0.82; state.vy = -Math.abs(state.vy); }
      var finTarget = Math.max(-1, Math.min(1, state.vy / 11));
      state.fin += (finTarget - state.fin) * Math.min(1, dt * 2.2);
      if (Math.random() < dt * 6 && state.appear > 0.7) spawnTrail();

      state.turnTimer -= dt;
      if (state.turnTimer <= 0 && state.zoom < 1.02) {
        state.mode = 'turn';
        state.turnPhase = 0;
        state.flipped = false;
        // 远点：沿游动方向远处、接近地平线；起点就是当前位置
        state.p0x = state.x;
        state.p0y = state.y;
        var ahead = vw * 0.46;
        state.vpX = state.dir > 0
          ? Math.min(vw * 0.94, state.x + ahead)
          : Math.max(vw * 0.06, state.x - ahead);
        state.vpY = vh * 0.17;
      }

      var edge = state.dir > 0 ? (state.x > vw - 90 * scale) : (state.x < 90 * scale);
      if (state.timer <= 0 || edge) {
        state.mode = 'out';
        state.timer = 0;
      }
    } else if (state.mode === 'turn') {
      state.turnPhase += dt;
      var dOut = CFG.diveSpan, dHold = CFG.holdSpan, dBack = CFG.riseSpan;
      var span = dOut + dHold + dBack;
      var t = Math.min(state.turnPhase, span);

      // 深度是以等速推进的，不是大小；缓入缓出模拟加速/减速
      var prog;
      if (t < dOut) { var a = t / dOut; prog = a * a * (3 - 2 * a); }
      else if (t < dOut + dHold) { prog = 1; }
      else { var b = (t - dOut - dHold) / dBack; prog = 1 - b * b * (3 - 2 * b); }
      var depth = 1 + (CFG.depthFar - 1) * prog;
      state.zoom = 1 / depth;

      // 掉头发生在最远处
      if (t >= dOut + dHold * 0.45 && !state.flipped) {
        state.dir = -state.dir;
        state.flipped = true;
      }
      // 透视投影：位置和大小由同一个 k 决定，所以平移与缩放必然同步
      var k = depth;
      state.x = state.vpX + (state.p0x - state.vpX) / k;
      state.y = state.vpY + (state.p0y - state.vpY) / k;
      state.yOff = 0;

      state.phase += dt * (1.25 + state.speed / 40);
      state.look = Math.max(0, state.look - dt * 2.5);
      if (t >= span) {
        state.mode = 'swim';
        state.zoom = 1;
        state.turnTimer = 11 + Math.random() * 9;
      }
    } else if (state.mode === 'out') {
      state.appear = Math.max(0, state.appear - dt / CFG.fadeOut);
      state.phase += dt * 1.1;
      if (state.appear <= 0) {
        state.mode = 'off';
        state.timer = CFG.gapMin + Math.random() * (CFG.gapMax - CFG.gapMin);
      }
    }

    for (var i = state.trail.length - 1; i >= 0; i--) {
      var t = state.trail[i];
      t.life -= dt;
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.a *= 1 - dt * 0.9;
      if (t.life <= 0 || t.a < 0.03) state.trail.splice(i, 1);
    }
  }

  function render() {
    ctx.clearRect(0, 0, vw, vh);
    if (state.mode === 'off' || state.appear <= 0.005) return;

    orca.render(ctx, {
      x: state.x,
      y: state.y + state.yOff,
      scale: scale * state.zoom,
      cell: CFG.cell,
      phase: state.phase,
      look: state.look,
      fin: state.fin,
      dir: state.dir,
      zoom: state.zoom,
      blink: state.blink,
      appear: state.appear,
      time: state.time,
      trail: state.trail
    });
  }

  var raf = 0, last = 0, acc = 0, failed = false;

  function loop(now) {
    raf = window.requestAnimationFrame(loop);
    if (failed) return;
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    acc += dt;
    // 水里游的东西不需要 60 帧，省一半电
    if (acc < 0.028) return;
    try {
      step(acc);
      render();
    } catch (e) {
      failed = true;
      if (window.console) console.warn('[ocean] stopped:', e && e.message);
    }
    acc = 0;
  }

  function start() {
    if (raf) return;
    last = 0;
    raf = window.requestAnimationFrame(loop);
  }

  function stop() {
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
  }

  function staticFrame() {
    resize();
    ctx.clearRect(0, 0, vw, vh);
    orca.render(ctx, {
      x: vw * 0.62, y: vh * 0.74, scale: scale, cell: CFG.cell,
      phase: 0.4, look: 0, appear: 1, time: 0, trail: []
    });
  }

  window.addEventListener('resize', function () {
    resize();
    if (reduce.matches) staticFrame();
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else if (!reduce.matches) start();
  });

  // 注意：init 在下面统一调用（带 try），这里不再重复触发

  function init() {
    resize();
    if (reduce.matches) { staticFrame(); return; }
    state.mode = 'off';
    state.timer = 1.2;
    start();
  }

  // 万一某台机器上建掩膜失败，别把整个页面拖下水
  try {
    init();
  } catch (e) {
    if (window.console) console.warn('[ocean] disabled:', e && e.message);
  }

  var onMotion = function (e) {
    if (e.matches) { stop(); staticFrame(); }
    else { start(); }
  };
  if (reduce.addEventListener) reduce.addEventListener('change', onMotion);
  else if (reduce.addListener) reduce.addListener(onMotion);

  window.__ocean = { state: state, step: step, render: render, resize: resize, cfg: CFG, orca: orca };
})();
