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
    lifeMin: 22,
    lifeMax: 38,
    gapMin: 4,
    gapMax: 10,
    fadeIn: 1.8,
    fadeOut: 1.8,
    inSpan: 11.4,       // 从深海游上来（0.7 倍速 => 8/0.7）
    outSpan: 14.25,     // 游回深海（11.4 / 0.8）
    glanceEvery: 14,
    glanceHold: 3.4,
    depthFar: 3.0,      // 游到头时离镜头远 3 倍（最小 1/3）
    diveSpan: 13.0,     // 去程秒数（深度线性推进，大小按 1/深度 掉）
    holdSpan: 1.4,      // 在远处待一下掉头
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
    inT: 0,
    outT: 0,
    windT: 0,
    windDur: 0,
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

  // behind: 远点放在鲸鱼身后（浮现/回程，鲸鱼朝着观众游来）
  // !behind: 远点放在鲸鱼前方（游走，鲸鱼朝着远方游去）
  function anchor(behind) {
    state.p0x = state.x;
    state.p0y = state.y;
    var d = state.dir * vw * 0.46 * (behind ? -1 : 1);
    state.vpX = Math.min(vw * 0.94, Math.max(vw * 0.06, state.p0x + d));
    state.vpY = vh * 0.17;
  }

  // 位置和大小同时由一个深度倍数 k 决定，三者永远自洽
  function setDepth(k) {
    state.zoom = 1 / k;
    state.x = state.vpX + (state.p0x - state.vpX) / k;
    state.y = state.vpY + (state.p0y - state.vpY) / k;
    state.yOff = 0;
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
    anchor(true);
    state.mode = 'in';
    state.appear = 0;
    state.inT = 0;
    state.outT = 0;
    state.fade = true;
    state.willReturn = false;
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
    if (state.mode === 'swim' || state.mode === 'off') state.yOff = 0;

    if (state.mode === 'off') {
      state.timer -= dt;
      if (state.timer <= 0) restart();
      return;
    }

    if (state.mode === 'in') {
      state.inT += dt;
      var pi = Math.min(1, state.inT / CFG.inSpan);
      var ei = pi * pi * (3 - 2 * pi);
      setDepth(CFG.depthFar + (1 - CFG.depthFar) * ei);        // 深 -> 近
      state.appear = state.fade === false ? 1 : Math.min(1, state.inT / CFG.fadeIn);
      state.phase += dt * (3.48 - 1.32 * ei);                  // 出场尾鳍拍得快（x1.2）
      if (pi >= 1) {
        state.mode = 'swim';
        state.appear = 1;
        state.zoom = 1;
        state.fade = true;
        if (state.timer <= 0) state.timer = CFG.lifeMin + Math.random() * (CFG.lifeMax - CFG.lifeMin);
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


      var edge = state.dir > 0 ? (state.x > vw - 90 * scale) : (state.x < 90 * scale);
      if (state.timer <= 0 || edge) {
        // 先加速蓄力：尾鳍以 1.4 倍速拍两下，再出发
        state.mode = 'windup';
        state.windT = 0;
        state.windDur = 2 * Math.PI * 1.5 * 2 / (1.4 * (1.7 + state.speed / 26));
        state.timer = 0;
      }
    } else if (state.mode === 'windup') {
      state.windT += dt;
      var rate = 1.4 * (1.7 + state.speed / 26);
      state.phase += dt * rate;                      // 尾鳍 1.4 倍速
      state.x += state.speed * 0.30 * dt * state.dir; // 略微前冲，别像卡住
      state.look = Math.max(0, state.look - dt * 2.5);
      if (state.windT >= state.windDur) {
        state.mode = 'out';
        state.outT = 0;
        state.appear = 1;
        anchor(false);
        // 抛硬币：游到远处掉头回来，还是隐入深海换个地方出现
        state.willReturn = Math.random() < 0.5;
      }
    } else if (state.mode === 'out') {
      state.outT += dt;
      var po = Math.min(1, state.outT / CFG.outSpan);
      var eo = po * po * (3 - 2 * po);
      setDepth(1 + (CFG.depthFar - 1) * eo);                   // 近 -> 深
      state.appear = po > 1 - CFG.fadeOut / CFG.outSpan
        ? Math.max(0, (1 - po) / (CFG.fadeOut / CFG.outSpan))
        : 1;
      state.phase += dt * (2.016 + 1.632 * eo);                // 离场尾鳍再慢 0.8 倍
      if (po >= 1) {
        if (state.willReturn) {
          // 原地掉头，沿同一条视线游回来
          state.dir = -state.dir;
          state.mode = 'in';
          state.inT = 0;
          state.appear = 1;
          state.fade = false;
        } else {
          state.mode = 'off';
          state.timer = CFG.gapMin + Math.random() * (CFG.gapMax - CFG.gapMin);
        }
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
