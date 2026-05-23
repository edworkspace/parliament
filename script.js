// ─────────────────────────────────────────────────────────────────────────────
// HEMICYCLE ALGORITHM
// Ported from slashme/parliamentdiagram (GPL v2)
// https://github.com/slashme/parliamentdiagram
// JS port reference: https://gist.github.com/compupro/f4df98ad750f44669be51a3580443936
// ─────────────────────────────────────────────────────────────────────────────

// Maximum seats achievable with N rows (precomputed).
// TOTALS[i] = max seats in (i+1) rows.
const TOTALS = [
  3,15,33,61,95,138,189,247,313,388,469,559,657,762,876,997,1126,1263,
  1408,1560,1722,1889,2066,2250,2442,2641,2850,3064,3289,3519,3759,4005,
  4261,4522,4794,5071,5358,5652,5953,6263,6581,6906,7239,7581,7929,8287,
  8650,9024,9404,9793,10187,10594,11003,11425,11850,12288,12729,13183,
  13638,14109,14580,15066,15553,16055,16557,17075,17592,18126,18660,
  19208,19758,20323,20888,21468,22050,22645,23243,23853,24467,25094,
  25723,26364,27011,27667,28329,29001,29679,30367,31061
];

/**
 * Build a list of seat positions using the slashme arch algorithm.
 * Returns array of {angle, x, y} in the SVG coordinate space where
 * the diagram fits in a 3.5 × 1.75 unit box (origin top-left),
 * centre of the semicircle at x=1.75, y=1.75 (bottom-centre).
 */
function buildSeatPositions(total) {
  if (total === 0) return [];

  // Find minimum number of rows to fit `total` seats
  let rows = 1;
  for (let i = 0; i < TOTALS.length; i++) {
    if (TOTALS[i] >= total) { rows = i + 1; break; }
  }

  const radius = 0.4 / rows; // seat circle radius
  const posList = [];

  // Inner rows 1 … rows-1
  for (let i = 1; i < rows; i++) {
    // Row radius: R_i = (3N + 4i - 2) / (4N)
    const R = (3.0 * rows + 4.0 * i - 2.0) / (4.0 * rows);
    // Seats in this row, scaled to actual total vs max capacity
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
        // Note: x mirrored so left=oppose, right=support after sort
      }
    }
  }

  // Outermost row gets the remaining seats
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

  // Sort by angle descending → left (oppose) first, right (support) last
  posList.sort((a, b) => b[0] - a[0]);

  return { seats: posList, radius, rows };
}

// ─── Rendering ───────────────────────────────────────────────────────────────

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
  const nS    = Math.max(0, parseInt(inpS.value) || 0);
  const nO    = Math.max(0, parseInt(inpO.value) || 0);
  const nN    = Math.max(0, parseInt(inpN.value) || 0);
  const total = nS + nO + nN;

  if (total === 0) {
    rateEl.innerHTML    = '—';
    totalEl.textContent = '0';
  } else {
    rateEl.innerHTML    = ((nS / total) * 100).toFixed(1) + '<span>%</span>';
    totalEl.textContent = total;
  }

  // The slashme SVG unit box is 3.5 wide × 1.75 tall.
  // We scale by width so the full arc always fits horizontally,
  // then add a small bottom pad so the lowest seats aren't clipped.
  const PAD  = 10; // px padding top & bottom
  const W    = canvas.parentElement.clientWidth - 44;
  const scale = W / 3.5;                    // 1 SVG unit → scale px
  const H    = Math.round(1.75 * scale) + PAD * 2;
  const DPR  = devicePixelRatio || 1;
  canvas.width        = W * DPR;
  canvas.height       = H * DPR;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  // Background
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

  // SVG coords: x in [0..3.5], y in [0..1.75], origin top-left,
  // semicircle centre at (1.75, 1.75) = bottom-centre.
  // Canvas: x=0 left, y=0 top. Map: px = svgX*scale, py = (1.75-svgY)*scale + PAD
  const pxR = Math.max(2, radius * scale);

  // Colour: seats sorted left→right; oppose fills from left, then neutral, then support from right.
  // After sort descending by angle: index 0 = leftmost = first oppose seat.
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

  // Podium arc at bottom centre (SVG centre = x:1.75, y:1.75)
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

  // Speaker dot
  ctx.beginPath();
  ctx.arc(podX, podY - podR, 3, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.podium;
  ctx.fill();
}

[inpS, inpO, inpN].forEach(el => el.addEventListener('input', draw));
window.addEventListener('resize', draw);
draw();