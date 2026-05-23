// ─────────────────────────────────────────────────────────────────────────────
// HEMICYCLE ALGORITHM (不变，保留原版)
// Ported from slashme/parliamentdiagram (GPL v2)
// https://github.com/slashme/parliamentdiagram
// JS port reference: https://gist.github.com/compupro/f4df98ad750f44669be51a3580443936
// ─────────────────────────────────────────────────────────────────────────────

const TOTALS = [
  3,15,33,61,95,138,189,247,313,388,469,559,657,762,876,997,1126,1263,
  1408,1560,1722,1889,2066,2250,2442,2641,2850,3064,3289,3519,3759,4005,
  4261,4522,4794,5071,5358,5652,5953,6263,6581,6906,7239,7581,7929,8287,
  8650,9024,9404,9793,10187,10594,11003,11425,11850,12288,12729,13183,
  13638,14109,14580,15066,15553,16055,16557,17075,17592,18126,18660,
  19208,19758,20323,20888,21468,22050,22645,23243,23853,24467,25094,
  25723,26364,27011,27667,28329,29001,29679,30367,31061
];

function buildSeatPositions(total) {
  if (total === 0) return [];

  let rows = 1;
  for (let i = 0; i < TOTALS.length; i++) {
    if (TOTALS[i] >= total) { rows = i + 1; break; }
  }

  const radius = 0.4 / rows;
  const posList = [];

  for (let i = 1; i < rows; i++) {
    const R = (3.0 * rows + 4.0 * i - 2.0) / (4.0 * rows);
    const J = Math.floor(
      (total / TOTALS[rows - 1]) *
      Math.PI / (2.0 * Math.asin(2.0 / (3.0 * rows + 4.0 * i - 2.0)))
    );
    if (J === 1) {
      posList.push([Math.PI / 2.0, 1.75 + R * Math.cos(Math.PI / 2.0), R * Math.sin(Math.PI / 2.0)]);
    } else {
      for (let j = 0; j < J; j++) {
        const angle = j * (Math.PI - 2.0 * Math.asin(radius / R)) / (J - 1.0) + Math.asin(radius / R);
        posList.push([angle, 1.75 + R * Math.cos(angle) * -1, R * Math.sin(angle)]);
      }
    }
  }

  const J_outer = total - posList.length;
  const R_outer = (7.0 * rows - 2.0) / (4.0 * rows);
  if (J_outer === 1) {
    posList.push([Math.PI / 2.0, 1.75 + R_outer * Math.cos(Math.PI / 2.0), R_outer * Math.sin(Math.PI / 2.0)]);
  } else {
    for (let j = 0; j < J_outer; j++) {
      const angle = j * (Math.PI - 2.0 * Math.asin(radius / R_outer)) / (J_outer - 1.0) + Math.asin(radius / R_outer);
      posList.push([angle, 1.75 + R_outer * Math.cos(angle) * -1, R_outer * Math.sin(angle)]);
    }
  }

  posList.sort((a, b) => b[0] - a[0]);
  return { seats: posList, radius, rows };
}

// ─── 渲染 Canvas 函数 (稍后修改以适应新的数据源) ───────────────────────────────

const COLORS = {
  support: '#1A6BBF',
  oppose:  '#BA1A1A',
  neutral: '#6B5778',
  bg:      '#F7F2FA',
  podium:  '#CAC4D0',
};

const canvas  = document.getElementById('hemicycle');
const ctx     = canvas.getContext('2d');
const inpS    = document.getElementById('inp-s');
const inpO    = document.getElementById('inp-o');
const inpN    = document.getElementById('inp-n');
const rateEl  = document.getElementById('rate-el');
const totalEl = document.getElementById('total-el');

// Helper: canvas roundRect
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.moveTo(x+r, y);
    this.lineTo(x+w-r, y);
    this.quadraticCurveTo(x+w, y, x+w, y+r);
    this.lineTo(x+w, y+h-r);
    this.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    this.lineTo(x+r, y+h);
    this.quadraticCurveTo(x, y+h, x, y+h-r);
    this.lineTo(x, y+r);
    this.quadraticCurveTo(x, y, x+r, y);
    return this;
  };
}

// draw 函数会读取全局 totals 而非直接读 input
function draw() {
  // 从 state 计算 totals
  const nS = state.support.reduce((s, e) => s + e.score, 0);
  const nO = state.oppose.reduce((s, e) => s + e.score, 0);
  const nN = state.neutral.reduce((s, e) => s + e.score, 0);
  const total = nS + nO + nN;

  if (total === 0) {
    rateEl.innerHTML    = '—';
    totalEl.textContent = '0';
  } else {
    rateEl.innerHTML    = ((nS / total) * 100).toFixed(1) + '<span>%</span>';
    totalEl.textContent = total;
  }

  const PAD  = 10;
  const W    = canvas.parentElement.clientWidth - 44;
  const scale = W / 3.5;
  const H    = Math.round(1.75 * scale) + PAD * 2;
  const DPR  = devicePixelRatio || 1;
  canvas.width        = W * DPR;
  canvas.height       = H * DPR;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = COLORS.bg;
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, 10);
  ctx.fill();

  if (total === 0) {
    ctx.fillStyle    = '#9E99A3';
    ctx.font         = `13px 'Google Sans', sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Enter numbers above to see the chamber', W / 2, H / 2);
    return;
  }

  const { seats, radius, rows } = buildSeatPositions(total);
  const pxR = Math.max(2, radius * scale);

  seats.forEach(([angle, sx, sy], i) => {
    let color;
    if      (i < nO)           color = 'oppose';
    else if (i < nO + nN)      color = 'neutral';
    else                       color = 'support';

    const px = sx * scale;
    const py = (1.75 - sy) * scale + PAD;

    ctx.beginPath();
    ctx.arc(px, py, pxR, 0, Math.PI * 2);
    ctx.fillStyle   = COLORS[color];
    ctx.globalAlpha = 0.88;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(px, py, pxR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth   = 0.8;
    ctx.globalAlpha = 1;
    ctx.stroke();
  });

  const podR = 0.4 / rows * scale * 1.8;
  const podX = 1.75 * scale;
  const podY = 1.75 * scale + PAD;
  ctx.beginPath();
  ctx.arc(podX, podY, podR, Math.PI, 0);
  ctx.strokeStyle = COLORS.podium;
  ctx.lineWidth   = 1.5;
  ctx.globalAlpha = 0.7;
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.arc(podX, podY - podR, 3, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.podium;
  ctx.fill();
}

// ─────────────────────────────────────────────────────────────────────────────
// REASON ENTRY STATE & PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'pulsecheck-reasons';

// state 结构: { support: [{ id, text, score }], oppose: [], neutral: [] }
let state = {
  support: [],
  oppose: [],
  neutral: []
};

// 辅助函数：保存到 localStorage
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// 辅助函数：从 localStorage 加载
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // 确保数据结构完整
      state.support = parsed.support || [];
      state.oppose  = parsed.oppose  || [];
      state.neutral = parsed.neutral || [];
    }
  } catch (_) {}
}

// 生成短唯一 ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ─── CRUD 操作 ───────────────────────────────────────────────────────────────

function addReason(category, text, score) {
  const newEntry = {
    id: generateId(),
    text: text.trim(),
    score: score
  };
  state[category].push(newEntry);
  saveState();
  renderAll();
}

function editReason(category, id, text, score) {
  const index = state[category].findIndex(item => item.id === id);
  if (index !== -1) {
    state[category][index] = {
      id: id,
      text: text.trim(),
      score: score
    };
    saveState();
    renderAll();
  }
}

function deleteReason(category, id) {
  state[category] = state[category].filter(item => item.id !== id);
  saveState();
  renderAll();
}

// ─── 内联表单状态 ───────────────────────────────────────────────────────────

let formState = {
  activeCategory: null,   // 'support' | 'oppose' | 'neutral' | null
  editingId: null         // 正在编辑的条目 ID，null 表示新增模式
};

// 关闭所有打开的表单
function closeForm() {
  if (formState.activeCategory) {
    const formDiv = document.getElementById(`form-${formState.activeCategory}`);
    if (formDiv) formDiv.hidden = true;
    // 清空表单内的值
    const textInput = formDiv.querySelector('.reason-text');
    const scoreInput = formDiv.querySelector('.reason-score');
    if (textInput) textInput.value = '';
    if (scoreInput) scoreInput.value = '';
    formState.activeCategory = null;
    formState.editingId = null;
  }
}

// 打开指定分类的表单（新增或编辑）
function openForm(category, editingId = null, existingText = '', existingScore = '') {
  // 如果有其他打开的表单，先关闭
  closeForm();
  
  formState.activeCategory = category;
  formState.editingId = editingId;
  
  const formDiv = document.getElementById(`form-${category}`);
  if (!formDiv) return;
  
  formDiv.hidden = false;
  const textInput = formDiv.querySelector('.reason-text');
  const scoreInput = formDiv.querySelector('.reason-score');
  
  if (editingId) {
    // 编辑模式：填入现有值
    if (textInput) textInput.value = existingText;
    if (scoreInput) scoreInput.value = existingScore;
  } else {
    // 新增模式：清空
    if (textInput) textInput.value = '';
    if (scoreInput) scoreInput.value = '';
  }
  
  // 聚焦文本输入框
  if (textInput) textInput.focus();
}

// 确认表单提交（新增或更新）
function confirmForm(category) {
  const formDiv = document.getElementById(`form-${category}`);
  if (!formDiv) return;
  
  const textInput = formDiv.querySelector('.reason-text');
  const scoreInput = formDiv.querySelector('.reason-score');
  const text = (textInput?.value || '').trim();
  const rawScore = scoreInput?.value || '';
  const score = parseInt(rawScore, 10);
  
  // 验证
  if (text === '') {
    alert('请输入理由');
    return;
  }
  if (isNaN(score) || score < 1) {
    alert('分数必须是大于等于 1 的数字');
    return;
  }
  
  if (formState.editingId) {
    // 编辑现有条目
    editReason(category, formState.editingId, text, score);
  } else {
    // 新增
    addReason(category, text, score);
  }
  
  closeForm();
}

// ─── 渲染 UI：更新输入框数值 + 渲染可折叠列表 + 重绘 Canvas ─────────────────

function renderAll() {
  // 1. 计算每个分类的总分
  const totalS = state.support.reduce((s, e) => s + e.score, 0);
  const totalO = state.oppose.reduce((s, e) => s + e.score, 0);
  const totalN = state.neutral.reduce((s, e) => s + e.score, 0);
  
  // 2. 更新只读输入框显示
  inpS.value = totalS;
  inpO.value = totalO;
  inpN.value = totalN;
  
  // 3. 更新每个分类的折叠列表标题和条目列表
  renderCategoryList('support');
  renderCategoryList('oppose');
  renderCategoryList('neutral');
  
  // 4. 重绘 hemicycle
  draw();
}

// 渲染单个分类的可折叠列表
function renderCategoryList(category) {
  const items = state[category];
  const totalScore = items.reduce((s, e) => s + e.score, 0);
  const toggleBtn = document.querySelector(`#section-${category} .reason-toggle`);
  const listContainer = document.getElementById(`list-${category}`);
  
  if (!toggleBtn || !listContainer) return;
  
  // 更新 toggle 按钮文本（显示条目数量）
  const count = items.length;
  toggleBtn.textContent = `${count} reason${count !== 1 ? 's' : ''} ▾`;
  
  // 生成列表 HTML
  if (items.length === 0) {
    listContainer.innerHTML = '<div style="padding: 6px 0; font-size: 11px; color: var(--outline);">暂无理由</div>';
  } else {
    const html = items.map(item => `
      <li class="reason-entry" data-id="${item.id}">
        <span class="reason-entry-text">${escapeHtml(item.text)}</span>
        <span class="reason-entry-score">${item.score}</span>
        <button class="reason-entry-edit" data-category="${category}" data-id="${item.id}" data-text="${escapeHtml(item.text)}" data-score="${item.score}">✏️</button>
        <button class="reason-entry-delete" data-category="${category}" data-id="${item.id}">🗑️</button>
      </li>
    `).join('');
    listContainer.innerHTML = html;
  }
  
  // 重新绑定列表内的按钮事件（委托给父容器也可以，这里直接在渲染后绑定）
  attachListEvents(category);
}

// 简单的防 XSS 辅助函数
function escapeHtml(str) {
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
    return c;
  });
}

// 为列表中的编辑/删除按钮绑定事件
function attachListEvents(category) {
  const listContainer = document.getElementById(`list-${category}`);
  if (!listContainer) return;
  
  // 编辑按钮
  listContainer.querySelectorAll('.reason-entry-edit').forEach(btn => {
    btn.removeEventListener('click', handleEditClick);
    btn.addEventListener('click', handleEditClick);
  });
  
  // 删除按钮
  listContainer.querySelectorAll('.reason-entry-delete').forEach(btn => {
    btn.removeEventListener('click', handleDeleteClick);
    btn.addEventListener('click', handleDeleteClick);
  });
}

function handleEditClick(e) {
  const btn = e.currentTarget;
  const category = btn.dataset.category;
  const id = btn.dataset.id;
  const text = btn.dataset.text;
  const score = parseInt(btn.dataset.score, 10);
  openForm(category, id, text, score);
}

function handleDeleteClick(e) {
  const btn = e.currentTarget;
  const category = btn.dataset.category;
  const id = btn.dataset.id;
  if (confirm('确定要删除这个理由吗？')) {
    deleteReason(category, id);
  }
}

// ─── 折叠/展开逻辑 ─────────────────────────────────────────────────────────

function setupCollapsibleListeners() {
  const toggles = document.querySelectorAll('.reason-toggle');
  toggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const section = toggle.closest('.reason-section');
      if (section) {
        section.classList.toggle('open');
        const expanded = section.classList.contains('open');
        toggle.setAttribute('aria-expanded', expanded);
      }
    });
  });
}

// ─── 事件监听初始化 ─────────────────────────────────────────────────────────

function initEventListeners() {
  // "+ Add reason" 按钮
  document.querySelectorAll('.btn-add').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const category = btn.dataset.category;
      if (category) {
        openForm(category);
      }
    });
  });
  
  // 每个表单的确认和取消按钮
  ['support', 'oppose', 'neutral'].forEach(cat => {
    const formDiv = document.getElementById(`form-${cat}`);
    if (formDiv) {
      const confirmBtn = formDiv.querySelector('.btn-confirm');
      const cancelBtn = formDiv.querySelector('.btn-cancel');
      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => confirmForm(cat));
      }
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => closeForm());
      }
    }
  });
  
  // 点击外部关闭表单（可选，轻量实现：监听 document 点击，但要过滤表单内）
  document.addEventListener('click', (e) => {
    if (formState.activeCategory) {
      const formDiv = document.getElementById(`form-${formState.activeCategory}`);
      if (formDiv && !formDiv.contains(e.target) && !e.target.closest('.btn-add')) {
        // 如果点击在表单外且不是“添加”按钮，关闭表单
        closeForm();
      }
    }
  });
  
  // 窗口尺寸变化时重绘 canvas
  window.addEventListener('resize', () => {
    draw();
  });
}

// ─── 启动应用 ─────────────────────────────────────────────────────────────

function init() {
  loadState();
  renderAll();
  setupCollapsibleListeners();
  initEventListeners();
  // 初始将所有折叠区置为关闭状态（class 无 open，max-height 0）
  document.querySelectorAll('.reason-section').forEach(section => {
    section.classList.remove('open');
    const toggle = section.querySelector('.reason-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  });
}

init();