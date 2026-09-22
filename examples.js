// Готовые примеры для галереи «Примеры». Каждый собран в том же JSON-формате,
// в котором Blockly сохраняет скрипты; вспомогательные функции ниже только
// сокращают запись.
(function (root) {
  'use strict';

  // --- мини-язык для записи скриптов ---

  const num = (v) => ({ shadow: { type: 'ms_num', fields: { NUM: v } } });
  const txt = (v) => ({ shadow: { type: 'ms_text', fields: { TEXT: v } } });
  const numOf = (block) => Object.assign(num(0), { block }); // значение-блок в числовом слоте
  const txtOf = (block) => Object.assign(txt(''), { block });
  const cond = (block) => ({ block });
  const body = (...blocks) => ({ block: chain(...blocks) });
  const varField = (ref) => ({ VAR: { id: ref.id } });

  // Склеивает блоки в цепочку через next.
  function chain(...blocks) {
    for (let i = 0; i < blocks.length - 1; i++) blocks[i].next = { block: blocks[i + 1] };
    return blocks[0];
  }

  function script(x, y, hat, ...blocks) {
    return chain(Object.assign(hat, { x, y }), ...blocks);
  }

  const B = {
    flag: () => ({ type: 'ms_when_flag' }),
    whenKey: (key) => ({ type: 'ms_when_key', fields: { KEY: key } }),
    whenClicked: () => ({ type: 'ms_when_clicked' }),
    goto: (x, y) => ({ type: 'ms_goto_xy', inputs: { X: typeof x === 'object' ? numOf(x) : num(x), Y: typeof y === 'object' ? numOf(y) : num(y) } }),
    move: (n) => ({ type: 'ms_move_steps', inputs: { STEPS: num(n) } }),
    turnRight: (d) => ({ type: 'ms_turn_right', inputs: { DEG: num(d) } }),
    pointDir: (d) => ({ type: 'ms_point_dir', inputs: { DIR: typeof d === 'object' ? numOf(d) : num(d) } }),
    changeX: (d) => ({ type: 'ms_change_x', inputs: { DX: num(d) } }),
    setX: (x) => ({ type: 'ms_set_x', inputs: { X: typeof x === 'object' ? numOf(x) : num(x) } }),
    changeY: (d) => ({ type: 'ms_change_y', inputs: { DY: typeof d === 'object' ? numOf(d) : num(d) } }),
    setY: (y) => ({ type: 'ms_set_y', inputs: { Y: num(y) } }),
    bounce: () => ({ type: 'ms_bounce' }),
    say: (s) => ({ type: 'ms_say', inputs: { TEXT: txt(s) } }),
    sayFor: (s, secs) => ({ type: 'ms_say_for', inputs: { TEXT: txt(s), SECS: num(secs) } }),
    costume: (e) => ({ type: 'ms_set_costume', fields: { EMOJI: e } }),
    changeSize: (d) => ({ type: 'ms_change_size', inputs: { DSIZE: num(d) } }),
    setSize: (s) => ({ type: 'ms_set_size', inputs: { SIZE: num(s) } }),
    flip: () => ({ type: 'ms_flip' }),
    bg: (color) => ({ type: 'ms_set_bg', fields: { COLOR: color } }),
    wait: (secs) => ({ type: 'ms_wait', inputs: { SECS: num(secs) } }),
    repeat: (times, ...blocks) => ({ type: 'ms_repeat', inputs: { TIMES: num(times), DO: body(...blocks) } }),
    forever: (...blocks) => ({ type: 'ms_forever', inputs: { DO: body(...blocks) } }),
    if: (c, ...blocks) => ({ type: 'ms_if', inputs: { COND: cond(c), DO: body(...blocks) } }),
    ifElse: (c, yes, no) => ({ type: 'ms_if_else', inputs: { COND: cond(c), DO: body(...yes), ELSE: body(...no) } }),
    stopThis: () => ({ type: 'ms_stop_this' }),
    setVar: (ref, v) => ({ type: 'ms_set_var', fields: varField(ref), inputs: { VALUE: txt(String(v)) } }),
    changeVar: (ref, d) => ({ type: 'ms_change_var', fields: varField(ref), inputs: { DELTA: num(d) } }),
    // значения и условия
    v: (ref) => ({ type: 'ms_var', fields: varField(ref) }),
    x: () => ({ type: 'ms_x_pos' }),
    y: () => ({ type: 'ms_y_pos' }),
    dir: () => ({ type: 'ms_direction' }),
    mouseX: () => ({ type: 'ms_mouse_x' }),
    random: (a, b) => ({ type: 'ms_random', inputs: { FROM: num(a), TO: num(b) } }),
    minus: (a, bBlock) => ({ type: 'ms_arith', fields: { OP: '-' }, inputs: { A: num(a), B: numOf(bBlock) } }),
    less: (aBlock, b) => ({ type: 'ms_compare', fields: { OP: '<' }, inputs: { A: txtOf(aBlock), B: txt(String(b)) } }),
    equals: (aBlock, b) => ({ type: 'ms_compare', fields: { OP: '=' }, inputs: { A: txtOf(aBlock), B: txt(String(b)) } }),
    touching: (target) => ({ type: 'ms_touching', fields: { TARGET: target } }),
    keyPressed: (key) => ({ type: 'ms_key_pressed', fields: { KEY: key } }),
  };

  function sprite(id, name, emoji, x, y, extra, scripts) {
    return Object.assign({
      id, name, emoji, x, y, dir: 90, size: 100, visible: true, flip: false, say: '',
      blocks: { languageVersion: 0, blocks: scripts },
    }, extra);
  }

  // --- «Первые шаги»: события и движение ---

  function firstSteps() {
    const cat = sprite('sprite_cat', 'Кот', '🐱', 0, 0, { size: 130 }, [
      script(30, 30, B.flag(),
        B.goto(0, 0),
        B.sayFor('Привет! Я умею ходить', 2),
        B.forever(B.move(5), B.bounce()),
      ),
      script(30, 300, B.whenClicked(),
        B.sayFor('Мяу!', 1),
      ),
      script(330, 300, B.whenKey('space'),
        B.repeat(5, B.changeSize(10)),
        B.repeat(5, B.changeSize(-10)),
      ),
    ]);
    return { version: 1, background: '#d6f5c9', variables: [], sprites: [cat] };
  }

  // --- «Поймай яблоко»: клавиши, касание, счёт ---

  function catchApple() {
    const score = { id: 'var_score', name: 'счёт' };
    const respawn = () => B.goto(B.random(-220, 220), 170);

    const basket = sprite('sprite_basket', 'Корзина', '🧺', 0, -150, { size: 120 }, [
      script(30, 30, B.flag(),
        B.goto(0, -150),
        B.forever(
          B.if(B.keyPressed('left'), B.changeX(-8)),
          B.if(B.keyPressed('right'), B.changeX(8)),
        ),
      ),
    ]);

    const apple = sprite('sprite_apple', 'Яблоко', '🍎', 0, 170, {}, [
      script(30, 30, B.flag(),
        B.bg('#cfe8ff'),
        B.setVar(score, 0),
        respawn(),
        B.forever(
          B.changeY(-5),
          B.if(B.touching('sprite_basket'), B.changeVar(score, 1), respawn()),
          B.if(B.less(B.y(), -170), B.say('Игра окончена!'), B.stopThis()),
        ),
      ),
    ]);

    return { version: 1, background: '#cfe8ff', variables: [score], sprites: [basket, apple] };
  }

  // --- «Динозавр»: прыжок с гравитацией, препятствия разного вида ---

  const GROUND = -100;

  function dino() {
    const score = { id: 'var_dino_score', name: 'счёт' };
    const speed = { id: 'var_dino_speed', name: 'скорость' };

    const cloud = sprite('sprite_cloud', 'Облако', '☁️', 120, 120, { size: 150 }, [
      script(30, 30, B.flag(),
        B.forever(
          B.changeX(-1),
          B.if(B.less(B.x(), -230), B.setX(240)),
        ),
      ),
    ]);

    // Скорость — вертикальная: прыжок задаёт её вверх, каждый такт гравитация отнимает 1.
    const dinoSprite = sprite('sprite_dino', 'Динозавр', '🦖', -160, GROUND, { size: 110, flip: true }, [
      script(30, 30, B.flag(),
        B.bg('#f7e7b4'),
        B.goto(-160, GROUND),
        B.setVar(speed, 0),
        B.setVar(score, 0),
        B.forever(
          B.changeY(B.v(speed)),
          B.ifElse(B.less(B.y(), GROUND + 1),
            [B.setY(GROUND), B.setVar(speed, 0)],
            [B.changeVar(speed, -1)],
          ),
        ),
      ),
      script(30, 420, B.whenKey('space'),
        B.if(B.less(B.y(), GROUND + 1), B.setVar(speed, 15)),
      ),
    ]);

    // Уехав за левый край, препятствие возвращается справа в случайном виде.
    const obstacle = sprite('sprite_obstacle', 'Препятствие', '🌵', 240, GROUND, {}, [
      script(30, 30, B.flag(),
        B.goto(240, GROUND),
        B.costume('🌵'),
        B.forever(
          B.changeX(-6),
          B.if(B.less(B.x(), -230),
            B.setX(240),
            B.changeVar(score, 1),
            B.ifElse(B.equals(B.random(1, 3), 1),
              [B.costume('🌵')],
              [B.ifElse(B.equals(B.random(1, 2), 1), [B.costume('🔥')], [B.costume('🧱')])],
            ),
          ),
          B.if(B.touching('sprite_dino'),
            B.say('Игра окончена!'),
            B.stopThis(),
          ),
        ),
      ),
    ]);

    return { version: 1, background: '#f7e7b4', variables: [score, speed], sprites: [cloud, dinoSprite, obstacle] };
  }

  // --- «Пинг-понг»: мышь, направление, отскок ---

  function pingPong() {
    const score = { id: 'var_pong_score', name: 'отбито' };

    const paddle = sprite('sprite_paddle', 'Ракетка', '🧱', 0, -150, { size: 180 }, [
      script(30, 30, B.flag(),
        B.goto(0, -150),
        B.forever(B.setX(B.mouseX())),
      ),
    ]);

    const ball = sprite('sprite_ball', 'Мяч', '⚽', 0, 60, {}, [
      script(30, 30, B.flag(),
        B.bg('#1d2340'),
        B.setVar(score, 0),
        B.goto(0, 60),
        B.pointDir(B.random(135, 225)),
        B.forever(
          B.move(7),
          B.bounce(),
          B.if(B.touching('sprite_paddle'),
            B.pointDir(B.minus(180, B.dir())),
            B.changeY(12),
            B.changeVar(score, 1),
          ),
          B.if(B.less(B.y(), -165),
            B.say('Мимо!'),
            B.stopThis(),
          ),
        ),
      ),
    ]);

    return { version: 1, background: '#1d2340', variables: [score], sprites: [paddle, ball] };
  }

  const EXAMPLES = [
    {
      id: 'first-steps', emoji: '🐱', title: 'Первые шаги', create: firstSteps,
      about: 'Кот гуляет по сцене и отталкивается от краёв. Кликните по нему или нажмите пробел.',
      topics: 'события, движение, «всегда»',
    },
    {
      id: 'catch-apple', emoji: '🍎', title: 'Поймай яблоко', create: catchApple,
      about: 'Ловите падающее яблоко корзиной, управляя стрелками.',
      topics: 'клавиши, касание, переменная-счёт',
    },
    {
      id: 'dino', emoji: '🦖', title: 'Динозавр', create: dino,
      about: 'Динозавр прыгает пробелом через кактусы, огонь и кирпичи.',
      topics: 'гравитация, переменная-скорость, случайный выбор',
    },
    {
      id: 'ping-pong', emoji: '⚽', title: 'Пинг-понг', create: pingPong,
      about: 'Отбивайте мяч ракеткой, которая следует за мышью.',
      topics: 'мышь, направление, отскок',
    },
  ];

  const api = { EXAMPLES, GROUND };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MiniExamples = api;
})(this);
