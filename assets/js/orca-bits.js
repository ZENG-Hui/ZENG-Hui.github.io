/* 0/1 虎鲸。
   身子是一张"身体坐标系"里的掩膜，字按格子铺上去：
   越靠轮廓越亮，最外圈稀疏散开，像从黑暗里一点点复现出来。 */
(function (global) {
  'use strict';

  var ANCHORS = [
    [0.000, 1.2], [0.012, 6.0], [0.040, 12.2], [0.080, 16.6],
    [0.130, 19.6], [0.200, 21.6], [0.300, 23.0], [0.420, 23.6],
    [0.550, 21.6], [0.680, 17.6], [0.790, 13.0], [0.880, 8.6],
    [0.950, 4.4], [1.000, 2.0]
  ];

  var LUT_N = 256;
  var LUT = new Float32Array(LUT_N + 1);
  (function () {
    var xs = ANCHORS.map(function (a) { return a[0]; });
    var ys = ANCHORS.map(function (a) { return a[1]; });
    for (var i = 0; i <= LUT_N; i++) {
      var s = i / LUT_N, k = 0;
      while (k < xs.length - 2 && s > xs[k + 1]) k++;
      var x0 = xs[k], x1 = xs[k + 1], t = (s - x0) / (x1 - x0);
      var y0 = ys[k], y1 = ys[k + 1];
      var yp = k > 0 ? ys[k - 1] : ys[k];
      var yn = k < ys.length - 2 ? ys[k + 2] : ys[k + 1];
      var m0 = (y1 - yp) * 0.5, m1 = (yn - y0) * 0.5;
      var t2 = t * t, t3 = t2 * t;
      LUT[i] = (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * m0 +
               (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * m1;
    }
  })();

  function halfWidth(s) {
    s = s < 0 ? 0 : s > 1 ? 1 : s;
    var f = s * LUT_N, i = Math.floor(f), t = f - i;
    return LUT[i] * (1 - t) + LUT[Math.min(LUT_N, i + 1)] * t;
  }

  function X(s) { return 100 - 200 * s; }

  function waveAmp(s) {
    var sc = s > 1 ? 1 : s;
    return 0.5 + 8.4 * Math.pow(sc, 2.1);
  }

  function centre(s, phase) {
    return waveAmp(s) * Math.sin(Math.PI * 2 * 1.05 * s - phase);
  }

  function tailBeat(phase) {
    return Math.sin(phase - 0.9) * (22 * Math.PI / 180);
  }

  function hash(i, j, k) {
    var h = (i * 374761393 + j * 668265263 + k * 2246822519) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967295;
  }

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  // ---------- 轮廓 ----------

  function bodyPath(ctx, phase) {
    var n = 56, top = [], bottom = [], i, s, x, cy, w;
    for (i = 0; i <= n; i++) {
      s = i / n; x = X(s); cy = centre(s, phase); w = halfWidth(s);
      top.push([x, cy - w]); bottom.push([x, cy + w]);
    }
    ctx.beginPath();
    ctx.moveTo(top[0][0], top[0][1]);
    for (i = 1; i <= n; i++) ctx.lineTo(top[i][0], top[i][1]);
    ctx.quadraticCurveTo(X(1) - 3, centre(1, phase), bottom[n][0], bottom[n][1]);
    for (i = n - 1; i >= 0; i--) ctx.lineTo(bottom[i][0], bottom[i][1]);
    ctx.quadraticCurveTo(X(0) + 5, centre(0, phase), top[0][0], top[0][1]);
    ctx.closePath();
  }

  function tailPath(ctx, phase) {
    ctx.save();
    ctx.translate(X(1), centre(1, phase));
    ctx.rotate(tailBeat(phase));
    ctx.beginPath();
    ctx.moveTo(3, 0);
    ctx.bezierCurveTo(-7, -5, -19, -10.5, -31, -8.5);
    ctx.bezierCurveTo(-23, -4, -18, -1.2, -15.5, 0.2);
    ctx.bezierCurveTo(-18, 1.6, -23, 4.6, -31, 9.5);
    ctx.bezierCurveTo(-19, 11, -7, 6, 3, 1.2);
    ctx.closePath();
    ctx.restore();
  }

  function finPath(ctx, phase) {
    ctx.save();
    ctx.translate(X(0.40), centre(0.40, phase) - halfWidth(0.40) * 0.92);
    ctx.rotate(Math.sin(phase - 0.4) * 2.2 * Math.PI / 180);
    ctx.beginPath();
    ctx.moveTo(10, 1);
    ctx.bezierCurveTo(9, -9, 4, -19, -4, -27);
    ctx.bezierCurveTo(-3, -17, -6, -8, -8, 1);
    ctx.closePath();
    ctx.restore();
  }

  function flipperPath(ctx, phase) {
    ctx.save();
    ctx.translate(X(0.62), centre(0.62, phase) + halfWidth(0.62) * 0.72);
    ctx.rotate((26 + Math.sin(phase * 0.9 + 1.2) * 7) * Math.PI / 180);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-7, 4, -15, 9, -23, 10.5);
    ctx.bezierCurveTo(-15, 5, -8, 1, -3, -2);
    ctx.closePath();
    ctx.restore();
  }

  // ---------- 掩膜 + 距离场 ----------

  var PPU = 2.8;
  var X0 = -150, Y0 = -62, XSPAN = 276, YSPAN = 118;
  var NEUTRAL = 0.9;

  function buildMask(makeCanvas) {
    var W = Math.ceil(XSPAN * PPU), H = Math.ceil(YSPAN * PPU);
    var c = makeCanvas(W, H), ctx = c.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(-X0 * PPU, -Y0 * PPU);
    ctx.scale(PPU, PPU);
    ctx.fillStyle = '#fff';
    tailPath(ctx, NEUTRAL); ctx.fill();
    finPath(ctx, NEUTRAL); ctx.fill();
    bodyPath(ctx, 0); ctx.fill();
    flipperPath(ctx, NEUTRAL); ctx.fill();
    ctx.restore();

    var data = ctx.getImageData(0, 0, W, H).data;
    var inside = new Uint8Array(W * H), i;
    for (i = 0; i < W * H; i++) inside[i] = data[i * 4] > 110 ? 1 : 0;

    var INF = 1e6, dist = new Float32Array(W * H);
    for (i = 0; i < W * H; i++) dist[i] = inside[i] ? INF : 0;
    var A = 1, B = 1.4142, x, y, idx, d;
    for (y = 0; y < H; y++) {
      for (x = 0; x < W; x++) {
        idx = y * W + x;
        if (!inside[idx]) continue;
        d = dist[idx];
        if (x > 0) d = Math.min(d, dist[idx - 1] + A);
        if (y > 0) {
          d = Math.min(d, dist[idx - W] + A);
          if (x > 0) d = Math.min(d, dist[idx - W - 1] + B);
          if (x < W - 1) d = Math.min(d, dist[idx - W + 1] + B);
        }
        dist[idx] = d;
      }
    }
    for (y = H - 1; y >= 0; y--) {
      for (x = W - 1; x >= 0; x--) {
        idx = y * W + x;
        if (!inside[idx]) continue;
        d = dist[idx];
        if (x < W - 1) d = Math.min(d, dist[idx + 1] + A);
        if (y < H - 1) {
          d = Math.min(d, dist[idx + W] + A);
          if (x < W - 1) d = Math.min(d, dist[idx + W + 1] + B);
          if (x > 0) d = Math.min(d, dist[idx + W - 1] + B);
        }
        dist[idx] = d;
      }
    }

    return {
      W: W, H: H,
      sample: function (x, y) {
        var px = Math.round((x - X0) * PPU), py = Math.round((y - Y0) * PPU);
        if (px < 0 || py < 0 || px >= W || py >= H) return -1;
        var k = py * W + px;
        if (!inside[k]) return -1;
        return dist[k] / PPU;
      }
    };
  }

  // ---------- 字 ----------

  var X_LEFT = -140, X_RIGHT = 124;

  function inPatch(s, yv, look) {
    var s0 = 0.105 + look * 0.012;
    var y0 = -0.16 * halfWidth(s0);
    var rs = 0.062 + look * 0.012;
    var ry = 6.6 + look * 1.4;
    var dx = (s - s0) / rs, dy = (yv - y0) / ry;
    return dx * dx + dy * dy < 1;
  }

  function layout(mask, st) {
    var phase = st.phase, look = st.look, time = st.time;
    var appear = st.appear === undefined ? 1 : st.appear;
    var scan = st.scan === undefined ? -1 : st.scan;
    var cell = st.cell;

    var cols = Math.round((X_RIGHT - X_LEFT) / cell);
    var rows = Math.round(110 / cell);
    var beat = tailBeat(phase), cosB = Math.cos(beat), sinB = Math.sin(beat);
    var tailX = X(1), tailY = centre(1, phase);
    var out = [];

    for (var j = 0; j < rows; j++) {
      var yv = (j - (rows - 1) / 2) * cell;
      for (var i = 0; i < cols; i++) {
        var x = X_LEFT + (i + 0.5) * cell;
        var d = mask.sample(x, yv);
        if (d < 0) continue;

        var s = (100 - x) / 200;
        var w = halfWidth(s < 0 ? 0 : s > 1 ? 1 : s);

        var b = 0.62 + 0.45 * Math.exp(-d / 1.7);
        if (s <= 1 && s >= 0 && yv > 0.16 * w) b = Math.max(b, 0.9 + 0.12 * Math.exp(-d / 2.0));
        if (s <= 1 && s >= 0 && inPatch(s, yv, look)) b = Math.max(b, 1.0);

        if (scan >= 0 && s >= 0 && s <= 1) {
          var ds = Math.abs(s - scan);
          if (ds < 0.07) b += 0.42 * (1 - ds / 0.07);
        }

        var keep = d < 2.4 ? 0.35 + 0.65 * (d / 2.4) : 1;
        if (hash(i, j, 2) > keep) continue;
        if (hash(i, j, 9) > appear) continue;

        var fade = clamp01(d / 1.2);
        var flick = 0.76 + 0.24 * Math.sin(time * 2.0 + hash(i, j, 3) * 9.4);
        var a = clamp01(b) * (0.55 + 0.45 * fade) * flick;
        if (a < 0.06) continue;

        var sx, sy;
        if (x < tailX) {
          var dx = x - tailX, dy = yv;
          sx = tailX + dx * cosB - dy * sinB;
          sy = tailY + dx * sinB + dy * cosB;
        } else {
          sx = x;
          sy = centre(s, phase) + yv;
        }

        var flip = Math.floor(time * 0.85 + hash(i, j, 13) * 5) % 2;
        out.push({ x: sx, y: sy, a: a, ch: flip ? 1 : 0, hot: b > 0.7 });
      }
    }
    return out;
  }

  function makeAtlas(makeCanvas, px) {
    var pad = Math.max(4, px * 0.6);
    var atlases = [null, null];
    for (var d = 0; d < 2; d++) {
      var w = Math.ceil(px * 0.85) + pad * 2;
      var h = Math.ceil(px * 1.25) + pad * 2;
      var c = makeCanvas(w, h);
      var ctx = c.getContext('2d');
      ctx.font = '700 ' + px + 'px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(110,185,255,0.95)';
      ctx.shadowBlur = px * 0.32;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(d ? '1' : '0', w / 2, h / 2);
      ctx.fillText(d ? '1' : '0', w / 2, h / 2);
      atlases[d] = c;
    }
    return atlases;
  }

  function create(opts) {
    var makeCanvas = opts.makeCanvas;
    var mask = buildMask(makeCanvas);
    var atlas = null, atlasPx = 0, atlasCool = null, atlasWarm = null;

    function ensureAtlas(px) {
      if (atlas && Math.abs(px - atlasPx) < 0.5) return;
      atlasPx = px;
      atlasCool = makeAtlas(makeCanvas, px);
      atlasWarm = makeAtlas(makeCanvas, px);
      // 冷白两套：一套偏蓝，一套接近纯白
      var i;
      for (i = 0; i < 2; i++) {
        tint(atlasCool[i], 'rgba(120,190,255,0.92)');
        tint(atlasWarm[i], 'rgba(240,250,255,0.97)');
      }
      atlas = true;
    }

    function tint(canvas, color) {
      var ctx = canvas.getContext('2d');
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
    }

    function render(ctx, st) {
      var px = st.cell * st.scale;
      ensureAtlas(px);
      var glyphs = layout(mask, st);
      var gw = atlasCool[0].width, gh = atlasCool[0].height;

      ctx.save();
      ctx.translate(st.x, st.y);
      ctx.scale(st.scale, st.scale);
      ctx.scale(1 - st.look * 0.05, 1 + st.look * 0.02);

      var i, g;
      for (i = 0; i < glyphs.length; i++) {
        g = glyphs[i];
        if (g.hot) continue;
        ctx.globalAlpha = g.a;
        ctx.drawImage(atlasCool[g.ch],
          g.x - (gw / 2) / st.scale, g.y - (gh / 2) / st.scale,
          gw / st.scale, gh / st.scale);
      }
      for (i = 0; i < glyphs.length; i++) {
        g = glyphs[i];
        if (!g.hot) continue;
        ctx.globalAlpha = g.a;
        ctx.drawImage(atlasWarm[g.ch],
          g.x - (gw / 2) / st.scale, g.y - (gh / 2) / st.scale,
          gw / st.scale, gh / st.scale);
      }
      ctx.globalAlpha = 1;

      // 眼睛：一颗亮着的点
      if (st.eye !== false) {
        var ex = X(0.105) + 3.0 + st.look * 1.5;
        var ey = centre(0.105, st.phase) - halfWidth(0.105) * 0.16;
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(ex, ey, 1.9 + st.look * 0.5, (1.9 + st.look * 0.6) * (st.blink ? 0.08 : 1), 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(230,246,255,0.95)';
        ctx.shadowColor = 'rgba(140,205,255,0.9)';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.restore();
      }

      // 身后散落的字
      if (st.trail) {
        for (i = 0; i < st.trail.length; i++) {
          var t = st.trail[i];
          ctx.globalAlpha = t.a;
          ctx.drawImage(atlasCool[t.ch],
            t.x - (gw / 2) / st.scale, t.y - (gh / 2) / st.scale,
            gw / st.scale, gh / st.scale);
        }
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }

    return { render: render, mask: mask, layout: layout };
  }

  var api = { create: create, layout: layout, halfWidth: halfWidth, centre: centre, X: X, tailBeat: tailBeat };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.OrcaBits = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
