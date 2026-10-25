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
    cell: 4.0,          // 身体坐标里的格子边长
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
    glanceHold: 3.4
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
    dir: 1
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
    state.x = lo + Math.random() * (hi - lo);
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
    var tailX = state.x - 100 * scale * 0.95;
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
        state.x += state.speed * 0.12 * dt;
        if (state.glancePhase < 1.0) state.look = Math.max(0, state.look - dt * 1.8);
      } else {
        state.look = Math.max(0, state.look - dt * 2.2);
        state.x += state.speed * dt;
        if (state.glanceTimer <= 0) {
          state.glancePhase = CFG.glanceHold;
          state.glanceTimer = CFG.glanceEvery * (0.8 + Math.random());
        }
      }

      state.phase += dt * (1.7 + state.speed / 26);
      state.y += Math.sin(state.time * 0.55) * 3.2 * dt;
      if (Math.random() < dt * 6 && state.appear > 0.7) spawnTrail();

      if (state.timer <= 0 || state.x > vw - 90 * scale) {
        state.mode = 'out';
        state.timer = 0;
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
      y: state.y,
      scale: scale,
      cell: CFG.cell,
      phase: state.phase,
      look: state.look,
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
