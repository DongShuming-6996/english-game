// ===== 大勇士小英语 · 应用逻辑 =====
const $app = document.getElementById('app');

// ---------- 状态 ----------
let state = {
  user: null,      // 当前账号 id
  themeId: null,   // 当前主题 id
  passageId: null, // 当前短文 id
  play: null       // 闯关现场数据
};

// ---------- 日期工具 ----------
function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function prevDateStr(s) {
  const p = s.split('-');
  const d = new Date(+p[0], +p[1] - 1, +p[2] - 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// ---------- 发音（系统美式发音）----------
let enVoice = null;
function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  const vs = speechSynthesis.getVoices();
  enVoice = vs.find(v => v.lang === 'en-US' && /Google|Samantha|Microsoft|Natural|Aria/i.test(v.name)) ||
            vs.find(v => v.lang.startsWith('en')) || null;
}
if ('speechSynthesis' in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}
function speak(text) {
  if (!('speechSynthesis' in window)) { toast('当前设备不支持朗读'); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 1;
  u.pitch = 1;
  if (enVoice) u.voice = enVoice;
  speechSynthesis.speak(u);
}
function stopSpeak() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

// ---------- 进度 ----------
function defaultProgress() {
  return { stars: 0, themes: {}, checkin: { last: '', days: 0, total: 0 } };
}
function getProgress() {
  const p = Store.get(state.user, 'progress', null) || defaultProgress();
  THEMES.forEach(t => {
    if (!p.themes[t.id]) p.themes[t.id] = { done: false, passages: {} };
    t.passages.forEach(pg => {
      if (!p.themes[t.id].passages[pg.id]) p.themes[t.id].passages[pg.id] = { stars: 0, levels: {}, done: false };
    });
  });
  return p;
}
function saveProgress(p) { Store.set(state.user, 'progress', p); }
function themeState(t) { return getProgress().themes[t.id]; }
function themeStars(t) {
  const ts = themeState(t);
  return t.passages.reduce((s, pg) => s + (ts.passages[pg.id].stars || 0), 0);
}
function themeUnlocked(t, idx) {
  if (idx === 0) return true;
  if (t.id === 'teacher') return true; // 教师上传的关卡始终开放
  const prev = THEMES[idx - 1];
  return prev.passages.every(pg => themeState(prev).passages[pg.id].done);
}
function passageUnlocked(pg, t, pidx) {
  if (pidx === 0) return true;
  return themeState(t).passages[t.passages[pidx - 1].id].done;
}
function currentTitle(p) {
  let cur = TITLES[0];
  TITLES.forEach(t => { if (p.stars >= t.min) cur = t; });
  return cur;
}
function starIcons(n, max) {
  let s = '';
  for (let i = 0; i < max; i++) s += i < n ? '⭐' : '☆';
  return s;
}
function userInfo() { return ACCOUNTS.find(a => a.id === state.user); }

// ---------- 工具 ----------
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function avatarHtml(acc, cls) {
  return `<span class="avatar ${cls}"><span class="avatar-emoji">${acc.avatar}</span><img class="avatar-img" src="${acc.img}" alt="${acc.name}" onerror="this.style.display='none'"></span>`;
}
function speakerStyle(who) {
  const color = who && SPEAKER_COLORS[who] ? SPEAKER_COLORS[who] : '#9AA0B4';
  const tint = who && SPEAKER_COLORS[who] ? SPEAKER_COLORS[who] + '22' : '';
  return { color, tint };
}
let toastTimer = null;
function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = 'show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = ''; }, 1800);
}
function render(html) {
  stopSpeak();
  $app.innerHTML = html;
  window.scrollTo(0, 0);
}

// ---------- 事件委托 ----------
const ACTIONS = {
  login: uid => { state.user = uid; renderHome(); },
  home: () => renderHome(),
  theme: tid => { state.themeId = tid; state.passageId = null; renderTheme(); },
  passage: pgid => startPassage(pgid),
  backTheme: () => { state.play = null; renderTheme(); },
  playFull: () => { state.play.listen.full = true; updateListenUi(); speakFull(); },
  speakLine: i => {
    const pl = state.play;
    if (pl.levelIdx === 0) { pl.listen.lines.add(+i); updateListenUi(); }
    speak(pl.pg.lines[+i].text);
  },
  completeLevel: () => completeLevel(),
  repeatOk: () => nextRepeat(),
  orderPick: si => handleOrderPick(+si),
  recallPick: ci => handleRecallPick(+ci),
  rank: () => renderRank(),
  profile: () => renderProfile(),
  logout: () => { state.user = null; state.themeId = null; state.passageId = null; state.play = null; renderLogin(); },
  nextLevel: () => { state.play.levelIdx++; renderPlay(); },
  passageResult: () => renderResult(),
  nextPassage: () => {
    const th = THEMES.find(t => t.id === state.themeId);
    const idx = th.passages.findIndex(pg => pg.id === state.passageId);
    const next = th.passages[idx + 1];
    if (next) startPlay(next.id, 0);
  },
  replay: () => startPlay(state.passageId, 0),
  lockTip: () => toast('🔒 先完成前面的内容哦')
};
$app.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = ACTIONS[el.dataset.action];
  if (fn) fn(el.dataset.arg);
});

// ---------- 页面：登录 ----------
function renderLogin() {
  const html = `
  <div class="screen login">
    <div class="login-hero">
      <div class="logo">🦸</div>
      <h1>大勇士小英语</h1>
      <p>选一个角色，开始英语大冒险吧！</p>
    </div>
    <div class="section-title">👋 今天是谁来闯关？</div>
    <div class="account-grid">
      ${ACCOUNTS.map(a => `
        <div class="account-card" data-action="login" data-arg="${a.id}">
          ${avatarHtml(a, 'big')}
          <div class="aname">${a.name}</div>
        </div>`).join('')}
    </div>
    <p class="tip">💡 点一下头像就能进入（测试版）</p>
  </div>`;
  render(html);
}

// ---------- 公共组件 ----------
function header(title, backAction) {
  const u = userInfo();
  return `
  <header class="topbar">
    ${backAction ? `<button class="icon-btn" data-action="${backAction}">‹</button>` : ''}
    <div class="topbar-title">${esc(title)}</div>
    ${u ? `<div class="userchip">${avatarHtml(u, 'sm')}<span>${u.name}</span></div>` : ''}
  </header>`;
}
function bottomNav(active) {
  const item = (k, label, action) => `<button class="${active === k ? 'active' : ''}" data-action="${action}">${label}</button>`;
  return `<nav class="bottom-nav">
    ${item('home', '🏠 首页', 'home')}
    ${item('rank', '🏆 排行', 'rank')}
    ${item('me', '👤 我的', 'profile')}
  </nav>`;
}

// ---------- 页面：首页 ----------
function renderHome() {
  const p = getProgress();
  const u = userInfo();
  const t = currentTitle(p);
  const themeCards = THEMES.map((th, idx) => {
    const unlocked = themeUnlocked(th, idx);
    const ts = themeState(th);
    const doneCount = th.passages.filter(pg => ts.passages[pg.id].done).length;
    return `
    <div class="theme-card ${unlocked ? '' : 'locked'}" style="--tc:${th.color}" data-action="${unlocked ? 'theme' : 'lockTip'}" data-arg="${th.id}">
      <div class="theme-icon"><img src="${th.bannerImg}" alt="${th.name}" onerror="this.style.display='none';document.getElementById('ti-${th.id}').style.display='flex'"><span class="ti-emoji" id="ti-${th.id}" style="display:none">${th.icon}</span></div>
      <div class="theme-info">
        <div class="theme-name">${th.name}</div>
        <div class="theme-desc">${th.desc}</div>
        <div class="theme-progress">${doneCount}/${th.passages.length} 篇</div>
      </div>
      <div class="theme-stars">⭐ ${themeStars(th)}</div>
    </div>`;
  }).join('');

  const html = `
  <div class="screen">
    ${header('大勇士小英语')}
    <div class="hero-card">
      <div class="hero-top">
        ${avatarHtml(u, '')}
        <div class="hero-meta">
          <div class="hero-name">你好，${u.name}！</div>
          <div class="hero-title">${t.icon} ${t.name}</div>
        </div>
      </div>
      <div class="hero-stats">
        <div class="stat"><b>${p.stars}</b><span>星星</span></div>
        <div class="stat"><b>🔥${p.checkin.days}</b><span>连续打卡</span></div>
        <div class="stat"><b>${p.checkin.total}</b><span>累计打卡</span></div>
      </div>
      <div class="hero-mascots">
        <img class="mascot" src="${IMG.mia}" alt="Mia 小猫" onerror="this.style.display='none'">
        <img class="mascot d2" src="${IMG.buddy}" alt="Buddy 小狗" onerror="this.style.display='none'">
      </div>
      <div class="checkin-row">
        <div class="checkin-info">${p.checkin.last === todayStr() ? '✅ 今天已自动打卡，棒棒的！' : '📅 今天还没打卡，完成一关就自动打卡'}</div>
      </div>
    </div>
    <div class="section-title">🗺️ 冒险地图</div>
    <div class="theme-list">${themeCards}</div>
    ${bottomNav('home')}
  </div>`;
  render(html);
}

// ---------- 页面：主题 ----------
function renderTheme() {
  const th = THEMES.find(t => t.id === state.themeId);
  const ts = themeState(th);
  const cards = th.passages.map((pg, pidx) => {
    const unlocked = passageUnlocked(pg, th, pidx);
    const ps = ts.passages[pg.id];
    const levelsDone = Object.keys(ps.levels).length;
    return `
    <div class="passage-card ${unlocked ? '' : 'locked'}" data-action="${unlocked ? 'passage' : 'lockTip'}" data-arg="${pg.id}">
      <div class="passage-icon"><img src="${pg.cover}" alt="${pg.title}" onerror="this.style.display='none';document.getElementById('pi-${pg.id}').style.display='flex'"><span class="pi-emoji" id="pi-${pg.id}" style="display:none">${pg.type === 'dialog' ? '💬' : '📖'}</span></div>
      <div class="passage-info">
        <div class="passage-type">${pg.type === 'dialog' ? '对话' : '小故事'}</div>
        <div class="passage-title">${esc(pg.title)}</div>
        <div class="passage-progress">已学 ${levelsDone}/4 关 ${starIcons(ps.stars, 4)}</div>
      </div>
      <div class="passage-go">${ps.done ? '✅' : '开始 ▶'}</div>
    </div>`;
  }).join('');

  const html = `
  <div class="screen">
    ${header(th.name, 'home')}
    <div class="theme-banner" style="--tc:${th.color}">
      <img class="banner-img" src="${th.bannerImg}" alt="${th.name}" onerror="this.style.display='none'">
      <div>
        <div class="banner-title">${th.icon} ${th.name}</div>
        <div class="banner-desc">${th.desc}</div>
        <div class="banner-stars">⭐ 共 ${themeStars(th)} 星</div>
      </div>
    </div>
    <div class="section-title">📚 闯关内容</div>
    <div class="passage-list">${cards}</div>
    ${bottomNav('home')}
  </div>`;
  render(html);
}

// ---------- 闯关 ----------
function startPassage(pgid) {
  const ps = getProgress().themes[state.themeId].passages[pgid];
  let li = 0;
  while (li < 4 && ps.levels[li]) li++;
  startPlay(pgid, Math.min(li, 3));
}
function startPlay(pgid, levelIdx) {
  const th = THEMES.find(t => t.id === state.themeId);
  const pg = th.passages.find(p => p.id === pgid);
  state.passageId = pgid;
  state.play = { pg, levelIdx, order: null, recall: null, repeatIdx: 0, mistakes: 0, listen: { full: false, lines: new Set() } };
  renderPlay();
}
function renderPlay() {
  const pl = state.play;
  const html = `
  <div class="screen play">
    ${header(pl.pg.title + ' · ' + LEVEL_NAMES[pl.levelIdx], 'backTheme')}
    <div class="play-stage">${levelHtml()}</div>
    <div class="play-levels">
      ${LEVEL_NAMES.map((n, i) => `<span class="lv ${i < pl.levelIdx ? 'done' : ''} ${i === pl.levelIdx ? 'now' : ''}" title="${n}">${LEVEL_ICONS[i]}</span>`).join('')}
    </div>
  </div>`;
  render(html);
}
function levelHtml() {
  switch (state.play.levelIdx) {
    case 0: return levelListenHtml();
    case 1: return levelRepeatHtml();
    case 2: return levelOrderHtml();
    case 3: return levelRecallHtml();
  }
}
// 带角色颜色的句子行
function lineHtml(ln, i, extraClass, extraAction, extraArg) {
  const s = speakerStyle(ln.who);
  const img = ln.who && SPEAKER_IMG[ln.who] ? `<img class="who-img" src="${SPEAKER_IMG[ln.who]}" alt="${ln.who}">` : '';
  return `<div class="line ${extraClass}" style="border-left:5px solid ${s.color};background:${s.tint || '#F7F8FC'}" data-action="${extraAction}" data-arg="${extraArg}">
    ${extraClass === 'order-item' ? '' : `<span class="line-no">${i + 1}</span>`}
    ${ln.who ? `<span class="who" style="background:${s.color}">${img}${ln.who}</span> ` : ''}
    ${esc(ln.text)}
  </div>`;
}

// 第 1 关：听一听
function levelListenHtml() {
  const pg = state.play.pg;
  const listened = state.play.listen;
  const canDone = listened.full || listened.lines.size >= pg.lines.length;
  return `
  <div class="listen-card">
    <img class="stage-img" src="${pg.cover}" alt="" onerror="this.style.display='none'">
    <h3>先听一听这篇${pg.type === 'dialog' ? '对话' : '小故事'}</h3>
    <div class="btn-row">
      <button class="btn primary" data-action="playFull">🔊 播放全文</button>
    </div>
    <div class="listen-progress" id="listenProgress">已听 ${listened.lines.size}/${pg.lines.length} 句</div>
    <div class="line-list">
      ${pg.lines.map((ln, i) => lineHtml(ln, i, '', 'speakLine', i)).join('')}
    </div>
    <div class="btn-row">
      <button class="btn primary big" data-action="completeLevel" id="listenDone" style="${canDone ? '' : 'display:none'}">✅ 我听完啦！</button>
    </div>
  </div>`;
}
function updateListenUi() {
  const pl = state.play;
  if (!pl || pl.levelIdx !== 0) return;
  const done = document.getElementById('listenDone');
  const prog = document.getElementById('listenProgress');
  if (prog) prog.textContent = '已听 ' + pl.listen.lines.size + '/' + pl.pg.lines.length + ' 句';
  const can = pl.listen.full || pl.listen.lines.size >= pl.pg.lines.length;
  if (done) done.style.display = can ? '' : 'none';
}

// 第 2 关：跟读
function levelRepeatHtml() {
  const pl = state.play;
  const ln = pl.pg.lines[pl.repeatIdx];
  const s = speakerStyle(ln.who);
  const spkImg = ln.who && SPEAKER_IMG[ln.who] ? `<img class="stage-img small" src="${SPEAKER_IMG[ln.who]}" alt="${ln.who}" onerror="this.style.display='none'">` : '';
  return `
  <div class="repeat-card">
    <div class="progress-line">第 ${pl.repeatIdx + 1} / ${pl.pg.lines.length} 句</div>
    ${spkImg}
    ${ln.who ? `<div class="speaker"><span class="who" style="background:${s.color}">${ln.who}</span></div>` : ''}
    <div class="repeat-line" style="border-left:5px solid ${s.color};background:${s.tint || '#FFF8EC'}">${esc(ln.text)}</div>
    <div class="btn-row">
      <button class="btn" data-action="speakLine" data-arg="${pl.repeatIdx}">🔊 听这句</button>
    </div>
    <p class="hint">🎤 大声跟读一遍，然后点下面的按钮</p>
    <div class="btn-row">
      <button class="btn primary" data-action="repeatOk">✅ 我会读啦！</button>
    </div>
  </div>`;
}
function nextRepeat() {
  const pl = state.play;
  pl.repeatIdx++;
  if (pl.repeatIdx >= pl.pg.lines.length) completeLevel();
  else renderPlay();
}

// 第 3 关：排一排
function levelOrderHtml() {
  const pl = state.play;
  if (!pl.order) {
    const shuffled = pl.pg.lines.map((ln, i) => ({ i, text: ln.text, who: ln.who })).sort(() => Math.random() - 0.5);
    pl.order = { remaining: shuffled, picked: [] };
  }
  const { remaining, picked } = pl.order;
  return `
  <div class="order-card">
    <h3>🧩 把句子排成正确的顺序</h3>
    <p class="hint">按顺序点一点下面的句子</p>
    <div class="picked-list">
      ${picked.length === 0 ? '<div class="empty">（排好的句子会出现在这里）</div>' : picked.map((s, i) => `<div class="line picked" style="border-left:5px solid ${speakerStyle(s.who).color}">${i + 1}. ${esc(s.text)}</div>`).join('')}
    </div>
    <div class="remaining-list">
      ${remaining.map((s, si) => lineHtml(s, 0, 'order-item', 'orderPick', si)).join('')}
    </div>
  </div>`;
}
function handleOrderPick(si) {
  const pl = state.play;
  const o = pl.order;
  const s = o.remaining[si];
  const expect = o.picked.length;
  if (s.i === expect) {
    o.picked.push(s);
    o.remaining.splice(si, 1);
  } else {
    pl.mistakes++;
    toast('再想想哦 🤔');
  }
  if (o.remaining.length === 0) { completeLevel(); return; }
  renderPlay();
}

// 第 4 关：记一记（只挖空动词/形容词/功能词，避开人名和物品名词）
function levelRecallHtml() {
  const pl = state.play;
  if (!pl.recall) {
    const blanks = [];
    pl.pg.lines.forEach((ln, li) => {
      const words = ln.text.split(' ');
      const cands = words.map((w, i) => ({ w, i })).filter(x => {
        const c = x.w.replace(/[^a-zA-Z]/g, '');
        return c.length >= 2 && !/^[A-Z]/.test(c) && BLANK_WORDS.indexOf(c.toLowerCase()) >= 0;
      });
      if (cands.length) {
        const pick = cands[Math.floor(Math.random() * cands.length)];
        blanks.push({ li, wi: pick.i, word: pick.w.replace(/[^a-zA-Z]/g, '') });
      }
    });
    pl.recall = { blanks, idx: 0, choices: [] };
  }
  const r = pl.recall;
  if (r.blanks.length === 0) {
    return `
    <div class="recall-card">
      <h3>🧠 回忆小挑战</h3>
      <p class="hint">这一篇没有需要填的词，直接过关吧！</p>
      <div class="btn-row"><button class="btn primary" data-action="completeLevel">✅ 完成</button></div>
    </div>`;
  }
  if (r.idx >= r.blanks.length) return '';
  const b = r.blanks[r.idx];
  const line = pl.pg.lines[b.li];
  if (r.choices.length === 0) {
    const allWords = [];
    pl.pg.lines.forEach(ln => ln.text.split(' ').forEach(w => {
      const c = w.replace(/[^a-zA-Z]/g, '');
      if (c.length >= 2 && c.toLowerCase() !== b.word.toLowerCase()) allWords.push(c);
    }));
    const dist = [...new Set(allWords)].sort(() => Math.random() - 0.5).slice(0, 2);
    while (dist.length < 2) dist.push(b.word === 'happy' ? 'funny' : 'happy');
    r.choices = [b.word, ...dist].sort(() => Math.random() - 0.5);
  }
  const parts = line.text.split(' ');
  parts[b.wi] = '______';
  const shown = parts.join(' ');
  const s = speakerStyle(line.who);
  return `
  <div class="recall-card">
    <h3>🧠 回忆小挑战</h3>
    <p class="hint">选一选，把空填上</p>
    <div class="progress-line">第 ${r.idx + 1} / ${r.blanks.length} 句</div>
    <div class="recall-line" style="border-left:5px solid ${s.color}">${esc(shown)}</div>
    <div class="choice-grid">
      ${r.choices.map((c, ci) => `<button class="btn choice" data-action="recallPick" data-arg="${ci}">${esc(c)}</button>`).join('')}
    </div>
  </div>`;
}
function handleRecallPick(ci) {
  const r = state.play.recall;
  const b = r.blanks[r.idx];
  if (r.choices[ci] === b.word) {
    r.idx++;
    r.choices = [];
    if (r.idx >= r.blanks.length) { completeLevel(); return; }
  } else {
    state.play.mistakes++;
    toast('再想想哦 🤔');
  }
  renderPlay();
}

// 过关结算（完成任意一关自动打卡）
function completeLevel() {
  const pl = state.play;
  const p = getProgress();
  const th = THEMES.find(t => t.id === state.themeId);
  const ts = p.themes[th.id];
  const ps = ts.passages[pl.pg.id];

  if (!ps.levels[pl.levelIdx]) {
    ps.levels[pl.levelIdx] = true;
    ps.stars = Math.min(4, (ps.stars || 0) + 1);
    p.stars += 1;
  }
  const today = todayStr();
  if (p.checkin.last !== today) {
    if (p.checkin.last === prevDateStr(today)) p.checkin.days += 1;
    else p.checkin.days = 1;
    p.checkin.total += 1;
    p.checkin.last = today;
  }
  const allDone = Object.keys(ps.levels).length >= 4;
  if (allDone) ps.done = true;
  if (th.passages.every(pg => ts.passages[pg.id].done)) ts.done = true;
  saveProgress(p);

  const next = pl.levelIdx + 1;
  const passageDone = next >= 4;
  render(`
  <div class="modal-mask">
    <div class="modal-card pop">
      <div class="modal-icon">${passageDone ? '🎉' : '⭐'}</div>
      <h2>${passageDone ? '太棒了！' : '过关啦！'}</h2>
      <p>${passageDone ? '这一篇短文闯关完成！' : '又拿下 1 颗星星！'}</p>
      <div class="stars-row">${starIcons(ps.stars, 4)}</div>
      <button class="btn primary block" data-action="${passageDone ? 'passageResult' : 'nextLevel'}">${passageDone ? '查看成绩 🏆' : '继续下一关 ▶'}</button>
    </div>
  </div>`);
}

// 短文完成页
function renderResult() {
  const p = getProgress();
  const pl = state.play;
  const th = THEMES.find(t => t.id === state.themeId);
  const ps = p.themes[th.id].passages[pl.pg.id];
  const t = currentTitle(p);
  const idx = th.passages.findIndex(pg => pg.id === pl.pg.id);
  const next = th.passages[idx + 1];
  const nextUnlocked = next && passageUnlocked(next, th, idx + 1);

  const html = `
  <div class="screen result">
    <div class="result-card">
      <div class="result-icon">👑</div>
      <h2>「${esc(pl.pg.title)}」完成！</h2>
      <div class="stars-row">${starIcons(ps.stars, 4)}</div>
      <div class="result-stats">
        <div class="stat"><b>${p.stars}</b><span>总星星</span></div>
        <div class="stat"><b>${t.icon}</b><span>${t.name}</span></div>
        <div class="stat"><b>🔥${p.checkin.days}</b><span>连续打卡</span></div>
      </div>
      <button class="btn primary block" data-action="backTheme">回到主题</button>
      ${nextUnlocked ? `<button class="btn block" data-action="nextPassage">继续下一篇 ▶</button>` : ''}
      <button class="btn ghost block" data-action="replay">再玩一遍</button>
    </div>
  </div>`;
  render(html);
}

function speakFull() {
  const pg = state.play.pg;
  speak(pg.lines.map(l => l.text).join(' '));
}

// ---------- 页面：排行 ----------
function renderRank() {
  const rows = ACCOUNTS.map(a => {
    const p = Store.get(a.id, 'progress', null) || defaultProgress();
    return { a, stars: p.stars, days: p.checkin.days };
  }).sort((x, y) => y.stars - x.stars || y.days - x.days);
  const medals = ['🥇', '🥈', '🥉'];
  const html = `
  <div class="screen">
    ${header('🏆 排行榜')}
    <div class="rank-list">
      ${rows.map((r, i) => `
      <div class="rank-item ${i < 3 ? 'top' : ''}">
        <div class="rank-no">${i < 3 ? medals[i] : i + 1}</div>
        ${avatarHtml(r.a, '')}
        <div class="rank-name">${r.a.name}</div>
        <div class="rank-days">🔥${r.days}天</div>
        <div class="rank-stars">⭐ ${r.stars}</div>
      </div>`).join('')}
    </div>
    <p class="tip">💡 当前是本地测试排行，接入云端后所有同学都能看到</p>
    ${bottomNav('rank')}
  </div>`;
  render(html);
}

// ---------- 页面：我的 ----------
function renderProfile() {
  const p = getProgress();
  const u = userInfo();
  const t = currentTitle(p);
  const themeRows = THEMES.map(th => {
    const ts = p.themes[th.id];
    const done = th.passages.filter(pg => ts.passages[pg.id].done).length;
    return `<div class="profile-theme"><span>${th.icon} ${th.name}</span><span>⭐ ${themeStars(th)} · ${done}/${th.passages.length} 篇</span></div>`;
  }).join('');

  const html = `
  <div class="screen">
    ${header('👤 我的')}
    <div class="profile-card">
      ${avatarHtml(u, 'huge')}
      <div class="profile-name">${u.name}</div>
      <div class="profile-title">${t.icon} ${t.name}</div>
    </div>
    <div class="section-title">📊 学习数据</div>
    <div class="profile-stats">
      <div class="stat"><b>${p.stars}</b><span>总星星</span></div>
      <div class="stat"><b>🔥${p.checkin.days}</b><span>连续打卡</span></div>
      <div class="stat"><b>${p.checkin.total}</b><span>累计打卡</span></div>
    </div>
    <div class="section-title">🗺️ 冒险进度</div>
    <div class="profile-themes">${themeRows}</div>
    <div style="padding:20px 16px 0;text-align:center;">
      <button class="btn primary big block" data-action="teacher">👩‍🏫 教师模式</button>
      <button class="btn danger" data-action="logout">↩️ 换一个账号</button>
    </div>
    ${bottomNav('me')}
  </div>`;
  render(html);
}

// ---------- 开屏预览提示 ----------
let previewNoticeClosed = false;
function showPreviewNotice() {
  if (previewNoticeClosed) return;
  const mask = document.createElement('div');
  mask.className = 'modal-mask';
  mask.style.zIndex = '99';
  mask.innerHTML = `
    <div class="modal-card pop">
      <div class="modal-icon">👀</div>
      <h2 style="font-size:20px;color:#FF8A3D;">温馨提示</h2>
      <p class="preview-note">为了方便您的预览，不设置登录页面，您可以选择任意角色进行试用。</p>
      <button class="btn primary big block" data-preview-close>我知道了</button>
    </div>`;
  function close() {
    previewNoticeClosed = true;
    mask.remove();
  }
  mask.addEventListener('click', e => {
    if (e.target.closest('[data-preview-close]') || e.target === mask) close();
  });
  document.body.appendChild(mask);
}

// ---------- 启动 ----------
renderLogin();
showPreviewNotice();
