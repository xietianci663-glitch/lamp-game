// 检查剧情：所有节点都连得上，迷宫都走得通
global.STORY = {};
for (let i = 1; i <= 8; i++) require('./public/story/ch' + i + '.js');
const L = require('./public/logic.js');
let bad = 0;
for (const id of L.CHAPTERS) {
  const ch = STORY[id]; const seen = new Set(); const q = [ch.start]; let puzzles = 0;
  while (q.length) {
    const n = q.shift(); if (seen.has(n)) continue; seen.add(n);
    const node = ch.nodes[n]; if (!node) { console.log(id, 'missing node', n); bad++; continue; }
    if (node.type === 'puzzle') puzzles++;
    const nexts = [node.next].concat((node.options || []).map(o => o.next)).filter(Boolean);
    if (node.type !== 'end') nexts.forEach(x => q.push(x));
    if (node.type === 'end' && node.next && !STORY[node.next]) { console.log(id, 'bad next chapter'); bad++; }
    if (node.kind === 'maze') {
      const g = node.grid; const W = g[0].length;
      if (g.some(r => r.length !== W)) { console.log(id, n, 'ragged grid'); bad++; }
      // 搜索：状态 = 位置 + 拿到的钥匙
      const keys = []; let s;
      g.forEach((r, i) => [...r].forEach((c, j) => { if (c === 'k') keys.push(i + ',' + j); if (c === 'S') s = [i, j]; }));
      const p0 = L.PUZZLES.maze.gen(node);
      const seenS = new Set(); const qq = [[p0, 0]]; let ok = false, steps = -1;
      while (qq.length && !ok) {
        const [p, d] = qq.shift();
        for (const dir of ['up', 'down', 'left', 'right']) {
          const p2 = JSON.parse(JSON.stringify(p));
          const done = L.PUZZLES.maze.act(p2, node.mover, { type: 'move', dir }, node, 1);
          if (done) { ok = true; steps = d + 1; break; }
          const k = p2.pos.join(',') + '|' + p2.got.sort().join(';');
          if (!seenS.has(k)) { seenS.add(k); qq.push([p2, d + 1]); }
        }
      }
      console.log(id, n, ok ? 'maze ok, shortest ' + steps + ' moves, keys ' + keys.length : 'MAZE UNSOLVABLE');
      if (!ok) bad++;
    }
    if (node.kind === 'song' && node.notes.some(x => x < 0 || x > 4)) { console.log('bad note'); bad++; }
    if (node.kind === 'riddle' && !node.options.some(o => o.id === node.answer)) { console.log(id, n, 'riddle answer missing'); bad++; }
    if (node.kind === 'manual' && !L.MANUALS[node.manual]) { console.log('bad manual'); bad++; }
  }
  const unreachable = Object.keys(ch.nodes).filter(k => !seen.has(k));
  console.log(id, ch.title, 'nodes', seen.size, 'puzzles', puzzles, unreachable.length ? 'UNREACHABLE ' + unreachable : '');
}
// 说明书：每种配置都只有一个答案，且答案是合法按钮
for (const k in L.MANUALS) {
  for (let t = 0; t < 2000; t++) {
    const c = { light: ['红色', '蓝色', '金色', '绿色'][t % 4], gears: 2 + (t % 5), top: L.SYMBOLS[(t >> 2) % 4], buttons: L.SYMBOLS.slice().sort(() => Math.random() - .5) };
    const a = L.MANUALS[k].answer(c); if (!(a >= 0 && a < 4)) { console.log('manual', k, 'bad answer', c); bad++; break; }
  }
}
console.log(bad ? 'PROBLEMS: ' + bad : 'ALL GOOD');
