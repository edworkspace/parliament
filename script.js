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

// ─── 渲染 Canvas 函数 ───────────────────────────────────────────────────────

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

function draw() {
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

let state = {
  support: [],
  oppose: [],
  neutral: []
};

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state.support = parsed.support || [];
      state.oppose  = parsed.oppose  || [];
      state.neutral = parsed.neutral || [];
    }
  } catch (_) {}
}

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
  activeCategory: null,
  editingId: null
};

function closeForm() {
  if (formState.activeCategory) {
    const formDiv = document.getElementById(`form-${formState.activeCategory}`);
    if (formDiv) {
      formDiv.hidden = true;
      const stack = formDiv.querySelector('.reason-input-stack');
      if (stack) stack.classList.remove('active-score');
      const textInput = stack?.querySelector('.reason-text');
      const scoreInput = stack?.querySelector('.reason-score');
      if (textInput) textInput.value = '';
      if (scoreInput) scoreInput.value = '';
    }
    formState.activeCategory = null;
    formState.editingId = null;
  }
}

function openForm(category, editingId = null, existingText = '', existingScore = '') {
  closeForm();
  
  formState.activeCategory = category;
  formState.editingId = editingId;
  
  const formDiv = document.getElementById(`form-${category}`);
  if (!formDiv) return;
  
  formDiv.hidden = false;
  const stack = formDiv.querySelector('.reason-input-stack');
  const textInput = stack.querySelector('.reason-text');
  const scoreInput = stack.querySelector('.reason-score');
  
  // 确保初始状态是文本模式
  stack.classList.remove('active-score');
  
  if (editingId) {
    textInput.value = existingText;
    scoreInput.value = existingScore;
  } else {
    textInput.value = '';
    scoreInput.value = '';
  }
  
  // 聚焦到文本输入框
  textInput.focus();
}

function confirmForm(category) {
  const formDiv = document.getElementById(`form-${category}`);
  if (!formDiv) return;
  
  const stack = formDiv.querySelector('.reason-input-stack');
  const textInput = stack.querySelector('.reason-text');
  const scoreInput = stack.querySelector('.reason-score');
  const text = (textInput?.value || '').trim();
  const rawScore = scoreInput?.value || '';
  const score = parseInt(rawScore, 10);
  
  if (text === '') {
    alert('请输入理由');
    return;
  }
  if (isNaN(score) || score < 1) {
    alert('分数必须是大于等于 1 的数字');
    return;
  }
  
  if (formState.editingId) {
    editReason(category, formState.editingId, text, score);
  } else {
    addReason(category, text, score);
  }
  
  closeForm();
}

// 下一步按钮逻辑：从 reason 切换到 score
function goToScore(category) {
  const formDiv = document.getElementById(`form-${category}`);
  if (!formDiv) return;
  
  const stack = formDiv.querySelector('.reason-input-stack');
  const textInput = stack.querySelector('.reason-text');
  const text = (textInput?.value || '').trim();
  
  if (text === '') {
    alert('This field is required.');
    textInput.focus();
    return;
  }
  
  // 切换到分数输入框
  stack.classList.add('active-score');
  const scoreInput = stack.querySelector('.reason-score');
  if (scoreInput) scoreInput.focus();
}

// ─── 渲染 UI ────────────────────────────────────────────────────────────────

function renderAll() {
  const totalS = state.support.reduce((s, e) => s + e.score, 0);
  const totalO = state.oppose.reduce((s, e) => s + e.score, 0);
  const totalN = state.neutral.reduce((s, e) => s + e.score, 0);
  
  inpS.value = totalS;
  inpO.value = totalO;
  inpN.value = totalN;
  
  renderCategoryList('support');
  renderCategoryList('oppose');
  renderCategoryList('neutral');
  
  draw();
}

function renderCategoryList(category) {
  const items = state[category];
  const toggleBtn = document.querySelector(`#section-${category} .reason-toggle`);
  const listContainer = document.getElementById(`list-${category}`);
  
  if (!toggleBtn || !listContainer) return;
  
  const count = items.length;
  toggleBtn.textContent = `${count} reason${count !== 1 ? 's' : ''} ▾`;
  
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
  
  attachListEvents(category);
}

function escapeHtml(str) {
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function attachListEvents(category) {
  const listContainer = document.getElementById(`list-${category}`);
  if (!listContainer) return;
  
  listContainer.querySelectorAll('.reason-entry-edit').forEach(btn => {
    btn.removeEventListener('click', handleEditClick);
    btn.addEventListener('click', handleEditClick);
  });
  
  listContainer.querySelectorAll('.reason-entry-delete').forEach(btn => {
    btn.removeEventListener('click', handleDeleteClick);
    btn.addEventListener('click', handleDeleteClick);
  });
}

function handleEditClick(e) {
  e.stopPropagation();
  const btn = e.currentTarget;
  const category = btn.getAttribute('data-category');
  const id = btn.getAttribute('data-id');
  const entry = state[category]?.find(item => item.id === id);
  if (entry) {
    openForm(category, id, entry.text, entry.score);
  } else {
    const text = btn.getAttribute('data-text');
    const score = parseInt(btn.getAttribute('data-score'), 10);
    openForm(category, id, text, score);
  }
}

function handleDeleteClick(e) {
  e.stopPropagation();
  const btn = e.currentTarget;
  const category = btn.getAttribute('data-category');
  const id = btn.getAttribute('data-id');
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
  document.querySelectorAll('.btn-add').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const category = btn.dataset.category;
      if (category) openForm(category);
    });
  });
  
  ['support', 'oppose', 'neutral'].forEach(cat => {
    const formDiv = document.getElementById(`form-${cat}`);
    if (formDiv) {
      const confirmBtn = formDiv.querySelector('.btn-confirm');
      const cancelBtn = formDiv.querySelector('.btn-cancel');
      const nextBtn = formDiv.querySelector('.btn-next');
      
      if (confirmBtn) {
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        newConfirmBtn.addEventListener('click', () => confirmForm(cat));
      }
      if (cancelBtn) {
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        newCancelBtn.addEventListener('click', () => closeForm());
      }
      if (nextBtn) {
        const newNextBtn = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
        newNextBtn.addEventListener('click', () => goToScore(cat));
      }
    }
  });
  
  // 叠加输入框的键盘事件
  document.querySelectorAll('.reason-input-stack').forEach(stack => {
    const newStack = stack.cloneNode(true);
    stack.parentNode.replaceChild(newStack, stack);
    
    const textInput = newStack.querySelector('.reason-text');
    const scoreInput = newStack.querySelector('.reason-score');
    const form = newStack.closest('.reason-form');
    const category = form?.id.replace('form-', '');
    
    if (textInput) {
      // 电脑端：按 Enter 切换到分数框
      textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (category) goToScore(category);
        }
      });
      
      textInput.addEventListener('focus', () => {
        if (newStack.classList.contains('active-score')) {
          newStack.classList.remove('active-score');
        }
      });
    }
    
    if (scoreInput) {
      // 分数框按 Enter 直接确认
      scoreInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (category) confirmForm(category);
        }
      });
    }
  });
  
  document.addEventListener('click', (e) => {
    if (formState.activeCategory) {
      const formDiv = document.getElementById(`form-${formState.activeCategory}`);
      if (formDiv && !formDiv.contains(e.target) && !e.target.closest('.btn-add')) {
        closeForm();
      }
    }
  });
  
  window.addEventListener('resize', () => draw());
}

// ─── 启动应用 ─────────────────────────────────────────────────────────────

function init() {
  loadState();
  renderAll();
  setupCollapsibleListeners();
  initEventListeners();
  document.querySelectorAll('.reason-section').forEach(section => {
    section.classList.remove('open');
    const toggle = section.querySelector('.reason-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  });
}

init();