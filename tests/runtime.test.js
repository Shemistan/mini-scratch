// Проверка исполнителя на демо-проекте: node mini-scratch/tests/runtime.test.js
'use strict';
const assert = require('assert');
const { Runtime } = require('../runtime.js');
const { EXAMPLES, GROUND } = require('../examples.js');

const example = (id) => EXAMPLES.find((e) => e.id === id).create();

function setup() {
  const project = example('catch-apple');
  const rt = new Runtime(project);
  const [basket, apple] = project.sprites;
  return { project, rt, basket, apple };
}

const ticks = (rt, k) => { for (let i = 0; i < k; i++) rt.tick(); };

const tests = {
  'флажок запускает оба скрипта и обнуляет счёт'() {
    const { rt } = setup();
    rt.vars.var_score = 99;
    rt.greenFlag();
    assert.strictEqual(rt.threads.length, 2);
    ticks(rt, 1);
    assert.strictEqual(String(rt.vars.var_score), '0');
  },

  'яблоко падает на 5 за такт'() {
    const { rt, apple } = setup();
    rt.greenFlag();
    ticks(rt, 1);
    const y0 = apple.y;
    ticks(rt, 4);
    assert.strictEqual(apple.y, y0 - 20);
  },

  'стрелки двигают корзину, отпускание останавливает'() {
    const { rt, basket } = setup();
    rt.greenFlag();
    ticks(rt, 1);
    rt.keyDown('left');
    ticks(rt, 3);
    assert.strictEqual(basket.x, -24);
    rt.keyUp('left');
    rt.keyDown('right');
    ticks(rt, 5);
    assert.strictEqual(basket.x, 16);
  },

  'поймал яблоко — счёт растёт, яблоко наверху'() {
    const { rt, basket, apple } = setup();
    rt.greenFlag();
    ticks(rt, 1);
    apple.x = basket.x;
    apple.y = basket.y + 10;
    ticks(rt, 1);
    assert.strictEqual(rt.vars.var_score, 1);
    assert.strictEqual(apple.y, 170);
  },

  'промах — «Игра окончена!», скрипт яблока завершён'() {
    const { rt, apple } = setup();
    rt.greenFlag();
    ticks(rt, 1);
    apple.x = 200;
    apple.y = -168;
    rt.keyDown('left'); // уводим корзину, чтобы не поймала
    ticks(rt, 2);
    assert.strictEqual(apple.say, 'Игра окончена!');
    assert.strictEqual(rt.threads.length, 1); // корзина продолжает работать
  },

  'стоп останавливает всё и убирает реплики'() {
    const { rt, apple } = setup();
    rt.greenFlag();
    ticks(rt, 1);
    apple.say = 'что-то';
    rt.stopAll();
    assert.strictEqual(rt.threads.length, 0);
    assert.strictEqual(apple.say, '');
  },

  'ждать и повторить уступают ход между тактами'() {
    const sprite = { id: 's', name: 's', emoji: '🐱', x: 0, y: 0, dir: 90, size: 100, visible: true, say: '' };
    sprite.blocks = { blocks: [{
      type: 'ms_when_flag',
      next: { block: {
        type: 'ms_repeat',
        inputs: {
          TIMES: { shadow: { type: 'ms_num', fields: { NUM: 3 } } },
          DO: { block: { type: 'ms_move_steps', inputs: { STEPS: { shadow: { type: 'ms_num', fields: { NUM: 10 } } } } } },
        },
        next: { block: { type: 'ms_wait', inputs: { SECS: { shadow: { type: 'ms_num', fields: { NUM: 0.5 } } } },
          next: { block: { type: 'ms_say', inputs: { TEXT: { shadow: { type: 'ms_text', fields: { TEXT: 'готово' } } } } } } } },
      } },
    }] };
    const rt = new Runtime({ sprites: [sprite], variables: [] });
    rt.greenFlag();
    ticks(rt, 1);
    assert.strictEqual(sprite.x, 10);
    ticks(rt, 2);
    assert.strictEqual(sprite.x, 30);
    ticks(rt, 10);
    assert.strictEqual(sprite.say, '');
    ticks(rt, 10);
    assert.strictEqual(sprite.say, 'готово');
  },

  'каждый пример запускается и 20 секунд работает без ошибок'() {
    for (const ex of EXAMPLES) {
      const project = ex.create();
      const rt = new Runtime(project);
      rt.greenFlag();
      ticks(rt, 600);
      for (const s of project.sprites) {
        assert.ok(Number.isFinite(s.x) && Number.isFinite(s.y), ex.id + ': координаты ' + s.name);
      }
    }
  },

  'динозавр: стоит на земле ровно, прыгает и приземляется'() {
    const project = example('dino');
    const rt = new Runtime(project);
    const dino = project.sprites.find((s) => s.name === 'Динозавр');
    const obstacle = project.sprites.find((s) => s.name === 'Препятствие');
    rt.greenFlag();
    ticks(rt, 5);
    obstacle.x = 240; // пусть препятствие не мешает
    assert.strictEqual(dino.y, GROUND);
    ticks(rt, 3);
    assert.strictEqual(dino.y, GROUND); // без дрожания на месте
    rt.keyDown('space');
    rt.keyUp('space');
    let peak = GROUND;
    let landedAt = 0;
    for (let i = 1; i <= 60; i++) {
      obstacle.x = 240;
      rt.tick();
      peak = Math.max(peak, dino.y);
      if (!landedAt && i > 2 && dino.y === GROUND) landedAt = i;
    }
    assert.ok(peak - GROUND >= 100, 'высота прыжка ' + (peak - GROUND));
    assert.ok(landedAt > 20 && landedAt < 40, 'приземлился на такте ' + landedAt);
  },

  'динозавр: прыжок в нужный момент — перелетел, счёт +1'() {
    const project = example('dino');
    const rt = new Runtime(project);
    const dino = project.sprites.find((s) => s.name === 'Динозавр');
    const obstacle = project.sprites.find((s) => s.name === 'Препятствие');
    rt.greenFlag();
    ticks(rt, 1);
    let jumped = false;
    for (let i = 0; i < 120; i++) {
      if (!jumped && obstacle.x - dino.x < 70) {
        rt.keyDown('space');
        rt.keyUp('space');
        jumped = true;
      }
      rt.tick();
    }
    assert.strictEqual(obstacle.say, '');
    assert.strictEqual(rt.vars.var_dino_score, 1);
  },

  'динозавр: без прыжка — «Игра окончена!»'() {
    const project = example('dino');
    const rt = new Runtime(project);
    const obstacle = project.sprites.find((s) => s.name === 'Препятствие');
    rt.greenFlag();
    ticks(rt, 90);
    assert.strictEqual(obstacle.say, 'Игра окончена!');
  },

  'пинг-понг: ракетка за мышью, мяч отскакивает вверх'() {
    const project = example('ping-pong');
    const rt = new Runtime(project);
    const [paddle, ball] = project.sprites;
    rt.greenFlag();
    ticks(rt, 1);
    rt.mouse.x = 100;
    ticks(rt, 1);
    assert.strictEqual(paddle.x, 100);
    ball.x = 100;
    ball.y = paddle.y + 20;
    ball.dir = 180; // летит вниз
    ticks(rt, 1);
    assert.strictEqual(rt.vars.var_pong_score, 1);
    assert.ok(Math.abs(ball.dir) < 90, 'после отскока летит вверх, направление ' + ball.dir);
  },

  'зеркальное отражение: переключение, установка и условие'() {
    const s = { id: 's', x: 0, y: 0, dir: 90, size: 100, visible: true, flip: false };
    const rt = new Runtime({ sprites: [s], variables: [] });
    const t = { sprite: s };
    const run = (b) => { const g = rt.exec(b, t); while (!g.next().done); };
    run({ type: 'ms_flip' });
    assert.strictEqual(s.flip, true);
    assert.strictEqual(rt.evaluate({ type: 'ms_flipped' }, t), true);
    run({ type: 'ms_flip' });
    assert.strictEqual(s.flip, false);
    run({ type: 'ms_set_flip', fields: { FLIP: 'on' } });
    run({ type: 'ms_set_flip', fields: { FLIP: 'on' } });
    assert.strictEqual(s.flip, true);
    run({ type: 'ms_set_flip', fields: { FLIP: 'off' } });
    assert.strictEqual(s.flip, false);
  },

  'повороты, отталкивание от края и операторы'() {
    const s = { id: 's', x: 235, y: 0, dir: 90, size: 100, visible: true };
    const rt = new Runtime({ sprites: [s], variables: [] });
    rt.bounce(s);
    assert.strictEqual(s.dir, -90);
    assert.ok(s.x < 240 - 19);
    const t = { sprite: s };
    const numIn = (v) => ({ shadow: { type: 'ms_num', fields: { NUM: v } } });
    const arith = (op, a, b) => rt.evaluate({ type: 'ms_arith', fields: { OP: op }, inputs: { A: numIn(a), B: numIn(b) } }, t);
    assert.strictEqual(arith('+', 2, 3), 5);
    assert.strictEqual(arith('%', -1, 3), 2);
    const cmp = (op, a, b) => rt.evaluate({ type: 'ms_compare', fields: { OP: op }, inputs: {
      A: { shadow: { type: 'ms_text', fields: { TEXT: a } } }, B: { shadow: { type: 'ms_text', fields: { TEXT: b } } } } }, t);
    assert.strictEqual(cmp('<', '9', '10'), true); // числа сравниваются как числа
    assert.strictEqual(cmp('=', 'Кот', 'кот'), true); // текст — без учёта регистра
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try {
    fn();
    console.log('ok   ' + name);
  } catch (e) {
    failed++;
    console.log('FAIL ' + name + '\n     ' + e.message);
  }
}
if (failed) {
  console.log(failed + ' тест(ов) упало');
  process.exit(1);
}
console.log('все тесты исполнителя прошли');
