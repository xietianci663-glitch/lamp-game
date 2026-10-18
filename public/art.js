// 占位美术：用 SVG 画的手绘风场景（暖色、柔和，参考吉卜力和塞尔达的感觉）。
// 以后换成正式画稿：在 public/img/ 里放同名图片（比如 market.webp），然后把 USE_IMAGES 改成 true。
(function (root) {
  var USE_IMAGES = false;

  function hills(color, y, amp, seed, op) {
    var d = 'M0 ' + y;
    for (var x = 0; x <= 400; x += 40) {
      var h = y - Math.abs(Math.sin((x + seed * 37) / 61)) * amp - Math.abs(Math.cos((x + seed * 13) / 29)) * amp * 0.4;
      d += ' Q' + (x + 20) + ' ' + (h - 6) + ' ' + (x + 40) + ' ' + h;
    }
    return '<path d="' + d + ' L400 700 L0 700 Z" fill="' + color + '" opacity="' + (op || 1) + '"/>';
  }
  function cloud(x, y, s, c, op) {
    return '<g class="cloud" style="animation-duration:' + (30 + s * 25) + 's"><g transform="translate(' + x + ' ' + y + ') scale(' + s + ')" fill="' + c + '" opacity="' + (op || 1) + '">' +
      '<ellipse cx="0" cy="0" rx="34" ry="14"/><ellipse cx="-18" cy="-6" rx="18" ry="13"/><ellipse cx="14" cy="-10" rx="22" ry="17"/></g></g>';
  }
  function cloudSea(y, c1, c2) {
    var s = '<rect x="0" y="' + y + '" width="400" height="' + (700 - y) + '" fill="' + c1 + '"/>';
    for (var i = 0; i < 9; i++) s += '<ellipse class="cloud" style="animation-duration:' + (20 + i * 3) + 's" cx="' + (i * 52 - 10) + '" cy="' + (y + 8 + (i % 3) * 6) + '" rx="42" ry="20" fill="' + c2 + '"/>';
    return s;
  }
  function stars(n, c) {
    var s = '';
    for (var i = 0; i < n; i++) {
      var x = (i * 97) % 400, y = (i * 53) % 330, r = (i % 3) * 0.5 + 0.6;
      s += '<circle class="twinkle" style="animation-delay:' + (i % 7) * 0.4 + 's" cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + c + '"/>';
    }
    return s;
  }
  var gid = 0;
  function sky(top, bottom) {
    var id = 'g' + (gid++);
    return { id: id, svg: '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + top + '"/><stop offset="1" stop-color="' + bottom + '"/></linearGradient>' +
      '<radialGradient id="' + id + 'g" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff6c8" stop-opacity="0.85"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient></defs>' +
      '<rect width="400" height="700" fill="url(#' + id + ')"/>' };
  }
  function glow(sk, cy) { return '<circle class="pulse" cx="200" cy="' + (cy || 420) + '" r="160" fill="url(#' + sk.id + 'g)"/>'; }
  function airship(x, y, s) {
    return '<g class="bob"><g transform="translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')"><ellipse cx="0" cy="0" rx="34" ry="13" fill="#e9785a"/><path d="M-34 0 Q0 -8 34 0" stroke="#c75a40" fill="none"/>' +
      '<rect x="-10" y="15" width="20" height="8" rx="2" fill="#7a5134"/><line x1="-8" y1="11" x2="-6" y2="15" stroke="#7a5134"/><line x1="8" y1="11" x2="6" y2="15" stroke="#7a5134"/></g></g>';
  }
  function lighthouse(x, y, lit, s) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')"><path d="M-9 0 L-6 -60 L6 -60 L9 0 Z" fill="#f4ede0"/><rect x="-6" y="-45" width="12" height="7" fill="#d76b52"/><rect x="-6" y="-25" width="12" height="7" fill="#d76b52"/>' +
      '<rect x="-8" y="-70" width="16" height="10" fill="' + (lit ? '#ffe28a' : '#8b9bb0') + '"/><path d="M-10 -70 L0 -80 L10 -70 Z" fill="#5a4a5a"/>' +
      (lit ? '<circle class="pulse" cx="0" cy="-65" r="26" fill="#ffe9a6" opacity="0.4"/>' : '') + '</g>';
  }
  function houses(baseY, lit, cols) {
    var s = ''; cols = cols || ['#5b6c8f', '#6f5c86', '#4f5f7d', '#7a6a8a'];
    for (var i = 0; i < 9; i++) {
      var x = i * 46 - 6, h = 40 + (i * 23) % 35, w = 38;
      s += '<rect x="' + x + '" y="' + (baseY - h) + '" width="' + w + '" height="' + (h + 80) + '" fill="' + cols[i % cols.length] + '"/>';
      s += '<path d="M' + (x - 3) + ' ' + (baseY - h) + ' L' + (x + w / 2) + ' ' + (baseY - h - 18) + ' L' + (x + w + 3) + ' ' + (baseY - h) + ' Z" fill="#3d4663" opacity="0.85"/>';
      if (lit) s += '<rect class="twinkle" style="animation-delay:' + i * 0.3 + 's" x="' + (x + 12) + '" y="' + (baseY - h + 12) + '" width="9" height="11" rx="2" fill="#ffd27a"/>';
    }
    return s;
  }
  function sea(y, c1, c2) {
    return '<rect x="0" y="' + y + '" width="400" height="' + (700 - y) + '" fill="' + c1 + '"/>' +
      '<path class="wave" d="M0 ' + (y + 14) + ' Q50 ' + (y + 8) + ' 100 ' + (y + 14) + ' T200 ' + (y + 14) + ' T300 ' + (y + 14) + ' T400 ' + (y + 14) + ' T500 ' + (y + 14) + '" stroke="' + c2 + '" stroke-width="2" fill="none" opacity="0.6"/>' +
      '<path class="wave" style="animation-duration:9s" d="M0 ' + (y + 40) + ' Q50 ' + (y + 34) + ' 100 ' + (y + 40) + ' T200 ' + (y + 40) + ' T300 ' + (y + 40) + ' T400 ' + (y + 40) + ' T500 ' + (y + 40) + '" stroke="' + c2 + '" stroke-width="2" fill="none" opacity="0.4"/>';
  }
  function clocks() {
    var s = '';
    [[60, 140, 30], [170, 110, 22], [270, 150, 34], [350, 100, 18], [110, 250, 20], [320, 260, 26]].forEach(function (p, i) {
      s += '<g transform="translate(' + p[0] + ' ' + p[1] + ')"><circle r="' + p[2] + '" fill="#f3e3c3" stroke="#8a5a33" stroke-width="4"/>' +
        '<line class="hand" style="animation-duration:' + (6 + i * 3) + 's" x1="0" y1="0" x2="0" y2="' + (-p[2] * 0.7) + '" stroke="#5a3a22" stroke-width="2.5" stroke-linecap="round"/>' +
        '<line x1="0" y1="0" x2="' + p[2] * 0.45 + '" y2="0" stroke="#5a3a22" stroke-width="3" stroke-linecap="round"/></g>';
    });
    return s;
  }
  function stalls() {
    var s = '', cols = ['#e8735a', '#f2c14e', '#6fa8a3', '#d98bb0'];
    for (var i = 0; i < 4; i++) {
      var x = 10 + i * 98;
      s += '<rect x="' + (x + 6) + '" y="420" width="78" height="80" fill="#c99a6b"/>';
      for (var k = 0; k < 4; k++) s += '<path d="M' + (x + k * 22.5) + ' 390 h22.5 v30 q-11 10 -22.5 0 Z" fill="' + (k % 2 ? '#fff6e6' : cols[i]) + '"/>';
      s += '<circle cx="' + (x + 25) + '" cy="440" r="8" fill="#e95f4b"/><circle cx="' + (x + 45) + '" cy="438" r="8" fill="#f2c14e"/><circle cx="' + (x + 62) + '" cy="442" r="8" fill="#9bc46b"/>';
    }
    return s;
  }
  function roofs(y) {
    var s = '', cols = ['#c8644f', '#b55a4a', '#d57d57', '#a9524a'];
    for (var i = 0; i < 7; i++) {
      var x = i * 62 - 20, h = y + (i * 37) % 60;
      s += '<path d="M' + x + ' ' + (h + 30) + ' L' + (x + 40) + ' ' + h + ' L' + (x + 80) + ' ' + (h + 30) + ' L' + (x + 80) + ' 700 L' + x + ' 700 Z" fill="' + cols[i % 4] + '"/>';
      s += '<rect x="' + (x + 50) + '" y="' + (h - 4) + '" width="10" height="22" fill="#6b4a3a"/>';
      s += '<line x1="' + (x + 20) + '" y1="' + (h + 40) + '" x2="' + (x + 80) + '" y2="' + (h + 55) + '" stroke="#fff" stroke-width="1" opacity="0.6"/>';
    }
    return s;
  }
  function waterTower(x, y, lit) {
    return '<g transform="translate(' + x + ' ' + y + ')"><rect x="-30" y="-90" width="60" height="50" rx="6" fill="#8d6e5a"/><path d="M-36 -90 L0 -115 L36 -90 Z" fill="#6b4a3a"/>' +
      '<line x1="-22" y1="-40" x2="-30" y2="40" stroke="#6b4a3a" stroke-width="5"/><line x1="22" y1="-40" x2="30" y2="40" stroke="#6b4a3a" stroke-width="5"/>' +
      (lit ? '<circle class="pulse" cx="0" cy="-65" r="40" fill="#ffb35c" opacity="0.5"/>' : '') + '</g>';
  }
  function shelves() {
    var s = '';
    for (var i = 0; i < 5; i++) {
      var x = 10 + i * 80;
      s += '<rect x="' + x + '" y="260" width="64" height="300" fill="#2b5470" opacity="0.8"/>';
      for (var r = 0; r < 5; r++) for (var b = 0; b < 5; b++)
        s += '<rect x="' + (x + 4 + b * 12) + '" y="' + (270 + r * 58) + '" width="9" height="44" fill="' + ['#7fb7c9', '#c9a96e', '#8fa7d8', '#d98b7a', '#9cc7a4'][(r + b + i) % 5] + '" opacity="0.8"/>';
    }
    s += [[60, 200], [180, 160], [300, 220], [120, 600], [330, 590]].map(function (p, i) {
      return '<g class="bob" style="animation-delay:' + i * 0.5 + 's"><ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="10" ry="5" fill="#bff3ff"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="16" fill="#bff3ff" opacity="0.25"/></g>';
    }).join('');
    return s;
  }
  function train(y) {
    var s = '';
    for (var i = 0; i < 4; i++) {
      var x = 20 + i * 92;
      s += '<rect x="' + x + '" y="' + y + '" width="86" height="54" rx="10" fill="' + (i === 0 ? '#3f6b5c' : '#5e8f7c') + '"/>';
      s += '<rect x="' + (x + 10) + '" y="' + (y + 10) + '" width="26" height="20" rx="4" fill="#fff3cf"/><rect x="' + (x + 50) + '" y="' + (y + 10) + '" width="26" height="20" rx="4" fill="#fff3cf"/>';
      s += '<circle cx="' + (x + 20) + '" cy="' + (y + 58) + '" r="8" fill="#3a3a3a"/><circle cx="' + (x + 66) + '" cy="' + (y + 58) + '" r="8" fill="#3a3a3a"/>';
    }
    s += '<rect x="30" y="' + (y - 26) + '" width="14" height="26" fill="#3f6b5c"/>';
    s += '<g class="drift-up">' + cloud(38, y - 40, 0.4, '#fff', 0.8) + '</g>';
    return s;
  }
  function ruins() {
    return '<g fill="#b9a99a"><rect x="40" y="300" width="40" height="260"/><rect x="300" y="340" width="44" height="220"/><path d="M80 300 Q190 200 300 340 L300 360 Q190 230 80 320 Z"/>' +
      '<rect x="150" y="430" width="90" height="130" fill="#a8988a"/></g>' +
      '<g fill="#8fd6a2" opacity="0.7"><circle class="twinkle" cx="60" cy="400" r="5"/><circle class="twinkle" style="animation-delay:.6s" cx="320" cy="420" r="5"/><circle class="twinkle" style="animation-delay:1.2s" cx="190" cy="460" r="5"/></g>';
  }
  function whale(op) {
    return '<g class="bob" style="animation-duration:6s" opacity="' + (op || 1) + '"><path d="M-20 520 Q120 380 300 440 Q380 470 420 430 L430 470 Q400 520 330 540 Q160 600 -20 600 Z" fill="#5d6a9e"/>' +
      '<path d="M-20 560 Q160 600 330 540" stroke="#8c97c9" stroke-width="6" fill="none"/><circle cx="270" cy="470" r="9" fill="#fff6d6"/><circle cx="272" cy="470" r="4" fill="#2b2f55"/>' +
      (function () { var h = ''; for (var i = 0; i < 7; i++) { var x = 120 + i * 16, y = 430 + Math.abs(3 - i) * 4; h += '<rect x="' + x + '" y="' + (y - 16) + '" width="13" height="18" fill="' + ['#c9b6e4', '#b6c7e4', '#e4c9b6'][i % 3] + '"/><path d="M' + (x - 1) + ' ' + (y - 16) + ' l7.5 -7 l7.5 7 Z" fill="#6b5a8e"/><rect class="twinkle" x="' + (x + 4) + '" y="' + (y - 11) + '" width="4" height="5" fill="#ffd27a"/>'; } return h; })() + '</g>';
  }
  function bridge(lit) {
    var c = lit ? '#ffe39a' : '#9aa3b8';
    var s = '<path d="M-10 470 Q200 390 410 470" stroke="' + c + '" stroke-width="16" fill="none" ' + (lit ? 'class="pulse"' : '') + '/>';
    for (var i = 0; i < 7; i++) {
      var x = 20 + i * 60, y = 470 - Math.sin((x + 10) / 420 * Math.PI) * 80;
      s += '<line x1="' + x + '" y1="' + y + '" x2="' + x + '" y2="' + (y - 34) + '" stroke="#6b5a6e" stroke-width="3"/><circle cx="' + x + '" cy="' + (y - 38) + '" r="6" fill="' + (lit ? '#ffe08a' : '#7a8299') + '"/>';
      if (lit) s += '<circle class="pulse" cx="' + x + '" cy="' + (y - 38) + '" r="16" fill="#ffe08a" opacity="0.35"/>';
    }
    return s;
  }

  var SCENES = {
    dawn: function (g) { var k = sky('#ffd9b3', '#fff3e0'); return k.svg + '<circle cx="300" cy="170" r="46" fill="#fff1c4"/>' + cloud(80, 110, 1.1, '#fff') + cloud(260, 80, 0.8, '#fff') + cloud(340, 230, 1, '#ffeede') + airship(130, 200) + hills('#b9d7a8', 470, 60, 1, 0.8) + lighthouse(320, 440, g) + hills('#8fbf7e', 520, 50, 3) + hills('#6fa35e', 580, 30, 5) + (g ? glow(k) : ''); },
    dusk: function (g) { var k = sky('#6c5b9e', '#f2a37a'); return k.svg + '<circle cx="90" cy="300" r="40" fill="#ffd3a1" opacity="0.9"/>' + cloud(250, 120, 1, '#f6c0b0') + cloud(90, 180, 0.7, '#e6a8b5') + sea(430, '#5867a2', '#c9b6e4') + houses(430, true) + (g ? glow(k) : ''); },
    night: function () { var k = sky('#1c2350', '#3c4a86'); return k.svg + stars(70, '#fff6d6') + '<circle cx="320" cy="90" r="26" fill="#fdf3c8"/><circle cx="330" cy="84" r="24" fill="#26306a"/>' + hills('#2c3767', 560, 50, 2) + hills('#222b55', 610, 30, 4); },
    map: function () { var k = sky('#20305e', '#4a3a6e'); return k.svg + stars(50, '#ffe9a6') + glow(k, 330) + '<path d="M70 300 Q200 230 330 300" stroke="#ffe39a" stroke-dasharray="4 7" stroke-width="2" fill="none"/>' + [[70, 300], [110, 360], [160, 260], [200, 330], [250, 250], [290, 370], [330, 300]].map(function (p, i) { return '<circle class="twinkle" style="animation-delay:' + i * 0.3 + 's" cx="' + p[0] + '" cy="' + p[1] + '" r="7" fill="#ffd56b"/>'; }).join(''); },
    workshop: function (g) { var k = sky('#7d5a3f', '#6b4a33'); return k.svg + '<rect x="0" y="380" width="400" height="14" fill="#4f3523"/>' + clocks() + '<rect x="40" y="440" width="320" height="30" rx="4" fill="#9a6b45"/><rect x="60" y="470" width="14" height="140" fill="#7b5236"/><rect x="326" y="470" width="14" height="140" fill="#7b5236"/><circle cx="330" cy="40" r="80" fill="#ffd98a" opacity="0.18"/>' + (g ? glow(k) : ''); },
    paper: function () { return '<rect width="400" height="700" fill="#e9dcc0"/><rect x="18" y="18" width="364" height="664" rx="10" fill="#f6ecd5" stroke="#c9b48a" stroke-width="2"/><circle cx="330" cy="610" r="40" fill="#e3cfa6" opacity="0.6"/>'; },
    market: function () { var k = sky('#ffe2b8', '#fff4dd'); return k.svg + cloud(90, 90, 1, '#fff') + cloud(300, 130, 0.8, '#fff') + houses(380, false, ['#f0c9a0', '#e8b48c', '#f3d6b0', '#dca784']) + '<rect x="0" y="380" width="400" height="320" fill="#e8d2b0"/>' + stalls() + '<rect x="0" y="500" width="400" height="200" fill="#d9bf98"/>'; },
    roofs: function () { var k = sky('#ffd2a8', '#ffeacc'); return k.svg + '<circle cx="80" cy="140" r="36" fill="#fff1c4"/>' + cloud(260, 100, 1, '#fff') + roofs(330); },
    tower: function (g) { var k = sky('#f7b98a', '#ffe0b8'); return k.svg + cloud(90, 120, 0.9, '#fff3e3') + roofs(470) + waterTower(200, 400, g) + lighthouse(340, 420, true, 0.8) + (g ? glow(k, 340) : ''); },
    pier: function () { var k = sky('#8a7bb8', '#f3b58c'); return k.svg + cloud(280, 120, 1, '#f6c0b0') + sea(380, '#4f6aa3', '#c9d6f0') + '<rect x="0" y="372" width="230" height="16" fill="#7a5a44"/>' + [20, 80, 140, 200].map(function (x) { return '<rect x="' + x + '" y="388" width="8" height="60" fill="#5e4434"/>'; }).join('') + '<circle class="pulse" cx="300" cy="560" r="60" fill="#8fe3ff" opacity="0.25"/>'; },
    library: function (g) { var k = sky('#0f3550', '#1f6077'); return k.svg + '<path d="M-20 260 Q200 40 420 260" stroke="#7fd3e8" stroke-width="3" fill="none" opacity="0.5"/>' + shelves() + (g ? glow(k, 330) : '') + '<rect x="0" y="600" width="400" height="100" fill="#163f55"/>'; },
    station: function () { var k = sky('#ffe6c4', '#fff6e6'); return k.svg + cloud(80, 120, 1, '#fff') + cloud(300, 90, 0.9, '#fff') + cloudSea(470, '#fff', '#f3f0ff') + '<rect x="0" y="440" width="400" height="10" fill="#9a7a5a"/>' + train(380); },
    train: function () { var k = sky('#cfe7ff', '#fff3e0'); return k.svg + cloud(60, 140, 1.2, '#fff') + cloud(330, 220, 1, '#fff') + airship(300, 120, 1.3) + cloudSea(500, '#fff', '#eef3ff') + train(440) + '<rect x="0" y="498" width="400" height="6" fill="#c9b8f0" opacity="0.6"/>'; },
    airship: function () { var k = sky('#a8cff5', '#fff0dc'); return k.svg + cloud(100, 200, 1.4, '#fff') + cloud(320, 300, 1.1, '#fff') + cloudSea(560, '#fff', '#eaf1ff') + '<path d="M-20 470 Q200 520 420 470 L420 700 L-20 700 Z" fill="#a8774f"/><rect x="0" y="455" width="400" height="10" fill="#7a5134"/>' + [30, 110, 190, 270, 350].map(function (x) { return '<rect x="' + x + '" y="420" width="6" height="40" fill="#7a5134"/>'; }).join(''); },
    island: function () { var k = sky('#bfe3ff', '#fff4e0'); return k.svg + cloud(80, 130, 1, '#fff') + cloudSea(520, '#fff', '#eef3ff') + '<path d="M60 470 Q200 400 340 470 Q300 560 200 590 Q100 560 60 470 Z" fill="#9bc47a"/><path d="M60 470 Q200 500 340 470 Q300 560 200 590 Q100 560 60 470 Z" fill="#8a6a50"/><rect x="190" y="380" width="10" height="70" fill="#6b4a3a"/><circle cx="195" cy="370" r="34" fill="#6fa35e"/>' + airship(280, 250); },
    ruins: function () { var k = sky('#8e9fd0', '#e8d6f0'); return k.svg + stars(20, '#fff') + cloudSea(560, '#f3efff', '#ffffff') + ruins(); },
    cabin: function () { var k = sky('#3d2c24', '#2a1f1a'); return k.svg + '<circle cx="200" cy="160" r="40" fill="#ffd27a" opacity="0.18"/><rect x="170" y="140" width="60" height="44" rx="22" fill="#2a3f5a" stroke="#8a6a50" stroke-width="6"/>' + [0, 1, 2, 3, 4].map(function (i) { return '<rect x="' + (i * 90) + '" y="0" width="12" height="700" fill="#4f3a2e"/>'; }).join('') + '<rect x="0" y="560" width="400" height="140" fill="#4a362b"/>'; },
    storm: function () { var k = sky('#3b4a6b', '#7a8bb0'); return k.svg + cloud(80, 120, 1.6, '#5a6788') + cloud(300, 90, 1.4, '#4f5c7c') + '<path class="flash" d="M220 60 L200 160 L225 160 L190 280" stroke="#fff6c8" stroke-width="4" fill="none"/>' + sea(420, '#3f5f8a', '#a8c4e8') + '<path class="bob" d="M150 430 l40 0 l-8 14 l-24 0 Z" fill="#c9915c"/><path class="bob" d="M170 430 l0 -40 l20 34 Z" fill="#f6ecd5"/>'; },
    memory: function () { var k = sky('#e8c9a0', '#f6e6c8'); return k.svg + '<g opacity="0.75" filter="url(#sepia)">' + cloudSea(500, '#f3e2c4', '#fff4e0') + bridge(true) + lighthouse(40, 460, true, 0.8) + '</g>' + '<rect width="400" height="700" fill="#c9a26b" opacity="0.15"/>'; },
    bridge: function (g) { var k = sky('#f7c8a8', '#fff0e0'); return k.svg + cloud(90, 130, 1, '#fff') + cloud(300, 100, 0.8, '#fff') + cloudSea(500, '#fff', '#f6efff') + bridge(g) + (g ? glow(k, 380) : ''); },
    fog: function () { var k = sky('#d8dce6', '#eef0f5'); return k.svg + bridge(false) + cloud(80, 420, 2.2, '#fff', 0.85) + cloud(300, 460, 2.4, '#fff', 0.85) + cloud(200, 380, 2, '#fff', 0.7) + '<rect width="400" height="700" fill="#fff" opacity="0.3"/>'; },
    whale: function () { var k = sky('#2b3466', '#6a5f9e'); return k.svg + stars(40, '#fff6d6') + bridge(false) + whale(); }
  };
  SCENES['bridge-lit'] = function () { return SCENES.bridge(true); };

  function bg(key) {
    var g = /-glow$/.test(key), base = key.replace(/-glow$/, '');
    if (USE_IMAGES) return '<img class="bg-img" src="img/' + key + '.webp" alt="">';
    var fn = SCENES[key] || SCENES[base] || SCENES.dawn;
    return '<svg viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><filter id="sepia"><feColorMatrix type="matrix" values="0.39 0.77 0.19 0 0 0.35 0.69 0.17 0 0 0.27 0.53 0.13 0 0 0 0 0 1 0"/></filter></defs>' + fn(g) + '</svg>';
  }

  // 立绘占位：圆形底色 + 表情符号
  var CAST = {
    A: { emoji: '🧒', color: '#f6b38f' },
    B: { emoji: '🧑', color: '#93b5e1' },
    tuanzi: { emoji: '🦊', color: '#f7c873', name: '团子' },
    chilun: { emoji: '🐱', color: '#b8b0c8', name: '齿轮' },
    letter: { emoji: '✉️', color: '#eadfc4', name: '信' }
  };

  function constellationSVG(c, rotate) {
    var t = rotate ? ' transform="rotate(180 50 50)"' : '';
    var s = '<svg viewBox="0 0 100 100" class="const"><g' + t + '>';
    c.links.forEach(function (l) {
      var a = c.stars[l[0]], b = c.stars[l[1]];
      s += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="#ffe7a3" stroke-width="1.6" opacity="0.7"/>';
    });
    c.stars.forEach(function (p) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" fill="#fff4c8"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="8" fill="#ffe08a" opacity="0.25"/>'; });
    return s + '</g></svg>';
  }

  function gearsSVG(n) {
    var s = '<svg viewBox="0 0 ' + (n * 34 + 6) + ' 40" class="gears">';
    for (var i = 0; i < n; i++) {
      var teeth = '';
      for (var k = 0; k < 8; k++) teeth += '<rect x="-3" y="-17" width="6" height="7" rx="1" transform="rotate(' + k * 45 + ')"/>';
      s += '<g transform="translate(' + (20 + i * 34) + ' 20)" fill="#c99a52"><g class="spin" style="animation-direction:' + (i % 2 ? 'reverse' : 'normal') + '">' + teeth + '<circle r="12"/><circle r="4" fill="#6b4a33"/></g></g>';
    }
    return s + '</svg>';
  }

  // 密文符号：外框（圆、三角、方、菱形）× 内芯（点、横线、十字、小圈）
  var GLYPH_OUTER = ['圆', '三角', '方', '菱形'], GLYPH_INNER = ['一个点', '一条横线', '一个十字', '一个小圈'];
  function glyphSVG(id, color) {
    var o = Math.floor(id / 4), n = id % 4, c = color || '#4a3628';
    var out = [
      '<circle cx="25" cy="25" r="19"/>',
      '<path d="M25 5 L46 42 L4 42 Z"/>',
      '<rect x="7" y="7" width="36" height="36" rx="3"/>',
      '<path d="M25 3 L47 25 L25 47 L3 25 Z"/>'
    ][o];
    var cy = o === 1 ? 31 : 25;
    var inn = [
      '<circle cx="25" cy="' + cy + '" r="3.5" fill="' + c + '"/>',
      '<line x1="17" y1="' + cy + '" x2="33" y2="' + cy + '"/>',
      '<line x1="18" y1="' + cy + '" x2="32" y2="' + cy + '"/><line x1="25" y1="' + (cy - 7) + '" x2="25" y2="' + (cy + 7) + '"/>',
      '<circle cx="25" cy="' + cy + '" r="5.5"/>'
    ][n];
    return '<svg viewBox="0 0 50 50" class="glyph"><g fill="none" stroke="' + c + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' + out + inn + '</g></svg>';
  }

  var SYMBOL_ICON = { '太阳': '☀️', '月亮': '🌙', '星星': '⭐', '花': '🌸' };
  var LIGHT_COLOR = { '红色': '#e8574a', '蓝色': '#4f8fe0', '金色': '#f2c14e', '绿色': '#5bbf73' };
  var SIMON = [
    { name: '红', color: '#e8574a', emoji: '🔴' },
    { name: '蓝', color: '#4f8fe0', emoji: '🔵' },
    { name: '黄', color: '#f2c14e', emoji: '🟡' },
    { name: '绿', color: '#5bbf73', emoji: '🟢' }
  ];
  // 合奏的五个音键
  var KEYS = [
    { name: '哆', color: '#e8735a', freq: 523.25 },
    { name: '来', color: '#f2a94e', freq: 587.33 },
    { name: '咪', color: '#e6cf5a', freq: 659.25 },
    { name: '嗦', color: '#7cc27f', freq: 783.99 },
    { name: '啦', color: '#6aa0dc', freq: 880.0 }
  ];

  root.Art = {
    bg: bg, CAST: CAST, constellationSVG: constellationSVG, gearsSVG: gearsSVG, glyphSVG: glyphSVG,
    SYMBOL_ICON: SYMBOL_ICON, LIGHT_COLOR: LIGHT_COLOR, SIMON: SIMON, KEYS: KEYS, GLYPH_OUTER: GLYPH_OUTER, GLYPH_INNER: GLYPH_INNER
  };
})(window);
