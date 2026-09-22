// Набор блоков Мини-Scratch: описание, регистрация в Blockly, тема и панель.
// Каждый блок описан один раз в SPEC — из этой записи строится и определение
// блока, и его заготовка в палитре (с числами и текстом по умолчанию).
(function () {
  'use strict';

  const FLAG_SVG = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
    '<path d="M5 3v18" stroke="#3b7a1a" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M6 4c4-2 7 2 12 0v9c-5 2-8-2-12 0z" fill="#4cbf56" stroke="#3b7a1a" stroke-width="1.2"/>' +
    '</svg>');

  const EMOJIS = ['🐱', '🐶', '🐭', '🐸', '🐵', '🐧', '🐢', '🐟', '🦋', '🐝', '🦖', '🍎', '🍌',
    '🍓', '🥕', '⭐', '❤️', '⚽', '🏀', '🚀', '🛸', '🚗', '👾', '👻', '🤖', '🧺', '💎',
    '🌵', '🌳', '☁️', '🔥', '💣', '🏠', '🧱'];

  const BACKGROUNDS = [
    ['белый', '#ffffff'], ['небо', '#cfe8ff'], ['трава', '#d6f5c9'],
    ['песок', '#f7e7b4'], ['закат', '#ffd1b3'], ['ночь', '#1d2340'],
  ];

  const KEYS = [
    ['пробел', 'space'], ['стрелка влево', 'left'], ['стрелка вправо', 'right'],
    ['стрелка вверх', 'up'], ['стрелка вниз', 'down'], ['любая', 'any'],
    ['a', 'a'], ['d', 'd'], ['w', 'w'], ['s', 's'], ['enter', 'enter'],
  ];

  const CATEGORIES = [
    { id: 'motion', name: 'Движение', colour: '#4C97FF' },
    { id: 'looks', name: 'Внешность', colour: '#9966FF' },
    { id: 'events', name: 'События', colour: '#FFBF00' },
    { id: 'control', name: 'Управление', colour: '#FFAB19' },
    { id: 'sensing', name: 'Сенсоры', colour: '#5CB1D6' },
    { id: 'operators', name: 'Операторы', colour: '#59C059' },
    { id: 'variables', name: 'Переменные', colour: '#FF8C1A' },
  ];

  // Приложение подменяет эту функцию: список «других спрайтов» для блока касания.
  const hooks = { otherSprites: () => [] };

  const num = (v) => ({ t: 'num', v });
  const text = (v) => ({ t: 'text', v });
  const bool = { t: 'bool' };
  const stmt = { t: 'stmt' };
  const dd = (options) => ({ t: 'dd', options });

  // kind: hat — начало скрипта; stmt — обычная команда; cap — после неё ничего не ставится;
  // reporter — круглый блок-значение; bool — шестиугольное условие.
  const SPEC = [
    // Движение
    { type: 'ms_move_steps', cat: 'motion', kind: 'stmt', text: 'идти %STEPS шагов', args: { STEPS: num(10) } },
    { type: 'ms_turn_right', cat: 'motion', kind: 'stmt', text: 'повернуть ↻ на %DEG градусов', args: { DEG: num(15) } },
    { type: 'ms_turn_left', cat: 'motion', kind: 'stmt', text: 'повернуть ↺ на %DEG градусов', args: { DEG: num(15) } },
    { type: 'ms_goto_xy', cat: 'motion', kind: 'stmt', text: 'перейти в x: %X y: %Y', args: { X: num(0), Y: num(0) } },
    { type: 'ms_goto_random', cat: 'motion', kind: 'stmt', text: 'перейти в случайное место', args: {} },
    { type: 'ms_point_dir', cat: 'motion', kind: 'stmt', text: 'повернуться в направлении %DIR', args: { DIR: num(90) } },
    { type: 'ms_change_x', cat: 'motion', kind: 'stmt', text: 'изменить x на %DX', args: { DX: num(10) } },
    { type: 'ms_set_x', cat: 'motion', kind: 'stmt', text: 'установить x в %X', args: { X: num(0) } },
    { type: 'ms_change_y', cat: 'motion', kind: 'stmt', text: 'изменить y на %DY', args: { DY: num(10) } },
    { type: 'ms_set_y', cat: 'motion', kind: 'stmt', text: 'установить y в %Y', args: { Y: num(0) } },
    { type: 'ms_bounce', cat: 'motion', kind: 'stmt', text: 'если касается края, оттолкнуться', args: {} },
    { type: 'ms_x_pos', cat: 'motion', kind: 'reporter', text: 'x', args: {} },
    { type: 'ms_y_pos', cat: 'motion', kind: 'reporter', text: 'y', args: {} },
    { type: 'ms_direction', cat: 'motion', kind: 'reporter', text: 'направление', args: {} },

    // Внешность
    { type: 'ms_say_for', cat: 'looks', kind: 'stmt', text: 'сказать %TEXT в течение %SECS секунд', args: { TEXT: text('Привет!'), SECS: num(2) } },
    { type: 'ms_say', cat: 'looks', kind: 'stmt', text: 'сказать %TEXT', args: { TEXT: text('Привет!') } },
    { type: 'ms_set_costume', cat: 'looks', kind: 'stmt', text: 'сменить вид на %EMOJI', args: { EMOJI: dd(EMOJIS.map((e) => [e, e])) } },
    { type: 'ms_set_size', cat: 'looks', kind: 'stmt', text: 'установить размер %SIZE %', args: { SIZE: num(100) } },
    { type: 'ms_change_size', cat: 'looks', kind: 'stmt', text: 'изменить размер на %DSIZE', args: { DSIZE: num(10) } },
    { type: 'ms_show', cat: 'looks', kind: 'stmt', text: 'показаться', args: {} },
    { type: 'ms_hide', cat: 'looks', kind: 'stmt', text: 'спрятаться', args: {} },
    { type: 'ms_flip', cat: 'looks', kind: 'stmt', text: 'отразить зеркально', args: {} },
    { type: 'ms_set_flip', cat: 'looks', kind: 'stmt', text: 'зеркальное отражение %FLIP', args: { FLIP: dd([['включить', 'on'], ['выключить', 'off']]) } },
    { type: 'ms_flipped', cat: 'looks', kind: 'bool', text: 'отражён?', args: {} },
    { type: 'ms_set_bg', cat: 'looks', kind: 'stmt', text: 'сменить фон на %COLOR', args: { COLOR: dd(BACKGROUNDS) } },
    { type: 'ms_size', cat: 'looks', kind: 'reporter', text: 'размер', args: {} },

    // События
    { type: 'ms_when_flag', cat: 'events', kind: 'hat', text: 'когда нажат %FLAG', args: { FLAG: { t: 'img', src: FLAG_SVG } } },
    { type: 'ms_when_key', cat: 'events', kind: 'hat', text: 'когда клавиша %KEY нажата', args: { KEY: dd(KEYS) } },
    { type: 'ms_when_clicked', cat: 'events', kind: 'hat', text: 'когда спрайт нажат', args: {} },
    { type: 'ms_when_receive', cat: 'events', kind: 'hat', text: 'когда я получу %MSG', args: { MSG: { t: 'input', v: 'сигнал' } } },
    { type: 'ms_broadcast', cat: 'events', kind: 'stmt', text: 'передать %MSG', args: { MSG: text('сигнал') } },

    // Управление
    { type: 'ms_wait', cat: 'control', kind: 'stmt', text: 'ждать %SECS секунд', args: { SECS: num(1) } },
    { type: 'ms_repeat', cat: 'control', kind: 'stmt', text: 'повторить %TIMES раз\n%DO', args: { TIMES: num(10), DO: stmt } },
    { type: 'ms_forever', cat: 'control', kind: 'cap', text: 'всегда\n%DO', args: { DO: stmt } },
    { type: 'ms_if', cat: 'control', kind: 'stmt', text: 'если %COND то\n%DO', args: { COND: bool, DO: stmt } },
    { type: 'ms_if_else', cat: 'control', kind: 'stmt', text: 'если %COND то\n%DO\nиначе\n%ELSE', args: { COND: bool, DO: stmt, ELSE: stmt } },
    { type: 'ms_wait_until', cat: 'control', kind: 'stmt', text: 'ждать до %COND', args: { COND: bool } },
    { type: 'ms_repeat_until', cat: 'control', kind: 'stmt', text: 'повторять пока не %COND\n%DO', args: { COND: bool, DO: stmt } },
    { type: 'ms_stop_this', cat: 'control', kind: 'cap', text: 'стоп этот скрипт', args: {} },
    { type: 'ms_stop_all', cat: 'control', kind: 'cap', text: 'стоп всё', args: {} },

    // Сенсоры
    { type: 'ms_touching', cat: 'sensing', kind: 'bool', text: 'касается %TARGET ?', args: { TARGET: dd(() => [['края', '_edge_'], ['указателя мыши', '_mouse_']].concat(hooks.otherSprites())) } },
    { type: 'ms_key_pressed', cat: 'sensing', kind: 'bool', text: 'клавиша %KEY нажата?', args: { KEY: dd(KEYS) } },
    { type: 'ms_mouse_down', cat: 'sensing', kind: 'bool', text: 'мышь нажата?', args: {} },
    { type: 'ms_mouse_x', cat: 'sensing', kind: 'reporter', text: 'x мыши', args: {} },
    { type: 'ms_mouse_y', cat: 'sensing', kind: 'reporter', text: 'y мыши', args: {} },
    { type: 'ms_timer', cat: 'sensing', kind: 'reporter', text: 'таймер', args: {} },
    { type: 'ms_reset_timer', cat: 'sensing', kind: 'stmt', text: 'сбросить таймер', args: {} },

    // Операторы
    { type: 'ms_arith', cat: 'operators', kind: 'reporter', text: '%A %OP %B', args: { A: num(''), OP: dd([['+', '+'], ['−', '-'], ['×', '*'], ['÷', '/'], ['остаток', '%']]), B: num('') } },
    { type: 'ms_random', cat: 'operators', kind: 'reporter', text: 'случайное от %FROM до %TO', args: { FROM: num(1), TO: num(10) } },
    { type: 'ms_compare', cat: 'operators', kind: 'bool', text: '%A %OP %B', args: { A: text(''), OP: dd([['<', '<'], ['=', '='], ['>', '>']]), B: text('50') } },
    { type: 'ms_and', cat: 'operators', kind: 'bool', text: '%A и %B', args: { A: bool, B: bool } },
    { type: 'ms_or', cat: 'operators', kind: 'bool', text: '%A или %B', args: { A: bool, B: bool } },
    { type: 'ms_not', cat: 'operators', kind: 'bool', text: 'не %A', args: { A: bool } },
    { type: 'ms_join', cat: 'operators', kind: 'reporter', text: 'соединить %A %B', args: { A: text('яблоко '), B: text('банан') } },
    { type: 'ms_round', cat: 'operators', kind: 'reporter', text: 'округлить %A', args: { A: num('') } },

    // Переменные (попадают в палитру динамически, см. variablesFlyout)
    { type: 'ms_set_var', cat: 'variables', kind: 'stmt', text: 'задать %VAR значение %VALUE', args: { VAR: { t: 'var' }, VALUE: text('0') }, hidden: true },
    { type: 'ms_change_var', cat: 'variables', kind: 'stmt', text: 'изменить %VAR на %DELTA', args: { VAR: { t: 'var' }, DELTA: num(1) }, hidden: true },
    { type: 'ms_var', cat: 'variables', kind: 'reporter', text: '%VAR', args: { VAR: { t: 'var' } }, hidden: true },
  ];

  // Превращает запись SPEC в JSON-определение блока для Blockly.
  function toBlockJson(spec) {
    const json = { type: spec.type, style: spec.cat + '_blocks', inputsInline: true };
    spec.text.split('\n').forEach((line, i) => {
      const args = [];
      const message = line.replace(/%([A-Z]+)/g, (_, name) => {
        const a = spec.args[name];
        if (a.t === 'num' || a.t === 'text') args.push({ type: 'input_value', name });
        else if (a.t === 'bool') args.push({ type: 'input_value', name, check: 'Boolean' });
        else if (a.t === 'stmt') args.push({ type: 'input_statement', name });
        else if (a.t === 'dd') args.push({ type: 'field_dropdown', name, options: a.options });
        else if (a.t === 'input') args.push({ type: 'field_input', name, text: a.v });
        else if (a.t === 'var') args.push({ type: 'field_variable', name, variable: null });
        else if (a.t === 'img') args.push({ type: 'field_image', src: a.src, width: 24, height: 24, alt: '⚑' });
        return '%' + args.length;
      });
      json['message' + i] = message;
      json['args' + i] = args;
    });
    if (spec.kind === 'hat') json.nextStatement = null;
    if (spec.kind === 'stmt') { json.previousStatement = null; json.nextStatement = null; }
    if (spec.kind === 'cap') json.previousStatement = null;
    if (spec.kind === 'reporter') json.output = null;
    if (spec.kind === 'bool') json.output = 'Boolean';
    return json;
  }

  function shadowsFor(spec) {
    const inputs = {};
    for (const [name, a] of Object.entries(spec.args)) {
      if (a.t === 'num') inputs[name] = { shadow: { type: 'ms_num', fields: { NUM: a.v } } };
      if (a.t === 'text') inputs[name] = { shadow: { type: 'ms_text', fields: { TEXT: a.v } } };
    }
    return inputs;
  }

  function register() {
    Blockly.defineBlocksWithJsonArray([
      { type: 'ms_num', message0: '%1', args0: [{ type: 'field_number', name: 'NUM', value: 0 }], output: null, style: 'operators_blocks' },
      { type: 'ms_text', message0: '%1', args0: [{ type: 'field_input', name: 'TEXT', text: '' }], output: null, style: 'operators_blocks' },
    ].concat(SPEC.map(toBlockJson)));
  }

  function toolbox() {
    return {
      kind: 'categoryToolbox',
      contents: CATEGORIES.map((c) => {
        if (c.id === 'variables') {
          return { kind: 'category', name: c.name, categorystyle: c.id + '_category', custom: 'MS_VARIABLES' };
        }
        return {
          kind: 'category',
          name: c.name,
          categorystyle: c.id + '_category',
          contents: SPEC.filter((s) => s.cat === c.id && !s.hidden)
            .map((s) => ({ kind: 'block', type: s.type, inputs: shadowsFor(s) })),
        };
      }),
    };
  }

  // Палитра переменных: кнопка «Создать» + блоки для каждой переменной.
  function variablesFlyout(workspace) {
    const items = [{ kind: 'button', text: 'Создать переменную', callbackkey: 'MS_CREATE_VAR' }];
    const vars = workspace.getAllVariables();
    for (const v of vars) {
      items.push({ kind: 'block', type: 'ms_var', fields: { VAR: { id: v.getId() } } });
    }
    if (vars.length) {
      const first = { VAR: { id: vars[0].getId() } };
      const byType = (type) => SPEC.find((s) => s.type === type);
      items.push({ kind: 'block', type: 'ms_set_var', fields: first, inputs: shadowsFor(byType('ms_set_var')) });
      items.push({ kind: 'block', type: 'ms_change_var', fields: first, inputs: shadowsFor(byType('ms_change_var')) });
    }
    return items;
  }

  function theme() {
    const blockStyles = {};
    const categoryStyles = {};
    for (const c of CATEGORIES) {
      blockStyles[c.id + '_blocks'] = { colourPrimary: c.colour };
      categoryStyles[c.id + '_category'] = { colour: c.colour };
    }
    return Blockly.Theme.defineTheme('mini_scratch', {
      base: Blockly.Themes.Classic,
      blockStyles,
      categoryStyles,
      startHats: true,
      fontStyle: { family: '"Helvetica Neue", Helvetica, Arial, sans-serif', weight: '500', size: 12 },
      componentStyles: {
        workspaceBackgroundColour: '#f9f9fb',
        toolboxBackgroundColour: '#ffffff',
        flyoutBackgroundColour: '#f2f2f7',
        flyoutOpacity: 1,
      },
    });
  }

  window.MiniBlocks = { register, toolbox, variablesFlyout, theme, hooks, EMOJIS, BACKGROUNDS };
})();
