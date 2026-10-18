// 《两端的灯》联机服务器：不依赖任何第三方包，`node server.js` 即可运行。
// 负责：提供网页文件、创建/加入房间、转发双方操作、保存进度。
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

global.STORY = {};
for (let i = 1; i <= 8; i++) require('./public/story/ch' + i + '.js');
const Logic = require('./public/logic.js');

const PORT = process.env.PORT || 8080;
const PUBLIC = path.join(__dirname, 'public');
const DATA_FILE = path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), 'rooms.json');
const ROOM_TTL = 60 * 24 * 3600 * 1000; // 60 天没人玩的房间会被清掉

// rooms[code] = { state, tokens: {A, B}, touched }
let rooms = {};
try { rooms = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { rooms = {}; }
const clients = {}; // code -> Set of {res, role}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const now = Date.now();
    for (const k of Object.keys(rooms)) if (now - rooms[k].touched > ROOM_TTL) delete rooms[k];
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE + '.tmp', JSON.stringify(rooms));
    fs.renameSync(DATA_FILE + '.tmp', DATA_FILE);
  }, 500);
}

function newCode() {
  for (;;) { const c = String(1000 + Math.floor(Math.random() * 9000)); if (!rooms[c]) return c; }
}
function roleOf(room, token) {
  if (!room || !token) return null;
  if (room.tokens.A === token) return 'A';
  if (room.tokens.B === token) return 'B';
  return null;
}

function broadcast(code) {
  const room = rooms[code]; if (!room) return;
  const set = clients[code]; if (!set) return;
  room.state.online = { A: false, B: false };
  for (const c of set) if (c.role) room.state.online[c.role] = true;
  for (const c of set) {
    const v = c.role ? Logic.viewFor(room.state, c.role) : Logic.viewFor(Logic.viewFor(room.state, 'A'), 'B');
    v.taken = { A: !!room.tokens.A, B: !!room.tokens.B };
    c.res.write('data: ' + JSON.stringify(v) + '\n\n');
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (ch) => { d += ch; if (d.length > 1e5) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch (e) { resolve({}); } });
  });
}
function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.webp': 'image/webp', '.json': 'application/json' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  if (p === '/api/join' && req.method === 'POST') {
    const b = await readBody(req);
    let code = String(b.room || '').trim();
    if (!code) { code = newCode(); rooms[code] = { state: Logic.initialState(code), tokens: { A: null, B: null }, touched: Date.now() }; save(); }
    const canRestore = /^\d{4}$/.test(code) && b.token && (b.role === 'A' || b.role === 'B');
    if (!rooms[code] && canRestore && b.restore) {
      // 服务器重启丢了房间：用这位玩家手机里存的进度重建
      rooms[code] = { state: Logic.restore(b.restore, code), tokens: { A: null, B: null }, touched: Date.now() };
    }
    const room = rooms[code];
    if (!room) return json(res, 404, { error: '找不到这个房间号' });
    if (canRestore && !roleOf(room, b.token) && !room.tokens[b.role]) {
      room.tokens[b.role] = b.token; room.state.joined[b.role] = true; save();
    }
    const token = b.token && roleOf(room, b.token) ? b.token : crypto.randomBytes(12).toString('hex');
    return json(res, 200, { room: code, token, role: roleOf(room, token) });
  }

  if (p === '/api/claim' && req.method === 'POST') {
    const b = await readBody(req);
    const room = rooms[b.room];
    if (!room) return json(res, 404, { error: '找不到这个房间号' });
    if (b.role !== 'A' && b.role !== 'B') return json(res, 400, { error: '角色不对' });
    if (roleOf(room, b.token)) return json(res, 200, { role: roleOf(room, b.token) });
    if (room.tokens[b.role]) return json(res, 409, { error: '这个角色已经被选了' });
    room.tokens[b.role] = b.token; room.state.joined[b.role] = true; room.touched = Date.now();
    for (const c of clients[b.room] || []) if (c.token === b.token) c.role = b.role;
    save(); broadcast(b.room);
    return json(res, 200, { role: b.role });
  }

  if (p === '/api/action' && req.method === 'POST') {
    const b = await readBody(req);
    const room = rooms[b.room];
    if (!room) return json(res, 404, { error: '找不到这个房间号' });
    const role = roleOf(room, b.token);
    try { room.state = Logic.reduce(room.state, role, b.action || {}); }
    catch (e) { return json(res, 400, { error: String(e) }); }
    room.touched = Date.now(); save(); broadcast(b.room);
    return json(res, 200, { ok: true });
  }

  if (p === '/api/debug' && process.env.LAMP_DEBUG) {
    const room = rooms[url.searchParams.get('room')];
    return json(res, room ? 200 : 404, room ? room.state : {});
  }

  if (p === '/api/events') {
    const code = url.searchParams.get('room');
    const room = rooms[code];
    if (!room) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write('retry: 2000\n\n');
    const token = url.searchParams.get('token');
    const c = { res, token, role: roleOf(room, token) };
    (clients[code] = clients[code] || new Set()).add(c);
    const ping = setInterval(() => res.write(': ping\n\n'), 20000);
    req.on('close', () => { clearInterval(ping); clients[code].delete(c); broadcast(code); });
    broadcast(code);
    return;
  }

  // 静态文件
  let file = path.normalize(path.join(PUBLIC, p === '/' ? 'index.html' : decodeURIComponent(p)));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

server.listen(PORT, () => console.log('两端的灯 已启动：http://localhost:' + PORT));
