// Исполнитель скриптов Мини-Scratch.
// Работает не с живыми блоками Blockly, а с их JSON-сериализацией, поэтому
// не зависит от DOM и тестируется в Node (см. tests/runtime.test.js).
//
// Каждый скрипт — отдельный «поток»: JS-генератор. Блоки «ждать», «повторить»,
// «всегда» делают yield, и поток уступает ход до следующего такта.
// Такт — 1/30 секунды, как в оригинальном Scratch.
(function (root) {
  'use strict';

  const STAGE_W = 480;
  const STAGE_H = 360;
  const SPRITE_PX = 48; // размер эмодзи при «размере 100 %»
  const TICK_MS = 1000 / 30;

  function toNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  // Сравнение как в Scratch: числа — как числа, остальное — как текст без учёта регистра.
  function compare(a, b) {
    const na = Number(a);
    const nb = Number(b);
    if (a !== '' && b !== '' && !Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    const sa = String(a).toLowerCase();
    const sb = String(b).toLowerCase();
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  }

  function normDir(d) {
    d = ((d + 180) % 360 + 360) % 360 - 180;
    return d === -180 ? 180 : d;
  }

  function nextOf(block) {
    return block.next && block.next.block;
  }

  function field(block, name) {
    const f = block.fields && block.fields[name];
    if (f && typeof f === 'object') return f.id;
    return f === undefined ? '' : f;
  }

  function subStack(block, name) {
    const inp = block.inputs && block.inputs[name];
    return inp && inp.block;
  }

  function halfSize(s) {
    return (SPRITE_PX / 2) * (s.size / 100) * 0.8;
  }

  class Runtime {
    constructor(project) {
      this.project = project;
      this.threads = [];
      this.keys = new Set();
      this.mouse = { x: 0, y: 0, down: false };
      this.vars = {};
      this.now = 0;
      this.timerStart = 0;
      this.acc = 0;
    }

    setProject(project) {
      this.stopAll();
      this.project = project;
      this.vars = {};
    }

    get running() {
      return this.threads.length > 0;
    }

    // --- запуск скриптов ---

    scripts(hatType, match) {
      const out = [];
      for (const sprite of this.project.sprites) {
        const tops = (sprite.blocks && sprite.blocks.blocks) || [];
        for (const top of tops) {
          if (top.type === hatType && (!match || match(top, sprite))) out.push({ sprite, top });
        }
      }
      return out;
    }

    // restart = true: уже идущий скрипт начинается заново (флажок, сообщения);
    // false: повторное событие игнорируется, пока скрипт не закончится (клавиши, клики).
    start(hatType, match, restart) {
      for (const { sprite, top } of this.scripts(hatType, match)) {
        const running = this.threads.find((t) => !t.done && t.top === top && t.sprite === sprite);
        if (running) {
          if (!restart) continue;
          running.done = true;
        }
        const thread = { sprite, top, done: false };
        thread.gen = this.runStack(nextOf(top), thread);
        this.threads.push(thread);
      }
    }

    greenFlag() {
      this.stopAll();
      this.timerStart = this.now;
      this.start('ms_when_flag', null, true);
    }

    keyDown(key) {
      this.keys.add(key);
      this.start('ms_when_key', (top) => {
        const k = field(top, 'KEY');
        return k === key || k === 'any';
      }, false);
    }

    keyUp(key) {
      this.keys.delete(key);
    }

    spriteClicked(sprite) {
      this.start('ms_when_clicked', (top, s) => s === sprite, false);
    }

    broadcast(message) {
      const m = String(message).trim().toLowerCase();
      this.start('ms_when_receive', (top) => String(field(top, 'MSG')).trim().toLowerCase() === m, true);
    }

    stopAll() {
      for (const t of this.threads) t.done = true;
      this.threads = [];
      for (const s of this.project.sprites) s.say = '';
    }

    // Продвигает время на dtMs и выполняет нужное число тактов.
    advance(dtMs) {
      this.acc = Math.min(this.acc + dtMs, TICK_MS * 5);
      while (this.acc >= TICK_MS) {
        this.acc -= TICK_MS;
        this.tick();
      }
    }

    tick() {
      this.now += TICK_MS;
      for (const t of this.threads.slice()) {
        if (t.done) continue;
        if (t.gen.next().done) t.done = true;
      }
      this.threads = this.threads.filter((t) => !t.done);
    }

    // --- выполнение команд ---

    *runStack(block, t) {
      while (block && !t.done) {
        yield* this.exec(block, t);
        block = nextOf(block);
      }
    }

    *wait(seconds) {
      const end = this.now + Math.max(0, seconds) * 1000;
      do {
        yield;
      } while (this.now < end);
    }

    *exec(b, t) {
      const s = t.sprite;
      switch (b.type) {
        // Движение
        case 'ms_move_steps': {
          const n = this.num(b, 'STEPS', t);
          const r = (s.dir * Math.PI) / 180;
          this.moveTo(s, s.x + n * Math.sin(r), s.y + n * Math.cos(r));
          break;
        }
        case 'ms_turn_right': s.dir = normDir(s.dir + this.num(b, 'DEG', t)); break;
        case 'ms_turn_left': s.dir = normDir(s.dir - this.num(b, 'DEG', t)); break;
        case 'ms_point_dir': s.dir = normDir(this.num(b, 'DIR', t)); break;
        case 'ms_goto_xy': this.moveTo(s, this.num(b, 'X', t), this.num(b, 'Y', t)); break;
        case 'ms_goto_random':
          this.moveTo(s, Math.round(Math.random() * 440 - 220), Math.round(Math.random() * 320 - 160));
          break;
        case 'ms_change_x': this.moveTo(s, s.x + this.num(b, 'DX', t), s.y); break;
        case 'ms_set_x': this.moveTo(s, this.num(b, 'X', t), s.y); break;
        case 'ms_change_y': this.moveTo(s, s.x, s.y + this.num(b, 'DY', t)); break;
        case 'ms_set_y': this.moveTo(s, s.x, this.num(b, 'Y', t)); break;
        case 'ms_bounce': this.bounce(s); break;

        // Внешность
        case 'ms_say': s.say = this.text(b, 'TEXT', t); break;
        case 'ms_say_for': {
          const text = this.text(b, 'TEXT', t);
          s.say = text;
          yield* this.wait(this.num(b, 'SECS', t));
          if (s.say === text) s.say = '';
          break;
        }
        case 'ms_show': s.visible = true; break;
        case 'ms_hide': s.visible = false; break;
        case 'ms_flip': s.flip = !s.flip; break;
        case 'ms_set_flip': s.flip = field(b, 'FLIP') === 'on'; break;
        case 'ms_set_costume': s.emoji = field(b, 'EMOJI'); break;
        case 'ms_set_size': s.size = Math.min(500, Math.max(5, this.num(b, 'SIZE', t))); break;
        case 'ms_change_size': s.size = Math.min(500, Math.max(5, s.size + this.num(b, 'DSIZE', t))); break;
        case 'ms_set_bg': this.project.background = field(b, 'COLOR'); break;

        // События
        case 'ms_broadcast': this.broadcast(this.text(b, 'MSG', t)); break;

        // Управление
        case 'ms_wait': yield* this.wait(this.num(b, 'SECS', t)); break;
        case 'ms_repeat': {
          const n = Math.round(this.num(b, 'TIMES', t));
          for (let i = 0; i < n && !t.done; i++) {
            yield* this.runStack(subStack(b, 'DO'), t);
            yield;
          }
          break;
        }
        case 'ms_forever':
          while (!t.done) {
            yield* this.runStack(subStack(b, 'DO'), t);
            yield;
          }
          break;
        case 'ms_if':
          if (this.bool(b, 'COND', t)) yield* this.runStack(subStack(b, 'DO'), t);
          break;
        case 'ms_if_else':
          yield* this.runStack(subStack(b, this.bool(b, 'COND', t) ? 'DO' : 'ELSE'), t);
          break;
        case 'ms_wait_until':
          while (!t.done && !this.bool(b, 'COND', t)) yield;
          break;
        case 'ms_repeat_until':
          while (!t.done && !this.bool(b, 'COND', t)) {
            yield* this.runStack(subStack(b, 'DO'), t);
            yield;
          }
          break;
        case 'ms_stop_all': this.stopAll(); break;
        case 'ms_stop_this': t.done = true; break;

        // Сенсоры
        case 'ms_reset_timer': this.timerStart = this.now; break;

        // Переменные
        case 'ms_set_var': this.vars[field(b, 'VAR')] = this.value(b, 'VALUE', t); break;
        case 'ms_change_var': {
          const id = field(b, 'VAR');
          this.vars[id] = toNum(this.vars[id]) + this.num(b, 'DELTA', t);
          break;
        }
        default:
          break;
      }
    }

    // --- вычисление значений ---

    value(b, name, t) {
      const inp = b.inputs && b.inputs[name];
      const target = inp && (inp.block || inp.shadow);
      return target ? this.evaluate(target, t) : '';
    }

    num(b, name, t) {
      return toNum(this.value(b, name, t));
    }

    text(b, name, t) {
      const v = this.value(b, name, t);
      return typeof v === 'number' ? String(Math.round(v * 1e6) / 1e6) : String(v);
    }

    bool(b, name, t) {
      const v = this.value(b, name, t);
      return v === true || v === 'true';
    }

    evaluate(b, t) {
      const s = t.sprite;
      switch (b.type) {
        case 'ms_num': return toNum(field(b, 'NUM'));
        case 'ms_text': return field(b, 'TEXT');
        case 'ms_var': {
          const v = this.vars[field(b, 'VAR')];
          return v === undefined ? 0 : v;
        }
        case 'ms_x_pos': return Math.round(s.x);
        case 'ms_y_pos': return Math.round(s.y);
        case 'ms_direction': return s.dir;
        case 'ms_size': return Math.round(s.size);
        case 'ms_flipped': return Boolean(s.flip);
        case 'ms_touching': return this.touching(s, field(b, 'TARGET'));
        case 'ms_key_pressed': {
          const k = field(b, 'KEY');
          return k === 'any' ? this.keys.size > 0 : this.keys.has(k);
        }
        case 'ms_mouse_x': return Math.round(this.mouse.x);
        case 'ms_mouse_y': return Math.round(this.mouse.y);
        case 'ms_mouse_down': return this.mouse.down;
        case 'ms_timer': return Math.round((this.now - this.timerStart) / 10) / 100;
        case 'ms_arith': {
          const a = this.num(b, 'A', t);
          const c = this.num(b, 'B', t);
          switch (field(b, 'OP')) {
            case '+': return a + c;
            case '-': return a - c;
            case '*': return a * c;
            case '/': return a / c;
            case '%': return ((a % c) + c) % c;
            default: return 0;
          }
        }
        case 'ms_compare': {
          const d = compare(this.value(b, 'A', t), this.value(b, 'B', t));
          const op = field(b, 'OP');
          return op === '<' ? d < 0 : op === '>' ? d > 0 : d === 0;
        }
        case 'ms_and': return this.bool(b, 'A', t) && this.bool(b, 'B', t);
        case 'ms_or': return this.bool(b, 'A', t) || this.bool(b, 'B', t);
        case 'ms_not': return !this.bool(b, 'A', t);
        case 'ms_random': {
          let lo = this.num(b, 'FROM', t);
          let hi = this.num(b, 'TO', t);
          if (lo > hi) [lo, hi] = [hi, lo];
          if (Number.isInteger(lo) && Number.isInteger(hi)) {
            return lo + Math.floor(Math.random() * (hi - lo + 1));
          }
          return lo + Math.random() * (hi - lo);
        }
        case 'ms_join': return this.text(b, 'A', t) + this.text(b, 'B', t);
        case 'ms_round': return Math.round(this.num(b, 'A', t));
        default: return '';
      }
    }

    // --- геометрия ---

    moveTo(s, x, y) {
      s.x = Math.max(-STAGE_W / 2, Math.min(STAGE_W / 2, x));
      s.y = Math.max(-STAGE_H / 2, Math.min(STAGE_H / 2, y));
    }

    bounce(s) {
      const h = halfSize(s);
      if (s.x - h < -STAGE_W / 2) { s.dir = normDir(-s.dir); s.x = -STAGE_W / 2 + h; }
      if (s.x + h > STAGE_W / 2) { s.dir = normDir(-s.dir); s.x = STAGE_W / 2 - h; }
      if (s.y + h > STAGE_H / 2) { s.dir = normDir(180 - s.dir); s.y = STAGE_H / 2 - h; }
      if (s.y - h < -STAGE_H / 2) { s.dir = normDir(180 - s.dir); s.y = -STAGE_H / 2 + h; }
    }

    touching(s, target) {
      if (!s.visible) return false;
      const h = halfSize(s);
      if (target === '_edge_') {
        return s.x - h <= -STAGE_W / 2 || s.x + h >= STAGE_W / 2 ||
          s.y - h <= -STAGE_H / 2 || s.y + h >= STAGE_H / 2;
      }
      if (target === '_mouse_') {
        return Math.abs(this.mouse.x - s.x) <= h && Math.abs(this.mouse.y - s.y) <= h;
      }
      const other = this.project.sprites.find((o) => o.id === target);
      if (!other || other === s || !other.visible) return false;
      const ho = halfSize(other);
      return Math.abs(s.x - other.x) <= h + ho && Math.abs(s.y - other.y) <= h + ho;
    }

    // Верхний видимый спрайт под точкой — для кликов и перетаскивания на сцене.
    spriteAt(x, y) {
      for (let i = this.project.sprites.length - 1; i >= 0; i--) {
        const s = this.project.sprites[i];
        const h = halfSize(s) / 0.8;
        if (s.visible && Math.abs(x - s.x) <= h && Math.abs(y - s.y) <= h) return s;
      }
      return null;
    }
  }

  const api = { Runtime, STAGE_W, STAGE_H, SPRITE_PX };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MiniRuntime = api;
})(this);
