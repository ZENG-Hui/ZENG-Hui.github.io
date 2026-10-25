/* 0/1 虎鲸。
   身子是一张"身体坐标系"里的掩膜，字按格子铺上去：
   越靠轮廓越亮，最外圈稀疏散开，像从黑暗里一点点复现出来。 */
(function (global) {
  'use strict';

  // 身体侧影：钝头 + 后脑最厚 + 细尾柄。这三件事决定它是虎鲸而不是鱼。
  var ANCHORS = [
    [0.000, 18.0], [0.050, 28.0], [0.120, 36.0], [0.200, 41.0],
    [0.280, 41.0], [0.380, 39.5], [0.500, 37.0], [0.620, 33.0],
    [0.720, 28.0], [0.820, 21.0], [0.900, 13.0], [0.960, 7.0],
    [1.000, 4.0]
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
    var sc = s < 0 ? 0 : s > 1 ? 1 : s;
    return 0.5 + 8.4 * Math.pow(sc, 2.1);
  }

  function centre(s, phase) {
    return waveAmp(s) * Math.sin(Math.PI * 2 * 1.05 * s - phase) + headDrop(s);
  }

  // 吻端往下垂一点，脸才立得起来
  function headDrop(s) {
    var t = clamp01((0.13 - s) / 0.13);
    return 8 * t * t;
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
      top.push([x, cy - w * 0.88]); bottom.push([x, cy + w * 1.12]);
    }
    ctx.beginPath();
    ctx.moveTo(top[0][0], top[0][1]);
    for (i = 1; i <= n; i++) ctx.lineTo(top[i][0], top[i][1]);
    ctx.quadraticCurveTo(X(1) - 3, centre(1, phase), bottom[n][0], bottom[n][1]);
    for (i = n - 1; i >= 0; i--) ctx.lineTo(bottom[i][0], bottom[i][1]);
    ctx.quadraticCurveTo(X(0) + 7, centre(0, phase), top[0][0], top[0][1]);
    ctx.closePath();
  }

  function tailPath(ctx, phase) {
    ctx.save();
    ctx.translate(X(1), centre(1, phase));
    ctx.rotate(tailBeat(phase));
    ctx.beginPath();
    ctx.rotate(0.2);
    ctx.moveTo(8, -2);
    ctx.bezierCurveTo(-6, -13, -28, -26, -50, -27);
    ctx.bezierCurveTo(-43, -15, -37, -5, -35, 0);
    ctx.bezierCurveTo(-40, 9, -46, 21, -52, 31);
    ctx.bezierCurveTo(-29, 24, -7, 12, 8, 3);
    ctx.closePath();
    ctx.restore();
  }

  function finPath(ctx, phase) {
    ctx.save();
    // 小三角，尖往后弯
    ctx.translate(X(0.40), centre(0.40, phase) - halfWidth(0.40) * 0.84);
    ctx.rotate(Math.sin(phase - 0.4) * 2.2 * Math.PI / 180);
    ctx.beginPath();
    ctx.moveTo(14, 4);
    ctx.bezierCurveTo(12, -14, 2, -34, -12, -46);
    ctx.bezierCurveTo(-18, -47, -20, -40, -19, -30);
    ctx.bezierCurveTo(-17, -14, -13, -3, -11, 4);
    ctx.closePath();
    ctx.restore();
  }

  function flipperPath(ctx, phase) {
    ctx.save();
    // 胸鳍长在头后面，不是肚皮中间 —— 这一条最容易被看成"鱼"。
    ctx.translate(X(0.28), centre(0.28, phase) + halfWidth(0.28) * 0.88);
    ctx.rotate((-38 + Math.sin(phase * 0.9 + 1.2) * 6) * Math.PI / 180);
    ctx.beginPath();
    ctx.moveTo(4, -7);
    ctx.bezierCurveTo(-9, 1, -23, 10, -35, 12);
    ctx.bezierCurveTo(-29, 3, -17, -7, -9, -12);
    ctx.closePath();
    ctx.restore();
  }

  // ---------- 掩膜 + 距离场 ----------

  var PPU = 2.8;
  var X0 = -178, Y0 = -110, XSPAN = 314, YSPAN = 200;
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

  var X_LEFT = -172, X_RIGHT = 126;

  // 白肚皮的分界线：从下巴往上抬，到身体中段变高
  function bellyLine(s, w) {
    var t = clamp01((s - 0.16) / 0.44);
    var k = 0.46 - 0.26 * (t * t * (3 - 2 * t));
    return k * w;
  }

  function inWhite(s, yv, w, look) {
    if (inPatch(s, yv, look)) return true;                 // 眼斑
    if (s < 0.10 && yv > 0.52 * w) return true;            // 下巴
    if (s > 0.16 && yv > bellyLine(s, w)) return true;     // 腹部
    return false;
  }

  // 背鳍和尾鳍是黑的
  function isBlack(s, yv, w) {
    if (s > 1.02) return true;                                    // 尾鳍
    if (s > 0.30 && s < 0.56 && yv < -0.88 * w - 3) return true;  // 背鳍
    return false;
  }

  // 眼斑：斜着往上后方拉长的一枚白斑，虎鲸的第二张名片
  function inPatch(s, yv, look) {
    var s0 = 0.092 + look * 0.012;
    var y0 = -0.46 * halfWidth(s0);
    var rs = 0.13 + look * 0.014;
    var ry = 13.0 + look * 2.0;
    var tilt = y0 - (s - s0) * 62;
    var dx = (s - s0) / rs, dy = (yv - tilt) / ry;
    return dx * dx + dy * dy < 1;
  }

  function layout(mask, st) {
    var phase = st.phase, look = st.look, time = st.time;
    var appear = st.appear === undefined ? 1 : st.appear;
    var scan = st.scan === undefined ? -1 : st.scan;
    var cell = st.cell;

    var cols = Math.round((X_RIGHT - X_LEFT) / cell);
    var rows = Math.round(200 / cell);
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

        // 三种料：白（肚皮+眼斑）、蓝（背）、黑（背鳍+尾鳍）
        var edge = Math.exp(-d / 1.5);
        var black = isBlack(s, yv, w);
        var white = !black && inWhite(s, yv, w, look);
        var b;
        if (black) b = 0.18 + 0.52 * edge;
        else if (white) b = Math.max(0.94, 0.55 + 0.5 * edge);
        else b = Math.max(0.70, 0.60 + 0.40 * edge);
        if (d < 1.0 && !black) b = Math.max(b, 0.98);

        if (scan >= 0 && s >= 0 && s <= 1) {
          var ds = Math.abs(s - scan);
          if (ds < 0.07) b += 0.42 * (1 - ds / 0.07);
        }

        // 嘴：一条挖空的弧线，从吻端向后微微上扬
        if (s > -0.03 && s < 0.26) {
          var mouthY = 5.5 - 26 * s;
          if (Math.abs(yv - mouthY) < 2.2) continue;
        }

        // 瞳孔：白斑里挖掉一小块，脸才有表情
        if (s > 0.05 && s < 0.16 && yv < 0.1 * w) {
          var dex = (s - 0.098) * 200, dey = yv + 0.30 * w;
          if (dex * dex + dey * dey < 3.4 * 3.4) continue;
        }

        var keep = d < 1.2 ? 0.55 + 0.45 * (d / 1.2) : 1;
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
        var ex = X(0.092) + 3.0 + st.look * 1.5;
        var ey = centre(0.092, st.phase) - halfWidth(0.092) * 0.34;
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
