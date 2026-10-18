// 游戏规则（服务器和本地预览共用）。reduce(state, role, action, now) 返回新状态，非法操作抛出字符串。
(function (root) {
  var STORY = root.STORY;
  var OTHER = { A: 'B', B: 'A' };
  var CHAPTERS = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'];

  function rnd(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }
  function newSeq(len, colors) { var s = []; for (var i = 0; i < len; i++) s.push(rnd(colors)); return s; }

  // ================= 谜题素材 =================
  var CONSTELLATIONS = [
    { stars: [[15, 30], [30, 25], [45, 30], [55, 45], [75, 50], [85, 70], [65, 75]], links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] },
    { stars: [[50, 15], [20, 80], [80, 80]], links: [[0, 1], [1, 2], [2, 0]] },
    { stars: [[15, 50], [38, 50], [62, 50], [85, 50]], links: [[0, 1], [1, 2], [2, 3]] },
    { stars: [[30, 10], [60, 40], [35, 55], [70, 90]], links: [[0, 1], [1, 2], [2, 3]] },
    { stars: [[50, 15], [50, 50], [50, 85], [15, 50], [85, 50]], links: [[0, 1], [1, 2], [3, 1], [1, 4]] },
    { stars: [[50, 12], [20, 40], [80, 40], [20, 85], [80, 85]], links: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 4]] },
    { stars: [[30, 12], [30, 45], [30, 75], [50, 88], [72, 75]], links: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    { stars: [[15, 50], [50, 50], [85, 50], [65, 25], [65, 75]], links: [[0, 1], [1, 2], [3, 2], [4, 2]] },
    { stars: [[20, 20], [80, 20], [50, 50], [20, 80], [80, 80]], links: [[0, 2], [1, 2], [2, 3], [2, 4]] },
    { stars: [[50, 15], [80, 50], [50, 85], [20, 50]], links: [[0, 1], [1, 2], [2, 3], [3, 0]] },
    { stars: [[15, 80], [35, 30], [50, 60], [65, 30], [85, 80]], links: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    { stars: [[50, 50], [50, 18], [78, 66], [22, 66]], links: [[0, 1], [0, 2], [0, 3]] }
  ];

  var SYMBOLS = ['太阳', '月亮', '星星', '花'];
  var LIGHTS = ['红色', '蓝色', '金色', '绿色'];
  function idx(c, sym) { return c.buttons.indexOf(sym); }
  var MANUALS = {
    lock: {
      title: '灯匠手册 · 第三页', device: '铜匣锁',
      intro: '开启铜匣时，自第一条起依次查看，遇到第一条相符的便照做，余下不必理会。须连续三次无误。',
      rules: [
        '如果小灯是红色，并且齿轮多于 4 个：按最右边的按钮。',
        '如果顶上的图案是月亮：按太阳按钮。',
        '如果小灯是蓝色：按和顶上图案一样的按钮。',
        '如果齿轮数量是双数：按最左边的按钮。',
        '如果小灯是金色，并且花按钮在最左边：按花按钮。',
        '以上都不符合：按星星按钮。'
      ],
      answer: function (c) {
        if (c.light === '红色' && c.gears > 4) return 3;
        if (c.top === '月亮') return idx(c, '太阳');
        if (c.light === '蓝色') return idx(c, c.top);
        if (c.gears % 2 === 0) return 0;
        if (c.light === '金色' && c.buttons[0] === '花') return 0;
        return idx(c, '星星');
      }
    },
    engine: {
      title: '云上列车 · 锅炉操作守则', device: '锅炉控制台',
      intro: '每次只调一下。从第一条开始看，第一条符合的就照做。连续调对三次，锅炉才会稳定。',
      rules: [
        '如果压力灯是绿色：按最左边的按钮。',
        '如果齿轮正好 3 个：按月亮按钮。',
        '如果顶上是星星，并且花按钮不在最右边：按花按钮。',
        '如果压力灯是红色：按和顶上图案一样的按钮。',
        '如果齿轮多于 4 个：按从左数第二个按钮。',
        '以上都不符合：按最右边的按钮。'
      ],
      answer: function (c) {
        if (c.light === '绿色') return 0;
        if (c.gears === 3) return idx(c, '月亮');
        if (c.top === '星星' && idx(c, '花') !== 3) return idx(c, '花');
        if (c.light === '红色') return idx(c, c.top);
        if (c.gears > 4) return 1;
        return 3;
      }
    },
    clock: {
      title: '钟芯笔记（白与钟表匠合写）', device: '老钟的钟芯',
      intro: '「这只钟是我们一起做的，所以要两个人一起开。」从第一条往下看，连续对三次。',
      rules: [
        '如果顶上是太阳，并且小灯是金色：按月亮按钮。',
        '如果齿轮数是单数，并且月亮按钮在最左边：按最右边的按钮。',
        '如果小灯是蓝色或绿色：找到「和顶上图案一样的按钮」，按它右边紧挨着的那个；如果它已经在最右边，就按最左边的。',
        '如果齿轮是 2 个或 6 个：按星星按钮。',
        '以上都不符合：按从右数第二个按钮。'
      ],
      answer: function (c) {
        if (c.top === '太阳' && c.light === '金色') return idx(c, '月亮');
        if (c.gears % 2 === 1 && c.buttons[0] === '月亮') return 3;
        if (c.light === '蓝色' || c.light === '绿色') return (idx(c, c.top) + 1) % 4;
        if (c.gears === 2 || c.gears === 6) return idx(c, '星星');
        return 2;
      }
    }
  };
  function newManualCfg() { return { light: LIGHTS[rnd(4)], gears: 2 + rnd(5), top: SYMBOLS[rnd(4)], buttons: shuffle(SYMBOLS) }; }

  var DECOY_CHARS = '山水风雨云月星花木石门桥灯海船鸟鱼雪春夜路心梦'.split('');

  var DIFF_POOLS = {
    market: ['🍎', '🍐', '🍊', '🍋', '🍇', '🍓', '🥕', '🥬', '🍞', '🧀', '🐟', '🥚', '🌽', '🍯', '🧺', '🌻'],
    luggage: ['🧳', '🎒', '👜', '📦', '🎩', '🧣', '🧸', '📚', '🕰️', '🔭', '🎻', '☂️', '🧤', '🪁', '🖼️', '🧶'],
    dream: ['🌙', '⭐', '☁️', '🐚', '🐋', '🌊', '🏝️', '🎐', '🪸', '🫧', '🌈', '🕯️', '🗝️', '🎈', '🌸', '🍃'],
    ship: ['⚓', '🧭', '🗺️', '🔭', '🪢', '🛟', '🕯️', '📜', '🍵', '🧳', '🎩', '🪶', '⏳', '💼', '🔑', '🫖']
  };

  // ================= 各种谜题 =================
  // gen(node) 生成状态；act(p, role, a, node, now) 处理操作，返回 true 表示解开；hide(p, role, node) 藏起对方才该看的信息
  var PUZZLES = {
    // 星座：seer 看答案，另一个人转星环
    constellation: {
      gen: function (n) {
        var pool = shuffle(range(CONSTELLATIONS.length)).slice(0, 8);
        var target = shuffle(range(8)).slice(0, n.count || 4);
        var dials = target.map(function (t) { var d; do { d = rnd(8); } while (d === t); return d; });
        return { pool: pool, target: target, dials: dials, tries: 0, lastCorrect: null };
      },
      act: function (p, role, a, n) {
        var seer = n.seer || 'A';
        if (a.type === 'dial') {
          if (role === seer) throw '你这边只能看，星环在对方那里';
          var i = a.i | 0; if (i < 0 || i >= p.dials.length) throw '没有这个星环';
          p.dials[i] = (p.dials[i] + (a.dir < 0 ? 7 : 1)) % 8; p.lastCorrect = null; return false;
        }
        if (a.type === 'try') {
          p.tries++;
          var c = 0; for (var k = 0; k < p.dials.length; k++) if (p.dials[k] === p.target[k]) c++;
          p.lastCorrect = c; return c === p.dials.length;
        }
        throw '现在不能这样做';
      },
      hide: function (p, role, n) { if (role !== (n.seer || 'A')) p.target = null; }
    },

    // 说明书：seer 拿着规则，另一个人看着机关
    manual: {
      gen: function (n) { return { round: 0, rounds: n.rounds || 3, cfg: newManualCfg(), last: null, lastAt: 0 }; },
      act: function (p, role, a, n, now) {
        if (a.type !== 'press') throw '现在不能这样做';
        if (role === (n.seer || 'A')) throw '机关在对方那边';
        p.lastAt = now;
        if ((a.i | 0) === MANUALS[n.manual].answer(p.cfg)) {
          p.round++; p.last = 'ok';
          if (p.round >= p.rounds) return true;
        } else { p.round = 0; p.last = 'bad'; }
        p.cfg = newManualCfg(); return false;
      },
      hide: function (p, role, n) { if (role === (n.seer || 'A')) p.cfg = null; }
    },

    // 迷宫：mover 只看得到身边一格，另一个人看得到整张地图
    maze: {
      gen: function (n) {
        var g = n.grid, s;
        for (var r = 0; r < g.length; r++) for (var c = 0; c < g[r].length; c++) if (g[r][c] === 'S') s = [r, c];
        return { pos: s, start: s, got: [], moves: 0, last: null, lastAt: 0 };
      },
      act: function (p, role, a, n, now) {
        if (a.type !== 'move') throw '现在不能这样做';
        if (role !== n.mover) throw '要由对方来走';
        var D = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[a.dir];
        if (!D) throw '方向不对';
        var g = n.grid;
        function cell(r, c) { return (g[r] && g[r][c]) || '#'; }
        var r = p.pos[0] + D[0], c = p.pos[1] + D[1];
        p.lastAt = now; p.moves++;
        if (cell(r, c) === '#') { p.last = 'wall'; return false; }
        p.pos = [r, c]; p.last = 'step';
        var ch = cell(r, c);
        var push = { '>': [0, 1], '<': [0, -1], '^': [-1, 0], 'v': [1, 0] }[ch];
        if (push) {
          var r2 = r + push[0], c2 = c + push[1];
          if (cell(r2, c2) !== '#') { p.pos = [r2, c2]; p.last = 'current'; ch = cell(r2, c2); }
        }
        var key = p.pos[0] + ',' + p.pos[1];
        if (ch === 'k' && p.got.indexOf(key) < 0) { p.got.push(key); p.last = 'key'; }
        if (ch === 'x') { p.pos = p.start.slice(); p.last = 'hazard'; return false; }
        if (ch === 'G') {
          var need = 0; g.forEach(function (row) { need += row.split('k').length - 1; });
          if (p.got.length >= need) return true;
          p.last = 'locked';
        }
        return false;
      },
      hide: function () { }
    },

    // 密文：seer 看到符号，另一个人有对照表和字块
    cipher: {
      gen: function (n) {
        var ans = n.answer.split('');
        var uniq = ans.filter(function (ch, i) { return ans.indexOf(ch) === i; });
        var decoys = shuffle(DECOY_CHARS.filter(function (ch) { return uniq.indexOf(ch) < 0; })).slice(0, n.decoys || 5);
        var chars = shuffle(uniq.concat(decoys));
        var glyphs = shuffle(range(16));
        var map = {}; chars.forEach(function (ch, i) { map[ch] = glyphs[i]; });
        return { chars: chars, map: map, msg: ans.map(function (ch) { return map[ch]; }), len: ans.length, input: [], wrongAt: 0 };
      },
      act: function (p, role, a, n, now) {
        if (role === (n.seer || 'A')) throw '字块在对方那里';
        if (a.type === 'tile') {
          if (p.chars.indexOf(a.ch) < 0) throw '没有这个字';
          p.input.push(a.ch);
          if (p.input.length >= p.len) {
            if (p.input.join('') === n.answer) return true;
            p.input = []; p.wrongAt = now;
          }
          return false;
        }
        if (a.type === 'undo') { p.input.pop(); return false; }
        throw '现在不能这样做';
      },
      hide: function (p, role, n) {
        if (role === (n.seer || 'A')) { p.map = null; p.chars = null; } else p.msg = null;
      }
    },

    // 闪光记忆：seer 看到闪烁顺序，另一个人照着按
    simon: {
      gen: function (n) {
        var rounds = n.rounds || [3, 4, 5];
        return { round: 0, rounds: rounds, seq: newSeq(rounds[0], n.colors || 4), input: 0, show: 1, flash: null, wrongAt: 0 };
      },
      act: function (p, role, a, n, now) {
        var seer = n.seer || 'A';
        if (a.type === 'replay') { if (role !== seer) throw '只有看得到信号的人能重播'; p.show++; return false; }
        if (a.type !== 'press') throw '现在不能这样做';
        if (role === seer) throw '按钮在对方那里';
        var k = a.i | 0;
        p.flash = { k: k, t: now };
        if (p.seq[p.input] === k) {
          p.input++;
          if (p.input >= p.seq.length) {
            p.round++;
            if (p.round >= p.rounds.length) return true;
            p.seq = newSeq(p.rounds[p.round], n.colors || 4); p.input = 0; p.show++;
          }
        } else { p.input = 0; p.wrongAt = now; p.show++; }
        return false;
      },
      hide: function (p, role, n) { if (role !== (n.seer || 'A')) p.seq = p.seq.map(function () { return null; }); }
    },

    // 同时按：两个人要在很短的时间里一起按下
    sync: {
      gen: function (n) { return { round: 0, rounds: n.rounds || 3, t: { A: 0, B: 0 }, last: null, lastAt: 0 }; },
      act: function (p, role, a, n, now) {
        if (a.type !== 'press') throw '现在不能这样做';
        var w = n.window || 900, o = OTHER[role];
        if (p.t[o] && Math.abs(now - p.t[o]) <= w) {
          p.round++; p.t = { A: 0, B: 0 }; p.last = 'ok'; p.lastAt = now;
          return p.round >= p.rounds;
        }
        if (p.t[o] && now - p.t[o] > w) { p.t[o] = 0; p.last = 'miss'; p.lastAt = now; }
        p.t[role] = now;
        return false;
      },
      hide: function (p) { p.t = null; }
    },

    // 找不同：两人各看一张图
    diff: {
      gen: function (n) {
        var pool = DIFF_POOLS[n.skin || 'market'], size = (n.w || 5) * (n.h || 4);
        var a = []; for (var i = 0; i < size; i++) a.push(pool[rnd(pool.length)]);
        var b = a.slice(), diffs = shuffle(range(size)).slice(0, n.diffs || 3);
        diffs.forEach(function (i) { var x; do { x = pool[rnd(pool.length)]; } while (x === a[i]); b[i] = x; });
        return { a: a, b: b, diffs: diffs, found: [], wrongAt: 0, wrongI: -1 };
      },
      act: function (p, role, a, n, now) {
        if (a.type !== 'tap') throw '现在不能这样做';
        var i = a.i | 0;
        if (p.diffs.indexOf(i) >= 0) {
          if (p.found.indexOf(i) < 0) p.found.push(i);
          return p.found.length >= p.diffs.length;
        }
        p.wrongAt = now; p.wrongI = i; return false;
      },
      hide: function (p, role) { if (role === 'A') p.b = null; else p.a = null; p.diffs = null; }
    },

    // 拉杆与灯：seer 有接线图，另一个人看得到灯和目标
    switches: {
      gen: function (n) {
        var L = n.levers || 5, M = n.lamps || 6, wiring = [];
        for (var i = 0; i < L; i++) wiring.push(shuffle(range(M)).slice(0, 2 + rnd(2)).sort());
        var target;
        do {
          target = range(M).map(function () { return false; });
          shuffle(range(L)).slice(0, 2 + rnd(L - 2)).forEach(function (l) { wiring[l].forEach(function (m) { target[m] = !target[m]; }); });
        } while (target.every(function (x) { return !x; }));
        return { wiring: wiring, target: target, levers: range(L).map(function () { return false; }), lamps: range(M).map(function () { return false; }) };
      },
      act: function (p, role, a, n) {
        if (a.type !== 'flip') throw '现在不能这样做';
        if (role === (n.seer || 'A')) throw '拉杆在对方那里';
        var i = a.i | 0; if (!p.wiring[i]) throw '没有这根拉杆';
        p.levers[i] = !p.levers[i];
        p.wiring[i].forEach(function (m) { p.lamps[m] = !p.lamps[m]; });
        return p.lamps.every(function (x, k) { return x === p.target[k]; });
      },
      hide: function (p, role, n) {
        if (role === (n.seer || 'A')) { p.target = null; p.lamps = null; } else p.wiring = null;
      }
    },

    // 合奏：两人各看一半乐谱，轮流弹
    song: {
      gen: function () { return { n: 0, last: null, wrongAt: 0 }; },
      act: function (p, role, a, n, now) {
        if (a.type !== 'key') throw '现在不能这样做';
        var first = n.first || 'A';
        var owner = p.n % 2 === 0 ? first : OTHER[first];
        if (role !== owner) throw '还没轮到你，这个音是对方的';
        var k = a.i | 0;
        p.last = { k: k, t: now, by: role };
        if (n.notes[p.n] === k) { p.n++; return p.n >= n.notes.length; }
        p.n = 0; p.wrongAt = now; return false;
      },
      hide: function () { }
    },

    // 推理：两人各有一半线索，要选同一个正确答案
    riddle: {
      gen: function () { return { pick: { A: null, B: null }, wrongAt: 0, wrongOpt: null }; },
      act: function (p, role, a, n, now) {
        if (a.type !== 'pick') throw '现在不能这样做';
        p.pick[role] = a.option;
        if (p.pick.A && p.pick.A === p.pick.B) {
          if (p.pick.A === n.answer) return true;
          p.wrongAt = now; p.wrongOpt = p.pick.A; p.pick = { A: null, B: null };
        }
        return false;
      },
      hide: function () { }
    }
  };

  // ================= 主流程 =================
  function chapterOf(s) { return STORY[s.chapter]; }
  function nodeOf(s) { return chapterOf(s).nodes[s.node]; }

  function initialState(room) {
    return {
      v: 2, room: room, seq: 0,
      phase: 'lobby',
      names: { A: '小晴', B: '阿屿' },
      online: { A: false, B: false },
      joined: { A: false, B: false },
      chapter: 'ch1', node: null,
      ready: { A: false, B: false },
      choice: { A: null, B: null },
      flags: {}, unlocked: ['ch1'], puzzle: null, emote: null, solvedAt: 0
    };
  }

  function enter(s, nodeId) {
    var node = chapterOf(s).nodes[nodeId];
    if (!node) throw '剧情缺少节点：' + nodeId;
    s.node = nodeId;
    s.ready = { A: false, B: false };
    s.choice = { A: null, B: null };
    s.puzzle = node.type === 'puzzle' ? PUZZLES[node.kind].gen(node) : null;
  }

  function startChapter(s, ch) {
    s.chapter = ch; s.phase = 'play';
    if (s.unlocked.indexOf(ch) < 0) s.unlocked.push(ch);
    enter(s, chapterOf(s).start);
  }

  function reduce(prev, role, a, now) {
    if (role !== 'A' && role !== 'B') throw '还没选角色';
    now = now || Date.now();
    var s = clone(prev);
    var node = s.node ? nodeOf(s) : null;
    switch (a.type) {
      case 'name': {
        var nm = String(a.name || '').trim().slice(0, 8);
        if (!nm) throw '名字不能为空';
        s.names[role] = nm; break;
      }
      case 'emote': s.emote = { from: role, kind: String(a.kind).slice(0, 4), t: now }; break;
      case 'start': {
        if (s.phase !== 'lobby') break;
        s.ready[role] = true;
        if (s.ready.A && s.ready.B) startChapter(s, 'ch1');
        break;
      }
      case 'ready': {
        if (s.phase !== 'play' || !node || (node.type !== 'dialog' && node.type !== 'end')) throw '现在不能继续';
        if (a.node !== s.node) break;
        s.ready[role] = true;
        if (s.ready.A && s.ready.B) {
          if (node.type === 'end') { if (node.next) startChapter(s, node.next); }
          else enter(s, node.next);
        }
        break;
      }
      case 'choose': {
        if (!node || node.type !== 'choice' || a.node !== s.node) throw '现在不能选择';
        if (!node.options.some(function (o) { return o.id === a.option; })) throw '没有这个选项';
        s.choice[role] = a.option;
        if (s.choice.A && s.choice.A === s.choice.B) {
          s.flags[node.flag] = s.choice.A;
          var opt = node.options.filter(function (o) { return o.id === s.choice.A; })[0];
          enter(s, opt.next || node.next);
        }
        break;
      }
      case 'restart': startChapter(s, s.chapter); break;
      case 'goto': {
        if (s.unlocked.indexOf(a.chapter) < 0) throw '这一章还没解锁';
        startChapter(s, a.chapter); break;
      }
      default: {
        if (!node || node.type !== 'puzzle' || a.node !== s.node) throw '现在不能这样做';
        var solved = PUZZLES[node.kind].act(s.puzzle, role, a, node, now);
        if (solved) { s.solvedAt = now; enter(s, node.next); }
      }
    }
    s.seq = (prev.seq || 0) + 1;
    return s;
  }

  // 给某一方看的状态：藏起对方才该看到的信息
  function viewFor(s, role) {
    var v = clone(s);
    if (v.puzzle && v.node) { var n = nodeOf(v); PUZZLES[n.kind].hide(v.puzzle, role, n); }
    return v;
  }

  // 服务器丢了房间（比如免费主机重启）时，用玩家手机里存的最后状态重建
  function restore(saved, room) {
    var s = initialState(room);
    if (!saved || typeof saved !== 'object') return s;
    if (saved.names) { s.names.A = String(saved.names.A || s.names.A).slice(0, 8); s.names.B = String(saved.names.B || s.names.B).slice(0, 8); }
    if (saved.flags && typeof saved.flags === 'object') s.flags = saved.flags;
    if (Array.isArray(saved.unlocked)) s.unlocked = saved.unlocked.filter(function (c) { return STORY[c]; });
    if (!s.unlocked.length) s.unlocked = ['ch1'];
    if (saved.chapter && STORY[saved.chapter]) s.chapter = saved.chapter;
    if (saved.phase === 'play' && saved.node && chapterOf(s).nodes[saved.node]) { s.phase = 'play'; enter(s, saved.node); }
    return s;
  }

  var api = {
    reduce: reduce, restore: restore, initialState: initialState, viewFor: viewFor, OTHER: OTHER, CHAPTERS: CHAPTERS,
    CONSTELLATIONS: CONSTELLATIONS, MANUALS: MANUALS, PUZZLES: PUZZLES, SYMBOLS: SYMBOLS
  };
  root.Logic = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
