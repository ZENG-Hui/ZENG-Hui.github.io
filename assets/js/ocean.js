/* 背景里那条缓慢游动的小虎鲸。
   动的东西只有 transform 和两个眼睛分组，不触发布局。 */

(function () {
  'use strict';

  var svg = document.getElementById('orca');
  if (!svg) return;

  var eyeScale = document.getElementById('orcaEyeScale');
  var eyeBlink = document.getElementById('orcaEyeBlink');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  var vw = 0, vh = 0, sizeW = 320;
  var state = {
    x: 0,
    baseY: 0,
    speed: 22,
    tilt: 0,
    eye: 1,
    phase: 'swim',
    phaseTime: 0,
    nextGlance: 0,
    clock: 0,
    last: 0
  };

  function measure() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    var rect = svg.getBoundingClientRect();
    if (rect.width > 0) sizeW = rect.width;
  }

  function placeStatic() {
    measure();
    var x = vw * 0.62;
    var y = vh * 0.74;
    svg.style.transform =
      'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(-3deg)';
  }

  function pickLane() {
    state.baseY = vh * (0.52 + Math.random() * 0.26);
  }

  function startGlance() {
    state.phase = 'glance';
    state.phaseTime = 0;
    if (eyeScale) eyeScale.style.transform = 'scale(1.35)';
    window.setTimeout(blink, 420);
    window.setTimeout(blink, 1750);
  }

  function blink() {
    if (!eyeBlink) return;
    eyeBlink.style.transform = 'scaleY(0.08)';
    window.setTimeout(function () {
      eyeBlink.style.transform = '';
    }, 130);
  }

  function endGlance() {
    state.phase = 'swim';
    state.phaseTime = 0;
    if (eyeScale) eyeScale.style.transform = '';
    state.nextGlance = state.clock + 22 + Math.random() * 26;
  }

  function respawn() {
    state.x = -sizeW - 20;
    state.speed = 18 + Math.random() * 8;
    pickLane();
  }

  function frame(now) {
    var dt = state.last ? Math.min(0.05, (now - state.last) / 1000) : 0.016;
    state.last = now;
    state.clock += dt;
    state.phaseTime += dt;

    if (state.phase === 'glance') {
      state.speed += (0 - state.speed) * Math.min(1, dt * 2.2);
      state.tilt += (-5 - state.tilt) * Math.min(1, dt * 1.6);
      if (state.phaseTime > 3.6) endGlance();
    } else {
      var target = 18 + 4 * Math.sin(state.clock * 0.21);
      state.speed += (target - state.speed) * Math.min(1, dt * 0.9);
      state.tilt += (0 - state.tilt) * Math.min(1, dt * 1.6);

      if (!state.nextGlance) state.nextGlance = 8 + Math.random() * 10;
      // 到点之后一直等，直到它游进可视区中间再抬头看一眼
      if (state.clock > state.nextGlance) {
        var onScreen = state.x > vw * 0.06 && state.x < vw * 0.86;
        if (onScreen) startGlance();
      }
    }

    state.x += state.speed * dt;
    if (state.x > vw + 40) respawn();

    var bob = Math.sin(state.clock * 0.55) * 7;
    var roll = Math.sin(state.clock * 0.37) * 1.8 + state.tilt;
    svg.style.transform =
      'translate3d(' + state.x.toFixed(2) + 'px,' + (state.baseY + bob).toFixed(2) + 'px,0) rotate(' + roll.toFixed(2) + 'deg)';

    raf = window.requestAnimationFrame(frame);
  }

  var raf = 0;

  function start() {
    if (raf) return;
    state.last = 0;
    raf = window.requestAnimationFrame(frame);
  }

  function stop() {
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
  }

  function init() {
    measure();
    respawn();
    state.baseY = vh * (0.6 + Math.random() * 0.18);
    state.x = vw * 0.45;
    state.nextGlance = 7 + Math.random() * 8;

    if (reduceMotion.matches) {
      placeStatic();
      return;
    }
    start();
  }

  window.addEventListener('resize', function () {
    var wasStatic = reduceMotion.matches;
    measure();
    if (state.baseY > vh) pickLane();
    if (wasStatic) placeStatic();
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else if (!reduceMotion.matches) start();
  });

  var onMotionChange = function (e) {
    if (e.matches) { stop(); placeStatic(); }
    else { start(); }
  };
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', onMotionChange);
  else if (reduceMotion.addListener) reduceMotion.addListener(onMotionChange);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
