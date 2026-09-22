// Связка редактора блоков, сцены и панели спрайтов.
(function () {
  'use strict';

  const { Runtime, STAGE_W, STAGE_H, SPRITE_PX } = window.MiniRuntime;
  const STORAGE_KEY = 'mini-scratch-project';
  const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

  const EXAMPLES = window.MiniExamples.EXAMPLES;
  let project = loadStored() || EXAMPLES.find((e) => e.id === 'catch-apple').create();
  let currentId = project.sprites[0].id;
  let loading = false;
  const runtime = new Runtime(project);

  const $ = (id) => document.getElementById(id);
  const current = () => project.sprites.find((s) => s.id === currentId);

  // --- хранение ---

  function loadStored() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? normalize(JSON.parse(raw)) : null;
    } catch (e) {
      return null;
    }
  }

  let persistTimer = 0;
  function persist() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(project, stripRuntime));
      } catch (e) {
        // хранилище недоступно (приватный режим) — проект живёт до перезагрузки
      }
    }, 300);
  }

  // Реплики спрайтов — состояние запуска, в файл их не пишем.
  function stripRuntime(key, value) {
    return key === 'say' ? undefined : value;
  }

  function normalize(p) {
    if (!p || !Array.isArray(p.sprites) || !p.sprites.length) throw new Error('В файле нет спрайтов');
    p.variables = Array.isArray(p.variables) ? p.variables : [];
    p.background = p.background || '#ffffff';
    for (const s of p.sprites) {
      s.id = s.id || newId('sprite');
      s.name = s.name || 'Спрайт';
      s.emoji = s.emoji || '🐱';
      s.x = Number(s.x) || 0;
      s.y = Number(s.y) || 0;
      s.dir = Number.isFinite(s.dir) ? s.dir : 90;
      s.size = Number(s.size) || 100;
      s.visible = s.visible !== false;
      s.flip = Boolean(s.flip);
      s.say = '';
      s.blocks = s.blocks || { languageVersion: 0, blocks: [] };
    }
    return p;
  }

  function newId(prefix) {
    return prefix + '_' + Math.random().toString(36).slice(2, 9);
  }

  // --- редактор блоков ---

  window.MiniBlocks.register();
  window.MiniBlocks.hooks.otherSprites = () =>
    project.sprites.filter((s) => s.id !== currentId).map((s) => [s.name, s.id]);

  const workspace = Blockly.inject($('blockly'), {
    toolbox: window.MiniBlocks.toolbox(),
    renderer: 'zelos',
    theme: window.MiniBlocks.theme(),
    media: 'vendor/blockly/media/',
    sounds: false,
    trashcan: true,
    zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 2, minScale: 0.3 },
    move: { scrollbars: true, drag: true, wheel: false },
  });

  workspace.registerToolboxCategoryCallback('MS_VARIABLES', window.MiniBlocks.variablesFlyout);
  workspace.registerButtonCallback('MS_CREATE_VAR', () =>
    Blockly.Variables.createVariableButtonHandler(workspace));

  workspace.addChangeListener((e) => {
    if (loading || e.isUiEvent) return;
    saveWorkspace();
  });

  // Скрипты текущего спрайта и общий список переменных забираем из Blockly.
  function saveWorkspace() {
    const state = Blockly.serialization.workspaces.save(workspace);
    current().blocks = state.blocks || { languageVersion: 0, blocks: [] };
    project.variables = (state.variables || []).map((v) => ({ id: v.id, name: v.name }));
    persist();
  }

  function loadWorkspace() {
    loading = true;
    Blockly.Events.disable();
    try {
      Blockly.serialization.workspaces.load(
        { blocks: current().blocks, variables: project.variables }, workspace);
    } finally {
      Blockly.Events.enable();
      loading = false;
    }
    tidyIfOverlapping();
    workspace.clearUndo();
    workspace.scrollCenter();
  }

  // Скрипты с неудачными координатами (примеры, чужие файлы) расставляем в столбик.
  function tidyIfOverlapping() {
    const boxes = workspace.getTopBlocks(false).map((b) => b.getBoundingRectangle());
    const overlap = boxes.some((a, i) => boxes.some((b, j) => j > i && a.intersects(b)));
    if (overlap) {
      workspace.cleanUp();
      saveWorkspace();
    }
  }

  // --- панель спрайтов ---

  function selectSprite(id) {
    if (id === currentId) return;
    currentId = id;
    loadWorkspace();
    renderSpritePanel();
  }

  function renderSpritePanel() {
    const s = current();
    $('sprite-name').value = s.name;
    $('btn-delete-sprite').disabled = project.sprites.length < 2;
    $('btn-flip').classList.toggle('on', s.flip);
    $('btn-flip').setAttribute('aria-pressed', String(s.flip));

    const picker = $('emoji-picker');
    picker.textContent = '';
    for (const e of window.MiniBlocks.EMOJIS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = e;
      b.title = 'Вид: ' + e;
      b.className = e === s.emoji ? 'selected' : '';
      b.addEventListener('click', () => {
        current().emoji = e;
        persist();
        renderSpritePanel();
      });
      picker.appendChild(b);
    }

    const list = $('sprite-list');
    list.textContent = '';
    for (const sp of project.sprites) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'sprite-tile' + (sp.id === currentId ? ' selected' : '');
      const em = document.createElement('span');
      em.className = 'emoji' + (sp.flip ? ' flipped' : '');
      em.textContent = sp.emoji;
      const nm = document.createElement('span');
      nm.className = 'name';
      nm.textContent = sp.name;
      tile.append(em, nm);
      tile.addEventListener('click', () => selectSprite(sp.id));
      list.appendChild(tile);
    }
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'sprite-tile add';
    add.title = 'Добавить спрайт';
    add.textContent = '+';
    add.addEventListener('click', addSprite);
    list.appendChild(add);
  }

  function uniqueName(base) {
    const names = new Set(project.sprites.map((s) => s.name));
    if (!names.has(base)) return base;
    let i = 2;
    while (names.has(base + i)) i++;
    return base + i;
  }

  function addSprite() {
    const emojis = window.MiniBlocks.EMOJIS;
    const sprite = {
      id: newId('sprite'),
      name: uniqueName('Спрайт'),
      emoji: emojis[project.sprites.length % emojis.length],
      x: Math.round(Math.random() * 200 - 100),
      y: Math.round(Math.random() * 160 - 80),
      dir: 90, size: 100, visible: true, flip: false, say: '',
      blocks: { languageVersion: 0, blocks: [] },
    };
    project.sprites.push(sprite);
    persist();
    selectSprite(sprite.id);
  }

  $('sprite-name').addEventListener('input', (e) => {
    current().name = e.target.value.trim() || 'Спрайт';
    persist();
    for (const tile of $('sprite-list').querySelectorAll('.sprite-tile.selected .name')) {
      tile.textContent = current().name;
    }
  });

  $('btn-flip').addEventListener('click', () => {
    current().flip = !current().flip;
    persist();
    renderSpritePanel();
  });

  $('btn-delete-sprite').addEventListener('click', () => {
    if (project.sprites.length < 2) return;
    const s = current();
    if (!confirm('Удалить спрайт «' + s.name + '» вместе со скриптами?')) return;
    runtime.stopAll();
    project.sprites = project.sprites.filter((x) => x !== s);
    currentId = null;
    selectSprite(project.sprites[0].id);
    persist();
  });

  // --- проект целиком ---

  function setProject(p) {
    project = normalize(p);
    runtime.setProject(project);
    currentId = null;
    selectSprite(project.sprites[0].id);
    persist();
  }

  $('btn-new').addEventListener('click', () => {
    if (!confirm('Начать новый проект? Текущий будет заменён.')) return;
    setProject({
      version: 1, background: '#ffffff', variables: [],
      sprites: [{ id: newId('sprite'), name: 'Кот', emoji: '🐱', x: 0, y: 0, dir: 90, size: 100, visible: true }],
    });
  });

  // --- галерея примеров ---

  function renderExamples() {
    const list = $('examples-list');
    list.textContent = '';
    for (const ex of EXAMPLES) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'example-card';
      const icon = document.createElement('span');
      icon.className = 'example-emoji';
      icon.textContent = ex.emoji;
      const title = document.createElement('span');
      title.className = 'example-title';
      title.textContent = ex.title;
      const about = document.createElement('span');
      about.className = 'example-about';
      about.textContent = ex.about;
      const topics = document.createElement('span');
      topics.className = 'example-topics';
      topics.textContent = 'Темы: ' + ex.topics;
      card.append(icon, title, about, topics);
      card.addEventListener('click', () => {
        $('examples-dialog').close();
        setProject(ex.create());
      });
      list.appendChild(card);
    }
  }

  $('btn-examples').addEventListener('click', () => $('examples-dialog').showModal());
  $('btn-examples-close').addEventListener('click', () => $('examples-dialog').close());
  $('examples-dialog').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.close(); // клик по затемнению
  });

  $('btn-save').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(project, stripRuntime, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'проект.mscratch.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  $('btn-open').addEventListener('click', () => $('file-input').click());
  $('file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      setProject(JSON.parse(await file.text()));
    } catch (err) {
      alert('Не удалось открыть файл: ' + err.message);
    }
  });

  $('btn-flag').addEventListener('click', () => runtime.greenFlag());
  $('btn-stop').addEventListener('click', () => runtime.stopAll());

  // Кнопки не должны держать фокус, иначе пробел в игре «нажмёт» их снова.
  for (const b of document.querySelectorAll('header button')) {
    b.addEventListener('mouseup', () => b.blur());
  }

  // --- клавиатура ---

  const KEY_MAP = { ' ': 'space', ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Enter: 'enter' };

  function keyName(e) {
    if (KEY_MAP[e.key]) return KEY_MAP[e.key];
    if (e.code && e.code.startsWith('Key')) return e.code.slice(3).toLowerCase(); // работает и в русской раскладке
    return e.key.length === 1 ? e.key.toLowerCase() : null;
  }

  function typingInField(e) {
    const t = e.target;
    return t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t.isContentEditable;
  }

  window.addEventListener('keydown', (e) => {
    if (typingInField(e) || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = keyName(e);
    if (!k) return;
    if (k === 'space' || k === 'left' || k === 'right' || k === 'up' || k === 'down') e.preventDefault();
    if (!e.repeat) runtime.keyDown(k);
  });

  window.addEventListener('keyup', (e) => {
    const k = keyName(e);
    if (k) runtime.keyUp(k);
  });

  window.addEventListener('blur', () => runtime.keys.clear());

  // --- сцена: мышь и перетаскивание спрайтов ---

  const canvas = $('stage');
  const ctx = canvas.getContext('2d');
  let drag = null;

  function stagePoint(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * STAGE_W - STAGE_W / 2,
      y: STAGE_H / 2 - ((e.clientY - r.top) / r.height) * STAGE_H,
    };
  }

  canvas.addEventListener('pointermove', (e) => {
    const p = stagePoint(e);
    runtime.mouse.x = Math.max(-STAGE_W / 2, Math.min(STAGE_W / 2, p.x));
    runtime.mouse.y = Math.max(-STAGE_H / 2, Math.min(STAGE_H / 2, p.y));
    $('stage-info').textContent = 'x: ' + Math.round(runtime.mouse.x) + '   y: ' + Math.round(runtime.mouse.y);
    if (drag) {
      if (Math.abs(p.x - drag.startX) + Math.abs(p.y - drag.startY) > 3) drag.moved = true;
      if (drag.moved) runtime.moveTo(drag.sprite, Math.round(p.x - drag.dx), Math.round(p.y - drag.dy));
    }
  });

  canvas.addEventListener('pointerdown', (e) => {
    const p = stagePoint(e);
    runtime.mouse.down = true;
    const s = runtime.spriteAt(p.x, p.y);
    if (!s) return;
    canvas.setPointerCapture(e.pointerId);
    drag = { sprite: s, dx: p.x - s.x, dy: p.y - s.y, startX: p.x, startY: p.y, moved: false };
    if (s.id !== currentId) selectSprite(s.id);
  });

  function endPointer() {
    runtime.mouse.down = false;
    if (!drag) return;
    if (drag.moved) persist();
    else runtime.spriteClicked(drag.sprite);
    drag = null;
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  // --- отрисовка ---

  function drawSprite(s) {
    ctx.save();
    ctx.translate(s.x + STAGE_W / 2, STAGE_H / 2 - s.y);
    ctx.rotate(((s.dir - 90) * Math.PI) / 180);
    if (s.flip) ctx.scale(-1, 1);
    ctx.font = Math.round(SPRITE_PX * (s.size / 100)) + 'px ' + EMOJI_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.emoji, 0, 2);
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBubble(s) {
    ctx.font = '13px "Helvetica Neue", Helvetica, Arial, sans-serif';
    const text = s.say.length > 60 ? s.say.slice(0, 57) + '…' : s.say;
    const w = Math.min(200, ctx.measureText(text).width + 20);
    const h = 28;
    const top = (SPRITE_PX / 2) * (s.size / 100);
    let x = s.x + STAGE_W / 2 + top * 0.4;
    let y = STAGE_H / 2 - s.y - top - h - 8;
    x = Math.max(2, Math.min(STAGE_W - w - 2, x));
    y = Math.max(2, y);
    roundRect(x, y, w, h, 12);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#b8c0cc';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2a2f3a';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 10, y + h / 2, w - 20);
  }

  function drawMonitors() {
    let y = 6;
    ctx.font = '12px "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.textBaseline = 'middle';
    for (const v of project.variables) {
      const raw = runtime.vars[v.id];
      const value = raw === undefined ? '0' : typeof raw === 'number' ? String(Math.round(raw * 1e6) / 1e6) : String(raw);
      const labelW = ctx.measureText(v.name).width;
      const valueW = Math.max(24, ctx.measureText(value).width + 12);
      const w = labelW + valueW + 18;
      roundRect(6, y, w, 24, 6);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.strokeStyle = '#c5ccd8';
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#2a2f3a';
      ctx.textAlign = 'left';
      ctx.fillText(v.name, 12, y + 12);
      roundRect(12 + labelW + 6, y + 4, valueW, 16, 5);
      ctx.fillStyle = '#FF8C1A';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(value, 12 + labelW + 6 + valueW / 2, y + 12);
      y += 30;
    }
  }

  function draw() {
    ctx.setTransform(canvas.width / STAGE_W, 0, 0, canvas.height / STAGE_H, 0, 0);
    ctx.fillStyle = project.background;
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);
    for (const s of project.sprites) if (s.visible) drawSprite(s);
    for (const s of project.sprites) if (s.visible && s.say) drawBubble(s);
    drawMonitors();
  }

  let lastTime = performance.now();
  let lastCoords = '';
  function frame(now) {
    runtime.advance(now - lastTime);
    lastTime = now;
    draw();
    $('btn-flag').classList.toggle('active', runtime.running);
    const s = current();
    const coords = 'x: ' + Math.round(s.x) + '  y: ' + Math.round(s.y) + '  направление: ' + Math.round(s.dir);
    if (coords !== lastCoords) {
      $('sprite-coords').textContent = coords;
      lastCoords = coords;
      if (!runtime.running) persist();
    }
    requestAnimationFrame(frame);
  }

  // --- старт ---

  // Доступ из консоли браузера для отладки: miniScratch.runtime.vars и т. п.
  window.miniScratch = { runtime, workspace, get project() { return project; } };

  window.addEventListener('resize', () => Blockly.svgResize(workspace));
  loadWorkspace();
  renderSpritePanel();
  renderExamples();
  requestAnimationFrame(frame);
})();
