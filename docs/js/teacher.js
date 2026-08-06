// ===== 大勇士小英语 · 教师模式（本地可点击原型） =====
// 数据保存在本机浏览器 localStorage：
// - 草稿只有老师自己能看到
// - 发布后本机学生端“冒险地图”立即出现新关卡（归属「📚 老师上传」主题）
// - 可导出 JSON 备份/分享，另一个浏览器导入后即可看到

const TEACHER_PIN = '1234';                       // 原型默认口令，后续可做成可改
const TEACHER_LEVELS_KEY = 'dyx-teacher-levels';  // 草稿 + 已发布关卡
const TEACHER_THEME_ID = 'teacher';               // 学生端自动生成的主题 id
const TEACHER_DEFAULT_COVER = IMG.panda;
const TEACHER_WHO_OPTIONS = ['Leo', 'Lily', 'Tom', 'Robo', ''];

const TeacherState = {
  page: 'list',        // list | editor
  level: null,         // 当前编辑的关卡对象
  search: '',
  filter: 'all'        // all | draft | published
};

// ---------- 存储 ----------
function tLoad(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; }
}
function tSave(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); }
  catch (e) { toast('保存失败：浏览器存储空间可能不足'); }
}
function teacherLevels() { return tLoad(TEACHER_LEVELS_KEY, []); }
function saveTeacherLevels(list) { tSave(TEACHER_LEVELS_KEY, list); }

function blankLevel() {
  return {
    id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    title: '',
    type: 'dialog',
    cover: TEACHER_DEFAULT_COVER,
    lines: [{ who: 'Leo', text: '' }, { who: 'Lily', text: '' }],
    words: [],
    status: 'draft',
    updatedAt: Date.now()
  };
}

function toPassage(l) {
  return {
    id: l.id,
    type: l.type,
    title: l.title,
    cover: l.cover || TEACHER_DEFAULT_COVER,
    lines: l.lines.filter(x => x.text.trim()),
    words: (l.words || []).filter(w => w[0] && w[1])
  };
}

// ---------- 与学生端数据合并 ----------
function syncCustomThemes() {
  const idx = THEMES.findIndex(t => t.id === TEACHER_THEME_ID);
  if (idx >= 0) THEMES.splice(idx, 1);
  const published = teacherLevels().filter(l => l.status === 'published');
  if (!published.length) return;
  THEMES.push({
    id: TEACHER_THEME_ID,
    name: '老师上传',
    icon: '📚',
    color: '#7ED6A5',
    desc: '老师新上传的关卡',
    bannerImg: TEACHER_DEFAULT_COVER,
    passages: published.map(toPassage)
  });
}

function upsertCustomPassage(l) {
  syncCustomThemes();
  let th = THEMES.find(t => t.id === TEACHER_THEME_ID);
  if (!th) {
    th = {
      id: TEACHER_THEME_ID,
      name: '老师上传',
      icon: '📚',
      color: '#7ED6A5',
      desc: '老师新上传的关卡',
      bannerImg: TEACHER_DEFAULT_COVER,
      passages: []
    };
    THEMES.push(th);
  }
  const i = th.passages.findIndex(p => p.id === l.id);
  const pg = toPassage(l);
  if (i >= 0) th.passages[i] = pg; else th.passages.push(pg);
}

// ---------- 教师页面骨架 ----------
let teacherEl = null;
function ensureTeacherEl() {
  if (teacherEl) return teacherEl;
  teacherEl = document.createElement('div');
  teacherEl.id = 'teacher';
  document.body.appendChild(teacherEl);
  teacherEl.addEventListener('click', onTeacherClick);
  teacherEl.addEventListener('input', onTeacherInput);
  teacherEl.addEventListener('change', onTeacherChange);
  teacherEl.addEventListener('keydown', e => {
    if (e.key === 'Escape' && TeacherState.page === 'editor') exitTeacher();
  });
  return teacherEl;
}

function openTeacher() {
  ensureTeacherEl();
  document.body.classList.add('teacher');
  TeacherState.page = 'list';
  renderTeacher();
}
function exitTeacher() {
  document.body.classList.remove('teacher');
  TeacherState.page = 'list';
  TeacherState.level = null;
  if (state.user) renderHome(); else renderLogin();
}

function renderTeacher() {
  if (TeacherState.page === 'editor') renderTeacherEditor();
  else renderTeacherList();
}

// ---------- 口令验证 ----------
function openTeacherGate() {
  const mask = document.createElement('div');
  mask.className = 'modal-mask';
  mask.style.zIndex = '99';
  mask.innerHTML = `
    <div class="modal-card pop">
      <div class="modal-icon">👩‍🏫</div>
      <h2 style="font-size:20px;color:#FF8A3D;">教师模式</h2>
      <p class="preview-note">请输入教师口令<br><span style="font-size:12px;color:#c9c9d4;">（原型默认口令：1234）</span></p>
      <input id="tPin" type="password" inputmode="numeric" class="t-input" placeholder="请输入口令" style="text-align:center;font-size:18px;letter-spacing:6px;">
      <div class="btn-row">
        <button class="btn ghost" data-gate="cancel">取消</button>
        <button class="btn primary big" data-gate="ok">进入</button>
      </div>
    </div>`;
  mask.addEventListener('click', e => {
    const b = e.target.closest('[data-gate]');
    if (b && b.dataset.gate === 'cancel') { mask.remove(); return; }
    if (b && b.dataset.gate === 'ok') checkPin(mask);
    else if (e.target === mask) mask.remove();
  });
  mask.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); checkPin(mask); }
  });
  document.body.appendChild(mask);
  setTimeout(() => { const inp = mask.querySelector('#tPin'); if (inp) inp.focus(); }, 50);
}
function checkPin(mask) {
  const inp = mask.querySelector('#tPin');
  if (inp && inp.value.trim() === TEACHER_PIN) {
    mask.remove();
    openTeacher();
  } else {
    toast('口令不对，再试试');
  }
}

// ---------- 列表页 ----------
function renderTeacherList() {
  const all = teacherLevels();
  const kw = TeacherState.search.trim().toLowerCase();
  const rows = all
    .filter(l => TeacherState.filter === 'all' || l.status === TeacherState.filter)
    .filter(l => !kw || (l.title || '').toLowerCase().includes(kw) || String(l.lines ? l.lines.length : 0).includes(kw))
    .map(l => {
      const badge = l.status === 'published'
        ? '<span class="badge published">已发布</span>'
        : '<span class="badge draft">草稿</span>';
      const date = new Date(l.updatedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const lineCount = (l.lines || []).filter(x => x.text.trim()).length;
      return `
      <div class="t-row">
        <img src="${l.cover || TEACHER_DEFAULT_COVER}" alt="" onerror="this.style.display='none'">
        <div class="info">
          <div class="ti">${esc(l.title) || '（未命名关卡）'} ${badge}</div>
          <div class="meta">${l.type === 'dialog' ? '💬 对话' : '📖 小故事'} · ${lineCount} 句台词 · ${(l.words || []).length} 个生词 · ${date}</div>
        </div>
        <div class="t-actions">
          <button class="t-btn" data-t="edit" data-id="${l.id}">✏️ 编辑</button>
          <button class="t-btn" data-t="try" data-id="${l.id}">▶ 试玩</button>
          ${l.status === 'published'
            ? `<button class="t-btn warn" data-t="unpub" data-id="${l.id}">下架</button>`
            : `<button class="t-btn primary" data-t="pub" data-id="${l.id}">🚀 发布</button>`}
          <button class="t-btn danger" data-t="del" data-id="${l.id}">🗑 删除</button>
        </div>
      </div>`;
    }).join('');

  const stat = all.filter(l => l.status === 'published').length;
  teacherEl.innerHTML = `
  <div class="t-wrap">
    <div class="t-topbar">
      <div class="t-title">👩‍🏫 教师模式 · 关卡管理 <span class="badge published">已发布 ${stat} 关</span></div>
      <div class="t-tools">
        <button class="btn" data-t="import">📥 导入</button>
        <button class="btn" data-t="export">📤 导出</button>
        <button class="btn ghost" data-t="back">← 返回学生端</button>
      </div>
    </div>
    <div class="t-panel">
      <div class="t-toolbar">
        <button class="btn primary big" data-t="new">＋ 新建关卡</button>
        <input class="t-input t-search" data-t-search placeholder="🔍 搜索标题 / 台词句数" value="${esc(TeacherState.search)}">
        <select class="t-select" data-t-filter>
          <option value="all" ${TeacherState.filter === 'all' ? 'selected' : ''}>全部状态</option>
          <option value="draft" ${TeacherState.filter === 'draft' ? 'selected' : ''}>只看草稿</option>
          <option value="published" ${TeacherState.filter === 'published' ? 'selected' : ''}>只看已发布</option>
        </select>
      </div>
    </div>
    <div class="t-panel">
      <h3>我的关卡</h3>
      ${rows || '<div class="empty" style="padding:30px 0;">还没有关卡，点右上角「＋ 新建关卡」开始吧 🚀</div>'}
    </div>
    <p class="t-hint">💡 发布的关卡会自动出现在学生端“冒险地图”的「📚 老师上传」主题里；导出 JSON 可以备份或分享给其他设备导入。</p>
  </div>`;
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.id = 'tImportFile';
  fileInput.accept = '.json,application/json';
  fileInput.style.display = 'none';
  teacherEl.appendChild(fileInput);
}

function newLevel() {
  TeacherState.level = blankLevel();
  TeacherState.page = 'editor';
  renderTeacher();
}
function openEditor(id) {
  const l = teacherLevels().find(x => x.id === id);
  if (!l) { toast('关卡不存在'); return; }
  TeacherState.level = JSON.parse(JSON.stringify(l));
  TeacherState.page = 'editor';
  renderTeacher();
}
function confirmDelete(id) {
  const l = teacherLevels().find(x => x.id === id);
  if (!l) return;
  if (!confirm(`确定删除《${l.title || '未命名关卡'}》吗？删除后不可恢复。`)) return;
  saveTeacherLevels(teacherLevels().filter(x => x.id !== id));
  syncCustomThemes();
  renderTeacherList();
  toast('已删除');
}

function setLevelStatus(id, status) {
  const list = teacherLevels();
  const l = list.find(x => x.id === id);
  if (!l) return;
  l.status = status;
  l.updatedAt = Date.now();
  saveTeacherLevels(list);
  syncCustomThemes();
  renderTeacherList();
}

// ---------- 编辑器 ----------
function renderTeacherEditor() {
  const l = TeacherState.level;
  const lineRows = l.lines.map((ln, i) => `
    <div class="t-line-row">
      <select class="t-select" data-f="lineWho" data-i="${i}">
        ${TEACHER_WHO_OPTIONS.map(w => `<option value="${w}" ${ln.who === w ? 'selected' : ''}>${w || '旁白'}</option>`).join('')}
      </select>
      <input class="t-input" data-f="lineText" data-i="${i}" placeholder="英文句子，例如：Hi! I am Leo." value="${esc(ln.text)}">
      <button class="t-icon" data-t="moveLine" data-i="${i}" data-d="-1" title="上移">↑</button>
      <button class="t-icon" data-t="moveLine" data-i="${i}" data-d="1" title="下移">↓</button>
      <button class="t-icon danger" data-t="delLine" data-i="${i}" title="删除">✕</button>
    </div>`).join('');

  const wordRows = l.words.map((w, i) => `
    <div class="t-word-row">
      <input class="t-input" data-f="wordEn" data-i="${i}" placeholder="English" value="${esc(w[0])}">
      <input class="t-input" data-f="wordCn" data-i="${i}" placeholder="中文释义" value="${esc(w[1])}">
      <button class="t-icon danger" data-t="delWord" data-i="${i}">✕</button>
    </div>`).join('');

  teacherEl.innerHTML = `
  <div class="t-wrap">
    <div class="t-topbar">
      <div class="t-title">✏️ ${l.id && teacherLevels().some(x => x.id === l.id) ? '编辑关卡' : '新建关卡'}</div>
      <div class="t-tools">
        <button class="btn ghost" data-t="backEdit">← 返回列表</button>
        <button class="btn" data-t="saveDraft">💾 存草稿</button>
        <button class="btn primary big" data-t="doPublish">🚀 发布</button>
      </div>
    </div>
    <div class="t-editor">
      <div>
        <div class="t-panel">
          <h3>📋 基本信息</h3>
          <div class="t-field">
            <label>关卡标题（学生端会显示）</label>
            <input class="t-input" data-f="title" placeholder="例如：我的宠物 My Pet" value="${esc(l.title)}">
          </div>
          <div class="t-grid2">
            <div class="t-field">
              <label>类型</label>
              <select class="t-select" data-f="type">
                <option value="dialog" ${l.type === 'dialog' ? 'selected' : ''}>💬 对话</option>
                <option value="story" ${l.type === 'story' ? 'selected' : ''}>📖 小故事</option>
              </select>
            </div>
            <div class="t-field">
              <label>归属主题</label>
              <div class="t-static">📚 老师上传（自动）</div>
            </div>
          </div>
          <div class="t-field">
            <label>封面图（可上传，也可留默认）</label>
            <div class="t-cover-row">
              <img id="tCoverPreview" src="${l.cover || TEACHER_DEFAULT_COVER}" alt="">
              <label class="btn">🖼 上传图片<input type="file" id="tCover" accept="image/*" hidden></label>
              <button class="btn ghost" data-t="resetCover">↺ 用默认图</button>
            </div>
          </div>
        </div>

        <div class="t-panel">
          <h3>💬 台词（4 关会自动从这里生成，老师不用配关卡）</h3>
          ${lineRows}
          <div class="t-btn-row">
            <button class="btn" data-t="addLine">＋ 添加一句</button>
            <button class="btn ghost" data-t="showBulk">📋 批量粘贴</button>
          </div>
          <div id="tBulkBox" style="display:none;margin-top:10px;">
            <textarea id="tBulk" class="t-area" rows="6" placeholder="每行一句；对话可写成「角色: 句子」，例如：&#10;Leo: Hi! I am Leo.&#10;Lily: Hi, Leo!&#10;He has a robot."></textarea>
            <button class="btn" data-t="bulkApply">应用粘贴内容</button>
          </div>
        </div>

        <div class="t-panel">
          <h3>📚 生词表（每关“记一记”会用到）</h3>
          ${wordRows}
          <div class="t-btn-row">
            <button class="btn" data-t="addWord">＋ 添加生词</button>
            <button class="btn ghost" data-t="pickWords">✨ 从台词里挑词</button>
          </div>
          <div id="tPickWords" class="t-chips"></div>
        </div>
      </div>

      <div>
        <div class="t-panel">
          <h3>📱 学生端实时预览</h3>
          <div class="phone" id="tPreview"></div>
        </div>
      </div>
    </div>
    <div class="t-editor-actions">
      <span class="t-autosave">✏️ 编辑内容会自动存草稿</span>
      <button class="btn ghost" data-t="backEdit">← 返回列表</button>
      <button class="btn" data-t="saveDraft">💾 存草稿</button>
      <button class="btn primary big" data-t="doPublish">🚀 发布</button>
    </div>
  </div>`;
  renderTeacherPreview();
}

function renderTeacherPreview() {
  const el = document.getElementById('tPreview');
  if (!el) return;
  const l = TeacherState.level;
  const filled = (l.lines || []).filter(x => x.text.trim());
  const linesHtml = filled.slice(0, 5).map(ln => {
    const s = speakerStyle(ln.who);
    return `<div class="p-line" style="border-left-color:${s.color};background:${s.tint || '#F7F8FC'}">${ln.who ? `<span class="p-who" style="background:${s.color}">${ln.who}</span>` : ''}${esc(ln.text)}</div>`;
  }).join('');
  const wordsHtml = (l.words || []).filter(w => w[0]).slice(0, 8).map(w => `<span class="word-chip">${esc(w[0])} ${esc(w[1])}</span>`).join('');
  el.innerHTML = `
    <div class="mini-top">
      <div class="mini-title">${esc(l.title) || '（未命名关卡）'}</div>
      <div class="mini-type">${l.type === 'dialog' ? '💬 对话' : '📖 小故事'}</div>
    </div>
    <img class="mini-cover" src="${l.cover || TEACHER_DEFAULT_COVER}" alt="" onerror="this.style.display='none'">
    <div class="mini-lv">🎧 听一听 → 🎤 跟读 → 🧩 排一排 → 🧠 记一记</div>
    <div class="mini-lines">${linesHtml || '<div class="empty" style="padding:16px;">还没有台词</div>'}</div>
    ${wordsHtml ? `<div class="mini-words">${wordsHtml}</div>` : ''}
    <button class="btn primary big block" data-t="tryPlay">▶ 试玩这关</button>`;
}

// ---------- 编辑器操作 ----------
function addLine() {
  TeacherState.level.lines.push({ who: '', text: '' });
  renderTeacherEditor();
}
function removeLine(i) {
  if (TeacherState.level.lines.length <= 1) { toast('至少要保留一句台词'); return; }
  TeacherState.level.lines.splice(i, 1);
  renderTeacherEditor();
}
function moveLine(i, d) {
  const arr = TeacherState.level.lines;
  const j = i + d;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  renderTeacherEditor();
}
function addWord() {
  TeacherState.level.words.push(['', '']);
  renderTeacherEditor();
}
function removeWord(i) {
  TeacherState.level.words.splice(i, 1);
  renderTeacherEditor();
}
function pickWords() {
  const box = document.getElementById('tPickWords');
  if (!box) return;
  const text = TeacherState.level.lines.map(x => x.text).join(' ').toLowerCase();
  const cands = [...new Set(text.match(/[a-z']{3,}/g) || [])]
    .filter(w => !BLANK_WORDS.includes(w))
    .filter(w => !TeacherState.level.words.some(x => x[0].toLowerCase() === w))
    .slice(0, 24);
  box.innerHTML = cands.length
    ? cands.map(w => `<button class="t-chip" data-t="addPick" data-word="${esc(w)}">${esc(w)}</button>`).join('')
    : '<div class="empty" style="padding:8px 0;">台词里没找到可提取的新词（已过滤常见词）</div>';
}
function addPick(word) {
  TeacherState.level.words.push([word, '']);
  renderTeacherEditor();
}

let draftTimer = null;
function scheduleDraftSave() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(saveDraft, 800);
}
function saveDraft() {
  const l = TeacherState.level;
  if (!l) return;
  const list = teacherLevels();
  const i = list.findIndex(x => x.id === l.id);
  l.status = l.status || 'draft';
  l.updatedAt = Date.now();
  if (i >= 0) list[i] = JSON.parse(JSON.stringify(l));
  else list.push(JSON.parse(JSON.stringify(l)));
  saveTeacherLevels(list);
  const hint = document.querySelector('.t-autosave');
  if (hint) hint.textContent = '✅ 草稿已保存（' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) + '）';
}

function validateLevel(l) {
  const errs = [];
  if (!l.title.trim()) errs.push('关卡标题不能为空');
  const filled = l.lines.filter(x => x.text.trim());
  if (filled.length < 2) errs.push('至少要有 2 句台词');
  if (filled.some(x => x.text.length > 160)) errs.push('有台词超过 160 个字符，建议拆短一点');
  if (filled.some(x => !/^[A-Za-z0-9 ,.'!?-]+$/.test(x.text.trim()))) errs.push('台词建议只用英文字母和英文标点');
  const allText = filled.map(x => x.text.toLowerCase()).join(' ');
  (l.words || []).forEach((w, i) => {
    if (!w[0].trim() && !w[1].trim()) return;
    if (!w[0].trim() || !w[1].trim()) errs.push(`第 ${i + 1} 个生词没写全（英文和中文都要填）`);
    else if (!allText.includes(w[0].trim().toLowerCase())) errs.push(`生词“${w[0]}”没有出现在台词里`);
  });
  return errs;
}

function publishLevel(l) {
  const errs = validateLevel(l);
  if (errs.length) {
    showTeacherAlert('发布前检查到几个问题', errs.map(e => '· ' + e).join('<br>'));
    return false;
  }
  const list = teacherLevels();
  const i = list.findIndex(x => x.id === l.id);
  l.status = 'published';
  l.updatedAt = Date.now();
  if (i >= 0) list[i] = JSON.parse(JSON.stringify(l));
  else list.push(JSON.parse(JSON.stringify(l)));
  saveTeacherLevels(list);
  syncCustomThemes();
  return true;
}
function doPublish() {
  if (publishLevel(TeacherState.level)) {
    TeacherState.page = 'list';
    renderTeacherList();
    toast('🚀 已发布！学生端冒险地图现在能玩这关了');
  }
}

function publishFromList(id) {
  const l = teacherLevels().find(x => x.id === id);
  if (!l) return;
  if (publishLevel(l)) {
    renderTeacherList();
    toast('🚀 已发布！');
  } else {
    renderTeacherList();
  }
}

function showTeacherAlert(title, html) {
  const mask = document.createElement('div');
  mask.className = 'modal-mask';
  mask.style.zIndex = '99';
  mask.innerHTML = `
    <div class="modal-card pop">
      <div class="modal-icon">⚠️</div>
      <h2 style="font-size:19px;color:#E86A3A;">${esc(title)}</h2>
      <p class="preview-note" style="text-align:left;color:#E05555;font-size:13px;">${html}</p>
      <button class="btn primary big block" data-gate="ok">知道了</button>
    </div>`;
  mask.addEventListener('click', e => {
    if (e.target.closest('[data-gate="ok"]') || e.target === mask) mask.remove();
  });
  document.body.appendChild(mask);
}

// ---------- 试玩（跳到学生端直接玩当前关卡） ----------
function tryPlayLevel(id) {
  let l = TeacherState.level;
  if (!l) l = teacherLevels().find(x => x.id === id);
  if (!l) { toast('关卡不存在'); return; }
  if (!l.title.trim()) { toast('先给关卡起个标题再试玩'); return; }
  upsertCustomPassage(l);
  state.user = state.user || 'stu01';
  state.themeId = TEACHER_THEME_ID;
  state.passageId = l.id;
  exitTeacher();
  startPlay(l.id, 0);
  toast('▶ 这是草稿试玩，发布后学生端才能看到');
}

// ---------- 导入 / 导出 ----------
function exportTeacher() {
  const data = {
    app: '大勇士小英语',
    version: 1,
    exportedAt: new Date().toISOString(),
    levels: teacherLevels()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  a.href = url;
  a.download = `大勇士小英语-关卡备份-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast('📤 已导出 JSON 备份');
}

function importTeacher(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      const arr = Array.isArray(data) ? data : (data.levels || []);
      if (!arr.length) { toast('文件里没有关卡'); return; }
      const list = teacherLevels();
      const ids = new Set(list.map(x => x.id));
      let added = 0;
      arr.forEach(l => {
        if (!l || typeof l !== 'object' || !Array.isArray(l.lines)) return;
        if (ids.has(l.id)) l.id = 't' + Date.now().toString(36) + added.toString(36);
        ids.add(l.id);
        if (!['draft', 'published'].includes(l.status)) l.status = 'draft';
        l.updatedAt = Date.now();
        list.push(l);
        added++;
      });
      saveTeacherLevels(list);
      syncCustomThemes();
      renderTeacherList();
      toast(`📥 导入成功：${added} 个关卡`);
    } catch (e) {
      toast('导入失败：文件格式不对');
    }
  };
  r.readAsText(file);
}

// ---------- 事件 ----------
function onTeacherClick(e) {
  const el = e.target.closest('[data-t]');
  if (!el) return;
  const act = el.dataset.t;
  const id = el.dataset.id;
  switch (act) {
    case 'back': exitTeacher(); break;
    case 'backEdit': TeacherState.page = 'list'; renderTeacherList(); break;
    case 'new': newLevel(); break;
    case 'edit': openEditor(id); break;
    case 'del': confirmDelete(id); break;
    case 'pub': publishFromList(id); break;
    case 'unpub': setLevelStatus(id, 'draft'); toast('已下架'); break;
    case 'try': tryPlayLevel(id); break;
    case 'tryPlay': tryPlayLevel(); break;
    case 'export': exportTeacher(); break;
    case 'import': { const f = teacherEl.querySelector('#tImportFile'); if (f) f.click(); break; }
    case 'addLine': addLine(); break;
    case 'delLine': removeLine(+el.dataset.i); break;
    case 'moveLine': moveLine(+el.dataset.i, +el.dataset.d); break;
    case 'addWord': addWord(); break;
    case 'delWord': removeWord(+el.dataset.i); break;
    case 'pickWords': pickWords(); break;
    case 'addPick': addPick(el.dataset.word); break;
    case 'showBulk': {
      const b = document.getElementById('tBulkBox');
      if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none';
      break;
    }
    case 'bulkApply': applyBulk(); break;
    case 'saveDraft': saveDraft(); toast('💾 草稿已保存'); break;
    case 'doPublish': doPublish(); break;
    case 'resetCover':
      TeacherState.level.cover = TEACHER_DEFAULT_COVER;
      renderTeacherEditor();
      scheduleDraftSave();
      break;
  }
}

function applyBulk() {
  const ta = document.getElementById('tBulk');
  if (!ta) return;
  const lines = ta.value.split('\n').map(s => s.trim()).filter(Boolean);
  if (!lines.length) { toast('没有可粘贴的内容'); return; }
  const parsed = lines.map(s => {
    const m = s.match(/^([A-Za-z]+)\s*[:：]\s*(.+)$/);
    if (m) return { who: m[1], text: m[2].trim() };
    return { who: '', text: s };
  });
  TeacherState.level.lines = parsed;
  renderTeacherEditor();
  toast('✅ 已应用 ' + parsed.length + ' 句台词');
}

function onTeacherInput(e) {
  if (TeacherState.page !== 'editor' || !TeacherState.level) return;
  const el = e.target;
  const f = el.dataset.f;
  const i = +el.dataset.i;
  const l = TeacherState.level;
  if (f === 'title') l.title = el.value;
  else if (f === 'type') l.type = el.value;
  else if (f === 'lineWho') l.lines[i].who = el.value;
  else if (f === 'lineText') l.lines[i].text = el.value;
  else if (f === 'wordEn') l.words[i][0] = el.value;
  else if (f === 'wordCn') l.words[i][1] = el.value;
  if (f === 'title' || f === 'type' || f === 'lineText' || f === 'lineWho') renderTeacherPreview();
  scheduleDraftSave();
}

function onTeacherChange(e) {
  if (e.target.id === 'tCover') {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast('请选择图片文件'); return; }
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 480;
        let w = img.width, h = img.height;
        if (w > max) { h = Math.round(h * max / w); w = max; }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        TeacherState.level.cover = c.toDataURL('image/jpeg', 0.8);
        renderTeacherEditor();
        scheduleDraftSave();
      };
      img.src = r.result;
    };
    r.readAsDataURL(f);
  }
  if (e.target.id === 'tImportFile') {
    importTeacher(e.target.files[0]);
    e.target.value = '';
  }
}

// 列表工具栏（搜索/筛选）用 change 监听
function onTeacherListChange(e) {
  const el = e.target.closest('[data-t-search]');
  if (el) { TeacherState.search = el.value; renderTeacherList(); return; }
  const sel = e.target.closest('[data-t-filter]');
  if (sel) { TeacherState.filter = sel.value; renderTeacherList(); }
}

// ---------- 教师模式入口（学生端“我的”页） ----------
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action="teacher"]');
  if (el) openTeacherGate();
});

// 搜索框输入防抖重渲染
document.addEventListener('input', e => {
  if (e.target.closest && e.target.closest('[data-t-search]') && TeacherState.page === 'list') {
    clearTimeout(window.__tSearchTimer);
    window.__tSearchTimer = setTimeout(() => {
      const el = document.querySelector('[data-t-search]');
      const pos = el ? el.selectionStart : null;
      if (el) TeacherState.search = el.value;
      renderTeacherList();
      const next = document.querySelector('[data-t-search]');
      if (next) {
        next.focus();
        if (pos !== null) { try { next.setSelectionRange(pos, pos); } catch (err) {} }
      }
    }, 300);
  }
});
document.addEventListener('change', onTeacherListChange);

// 启动时把已发布关卡合并进学生端数据
syncCustomThemes();

// ===== 退出预览 + 首次关闭引导（教师版本获客） =====
const EXIT_ASKED_KEY = 'dyx-exit-asked';
function exitAsked() { try { return sessionStorage.getItem(EXIT_ASKED_KEY) === '1'; } catch (e) { return false; } }
function markExitAsked() { try { sessionStorage.setItem(EXIT_ASKED_KEY, '1'); } catch (e) {} }

let exitModalOpen = false;
function onExitPreview() {
  if (exitModalOpen || document.body.classList.contains('exited')) return;
  if (exitAsked()) { tryCloseWindow(); return; }
  exitModalOpen = true;
  const mask = document.createElement('div');
  mask.className = 'modal-mask';
  mask.style.zIndex = '98';
  mask.innerHTML = `
    <div class="modal-card pop">
      <div class="modal-icon">🦸</div>
      <h2 style="font-size:17px;color:#FF8A3D;line-height:1.7;">您刚才试用的是学生版本，是否要体验教师版本，您可以创建关卡</h2>
      <div class="btn-row" style="margin-top:18px;">
        <button class="btn ghost" data-exit="no">否，直接退出</button>
        <button class="btn primary big" data-exit="yes">是，体验教师版</button>
      </div>
    </div>`;
  mask.addEventListener('click', e => {
    const b = e.target.closest('[data-exit]');
    if (!b) {
      if (e.target === mask) { mask.remove(); exitModalOpen = false; }
      return;
    }
    mask.remove();
    exitModalOpen = false;
    markExitAsked();
    if (b.dataset.exit === 'yes') startTeacherTour();
    else tryCloseWindow();
  });
  document.body.appendChild(mask);
}

function tryCloseWindow() {
  try { window.close(); } catch (e) {}
  setTimeout(showExitScreen, 350);
}
function showExitScreen() {
  if (document.getElementById('exitScreen')) return;
  const d = document.createElement('div');
  d.id = 'exitScreen';
  d.innerHTML = `
    <div class="exit-card">
      <div class="exit-emoji">👋</div>
      <div class="exit-title">已退出预览</div>
      <div class="exit-sub">感谢体验「大勇士小英语」<br>现在可以安全关闭本页面了</div>
      <button class="btn primary big" data-exit-reload>↩ 重新进入</button>
    </div>`;
  d.addEventListener('click', e => {
    if (e.target.closest('[data-exit-reload]')) location.reload();
  });
  document.body.appendChild(d);
  document.body.classList.add('exited');
}

// ---------- 分步引导：学生端 → 教师版本入口 ----------
let tour = null;

function buildTourSteps() {
  const steps = [];
  const onProfile = !!document.querySelector('.profile-card');
  const gateOpen = !!document.getElementById('tPin');

  if (!state.user) {
    steps.push({
      sel: '.account-card',
      text: '第 1 步：点任意一个角色头像，先进入学生端',
      done: () => !!state.user
    });
  }
  if (!onProfile) {
    steps.push({
      sel: '.bottom-nav [data-action="profile"]',
      text: '第 ' + (steps.length + 1) + ' 步：点底部「👤 我的」',
      done: () => !!document.querySelector('.profile-card')
    });
  }
  if (!gateOpen) {
    steps.push({
      sel: '[data-action="teacher"]',
      text: '第 ' + (steps.length + 1) + ' 步：点「👩🏫 教师模式」',
      done: () => !!document.getElementById('tPin')
    });
  }
  steps.push({
    sel: '#tPin',
    text: '第 ' + (steps.length + 1) + ' 步：输入口令 1234，点「进入」',
    done: () => document.body.classList.contains('teacher')
  });
  return steps;
}

function startTeacherTour() {
  if (document.body.classList.contains('teacher')) { toast('你已经在教师版本里了'); return; }
  if (state.user) {
    if (!document.querySelector('.bottom-nav')) renderHome();
  } else {
    renderLogin();
  }
  tour = { steps: buildTourSteps(), idx: 0, timer: null };
  showTourStep();
}

function showTourStep() {
  if (!tour || tour.idx >= tour.steps.length) return;
  const step = tour.steps[tour.idx];
  if (step.done()) { advanceTour(); return; } // 该步已完成则直接进入下一步
  buildTourOverlay(step);
  clearInterval(tour.timer);
  tour.timer = setInterval(() => { if (step.done()) advanceTour(); }, 400);
}

function advanceTour() {
  if (!tour) return;
  tour.idx++;
  if (tour.idx >= tour.steps.length) { finishTour(); return; }
  showTourStep();
}

function finishTour() {
  clearInterval(tour.timer);
  removeTourOverlay();
  tour = null;
  toast('🎉 欢迎来到教师版本！点「＋ 新建关卡」创建你的关卡吧');
}

function cancelTour() {
  if (!tour) return;
  clearInterval(tour.timer);
  removeTourOverlay();
  tour = null;
}

function removeTourOverlay() {
  const ov = document.getElementById('tour');
  if (ov) ov.remove();
  window.removeEventListener('resize', positionTourSpotlight);
}

function buildTourOverlay(step) {
  removeTourOverlay();
  const ov = document.createElement('div');
  ov.id = 'tour';
  ov.innerHTML = `
    <div class="tour-card">
      <div class="tour-text">${esc(step.text)}</div>
      <div class="tour-hint">完成这一步后，会自动进入下一步</div>
      <div class="tour-btns">
        <button class="btn ghost" data-tour="skip">跳过引导</button>
      </div>
    </div>`;
  ov.addEventListener('click', e => {
    const b = e.target.closest('[data-tour]');
    if (!b) return;
    cancelTour();
  });
  document.body.appendChild(ov);
  window.addEventListener('resize', positionTourSpotlight);
  positionTourSpotlight();
}

function positionTourSpotlight() {
  const ov = document.getElementById('tour');
  if (!ov || !tour) return;
  const step = tour.steps[tour.idx];
  let spot = ov.querySelector('.tour-spot');
  if (!spot) { spot = document.createElement('div'); spot.className = 'tour-spot'; ov.appendChild(spot); }
  const target = step.sel ? document.querySelector(step.sel) : null;
  if (!target) { spot.style.display = 'none'; return; }
  spot.style.display = 'block';
  const r = target.getBoundingClientRect();
  spot.style.left = r.left + 'px';
  spot.style.top = r.top + 'px';
  spot.style.width = r.width + 'px';
  spot.style.height = r.height + 'px';
  spot.style.borderRadius = '14px';
}

// 退出按钮：第一次点弹窗引导，之后直接退出
document.addEventListener('click', e => {
  if (e.target.closest('#exitPreview')) onExitPreview();
});
