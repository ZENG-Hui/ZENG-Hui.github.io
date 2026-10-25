/* 0/1 虎鲸。
   身子是一张"身体坐标系"里的掩膜，字按格子铺上去：
   越靠轮廓越亮，最外圈稀疏散开，像从黑暗里一点点复现出来。 */
(function (global) {
  'use strict';

  // 身体侧影：钝头 + 后脑最厚 + 细尾柄。这三件事决定它是虎鲸而不是鱼。
  var ANCHORS = [
    [0.000, 30.0], [0.050, 34.0], [0.110, 38.0], [0.180, 41.5],
    [0.260, 43.5], [0.340, 44.0], [0.440, 43.0], [0.540, 41.0],
    [0.640, 37.0], [0.720, 31.5], [0.800, 24.0], [0.870, 16.0],
    [0.920, 10.5], [0.960, 8.0], [1.000, 6.5]
  ];

  var LUT_N = 256;
  var LUT = new Float32Array(LUT_N + 1);
  (function () {
    var xs = ANCHORS.map(function (a) { return a[0]; });
    var ys = ANCHORS.map(function (a) { return a[1]; });
    // 单调三次插值（Fritsch–Carlson）：
    // 切线必须乘区间长度 h，否则每条线段都会鼓出去再凹回来 —— 那就是"扭曲"的来源。
    var n = xs.length, d = [], m = [], k;
    for (k = 0; k < n - 1; k++) d[k] = (ys[k + 1] - ys[k]) / (xs[k + 1] - xs[k]);
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (k = 1; k < n - 1; k++) m[k] = (d[k - 1] + d[k]) / 2;
    for (k = 0; k < n - 1; k++) {
      if (d[k] === 0) { m[k] = 0; m[k + 1] = 0; continue; }
      var a = m[k] / d[k], b = m[k + 1] / d[k], q = a * a + b * b;
      if (q > 9) {
        var sc = 3 / Math.sqrt(q);
        m[k] = sc * a * d[k]; m[k + 1] = sc * b * d[k];
      }
    }
    for (var i = 0; i <= LUT_N; i++) {
      var s = i / LUT_N, j = 0;
      while (j < n - 2 && s > xs[j + 1]) j++;
      var x0 = xs[j], h = xs[j + 1] - x0, t = (s - x0) / h;
      var t2 = t * t, t3 = t2 * t;
      LUT[i] = (2 * t3 - 3 * t2 + 1) * ys[j] + (t3 - 2 * t2 + t) * h * m[j] +
               (-2 * t3 + 3 * t2) * ys[j + 1] + (t3 - t2) * h * m[j + 1];
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
    return 4 * t * t;
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
    var capR = halfWidth(0) * 1.9;
    ctx.quadraticCurveTo(X(0) + capR, centre(0, phase), top[0][0], top[0][1]);
    ctx.closePath();
  }

  function tailPath(ctx, phase) {
    ctx.save();
    ctx.translate(X(1), centre(1, phase));
    ctx.rotate(tailBeat(phase));
    ctx.beginPath();
    ctx.rotate(0.12);
    ctx.moveTo(14, -9);
    ctx.bezierCurveTo(0, -22, -18, -32, -36, -32);
    ctx.bezierCurveTo(-40, -32, -40, -25, -36, -19);
    ctx.bezierCurveTo(-31, -12, -24, -5, -19, -1);
    ctx.bezierCurveTo(-25, 6, -31, 15, -35, 24);
    ctx.bezierCurveTo(-38, 30, -33, 36, -28, 33);
    ctx.bezierCurveTo(-13, 27, 0, 18, 14, 9);
    ctx.closePath();
    ctx.restore();
  }

  function finPath(ctx, phase) {
    ctx.save();
    ctx.translate(X(0.40), centre(0.40, phase) - halfWidth(0.40) * 0.84);
    ctx.rotate(Math.sin(phase - 0.4) * 2.2 * Math.PI / 180);
    ctx.beginPath();
    ctx.moveTo(14, 4);
    ctx.bezierCurveTo(10, -16, -2, -38, -18, -50);
    ctx.bezierCurveTo(-24, -52, -28, -44, -26, -34);
    ctx.bezierCurveTo(-22, -16, -16, -4, -12, 4);
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

  var LOGO_U = 200 / 24;
  var LOGO_D = "M23.748 4.651c-.254-.124-.364.113-.512.233-.051.04-.094.09-.137.137-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.155-.708-.311-.955-.65-.172-.24-.219-.509-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.094.172.187.129.323-.082.28-.18.553-.266.833-.055.179-.137.218-.328.14a5.5 5.5 0 0 1-1.737-1.179c-.857-.828-1.631-1.743-2.597-2.46a12 12 0 0 0-.689-.47c-.985-.957.13-1.743.387-1.836.27-.098.094-.433-.778-.428-.872.003-1.67.295-2.687.685a3 3 0 0 1-.465.136 9.6 9.6 0 0 0-2.883-.101c-1.885.21-3.39 1.1-4.497 2.622C.082 8.776-.231 10.854.152 13.02c.403 2.284 1.568 4.175 3.36 5.653 1.857 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.132-.284 4.994-1.86.47.234.962.328 1.78.398.629.058 1.235-.031 1.705-.129.735-.155.684-.836.418-.961-2.155-1.004-1.682-.595-2.112-.926 1.095-1.295 2.768-3.598 3.284-6.733.05-.346.115-.834.108-1.114-.004-.171.035-.238.23-.257a4.2 4.2 0 0 0 1.545-.475c1.397-.763 1.96-2.016 2.093-3.517.02-.23-.004-.467-.247-.588M11.58 18.168c-2.088-1.642-3.101-2.183-3.52-2.16-.39.024-.32.472-.234.763.09.288.207.487.371.74.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.168-1.361-.801-2.5-1.86-3.301-3.306-.775-1.393-1.225-2.888-1.299-4.482-.02-.385.094-.522.477-.592a4.7 4.7 0 0 1 1.53-.038c2.131.311 3.946 1.264 5.467 2.774.868.86 1.525 1.887 2.202 2.89.72 1.066 1.494 2.082 2.48 2.915.348.291.626.513.892.677-.802.09-2.14.109-3.055-.615zm1.001-6.44a.306.306 0 0 1 .415-.287.3.3 0 0 1 .113.074.3.3 0 0 1 .086.214c0 .17-.136.307-.308.307a.303.303 0 0 1-.306-.307m3.11 1.596c-.2.081-.4.151-.591.16a1.25 1.25 0 0 1-.798-.254c-.274-.23-.47-.358-.551-.758a1.7 1.7 0 0 1 .015-.588c.07-.327-.007-.537-.238-.727-.188-.156-.426-.199-.689-.199a.6.6 0 0 1-.254-.078.253.253 0 0 1-.114-.358 1 1 0 0 1 .192-.21c.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.392.451.462.576.685.915.176.264.336.536.446.848.066.194-.02.353-.25.45";
  var PPU = 3.4;

  // 尾巴甩起来：振幅沿身体往后加大
  // 躯干刚性，尾巴绕尾柄摆，胸鳍小幅拍
  function logoXform(x, y, phase, fin) {
    var bob = 1.4 * Math.sin(phase * 0.7);

    // 胸鳍：向外突出的那一小块（x 38..62, y 42..68），根在左、梢在右
    var wx = clamp01((x - 34) / 8) * clamp01((64 - x) / 6);
    var wy = clamp01((y - 40) / 6) * clamp01((70 - y) / 6);
    var fw = wx * wy;
    if (fw > 0.001) {
      var tx = clamp01((x - 38) / 20);
      var amp = fw * (0.25 + 0.75 * tx);
      y += (fin || 0) * 7.0 * amp;
      x += (fin || 0) * 2.0 * amp;
    }

    // 尾：绕尾柄（约 64,-12）整块摆，不再把后半身拧长
    var tdx = x - 64, tdy = y + 12;
    var tr = Math.sqrt(tdx * tdx + tdy * tdy);
    var tt = clamp01((tr - 7) / 13);
    tt = tt * tt * (3 - 2 * tt);
    var side = clamp01((-13 - y) / 7);
    var xgate = clamp01((x - 24) / 10);   // 只放尾巴那一段，别把背脊也拽起来
    var ang = 0.30 * Math.sin(phase / 1.5) * tt * side * xgate;
    if (ang !== 0) {
      var PX = 64, PY = -12;
      var ddx = x - PX, ddy = y - PY, c = Math.cos(ang), s = Math.sin(ang);
      return { x: PX + ddx * c - ddy * s, y: PY + ddx * s + ddy * c + bob };
    }
    return { x: x, y: y + bob };
  }
  var X0 = -108, Y0 = -86, XSPAN = 216, YSPAN = 172;
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
    ctx.save();
    ctx.scale(LOGO_U, LOGO_U);
    ctx.translate(-12, -12);
    ctx.fill(new Path2D(LOGO_D), 'nonzero');
    ctx.restore();
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

    // 连通域：把胸鳍那种独立凸起认出来，别再拿矩形硬套
    var label = new Int16Array(W * H);
    for (i = 0; i < W * H; i++) label[i] = -1;
    var stack = new Int32Array(W * H);
    var comps = [], nextId = 0, sp, k, kx, ky, kk, dxx, dyy, nx, ny, nk;
    for (i = 0; i < W * H; i++) {
      if (!inside[i] || label[i] >= 0) continue;
      sp = 0; stack[sp++] = i; label[i] = nextId;
      var area = 0, sx = 0, sy = 0;
      while (sp > 0) {
        k = stack[--sp]; kx = k % W; ky = (k - kx) / W;
        area++; sx += kx; sy += ky;
        for (dxx = -1; dxx <= 1; dxx++) {
          for (dyy = -1; dyy <= 1; dyy++) {
            nx = kx + dxx; ny = ky + dyy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            nk = ny * W + nx;
            if (inside[nk] && label[nk] < 0) { label[nk] = nextId; stack[sp++] = nk; }
          }
        }
      }
      comps.push({ id: nextId, area: area, cx: sx / area, cy: sy / area });
      nextId++;
    }
    // 胸鳍：包含身体坐标 (-20, 44) 的那块
    var fp = Math.round((-20 - X0) * PPU), fq = Math.round((44 - Y0) * PPU);
    var flipperId = (fp >= 0 && fq >= 0 && fp < W && fq < H) ? label[fq * W + fp] : -1;

    return {
      W: W, H: H,
      comps: comps,
      flipperId: flipperId,
      part: function (x, y) {
        var px = Math.round((x - X0) * PPU), py = Math.round((y - Y0) * PPU);
        if (px < 0 || py < 0 || px >= W || py >= H) return -1;
        return label[py * W + px];
      },
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

  var X_LEFT = -104, X_RIGHT = 104;

  // 白肚皮的分界线：从下巴往上抬，到身体中段变高
  // 胸鳍前：一块大的白斑，从下巴铺到鳍根
  function bellyLine(s, w) {
    var t = clamp01((s - 0.02) / 0.30);
    return (0.56 - 0.28 * Math.sin(Math.PI * t)) * w;
  }

  // 胸鳍后：一块小的
  function hindLine(s, w) {
    var t = clamp01((s - 0.38) / 0.24);
    return (0.58 - 0.20 * Math.sin(Math.PI * t)) * w;
  }

  function inWhite(s, yv, w, look) {
    if (inPatch(s, yv, look)) return true;                 // 眼斑
    if (s < 0.10 && yv > 0.52 * w) return true;            // 下巴
    if (s > 0.02 && s < 0.32 && yv > bellyLine(s, w)) return true;   // 鳍前的白
    if (s > 0.38 && s < 0.62 && yv > hindLine(s, w)) return true;    // 鳍后的小白
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
    var s0 = 0.155 + look * 0.012;
    var y0 = -0.30 * halfWidth(s0);
    var rs = 0.125 + look * 0.010;
    var ry = 7.0 + look * 1.2;
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
    var rows = Math.round(152 / cell);
    var beat = tailBeat(phase), cosB = Math.cos(beat), sinB = Math.sin(beat);
    var tailX = X(1), tailY = centre(1, phase);
    var out = [];

    for (var j = 0; j < rows; j++) {
      var yv = (j - (rows - 1) / 2) * cell;
      for (var i = 0; i < cols; i++) {
        var x = X_LEFT + (i + 0.5) * cell;
        var d = mask.sample(x, yv);
        if (d < 0) continue;

        var s = (x + 100) / 200;
        var w = halfWidth(s < 0 ? 0 : s > 1 ? 1 : s);

        // 三种料：白（肚皮+眼斑）、蓝（背）、黑（背鳍+尾鳍）
        // 内部给固定值，只有最外一圈提亮 —— 斑块才会是"面"而不是"边"
        var rim = d < 1.8 ? 1 - d / 1.8 : 0;
        var black = false;
        var white = false;
        var b;
        if (black) b = 0.26 + 0.5 * rim;
        else if (white) b = 0.96 + 0.04 * rim;
        else b = 0.60 + 0.40 * rim;

        if (scan >= 0 && s >= 0 && s <= 1) {
          var ds = Math.abs(s - scan);
          if (ds < 0.07) b += 0.42 * (1 - ds / 0.07);
        }

        // 嘴：一条挖空的弧线，从吻端向后微微上扬
        

        // 瞳孔：白斑里挖掉一小块，脸才有表情
        

        var keep = d < 0.7 ? 0.78 : 1;
        if (hash(i, j, 2) > keep) continue;
        if (hash(i, j, 9) > appear) continue;

        var fade = clamp01(d / 1.2);
        var flick = 0.88 + 0.12 * Math.sin(time * 2.0 + hash(i, j, 3) * 9.4);
        var a = clamp01(b) * (0.55 + 0.45 * fade) * flick;
        if (a < 0.06) continue;

        var p = logoXform(x, yv, phase, st.fin);
        var sx = -p.x, sy = p.y;   // 镜像：让脸朝向游动方向

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
      if (false) {
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
