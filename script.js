// ========== 設定 ==========
const TOTAL = 34;
const BR = [5, 6, 6]; // 左・中・右の行数
const BOFF = [0, 10, 22];
const TOTAL_SEATS = BR.reduce((s, r) => s + r * 2, 0); // 34

// 初期値
let groups = [
  [5, 23, 26, 34]
];
let aparts = [
  [22, 17]
];
let frontPref = [11, 15, 16, 20, 29, 32];
let roster = {}; // {番号: 名前}

// 色クラス（グループごと）
const GROUP_CLASSES = ['g0', 'g1', 'g2', 'g3'];

// ========== 座標ユーティリティ ==========
function sidx(b, r, c) { return BOFF[b] + r * 2 + c; }
function co(i) {
  const b = i < 10 ? 0 : i < 22 ? 1 : 2;
  const l = i - BOFF[b];
  return { b, r: Math.floor(l / 2), c: l % 2 };
}
function dist(a, b) {
  const p = co(a), q = co(b);
  return Math.abs(p.r - q.r) + Math.abs(p.c - q.c) + Math.abs(p.b - q.b) * 4;
}
function sh(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

// ========== 配置生成（複数回試行してベストを採用） ==========
function generateOnce() {
  const all = [];
  for (let b = 0; b < 3; b++) for (let r = 0; r < BR[b]; r++) for (let c = 0; c < 2; c++) all.push(sidx(b, r, c));

  const seatMap = new Map();
  const usedSeats = new Set();
  const usedNums = new Set();

  // ① グループを近くに配置
  for (const grp of groups) {
    if (grp.length < 2) continue;
    const remaining = all.filter(s => !usedSeats.has(s));
    if (remaining.length < grp.length) continue;

    const centers = sh(remaining);
    let chosen = null;
    for (const center of centers) {
      const sorted = remaining.map(s => ({ s, d: dist(center, s) })).sort((a, b) => a.d - b.d);
      const candidates = sorted.slice(0, grp.length).map(x => x.s);
      if (candidates.length === grp.length) { chosen = candidates; break; }
    }
    if (!chosen) chosen = sh(remaining).slice(0, grp.length);

    const grpSh = sh(grp);
    chosen.forEach((s, i) => {
      seatMap.set(s, grpSh[i]);
      usedSeats.add(s);
      usedNums.add(grpSh[i]);
    });
  }

  // ③ 前方優先
  const remaining = all.filter(s => !usedSeats.has(s));
  const frontSeats = sh(remaining.filter(s => co(s).r < 2));
  const backSeats = sh(remaining.filter(s => co(s).r >= 2));

  const fpAvail = frontPref.filter(n => !usedNums.has(n));
  const others = sh(Array.from({ length: TOTAL }, (_, i) => i + 1).filter(n => !usedNums.has(n) && !fpAvail.includes(n)));

  const fpSh = sh(fpAvail);
  let frontNums = [...fpSh];
  let backNums = [...others];

  if (frontNums.length > frontSeats.length) {
    backNums = [...frontNums.slice(frontSeats.length), ...backNums];
    frontNums = frontNums.slice(0, frontSeats.length);
  } else {
    const need = frontSeats.length - frontNums.length;
    frontNums = [...frontNums, ...backNums.slice(0, need)];
    backNums = backNums.slice(need);
  }

  frontSeats.forEach((s, i) => seatMap.set(s, frontNums[i]));
  backSeats.forEach((s, i) => seatMap.set(s, backNums[i]));

  return seatMap;
}

function evaluatePlacement(seatMap) {
  let score = 0;
  for (const pair of aparts) {
    if (pair.length < 2) continue;
    let s1 = -1, s2 = -1;
    seatMap.forEach((v, k) => { if (v === pair[0]) s1 = k; if (v === pair[1]) s2 = k; });
    if (s1 >= 0 && s2 >= 0) {
      const d = dist(s1, s2);
      score += d * 10;
      if (d < 3) score -= 100;
    }
  }
  for (const grp of groups) {
    if (grp.length < 2) continue;
    const seats = [];
    seatMap.forEach((v, k) => { if (grp.includes(v)) seats.push(k); });
    let total = 0;
    for (let i = 0; i < seats.length; i++) {
      for (let j = i + 1; j < seats.length; j++) {
        total += dist(seats[i], seats[j]);
      }
    }
    score -= total * 5;
  }
  return score;
}

function generate() {
  parseInputs();

  let best = null, bestScore = -Infinity;
  for (let i = 0; i < 200; i++) {
    const m = generateOnce();
    const sc = evaluatePlacement(m);
    if (sc > bestScore) { bestScore = sc; best = m; }
  }

  render(best);
  checkConditions(best);
}

function checkConditions(seatMap) {
  const status = document.getElementById('status');
  const issues = [];

  for (const pair of aparts) {
    if (pair.length < 2) continue;
    let s1 = -1, s2 = -1;
    seatMap.forEach((v, k) => { if (v === pair[0]) s1 = k; if (v === pair[1]) s2 = k; });
    if (s1 >= 0 && s2 >= 0 && dist(s1, s2) < 3) {
      issues.push(`${pair[0]}と${pair[1]}が近めです`);
    }
  }

  if (issues.length === 0) {
    status.innerHTML = '<div class="ok">✓ すべての条件を満たしています</div>';
  } else {
    status.innerHTML = '<div class="warn">⚠ ' + issues.join(' / ') + '（再シャッフルしてみてください）</div>';
  }
}

// ========== 描画 ==========
function render(seatMap) {
  const area = document.getElementById('seatArea');
  area.innerHTML = '';

  const brow = document.createElement('div');
  brow.className = 'brow';
  const maxR = Math.max(...BR);

  for (let b = 0; b < 3; b++) {
    if (b > 0) {
      const ai = document.createElement('div');
      ai.className = 'aisle';
      ai.style.height = (maxR * 56 + (maxR - 1) * 6) + 'px';
      const inn = document.createElement('div');
      inn.className = 'ai'; inn.textContent = '通　路';
      ai.appendChild(inn); brow.appendChild(ai);
    }
    const bwrap = document.createElement('div');
    bwrap.className = 'bwrap';
    if (b === 0) {
      const rl = document.createElement('div');
      rl.className = 'rlabels';
      for (let r = 0; r < maxR; r++) {
        const d = document.createElement('div');
        d.className = 'rl'; d.textContent = (r + 1) + '列';
        rl.appendChild(d);
      }
      bwrap.appendChild(rl);
    }
    const bk = document.createElement('div');
    bk.className = 'block';
    for (let r = 0; r < maxR; r++) {
      for (let c = 0; c < 2; c++) {
        if (r < BR[b]) {
          const id = sidx(b, r, c);
          const d = document.createElement('div');
          const n = seatMap.get(id);
          let cls = 'seat';
          let gIdx = -1;
          for (let i = 0; i < groups.length; i++) if (groups[i].includes(n)) { gIdx = i; break; }
          if (gIdx >= 0 && gIdx < GROUP_CLASSES.length) cls += ' ' + GROUP_CLASSES[gIdx];
          else if (frontPref.includes(n)) cls += ' fp';
          d.className = cls;

          const numEl = document.createElement('div');
          numEl.className = 'num';
          numEl.textContent = n;
          d.appendChild(numEl);

          if (roster[n]) {
            const nmEl = document.createElement('div');
            nmEl.className = 'nm';
            nmEl.textContent = roster[n];
            d.appendChild(nmEl);
          }
          bk.appendChild(d);
        } else {
          const g = document.createElement('div');
          g.className = 'ghost';
          bk.appendChild(g);
        }
      }
    }
    bwrap.appendChild(bk); brow.appendChild(bwrap);
  }
  area.appendChild(brow);

  renderLegend();
}

function renderLegend() {
  const legend = document.getElementById('legendArea');
  legend.innerHTML = '';
  const colors = {
    'g0': ['#EEEDFE', '#AFA9EC'],
    'g1': ['#FBEAF0', '#ED93B1'],
    'g2': ['#FAEEDA', '#EF9F27'],
    'g3': ['#E1F5EE', '#5DCAA5']
  };
  groups.forEach((grp, i) => {
    if (grp.length === 0 || i >= GROUP_CLASSES.length) return;
    const span = document.createElement('span');
    const cls = GROUP_CLASSES[i];
    span.innerHTML = `<span class="ldot" style="background:${colors[cls][0]};border:1px solid ${colors[cls][1]};"></span>近くグループ${i + 1}`;
    legend.appendChild(span);
  });
  if (frontPref.length > 0) {
    const span = document.createElement('span');
    span.innerHTML = `<span class="ldot" style="background:#EAF3DE;border:1px solid #97C459;"></span>前方優先`;
    legend.appendChild(span);
  }
}

// ========== UI: 条件編集 ==========
function renderGroups() {
  const list = document.getElementById('groupsList');
  list.innerHTML = '';
  groups.forEach((grp, i) => {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <span class="label">グループ${i + 1}:</span>
      <input type="text" data-group="${i}" value="${grp.join(', ')}" placeholder="例: 5, 23, 26, 34">
      <button class="btn-del" onclick="delGroup(${i})">削除</button>
    `;
    list.appendChild(row);
  });
}

function renderAparts() {
  const list = document.getElementById('apartsList');
  list.innerHTML = '';
  aparts.forEach((pair, i) => {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <span class="label">ペア${i + 1}:</span>
      <input type="text" data-apart="${i}" value="${pair.join(', ')}" placeholder="例: 22, 17">
      <button class="btn-del" onclick="delApart(${i})">削除</button>
    `;
    list.appendChild(row);
  });
}

function addGroup() {
  parseInputs();
  groups.push([]);
  renderGroups();
}

function delGroup(i) {
  parseInputs();
  groups.splice(i, 1);
  renderGroups();
}

function addApart() {
  parseInputs();
  aparts.push([]);
  renderAparts();
}

function delApart(i) {
  parseInputs();
  aparts.splice(i, 1);
  renderAparts();
}

function parseNumList(str) {
  return str.split(/[,、,\s]+/).map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= TOTAL);
}

function parseInputs() {
  document.querySelectorAll('[data-group]').forEach(el => {
    const i = parseInt(el.dataset.group);
    groups[i] = parseNumList(el.value);
  });
  document.querySelectorAll('[data-apart]').forEach(el => {
    const i = parseInt(el.dataset.apart);
    aparts[i] = parseNumList(el.value);
  });
  const frontEl = document.getElementById('frontInput');
  if (frontEl) frontPref = parseNumList(frontEl.value);
  document.querySelectorAll('[data-roster]').forEach(el => {
    const n = parseInt(el.dataset.roster);
    if (el.value.trim()) roster[n] = el.value.trim();
    else delete roster[n];
  });
}

// ========== UI: 名簿 ==========
function renderRoster() {
  const area = document.getElementById('rosterArea');
  area.innerHTML = '';
  for (let n = 1; n <= TOTAL; n++) {
    const item = document.createElement('div');
    item.className = 'roster-item';
    item.innerHTML = `
      <span class="rnum">${n}</span>
      <input type="text" data-roster="${n}" value="${roster[n] || ''}" placeholder="名前">
    `;
    area.appendChild(item);
  }
}

function clearRoster() {
  if (!confirm('名簿をすべてクリアしますか？')) return;
  roster = {};
  renderRoster();
}

// ========== タブ切替 ==========
function switchTab(idx, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.tab-content')[idx].classList.add('active');
}

// ========== 保存・読込 ==========
function saveSettings() {
  parseInputs();
  const data = { groups, aparts, frontPref };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'seating_settings.json'; a.click();
  URL.revokeObjectURL(url);
}

function loadSettings() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        groups = data.groups || groups;
        aparts = data.aparts || aparts;
        frontPref = data.frontPref || frontPref;
        renderGroups();
        renderAparts();
        document.getElementById('frontInput').value = frontPref.join(', ');
        alert('設定を読み込みました');
      } catch { alert('読み込みに失敗しました'); }
    };
    reader.readAsText(file);
  };
  input.click();
}

function saveRoster() {
  parseInputs();
  const blob = new Blob([JSON.stringify(roster, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'roster.json'; a.click();
  URL.revokeObjectURL(url);
  alert('名簿を保存しました');
}

// ========== 初期化 ==========
function init() {
  renderGroups();
  renderAparts();
  document.getElementById('frontInput').value = frontPref.join(', ');
  renderRoster();
  generate();
}

init();
