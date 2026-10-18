// 《两端的灯》客户端：界面、对话、谜题和联机。
(function () {
  var L = window.Logic, Art = window.Art, STORY = window.STORY;
  var OTHER = L.OTHER;
  var DEFAULT_EMOTES = ['❤️', '👋', '❓', '👍', '✨'];

  // ---------- 小工具 ----------
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k]; if (v === undefined || v === null) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function store(k, v) {
    try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; }
  }
  function fmt(t, s) {
    return String(t).replace(/\{A\}/g, s.names.A).replace(/\{B\}/g, s.names.B).replace(/\{lamp\}/g, s.flags.lamp || '灯');
  }
  function speakerName(who, s) {
    if (who === 'A' || who === 'B') return s.names[who];
    return (Art.CAST[who] && Art.CAST[who].name) || '';
  }
  function lineVisible(ln, s) {
    var c = ln[2]; if (!c) return true;
    if ('v' in c) return s.flags[c.f] === c.v;
    if ('not' in c) return s.flags[c.f] !== c.not;
    return true;
  }
  function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

  // ---------- 声音（用 WebAudio 合成，不需要音频文件） ----------
  var Sound = (function () {
    var ctx = null, muted = !!store('lamp-muted');
    function c() { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } return ctx; }
    function tone(freq, dur, type, vol, delay) {
      if (muted) return; var a = c(); if (!a) return;
      var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol || 0.08, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
    }
    return {
      unlock: function () { var a = c(); if (a && a.state === 'suspended') a.resume(); },
      blip: function () { tone(880 + Math.random() * 120, 0.05, 'triangle', 0.02); },
      tap: function () { tone(660, 0.12, 'sine', 0.06); },
      chime: function () { [784, 988, 1175].forEach(function (f, i) { tone(f, 0.6, 'sine', 0.06, i * 0.09); }); },
      win: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, 0.7, 'triangle', 0.07, i * 0.1); }); },
      wrong: function () { tone(220, 0.25, 'sawtooth', 0.04); tone(180, 0.3, 'sawtooth', 0.04, 0.12); },
      ping: function () { tone(1320, 0.3, 'sine', 0.07); tone(1760, 0.4, 'sine', 0.05, 0.1); },
      note: function (f) { tone(f, 0.9, 'triangle', 0.1); tone(f * 2, 0.6, 'sine', 0.03); },
      lamp: function (i) { tone([392, 494, 587, 698][i] || 440, 0.35, 'sine', 0.08); },
      toggle: function () { muted = !muted; store('lamp-muted', muted); return muted; },
      get muted() { return muted; }
    };
  })();
  document.addEventListener('pointerdown', function () { Sound.unlock(); }, { once: true });

  // ---------- 联机方式 ----------
  function ServerTransport(room, token, role) {
    var self = this; this.room = room; this.token = token; this.role = role; this.subs = [];
    this.connect = function () {
      var es = new EventSource('api/events?room=' + room + '&token=' + token);
      es.onmessage = function (e) { var s = JSON.parse(e.data); self.subs.forEach(function (f) { f(s); }); };
      es.onerror = function () { self.subs.forEach(function (f) { f(null); }); };
    };
    this.subscribe = function (f) { this.subs.push(f); };
    this.save = function (s) { store('lamp-session', { room: room, token: token, role: self.role, last: s }); };
    this.send = function (action) {
      return fetch('api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room: room, token: token, action: action }) })
        .then(function (r) { return r.json(); }).then(function (r) { if (r.error) throw r.error; return r; });
    };
    this.claim = function (r) {
      return fetch('api/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room: room, token: token, role: r }) })
        .then(function (x) { return x.json(); }).then(function (x) { if (x.error) throw x.error; self.role = x.role; return x.role; });
    };
  }

  // 本地预览：一台设备上同时扮演两个人
  function LocalHub() {
    var hub = this; this.state = L.initialState('预览'); this.state.joined = { A: true, B: true }; this.state.online = { A: true, B: true };
    this.views = [];
    this.forRole = function (role) {
      var t = { role: role, room: '预览', subs: [] };
      t.subscribe = function (f) { t.subs.push(f); };
      t.connect = function () { setTimeout(function () { hub.push(); }, 0); };
      t.send = function (a) {
        try { hub.state = L.reduce(hub.state, role, a, Date.now()); } catch (e) { return Promise.reject(e); }
        hub.push(); return Promise.resolve({ ok: true });
      };
      t.claim = function () { return Promise.resolve(role); };
      hub.views.push(t); return t;
    };
    this.push = function () {
      hub.views.forEach(function (t) {
        var v = L.viewFor(hub.state, t.role); v.taken = { A: true, B: true };
        t.subs.forEach(function (f) { f(v); });
      });
    };
  }

  // ---------- 一个玩家的画面 ----------
  function GameView(root, tr) {
    this.root = root; this.tr = tr; this.s = null; this.key = null; this.screen = null;
    this.lastEmote = 0; this.emoteLog = [];
    root.classList.add('game');
    this.bgEl = h('div', { class: 'bg' });
    this.stage = h('div', { class: 'stage' });
    this.top = h('div', { class: 'topbar' });
    this.banner = h('div', { class: 'banner' });
    this.log = h('div', { class: 'emote-log' });
    this.fx = h('div', { class: 'fx' });
    this.toast = h('div', { class: 'toast' });
    [this.bgEl, this.stage, this.top, this.banner, this.log, this.fx, this.toast].forEach(function (e) { root.appendChild(e); });
    var self = this;
    tr.subscribe(function (s) { self.onState(s); });
    tr.connect();
  }
  var G = GameView.prototype;

  G.say = function (msg) {
    var t = this.toast; t.textContent = this.s ? fmt(msg, this.s) : msg; t.classList.add('show');
    clearTimeout(this._tt); this._tt = setTimeout(function () { t.classList.remove('show'); }, 2600);
  };
  G.send = function (a) {
    var self = this;
    if (this.s && this.s.node && !a.node) a.node = this.s.node;
    return this.tr.send(a).catch(function (e) { self.say(String(e)); throw e; });
  };
  G.act = function (a) { this.send(a).catch(function () { }); };
  G.role = function () { return this.tr.role; };
  G.partner = function () { return this.role() ? OTHER[this.role()] : null; };
  G.chapter = function () { return this.s ? STORY[this.s.chapter] : null; };

  G.onState = function (s) {
    if (!s) { this.top.classList.add('offline'); return; }
    this.top.classList.remove('offline');
    var prev = this.s; this.s = s;
    if (this.tr.save && this.role()) this.tr.save(s);
    if (s.emote && s.emote.t !== this.lastEmote) {
      var first = this.lastEmote === 0; this.lastEmote = s.emote.t;
      if (!first) this.floatEmote(s.emote.kind, s.emote.from === this.role());
    }
    var key = s.phase === 'lobby' ? 'lobby' : s.chapter + '/' + s.node;
    if (!this.role()) key = 'pick';
    this.renderTop();
    var ch = this.chapter();
    var showBanner = s.phase === 'play' && ch && ch.banner && this.role();
    this.banner.textContent = showBanner ? ch.banner : '';
    this.banner.classList.toggle('show', !!showBanner);
    this.root.classList.toggle('many-emotes', !!(s.phase === 'play' && ch && ch.emotes && ch.emotes.length > 6));
    if (key !== this.key) { this.key = key; this.build(s, prev); }
    else if (this.screen && this.screen.update) this.screen.update(s, prev);
  };

  G.setBg = function (k) {
    if (this.bgKey === k) return; this.bgKey = k;
    var old = this.bgEl.querySelectorAll('.bg-layer');
    var n = h('div', { class: 'bg-layer', html: Art.bg(k) });
    this.bgEl.appendChild(n);
    requestAnimationFrame(function () { requestAnimationFrame(function () { n.classList.add('in'); }); });
    setTimeout(function () { for (var i = 0; i < old.length; i++) old[i].remove(); }, 1000);
  };

  G.renderTop = function () {
    var s = this.s, me = this.role(), self = this;
    this.top.innerHTML = '';
    var p = this.partner();
    this.top.appendChild(p ? h('div', { class: 'who' }, [
      h('span', { class: 'dot ' + (s.online[p] ? 'on' : '') }),
      h('span', { text: s.names[p] + (s.online[p] ? ' 在线' : ' 不在线') })
    ]) : h('div', { class: 'who', text: '房间 ' + s.room }));
    var em = h('div', { class: 'emotes' });
    var ch = this.chapter();
    if (me && s.phase === 'play') ((ch && ch.emotes) || DEFAULT_EMOTES).forEach(function (k) {
      em.appendChild(h('button', { class: 'emo', text: k, 'aria-label': '发送表情 ' + k, onclick: function (e) { e.stopPropagation(); self.act({ type: 'emote', kind: k }); } }));
    });
    this.top.appendChild(em);
    this.top.appendChild(h('button', { class: 'menu-btn', text: '☰', 'aria-label': '菜单', onclick: function (e) { e.stopPropagation(); self.menu(); } }));
  };

  G.menu = function () {
    var self = this, s = this.s;
    var box;
    var chapters = s.phase === 'play' ? h('div', { class: 'ch-list' }, L.CHAPTERS.map(function (c) {
      var open = s.unlocked.indexOf(c) >= 0;
      return h('button', { class: 'ch-item' + (c === s.chapter ? ' cur' : ''), disabled: open ? null : 'disabled', text: open ? STORY[c].title : '？？？', onclick: function () {
        box.remove(); self.ask('两个人都会跳到「' + STORY[c].title + '」的开头，确定吗？', function () { self.act({ type: 'goto', chapter: c }); });
      } });
    })) : null;
    box = h('div', { class: 'overlay', onclick: function (e) { if (e.target === box) box.remove(); } }, [
      h('div', { class: 'panel' }, [
        h('h3', { text: '菜单' }),
        h('p', { class: 'muted small', text: '房间号 ' + s.room + '，下次用同一个房间号就能接着玩。' }),
        chapters ? h('div', { class: 'muted small', text: '章节（已解锁的可以重玩）' }) : null,
        chapters,
        h('button', { class: 'btn', text: Sound.muted ? '打开声音' : '关闭声音', onclick: function () { Sound.toggle(); box.remove(); } }),
        h('button', { class: 'btn ghost', text: '关闭', onclick: function () { box.remove(); } })
      ])
    ]);
    this.root.appendChild(box);
  };

  G.ask = function (q, yes) {
    var box = h('div', { class: 'overlay' }, [h('div', { class: 'panel' }, [
      h('p', { text: q }),
      h('button', { class: 'btn', text: '确定', onclick: function () { box.remove(); yes(); } }),
      h('button', { class: 'btn ghost', text: '取消', onclick: function () { box.remove(); } })
    ])]);
    this.root.appendChild(box);
  };

  G.floatEmote = function (k, mine) {
    var e = h('div', { class: 'float-emo' + (mine ? ' mine' : ''), text: k });
    e.style.left = (20 + Math.random() * 60) + '%';
    this.fx.appendChild(e);
    setTimeout(function () { e.remove(); }, 2400);
    if (mine) return;
    Sound.ping();
    // 对方最近发的表情排成一行，方便看清箭头和颜色的顺序
    this.emoteLog.push(k); if (this.emoteLog.length > 8) this.emoteLog.shift();
    this.log.innerHTML = '';
    this.log.appendChild(h('span', { class: 'log-label', text: this.s.names[this.partner()] + '：' }));
    var self = this;
    this.emoteLog.forEach(function (x, i) { self.log.appendChild(h('span', { class: 'log-item' + (i === self.emoteLog.length - 1 ? ' new' : ''), text: x })); });
    this.log.classList.add('show');
    clearTimeout(this._lt); this._lt = setTimeout(function () { self.log.classList.remove('show'); self.emoteLog = []; }, 12000);
  };

  G.burst = function () {
    for (var i = 0; i < 26; i++) {
      var p = h('div', { class: 'spark' });
      p.style.left = '50%'; p.style.top = '45%';
      p.style.setProperty('--dx', (Math.random() * 2 - 1) * 180 + 'px');
      p.style.setProperty('--dy', (Math.random() * 2 - 1) * 220 + 'px');
      p.style.animationDelay = Math.random() * 0.2 + 's';
      this.fx.appendChild(p);
      (function (p) { setTimeout(function () { p.remove(); }, 1600); })(p);
    }
  };

  G.build = function (s, prev) {
    this.stage.innerHTML = ''; this.stage.onclick = null; this.screen = null;
    if (this.key === 'pick') return this.buildPick(s);
    if (s.phase === 'lobby') return this.buildLobby(s);
    var node = STORY[s.chapter].nodes[s.node];
    var bg = node.bg ? node.bg[this.role()] : null;
    if (bg) this.setBg(bg);
    if (prev && prev.phase === 'play' && (prev.node !== s.node || prev.chapter !== s.chapter)) {
      var pn = STORY[prev.chapter].nodes[prev.node];
      if (pn && pn.type === 'puzzle' && s.solvedAt !== prev.solvedAt) { Sound.win(); this.burst(); } else Sound.chime();
    }
    var b = { dialog: this.buildDialog, choice: this.buildChoice, puzzle: this.buildPuzzle, end: this.buildEnd }[node.type];
    this.screen = b.call(this, s, node) || null;
  };

  // ---------- 选角色 ----------
  G.buildPick = function (s) {
    var self = this;
    this.setBg('dawn');
    var card = function (r, place, job) {
      var taken = s.taken && s.taken[r];
      return h('button', { class: 'role-card r' + r + (taken ? ' taken' : ''), onclick: function () {
        if (taken) return;
        self.tr.claim(r).then(function () { self.key = null; self.onState(self.s); }).catch(function (e) { self.say(String(e)); });
      } }, [
        h('div', { class: 'portrait big', style: 'background:' + Art.CAST[r].color, text: Art.CAST[r].emoji }),
        h('b', { text: place }), h('small', { text: job }), h('small', { class: 'muted', text: taken ? '已被选' : '点我选这个' })
      ]);
    };
    this.stage.appendChild(h('div', { class: 'center-col' }, [
      h('div', { class: 'title-sm', text: '房间 ' + s.room }),
      h('p', { class: 'hint-line', text: '两个人各选一边。你们会在不同的地方醒来。' }),
      h('div', { class: 'role-row' }, [card('A', '晨岸', '飞艇邮局的邮差'), card('B', '暮港', '钟表铺的学徒')]),
      h('p', { class: 'muted small', text: '把房间号 ' + s.room + ' 告诉对方，对方打开同一个网址输入它就能进来。' })
    ]));
  };

  // ---------- 准备大厅 ----------
  G.buildLobby = function (s) {
    var self = this, me = this.role(), p = OTHER[me];
    this.setBg(me === 'A' ? 'dawn' : 'dusk');
    var input = h('input', { id: 'name-' + me, class: 'name-in', maxlength: '8', value: s.names[me] });
    input.addEventListener('change', function () { self.act({ type: 'name', name: input.value }); });
    var status = h('p', { class: 'hint-line' });
    var go = h('button', { class: 'btn big', text: '准备好了', onclick: function () { self.send({ type: 'name', name: input.value }).then(function () { self.act({ type: 'start' }); }).catch(function () { }); } });
    this.stage.appendChild(h('div', { class: 'center-col' }, [
      h('div', { class: 'logo', text: '两端的灯' }),
      h('div', { class: 'title-sm', text: '你在' + (me === 'A' ? '晨岸，是一名飞艇邮差' : '暮港，是一名钟表铺学徒') }),
      h('label', { class: 'muted small', for: 'name-' + me, text: '给你的角色起个名字' }), input,
      go, status,
      h('p', { class: 'muted small', text: '建议边打语音边玩。你们看到的画面不一样，要靠互相描述来解谜。' })
    ]));
    var upd = function (s) {
      status.textContent = !s.joined[p] ? '等对方加入房间 ' + s.room + '…' : s.names[p] + (s.ready[p] ? ' 已经准备好了' : ' 还在准备');
      if (s.ready[me]) { go.disabled = true; go.textContent = '等待对方…'; }
    };
    upd(s);
    return { update: upd };
  };

  // ---------- 对话 ----------
  G.buildDialog = function (s, node) {
    var self = this, me = this.role(), p = OTHER[me];
    var lines = [].concat(node.both || [], (node.lines && node.lines[me]) || [], node.tail || []).filter(function (ln) { return lineVisible(ln, s); });
    var C = window.CUSTOM;
    if (node.custom && C && C[node.custom] && C[node.custom].length) {
      lines = lines.concat([['narr', '灯桥正中间的栏杆上，系着一封信。']]).concat(C[node.custom].map(function (t) { return ['letter', t]; }));
      if (C.signature) lines.push(['letter', '—— ' + C.signature]);
    }
    var memKey = 'lamp-line-' + s.room + '-' + me + '-' + s.chapter + '-' + s.node;
    var i = Math.min(store(memKey) || 0, lines.length - 1);
    var portrait = h('div', { class: 'portrait' });
    var nameTag = h('div', { class: 'name-tag' });
    var text = h('div', { class: 'line' });
    var more = h('div', { class: 'more', text: '▼' });
    var counter = h('div', { class: 'counter' });
    var box = h('div', { class: 'dialog' }, [portrait, nameTag, text, more, counter]);
    var wait = h('div', { class: 'wait' });
    this.stage.appendChild(wait);
    this.stage.appendChild(box);
    var typing = null, full = '', done = !!s.ready[me];

    function show() {
      var ln = lines[i], who = ln[0], cast = Art.CAST[who];
      box.className = 'dialog ' + (who === 'narr' ? 'narr' : who === 'letter' ? 'letter' : who === me ? 'me' : 'other');
      portrait.style.display = cast ? '' : 'none';
      if (cast) { portrait.textContent = cast.emoji; portrait.style.background = cast.color; }
      nameTag.textContent = speakerName(who, self.s);
      nameTag.style.display = nameTag.textContent ? '' : 'none';
      counter.textContent = (i + 1) + '/' + lines.length;
      full = fmt(ln[1], self.s);
      var n = 0; text.textContent = ''; more.style.visibility = 'hidden';
      clearInterval(typing);
      typing = setInterval(function () {
        n++; text.textContent = full.slice(0, n);
        if (n % 2) Sound.blip();
        if (n >= full.length) { clearInterval(typing); typing = null; more.style.visibility = 'visible'; }
      }, 30);
    }
    function advance() {
      if (done) return;
      if (typing) { clearInterval(typing); typing = null; text.textContent = full; more.style.visibility = 'visible'; return; }
      Sound.tap();
      if (i < lines.length - 1) { i++; store(memKey, i); show(); }
      else {
        done = true; store(memKey, 0);
        self.send({ type: 'ready', node: s.node }).catch(function () { done = false; });
        upd(self.s);
      }
    }
    this.stage.onclick = function (e) { if (e.target.closest('button,input')) return; advance(); };
    function upd(s) {
      if (s.ready[me] || done) {
        done = true;
        wait.textContent = s.ready[p] ? '' : '你读完了，等 ' + s.names[p] + ' 读完…';
        wait.classList.toggle('show', !s.ready[p]);
      } else {
        wait.textContent = s.ready[p] ? s.names[p] + ' 已经读完了，在等你' : '';
        wait.classList.toggle('show', !!s.ready[p]);
      }
    }
    show(); upd(s);
    if (done) { clearInterval(typing); typing = null; text.textContent = full; }
    return { update: upd };
  };

  // ---------- 一起做选择 ----------
  G.pickList = function (options, getPick, onPick) {
    var self = this, me = this.role(), p = OTHER[me], btns = {};
    var list = h('div', { class: 'choices' });
    options.forEach(function (o) {
      var b = h('button', { class: 'choice', onclick: function () { Sound.tap(); onPick(o.id); } }, [
        h('span', { text: fmt(o.text, self.s) }), h('span', { class: 'marks' })
      ]);
      btns[o.id] = b; list.appendChild(b);
    });
    list.update = function (s) {
      var pk = getPick(s);
      for (var id in btns) {
        var m = btns[id].querySelector('.marks'); m.textContent = '';
        btns[id].classList.toggle('picked', pk[me] === id);
        if (pk[me] === id) m.textContent += ' ' + Art.CAST[me].emoji;
        if (pk[p] === id) m.textContent += ' ' + Art.CAST[p].emoji;
      }
    };
    return list;
  };

  G.buildChoice = function (s, node) {
    var self = this, me = this.role(), p = OTHER[me];
    var info = h('p', { class: 'hint-line' });
    var list = this.pickList(node.options, function (s) { return s.choice; }, function (id) { self.act({ type: 'choose', node: s.node, option: id }); });
    this.stage.appendChild(h('div', { class: 'center-col' }, [
      h('div', { class: 'prompt', text: fmt(node.prompt, s) }),
      h('p', { class: 'muted small', text: '两个人要选同一个才算数' }),
      list, info
    ]));
    function upd(s) {
      list.update(s);
      if (s.choice[me] && s.choice[p] && s.choice[me] !== s.choice[p]) info.textContent = '你们选得不一样，商量一下吧';
      else if (s.choice[me]) info.textContent = '等 ' + s.names[p] + ' 选…';
      else if (s.choice[p]) info.textContent = s.names[p] + ' 已经选好了';
      else info.textContent = '';
    }
    upd(s);
    return { update: upd };
  };

  // ---------- 谜题通用外壳 ----------
  // 每种谜题默认的标题和提示。seer = 看信息的一方，doer = 动手的一方
  var KIND_TEXT = {
    constellation: {
      seer: { title: '四个星座', sub: '把它们的样子描述给 {P} 听', hints: ['一个一个来，先说第一个，等对方确认了再说下一个。', '星星有几颗、连成什么形状，都是好线索。', '两边的星空可能是上下颠倒的。'] },
      doer: { title: '转动星环', sub: '转成和 {P} 描述的一样，然后让灯试一试', hints: ['「让灯试一试」会告诉你对了几个。', '你看到的图案可能和对方是上下颠倒的。'] }
    },
    manual: {
      seer: { hints: ['规则从第一条开始往下看，第一条符合的就照做，后面的不用管。', '你需要知道：小灯颜色、齿轮几个、顶上的图案、按钮从左到右的顺序。'] },
      doer: { hints: ['把机关完整地描述给对方：小灯颜色、齿轮数量、顶上的图案、按钮从左到右的顺序。', '按错不会有惩罚，只是要从头再连对三次。'] }
    },
    maze: {
      guide: { hints: ['一次只说一两步，比如「往右走两格，再往下」。', '要先拿到地图上所有的 ✨，出口才会打开。', '踩到危险的地方会被送回起点，不会受伤。'] },
      mover: { hints: ['你只看得清身边一格，完全照着对方说的走。', '走一步报一声，对方就不容易跟丢。'] }
    },
    cipher: {
      seer: { hints: ['每个符号都是「外框 + 里面一个记号」。', '先说外框（圆、三角、方、菱形），再说里面是什么（点、横线、十字、小圈）。'] },
      doer: { hints: ['在对照表里先找外框，再找里面的记号。', '点错了可以按「退一格」。'] }
    },
    simon: {
      seer: { title: '闪烁的光', sub: '记下颜色的顺序告诉 {P}', hints: ['可以先自己默念一遍再说，比如「红、蓝、蓝、黄」。', '看不清的话点「再闪一次」。'] },
      doer: { title: '按顺序按下', sub: '照 {P} 说的颜色顺序按', hints: ['让对方一次说完整串再按。按错会从这一串的开头重来。'] }
    },
    sync: { both: { hints: ['大声数「一、二、三」，在「三」的时候一起按。', '不要看到对方按了再按，那样会慢半拍。'] } },
    diff: { both: { hints: ['从左上角开始，一行一行念出来：「第一行：苹果、梨……」', '点错了没关系，只会抖一下。'] } },
    switches: {
      seer: { hints: ['每根拉杆会让它连着的灯都翻转：亮的变灭，灭的变亮。', '问清楚对方哪几盏灯和目标不一样，再一起算该拉哪几根。'] },
      doer: { hints: ['告诉对方哪几盏灯现在和目标不一样。', '同一根拉杆拉两次等于没拉。'] }
    },
    song: { both: { hints: ['轮到谁谁弹。你只看得到自己的音，对方的音是问号。', '弹错会从头开始，慢一点没关系。'] } },
    riddle: { both: { hints: ['把你看到的线索全部念给对方听。', '两个人的线索要合起来才能得出答案。'] } }
  };
  function sideOf(node, me) {
    switch (node.kind) {
      case 'maze': return me === node.mover ? 'mover' : 'guide';
      case 'constellation': case 'simon': case 'cipher': case 'switches': case 'manual': return me === (node.seer || 'A') ? 'seer' : 'doer';
      default: return 'both';
    }
  }

  G.buildPuzzle = function (s, node) {
    var self = this, me = this.role(), side = sideOf(node, me);
    var kt = (KIND_TEXT[node.kind] || {})[side] || {};
    var ui = (node.ui && node.ui[me]) || {};
    var wrap = h('div', { class: 'puzzle kind-' + node.kind });
    var P = s.names[OTHER[me]];
    var title = ui.title || kt.title, sub = ui.sub || kt.sub;
    if (node.kind === 'manual') {
      var M = L.MANUALS[node.manual];
      title = title || (side === 'seer' ? M.title : M.device);
      sub = sub || (side === 'seer' ? '听 {P} 描述机关，告诉对方该按哪个按钮' : '把机关的样子描述给 {P}，按对方说的按钮');
    }
    if (title) wrap.appendChild(h('div', { class: 'p-title', text: fmt(title, s).replace(/\{P\}/g, P) }));
    if (sub) wrap.appendChild(h('div', { class: 'p-sub', text: fmt(sub, s).replace(/\{P\}/g, P) }));
    var body = h('div', { class: 'p-body' });
    var msg = h('p', { class: 'hint-line p-msg' });
    wrap.appendChild(body); wrap.appendChild(msg);
    var hints = (node.hints && node.hints[me]) || kt.hints || [];
    if (hints.length) {
      var n = 0;
      wrap.appendChild(h('button', { class: 'hint-btn', text: '💡 提示', onclick: function () {
        var who = me === 'A' ? '团子' : '齿轮';
        self.showHint(who + '：' + fmt(hints[Math.min(n, hints.length - 1)], self.s));
        n = Math.min(n + 1, hints.length - 1);
      } }));
    }
    this.stage.appendChild(wrap);
    var ctx = { wrap: wrap, body: body, msg: msg, node: node, me: me, side: side, say: function (t) { msg.textContent = fmt(t, self.s); } };
    return this['pz_' + node.kind].call(this, s, ctx);
  };
  G.showHint = function (t) {
    var box = h('div', { class: 'overlay', onclick: function () { box.remove(); } }, [h('div', { class: 'panel hint-panel' }, [h('p', { text: t }), h('small', { class: 'muted', text: '点任意处关闭' })])]);
    this.root.appendChild(box);
  };
  function pips(el, n, total) {
    el.innerHTML = '';
    for (var i = 0; i < total; i++) el.appendChild(h('span', { class: 'pip' + (i < n ? ' on' : '') }));
  }

  // ---------- 星座 ----------
  G.pz_constellation = function (s, c) {
    var self = this, C = L.CONSTELLATIONS, seer = c.side === 'seer';
    var area = h('div', { class: 'slots' }); c.body.appendChild(area);
    var slots = [];
    var p0 = s.puzzle;
    for (var i = 0; i < p0.dials.length; i++) (function (i) {
      var pic = h('div', { class: 'slot-pic' });
      var kids = [h('div', { class: 'slot-n', text: String(i + 1) })];
      if (!seer) kids.push(h('button', { class: 'arrow', text: '▲', 'aria-label': '上一个', onclick: function () { Sound.blip(); self.act({ type: 'dial', i: i, dir: -1 }); } }));
      kids.push(pic);
      if (!seer) kids.push(h('button', { class: 'arrow', text: '▼', 'aria-label': '下一个', onclick: function () { Sound.blip(); self.act({ type: 'dial', i: i, dir: 1 }); } }));
      area.appendChild(h('div', { class: 'slot' + (seer ? '' : ' dial') }, kids));
      slots.push(pic);
    })(i);
    c.body.appendChild(h('button', { class: 'btn', text: '让灯试一试', onclick: function () { Sound.tap(); self.act({ type: 'try' }); } }));
    var lastTries = p0.tries;
    function upd(s) {
      var p = s.puzzle; if (!p) return;
      if (seer) p.target.forEach(function (t, i) { slots[i].innerHTML = Art.constellationSVG(C[p.pool[t]], false); });
      else p.dials.forEach(function (d, i) { slots[i].innerHTML = Art.constellationSVG(C[p.pool[d]], true); });
      c.say(p.lastCorrect !== null && p.lastCorrect < p.dials.length ? '灯闪了 ' + p.lastCorrect + ' 下：有 ' + p.lastCorrect + ' 个对上了' : '');
      if (p.tries !== lastTries) { lastTries = p.tries; Sound.wrong(); shake(c.wrap); }
    }
    upd(s);
    return { update: upd };
  };

  // ---------- 说明书 ----------
  G.pz_manual = function (s, c) {
    var self = this, M = L.MANUALS[c.node.manual];
    var prog = h('div', { class: 'progress' }); c.body.appendChild(prog);
    if (c.side === 'seer') {
      c.body.appendChild(h('div', { class: 'manual' }, [
        h('p', { class: 'small', text: M.intro }),
        h('ol', {}, M.rules.map(function (r) { return h('li', { text: r }); }))
      ]));
    }
    var dev = h('div', { class: 'lock' });
    if (c.side === 'doer') c.body.appendChild(dev);
    var lastAt = s.puzzle.lastAt;
    function upd(s) {
      var p = s.puzzle; if (!p) return;
      pips(prog, p.round, p.rounds);
      if (p.lastAt !== lastAt) {
        lastAt = p.lastAt;
        if (p.last === 'bad') { Sound.wrong(); shake(c.wrap); c.say(c.node.manual === 'lock' ? '阿嚏！齿轮打了个大喷嚏，机关换了样子，要从头再连对三次。' : '「噗」地冒出一股白烟，机关换了样子，要从头再连对三次。'); }
        else if (p.last === 'ok') { Sound.chime(); c.say('咔哒！对了一次。机关换了一种样子。'); }
      }
      if (c.side === 'doer' && p.cfg) {
        var g = p.cfg;
        dev.innerHTML = '';
        dev.appendChild(h('div', { class: 'lock-top' }, [
          h('div', { class: 'lock-light', title: g.light, style: 'background:' + Art.LIGHT_COLOR[g.light] + ';box-shadow:0 0 18px ' + Art.LIGHT_COLOR[g.light] }),
          h('div', { class: 'lock-symbol', text: Art.SYMBOL_ICON[g.top] })
        ]));
        dev.appendChild(h('div', { class: 'lock-gears', html: Art.gearsSVG(g.gears) }));
        var row = h('div', { class: 'lock-btns' });
        g.buttons.forEach(function (b, i) {
          row.appendChild(h('button', { class: 'lock-btn', text: Art.SYMBOL_ICON[b], 'aria-label': b, onclick: function () { Sound.tap(); self.act({ type: 'press', i: i }); } }));
        });
        dev.appendChild(row);
      }
    }
    upd(s);
    return { update: upd };
  };

  // ---------- 迷宫 ----------
  var MAZE_ICON = { k: '✨', x: '🌀', G: '🚩', '>': '➡️', '<': '⬅️', '^': '⬆️', 'v': '⬇️' };
  G.pz_maze = function (s, c) {
    var self = this, n = c.node, g = n.grid, mover = n.mover;
    var board = h('div', { class: 'maze' }); c.body.appendChild(board);
    var labels = n.labels || {};
    if (c.side === 'guide') {
      var legend = h('div', { class: 'legend' });
      var seen = {};
      ['k', 'x', '>', 'G'].forEach(function (k) {
        if (!labels[k] || seen[labels[k]]) return; seen[labels[k]] = 1;
        legend.appendChild(h('span', {}, [h('b', { text: k === '>' ? '➡️' : MAZE_ICON[k] }), ' ' + labels[k]]));
      });
      legend.appendChild(h('span', {}, [h('b', { text: Art.CAST[mover].emoji }), ' ' + s.names[mover]]));
      c.body.appendChild(legend);
    } else {
      var pad = h('div', { class: 'dpad' });
      [['up', '⬆'], ['left', '⬅'], ['right', '➡'], ['down', '⬇']].forEach(function (d) {
        pad.appendChild(h('button', { class: 'dp dp-' + d[0], text: d[1], 'aria-label': d[0], onclick: function () { Sound.blip(); self.act({ type: 'move', dir: d[0] }); } }));
      });
      c.body.appendChild(pad);
    }
    var lastAt = s.puzzle.lastAt;
    function cellEl(ch, r, col, p) {
      var got = p.got.indexOf(r + ',' + col) >= 0;
      var cls = 'mc' + (ch === '#' ? ' wall' : '') + (ch === 'x' ? ' haz' : '') + ('<>^v'.indexOf(ch) >= 0 ? ' cur' : '');
      var icon = (ch === '#' || ch === '.' || ch === 'S' || (ch === 'k' && got)) ? '' : (MAZE_ICON[ch] || '');
      if (p.pos[0] === r && p.pos[1] === col) { cls += ' me'; icon = Art.CAST[mover].emoji; }
      return h('div', { class: cls, text: icon });
    }
    var need = 0; g.forEach(function (row) { need += row.split('k').length - 1; });
    function upd(s) {
      var p = s.puzzle; if (!p) return;
      board.innerHTML = '';
      if (c.side === 'guide') {
        board.className = 'maze full';
        board.style.gridTemplateColumns = 'repeat(' + g[0].length + ', 1fr)';
        g.forEach(function (row, r) { for (var col = 0; col < row.length; col++) board.appendChild(cellEl(row[col], r, col, p)); });
      } else {
        board.className = 'maze near';
        board.style.gridTemplateColumns = 'repeat(3, 1fr)';
        for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
          var r = p.pos[0] + dr, col = p.pos[1] + dc;
          board.appendChild(cellEl((g[r] && g[r][col]) || '#', r, col, p));
        }
      }
      var status = need ? '已拿到 ' + p.got.length + '/' + need + ' 个「' + (labels.k || '东西') + '」' : '';
      if (p.lastAt !== lastAt) {
        lastAt = p.lastAt;
        var m = {
          wall: '咚，前面走不通。', hazard: '哎呀！是' + (labels.x || '危险的地方') + '，被送回了起点。', key: '拿到了「' + (labels.k || '东西') + '」！',
          current: '被' + (labels['>'] || labels.v || '水流') + '推着多走了一格。', locked: '还没拿齐，出口还打不开。'
        }[p.last];
        if (p.last === 'hazard' || p.last === 'wall') { Sound.wrong(); if (p.last === 'hazard') shake(c.wrap); }
        if (p.last === 'key') Sound.chime();
        c.say((m ? m + ' ' : '') + status);
      } else c.say(status);
    }
    upd(s);
    return { update: upd };
  };

  // ---------- 密文 ----------
  G.pz_cipher = function (s, c) {
    var self = this, seer = c.side === 'seer';
    if (seer) {
      var row = h('div', { class: 'glyph-row' });
      s.puzzle.msg.forEach(function (gid, i) { row.appendChild(h('div', { class: 'glyph-cell' }, [h('div', { class: 'gnum', text: String(i + 1) }), h('div', { html: Art.glyphSVG(gid) })])); });
      c.body.appendChild(row);
    }
    var out = h('div', { class: 'cipher-out' }); c.body.appendChild(out);
    if (!seer) {
      var book = h('div', { class: 'codebook' });
      var entries = s.puzzle.chars.map(function (ch) { return { ch: ch, g: s.puzzle.map[ch] }; }).sort(function (a, b) { return a.g - b.g; });
      entries.forEach(function (e) {
        book.appendChild(h('button', { class: 'code-entry', 'aria-label': e.ch, onclick: function () { Sound.blip(); self.act({ type: 'tile', ch: e.ch }); } }, [h('div', { html: Art.glyphSVG(e.g) }), h('span', { text: e.ch })]));
      });
      c.body.appendChild(book);
      c.body.appendChild(h('button', { class: 'btn ghost small-btn', text: '退一格', onclick: function () { self.act({ type: 'undo' }); } }));
    }
    var wrongAt = s.puzzle.wrongAt;
    function upd(s) {
      var p = s.puzzle; if (!p) return;
      out.innerHTML = '';
      for (var i = 0; i < p.len; i++) out.appendChild(h('div', { class: 'char-slot' + (p.input[i] ? ' filled' : ''), text: p.input[i] || '' }));
      if (p.wrongAt !== wrongAt) { wrongAt = p.wrongAt; Sound.wrong(); shake(c.wrap); c.say('这句话读不通，字块清空了，再试一次。'); }
    }
    upd(s);
    return { update: upd };
  };

  // ---------- 闪光记忆 ----------
  G.pz_simon = function (s, c) {
    var self = this, seer = c.side === 'seer';
    var prog = h('div', { class: 'progress' }); c.body.appendChild(prog);
    var lamps = h('div', { class: 'simon' }); c.body.appendChild(lamps);
    var els = Art.SIMON.map(function (x, i) {
      var b = h(seer ? 'div' : 'button', { class: 'simon-lamp', style: '--c:' + x.color, 'aria-label': x.name, onclick: seer ? null : function () { self.act({ type: 'press', i: i }); } }, [h('span', { text: x.name })]);
      lamps.appendChild(b); return b;
    });
    var counter = h('div', { class: 'simon-count' }); c.body.appendChild(counter);
    if (seer) c.body.appendChild(h('button', { class: 'btn ghost', text: '再闪一次', onclick: function () { self.act({ type: 'replay' }); } }));
    function flash(i, dur) {
      var e = els[i]; if (!e) return;
      e.classList.add('lit'); Sound.lamp(i);
      setTimeout(function () { e.classList.remove('lit'); }, dur || 380);
    }
    var timers = [];
    function play(seq) {
      timers.forEach(clearTimeout); timers = [];
      seq.forEach(function (k, j) { timers.push(setTimeout(function () { flash(k, 450); }, 700 + j * 700)); });
    }
    var shown = 0, lastFlash = s.puzzle.flash ? s.puzzle.flash.t : 0, wrongAt = s.puzzle.wrongAt;
    function upd(s) {
      var p = s.puzzle; if (!p) return;
      pips(prog, p.round, p.rounds.length);
      counter.textContent = '这一串共 ' + p.seq.length + ' 个，已按对 ' + p.input + ' 个';
      if (p.flash && p.flash.t !== lastFlash) { lastFlash = p.flash.t; flash(p.flash.k, 250); }
      if (p.wrongAt !== wrongAt) { wrongAt = p.wrongAt; Sound.wrong(); shake(c.wrap); c.say('按错了，这一串从头再来。'); }
      if (seer && p.show !== shown) { shown = p.show; play(p.seq); }
    }
    upd(s);
    return { update: upd };
  };

  // ---------- 同时按 ----------
  G.pz_sync = function (s, c) {
    var self = this, ui = (c.node.ui && c.node.ui[c.me]) || {};
    var prog = h('div', { class: 'progress' }); c.body.appendChild(prog);
    var btn = h('button', { class: 'sync-btn', text: ui.button || '一起按！', onclick: function () {
      Sound.tap(); btn.classList.add('pressed'); setTimeout(function () { btn.classList.remove('pressed'); }, 400);
      self.act({ type: 'press' });
    } });
    c.body.appendChild(btn);
    var lastAt = s.puzzle.lastAt;
    function upd(s) {
      var p = s.puzzle; if (!p) return;
      pips(prog, p.round, p.rounds);
      if (p.lastAt !== lastAt) {
        lastAt = p.lastAt;
        if (p.last === 'ok') { Sound.chime(); c.say('同时！还要 ' + (p.rounds - p.round) + ' 次。'); }
        else if (p.last === 'miss') { Sound.wrong(); shake(c.wrap); c.say('差了一点点，没对上。再数一次！'); }
      }
    }
    upd(s);
    return { update: upd };
  };

  // ---------- 找不同 ----------
  G.pz_diff = function (s, c) {
    var self = this, n = c.node;
    var grid = h('div', { class: 'diff-grid', style: 'grid-template-columns:repeat(' + (n.w || 5) + ',1fr)' });
    c.body.appendChild(grid);
    var items = s.puzzle.a || s.puzzle.b;
    var cells = items.map(function (it, i) {
      var e = h('button', { class: 'diff-cell', text: it, onclick: function () { self.act({ type: 'tap', i: i }); } });
      grid.appendChild(e); return e;
    });
    var wrongAt = s.puzzle.wrongAt, found = s.puzzle.found.length;
    function upd(s) {
      var p = s.puzzle; if (!p) return;
      cells.forEach(function (e, i) { e.classList.toggle('found', p.found.indexOf(i) >= 0); });
      c.say('找到 ' + p.found.length + '/' + (n.diffs || 3) + ' 处');
      if (p.found.length > found) { found = p.found.length; Sound.chime(); }
      if (p.wrongAt !== wrongAt) { wrongAt = p.wrongAt; Sound.wrong(); if (cells[p.wrongI]) shake(cells[p.wrongI]); }
    }
    upd(s);
    return { update: upd };
  };

  // ---------- 拉杆与灯 ----------
  G.pz_switches = function (s, c) {
    var self = this, seer = c.side === 'seer';
    var area = h('div', { class: 'sw' }); c.body.appendChild(area);
    function lampRow(states, label) {
      var r = h('div', { class: 'lamp-row' }, [h('span', { class: 'row-label', text: label })]);
      states.forEach(function (on, i) { r.appendChild(h('div', { class: 'lampx' + (on ? ' on' : '') }, [h('small', { text: String(i + 1) })])); });
      return r;
    }
    function upd(s) {
      var p = s.puzzle; if (!p) return;
      area.innerHTML = '';
      if (seer) {
        var t = h('div', { class: 'wiring' });
        var M = p.levers.length ? Math.max.apply(null, p.wiring.map(function (w) { return Math.max.apply(null, w); })) + 1 : 6;
        M = Math.max(M, c.node.lamps || 6);
        p.wiring.forEach(function (set, i) {
          var row = h('div', { class: 'wire-row' }, [h('span', { class: 'lever-tag' + (p.levers[i] ? ' down' : ''), text: '拉杆 ' + (i + 1) }), h('span', { class: 'wire-arrow', text: '→' })]);
          for (var m = 0; m < M; m++) row.appendChild(h('div', { class: 'lampx tiny' + (set.indexOf(m) >= 0 ? ' linked' : '') }, [h('small', { text: String(m + 1) })]));
          t.appendChild(row);
        });
        area.appendChild(t);
        area.appendChild(h('p', { class: 'muted small', text: '高亮的是这根拉杆连着的灯。拉杆标签变深，表示对方已经拉下了它。' }));
      } else {
        area.appendChild(lampRow(p.target, '目标'));
        area.appendChild(lampRow(p.lamps, '现在'));
        var lv = h('div', { class: 'levers' });
        p.levers.forEach(function (down, i) {
          lv.appendChild(h('button', { class: 'lever' + (down ? ' down' : ''), 'aria-label': '拉杆 ' + (i + 1), onclick: function () { Sound.tap(); self.act({ type: 'flip', i: i }); } }, [h('i'), h('span', { text: String(i + 1) })]));
        });
        area.appendChild(lv);
      }
    }
    upd(s);
    return { update: upd };
  };

  // ---------- 合奏 ----------
  G.pz_song = function (s, c) {
    var self = this, n = c.node, me = c.me, first = n.first || 'A';
    var score = h('div', { class: 'score' }); c.body.appendChild(score);
    var turn = h('div', { class: 'turn' }); c.body.appendChild(turn);
    var keys = h('div', { class: 'keys' }); c.body.appendChild(keys);
    Art.KEYS.forEach(function (k, i) {
      keys.appendChild(h('button', { class: 'key', style: '--c:' + k.color, onclick: function () { self.act({ type: 'key', i: i }); } }, [h('span', { text: k.name })]));
    });
    function owner(i) { return i % 2 === 0 ? first : OTHER[first]; }
    var lastT = s.puzzle.last ? s.puzzle.last.t : 0, wrongAt = s.puzzle.wrongAt;
    function upd(s) {
      var p = s.puzzle; if (!p) return;
      score.innerHTML = '';
      n.notes.forEach(function (k, i) {
        var mine = owner(i) === me, K = Art.KEYS[k], show = mine || i < p.n;
        score.appendChild(h('div', { class: 'note' + (i < p.n ? ' done' : '') + (i === p.n ? ' now' : '') + (mine ? ' mine' : ''), style: show ? '--c:' + K.color : null, text: show ? K.name : '？' }));
      });
      var o = owner(p.n);
      turn.textContent = p.n >= n.notes.length ? '' : (o === me ? '轮到你了：第 ' + (p.n + 1) + ' 个音' : '轮到 ' + s.names[o] + '：第 ' + (p.n + 1) + ' 个音');
      turn.classList.toggle('mine', o === me);
      if (p.last && p.last.t !== lastT) { lastT = p.last.t; Sound.note(Art.KEYS[p.last.k].freq); }
      if (p.wrongAt !== wrongAt) { wrongAt = p.wrongAt; setTimeout(Sound.wrong, 200); shake(c.wrap); c.say('音弹错了，从头再来。'); }
      else if (p.n) c.say('');
    }
    upd(s);
    return { update: upd };
  };

  // ---------- 推理 ----------
  G.pz_riddle = function (s, c) {
    var self = this, n = c.node, me = c.me, p = OTHER[me];
    var clues = h('div', { class: 'clues' });
    (n.clues[me] || []).forEach(function (t, i) { clues.appendChild(h(i === 0 ? 'b' : 'p', { text: fmt(t, s) })); });
    c.body.appendChild(clues);
    c.body.appendChild(h('div', { class: 'question', text: fmt(n.question, s) }));
    var list = this.pickList(n.options, function (s) { return s.puzzle.pick; }, function (id) { self.act({ type: 'pick', option: id }); });
    c.body.appendChild(list);
    var wrongAt = s.puzzle.wrongAt;
    function upd(s) {
      var pz = s.puzzle; if (!pz) return;
      list.update(s);
      if (pz.wrongAt !== wrongAt) { wrongAt = pz.wrongAt; Sound.wrong(); shake(c.wrap); c.say('你们都选了这个，可是好像不对。再对一对线索。'); return; }
      if (pz.pick[me] && pz.pick[p] && pz.pick[me] !== pz.pick[p]) c.say('你们选得不一样，商量一下吧');
      else if (pz.pick[me] && !pz.pick[p]) c.say('等 ' + s.names[p] + ' 选…');
      else if (pz.pick[p] && !pz.pick[me]) c.say(s.names[p] + ' 已经选好了');
    }
    upd(s);
    return { update: upd };
  };

  // ---------- 章节结束 ----------
  G.buildEnd = function (s, node) {
    var self = this, me = this.role(), p = OTHER[me];
    this.setBg(node.final ? 'bridge-lit' : 'dusk-glow');
    this.burst(); Sound.win();
    var info = h('p', { class: 'hint-line' });
    var kids = [
      h('div', { class: 'logo small', text: '两端的灯' }),
      h('div', { class: 'prompt', text: node.final ? node.title : node.title + ' · 完' })
    ];
    var go = null;
    if (node.final) {
      kids.push(h('p', { text: '谢谢你们一起走完了这座桥。' }));
      kids.push(h('p', { class: 'muted small', text: '灯的名字：' + (s.flags.lamp || '') }));
      kids.push(h('button', { class: 'btn ghost', text: '从第一章重温', onclick: function () { self.ask('两个人都会回到第一章，确定吗？', function () { self.act({ type: 'goto', chapter: 'ch1' }); }); } }));
    } else if (node.next) {
      kids.push(h('p', { class: 'muted', text: '下一章：' + STORY[node.next].title }));
      go = h('button', { class: 'btn big', text: '继续下一章', onclick: function () { go.disabled = true; self.send({ type: 'ready', node: s.node }).catch(function () { go.disabled = false; }); } });
      kids.push(go); kids.push(info);
      kids.push(h('p', { class: 'muted small', text: '想休息的话现在就可以关掉，下次用同一个房间号回来，会停在这里。' }));
    }
    this.stage.appendChild(h('div', { class: 'center-col end' }, kids));
    function upd(s) {
      if (!go) return;
      if (s.ready[me]) { go.disabled = true; go.textContent = '等 ' + s.names[p] + '…'; }
      info.textContent = s.ready[p] && !s.ready[me] ? s.names[p] + ' 已经准备好继续了' : '';
    }
    upd(s);
    return { update: upd };
  };

  // ---------- 启动 ----------
  function landing(app) {
    var params = new URLSearchParams(location.search);
    var saved = store('lamp-session');
    app.innerHTML = '';
    var root = h('div', { class: 'game' });
    app.appendChild(root);
    root.appendChild(h('div', { class: 'bg', html: '<div class="bg-layer in">' + Art.bg('dawn-glow') + '</div>' }));
    var codeIn = h('input', { id: 'room-code', class: 'name-in', inputmode: 'numeric', maxlength: '4', placeholder: '输入 4 位房间号', value: params.get('room') || '' });
    var err = h('p', { class: 'hint-line' });
    function join(room, token, role, last, auto) {
      return fetch('api/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room: room, token: token, role: role, restore: last }) })
        .then(function (r) { return r.json(); }).then(function (r) {
          if (r.error) throw r.error;
          if (!saved || saved.room !== r.room || saved.token !== r.token) store('lamp-session', { room: r.room, token: r.token });
          history.replaceState(null, '', '?room=' + r.room);
          app.innerHTML = '';
          var v = h('div', { class: 'single' }); app.appendChild(v);
          new GameView(v, new ServerTransport(r.room, r.token, r.role));
        }).catch(function (e) {
          if (auto) { store('lamp-session', null); saved = null; return landing(app); }
          err.textContent = /fetch|network/i.test(String(e)) ? '连不上服务器，请检查网络' : String(e);
        });
    }
    if (saved && (!params.get('room') || params.get('room') === saved.room)) return join(saved.room, saved.token, saved.role, saved.last, true);
    root.appendChild(h('div', { class: 'stage' }, [h('div', { class: 'center-col' }, [
      h('div', { class: 'logo', text: '两端的灯' }),
      h('p', { class: 'hint-line', text: '一个人在晨岸，一个人在暮港。' }),
      h('button', { class: 'btn big', text: '创建新房间', onclick: function () { join('', null); } }),
      h('div', { class: 'or', text: '或者' }),
      codeIn,
      h('button', { class: 'btn ghost', text: '加入对方的房间', onclick: function () { if (codeIn.value.trim()) join(codeIn.value.trim(), null); } }),
      err
    ])]));
  }

  function preview(app) {
    var hub = new LocalHub();
    window.__hub = hub;
    app.innerHTML = '';
    app.classList.add('preview');
    var tabs = h('div', { class: 'pv-tabs' });
    var row = h('div', { class: 'pv-row' });
    app.appendChild(tabs); app.appendChild(row);
    ['A', 'B'].forEach(function (r, i) {
      var v = h('div', { class: 'pv-cell' + (i === 0 ? ' active' : '') });
      row.appendChild(v);
      var t = h('button', { class: 'pv-tab' + (i === 0 ? ' active' : ''), text: r === 'A' ? '晨岸视角' : '暮港视角', onclick: function () {
        row.querySelectorAll('.pv-cell').forEach(function (c) { c.classList.remove('active'); });
        tabs.querySelectorAll('.pv-tab').forEach(function (c) { c.classList.remove('active'); });
        v.classList.add('active'); t.classList.add('active');
      } });
      tabs.appendChild(t);
      new GameView(v, hub.forRole(r));
    });
  }

  function boot() {
    var app = document.getElementById('app');
    if (window.LAMP_PREVIEW || /[?&]preview/.test(location.search)) preview(app);
    else landing(app);
  }
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', boot); else boot();
})();
