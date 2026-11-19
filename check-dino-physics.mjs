import assert from 'node:assert/strict';
import { createRun, jump, step, PHYSICS } from './simulation.js';

const dt = 1 / 120;
const results = [];
function check(name, test) {
  const detail = test();
  results.push({ name, status: 'PASS', ...detail });
}
function initial(speed = 12) {
  const run = createRun(() => 0);
  run.distance = (speed - PHYSICS.minSpeed) * 100;
  run.speed = speed;
  return run;
}

check('No-input run collides with first cactus', () => {
  const run = initial();
  let frames = 0;
  while (!run.dead && frames < 1200) { step(run, dt, () => 0); frames++; }
  assert.equal(run.dead, true);
  assert.equal(run.passed, 0);
  assert.equal(run.y, 0);
  const frozen = JSON.stringify(run);
  assert.deepEqual(step(run, dt, () => 0), { landed: false, crashed: false, passed: false });
  assert.equal(JSON.stringify(run), frozen);
  assert.equal(jump(run), false);
  return { seconds: +(frames * dt).toFixed(3), distance: +run.distance.toFixed(3) };
});

for (const speed of [12, 22]) {
  check(`Jump clears 1.5-unit cactus from speed ${speed}`, () => {
    const run = initial(speed);
    run.obstacles[0].height = 1.5;
    let frames = 0, jumped = false, minOverlapY = Infinity;
    while (!run.dead && run.passed < 1 && frames < 1200) {
      const obstacle = run.obstacles[0];
      if (!jumped && (PHYSICS.playerZ - obstacle.z) / run.speed <= 0.4) {
        assert.equal(jump(run), true);
        jumped = true;
      }
      step(run, dt, () => 0);
      if (Math.abs(obstacle.z - PHYSICS.playerZ) <= PHYSICS.collisionDepth) minOverlapY = Math.min(minOverlapY, run.y);
      frames++;
    }
    assert.equal(jumped, true);
    assert.equal(run.dead, false);
    assert.equal(run.passed, 1);
    assert.ok(minOverlapY >= 1.38);
    return { minHeightDuringOverlap: +minOverlapY.toFixed(3), actualSpeed: +run.speed.toFixed(3) };
  });
}

check('100 tallest cacti at max speed and minimum 26-unit spacing', () => {
  const run = initial(22);
  let frames = 0, jumps = 0, lastJumpAt = -Infinity, minJumpGap = Infinity;
  while (!run.dead && run.passed < 100 && frames < 20000) {
    for (const obstacle of run.obstacles) obstacle.height = 1.5;
    for (let i = 1; i < run.obstacles.length; i++) assert.ok(Math.abs(run.obstacles[i - 1].z - run.obstacles[i].z - 26) < 1e-8);
    const next = run.obstacles.find(obstacle => !obstacle.passed);
    if (next && run.y === 0 && (PHYSICS.playerZ - next.z) / run.speed <= 0.4) {
      assert.equal(jump(run), true);
      minJumpGap = Math.min(minJumpGap, frames * dt - lastJumpAt);
      lastJumpAt = frames * dt;
      jumps++;
    }
    step(run, dt, () => 0);
    frames++;
  }
  assert.equal(run.dead, false);
  assert.equal(run.passed, 100);
  assert.equal(jumps, 100);
  return { cleared: run.passed, seconds: +(frames * dt).toFixed(3), minJumpGap: +minJumpGap.toFixed(3) };
});

check('Jump locks during ascent/descent and unlocks on landing', () => {
  const run = initial();
  assert.equal(jump(run), true);
  assert.equal(jump(run), false);
  let frames = 0, apex = 0, testedDescent = false, landed = false;
  while (!landed && frames < 240) {
    const event = step(run, dt, () => 0);
    apex = Math.max(apex, run.y);
    if (run.y > 0.001) {
      const velocity = run.vy;
      assert.equal(jump(run), false);
      assert.equal(run.vy, velocity);
      testedDescent ||= velocity < 0;
    }
    landed = event.landed;
    frames++;
  }
  assert.equal(landed, true);
  assert.equal(testedDescent, true);
  assert.equal(run.y, 0);
  assert.equal(run.vy, 0);
  assert.equal(jump(run), true);
  assert.ok(Math.abs(apex - 2.2041666667) < 0.001);
  return { flightSeconds: +(frames * dt).toFixed(3), apex: +apex.toFixed(3) };
});

check('createRun resets score, physics, death and obstacles', () => {
  const old = initial(22);
  old.dead = true; old.y = 1; old.vy = -5; old.passed = 8;
  old.obstacles[0].passed = true;
  const fresh = createRun(() => 0);
  assert.equal(fresh.distance, 0);
  assert.equal(fresh.speed, 12);
  assert.equal(fresh.y, 0);
  assert.equal(fresh.vy, 0);
  assert.equal(fresh.dead, false);
  assert.equal(fresh.passed, 0);
  assert.equal(fresh.obstacles.length, 4);
  assert.equal(fresh.obstacles[0].z, -29);
  assert.ok(fresh.obstacles.every(obstacle => !obstacle.passed));
  assert.notEqual(fresh.obstacles, old.obstacles);
  assert.equal(jump(fresh), true);
  return {};
});

console.log(JSON.stringify({ passed: results.length, results }, null, 2));
