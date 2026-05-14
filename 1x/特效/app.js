const IMAGES = [
  { name: "丝巾 01", url: "../丝巾/画板 1.png" },
  { name: "丝巾 02", url: "../丝巾/画板 2.png" },
  { name: "丝巾 03", url: "../丝巾/画板 3.png" },
  { name: "丝巾 04", url: "../丝巾/画板 4.png" },
  { name: "丝巾 05", url: "../丝巾/画板 5.png" },
  { name: "丝巾 06", url: "../丝巾/画板 6.png" },
  { name: "挂毯 08", url: "../挂毯/画板 8.png" },
  { name: "挂毯 09", url: "../挂毯/画板 9.png" },
  { name: "挂毯 10", url: "../挂毯/画板 10.png" },
  { name: "挂毯 11", url: "../挂毯/画板 11.png" },
];

const canvas = document.querySelector("#effect-canvas");
const ctx = canvas.getContext("2d", { alpha: false });
const select = document.querySelector("#image-select");
const PRESET_DATA = Array.isArray(window.__FABRIC_SOURCE_DATA) ? window.__FABRIC_SOURCE_DATA : null;

const SAMPLE_SIZE = 450;
const SAMPLE_STEP = 3;
const TRANSITION_MS = 3000;
const AUTO_SWITCH_MS = 2000;

const state = {
  width: 0,
  height: 0,
  dpr: Math.min(window.devicePixelRatio || 1, 2),
  imageIndex: 9,
  fabric: null,
  nextFabric: null,
  transition: null,
  loadingNext: false,
  lastAutoSwitchAt: performance.now(),
  dragging: false,
  lastX: 0,
  lastY: 0,
  yawOffset: 0,
  pitchOffset: 0,
};

const imageCache = new Map();

for (const [index, image] of IMAGES.entries()) {
  const option = document.createElement("option");
  option.value = String(index);
  option.textContent = image.name;
  select.append(option);
}
select.value = String(state.imageIndex);

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t) => t * t * t;

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function colorString(r, g, b) {
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function boostColor(node) {
  return {
    r: node.r,
    g: node.g,
    b: node.b,
  };
}

function mixNodeColor(node, mix = 1) {
  if (node.fromR === undefined) return boostColor(node);
  return {
    r: clamp(lerp(node.fromR, node.r, mix), 0, 255),
    g: clamp(lerp(node.fromG, node.g, mix), 0, 255),
    b: clamp(lerp(node.fromB, node.b, mix), 0, 255),
  };
}

function generateFallbackImage() {
  const c = document.createElement("canvas");
  c.width = SAMPLE_SIZE;
  c.height = SAMPLE_SIZE;
  const g = c.getContext("2d");
  const cx = SAMPLE_SIZE / 2;
  const cy = SAMPLE_SIZE / 2;

  g.fillStyle = "#080808";
  g.fillRect(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

  for (let ring = 0; ring < 9; ring++) {
    const radius = 24 + ring * 22;
    const petals = 6 + ring * 2;
    for (let i = 0; i < petals; i++) {
      const angle = (i / petals) * Math.PI * 2 + ring * 0.25;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      const hue = (ring * 38 + i * 15 + 15) % 360;
      const grad = g.createRadialGradient(px, py, 0, px, py, 22 - ring * 0.8);
      grad.addColorStop(0, `hsl(${hue}, 90%, 62%)`);
      grad.addColorStop(0.55, `hsl(${hue + 18}, 76%, 38%)`);
      grad.addColorStop(1, "transparent");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(px, py, 22 - ring * 0.8, 0, Math.PI * 2);
      g.fill();
    }
  }

  g.strokeStyle = "hsl(36, 80%, 50%)";
  g.lineWidth = 4;
  g.strokeRect(24, 24, SAMPLE_SIZE - 48, SAMPLE_SIZE - 48);
  return c;
}

function loadImage(item) {
  if (imageCache.has(item.url)) return imageCache.get(item.url);

  const promise = new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(generateFallbackImage());
    image.src = item.url;
  });
  imageCache.set(item.url, promise);
  return promise;
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  state.width = Math.max(320, rect.width);
  state.height = Math.max(320, rect.height);
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(state.width * state.dpr);
  canvas.height = Math.floor(state.height * state.dpr);
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
}

function sampleImage(image) {
  const c = document.createElement("canvas");
  c.width = SAMPLE_SIZE;
  c.height = SAMPLE_SIZE;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  return g.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
}

function buildSourceNodesFromPixels(pixels) {
  const sourceNodes = [];

  for (let y = 0; y < SAMPLE_SIZE; y += SAMPLE_STEP) {
    for (let x = 0; x < SAMPLE_SIZE; x += SAMPLE_STEP) {
      const offset = (y * SAMPLE_SIZE + x) * 4;
      const r = pixels[offset];
      const g = pixels[offset + 1];
      const b = pixels[offset + 2];
      const a = pixels[offset + 3];
      if (a < 10) continue;
      sourceNodes.push([x, y, r, g, b, a]);
    }
  }

  return sourceNodes;
}

async function createFabric(index) {
  let sourceNodes = PRESET_DATA?.[index]?.nodes;
  if (!Array.isArray(sourceNodes) || sourceNodes.length === 0) {
    const image = await loadImage(IMAGES[index]);
    try {
      sourceNodes = buildSourceNodesFromPixels(sampleImage(image));
    } catch (error) {
      console.warn("Image sampling failed, falling back to generated fabric data.", error);
      sourceNodes = buildSourceNodesFromPixels(sampleImage(generateFallbackImage()));
    }
  }

  const random = mulberry32(9187 + index * 104729);
  const nodes = [];
  const threads = [];

  for (const sourceNode of sourceNodes) {
    const [x, y, r, g, b, a] = sourceNode;
    const light = (r + g + b) / 3;
    const saturation = Math.max(r, g, b) - Math.min(r, g, b);
    if (a < 10) continue;

    const u = x / SAMPLE_SIZE;
    const v = y / SAMPLE_SIZE;
    const edge = Math.min(u, 1 - u, v, 1 - v);
    const rowBand = Math.floor(y / SAMPLE_STEP);
    const colBand = Math.floor(x / SAMPLE_STEP);
    const isThread = rowBand % 2 === 0 || colBand % 5 === 0 || random() > 0.58;
    const horizontal = random() > 0.82;
    const centerBias = Math.abs((horizontal ? v : u) - 0.5);
    const duration = 0.2 + random() * 0.34;
    const delay = clamp(centerBias * 0.28 + random() * 0.48, 0, 0.94 - duration);
    const signedSide = horizontal ? (u < 0.5 ? -1 : 1) : (v < 0.5 ? -1 : 1);

    const node = {
      u,
      v,
      r,
      g,
      b,
      light,
      saturation,
      edge,
      rowBand,
      colBand,
      isThread,
      horizontal,
      dir: signedSide * (random() < 0.12 ? -1 : 1),
      delay,
      duration,
      seed: random() * Math.PI * 2,
      phase: random() * Math.PI * 2,
      rowPhase: random() * Math.PI * 2,
      driftAmpX: 0.2 + random() * 0.8,
      driftAmpY: 0.2 + random() * 0.8,
      driftSpeedX: 0.00045 + random() * 0.00055,
      driftSpeedY: 0.00045 + random() * 0.00055,
      burstAngle: random() * Math.PI * 2,
      burstDistance: 28 + random() * 74,
      waveAmp: 0.7 + random() * 1.9,
      waveSpeed: 0.0011 + random() * 0.00075,
      size: 1,
      threadLength: 2.6 + random() * 7.2 + Math.max(0, 150 - light) * 0.018,
      hairLength: 7 + random() * 23,
      stretch: 30 + random() * 94,
      travelBoost: 1 + random() * 0.56,
    };

    nodes.push(node);
    if (isThread) threads.push(node);
  }

  return { nodes, threads, index };
}

function panelSize() {
  return Math.min(state.width * 0.82, state.height * 0.78);
}

function autoCamera(now) {
  const autoYaw = Math.sin(now * 0.00028) * 0.22;

  return {
    angleY: state.yawOffset + autoYaw,
    angleX: state.pitchOffset,
  };
}

function project(node, now, cam, opts = {}) {
  const size = panelSize();
  const u = node.u;
  const v = node.v;
  const waveAmount = opts.waveAmount ?? 1;
  const driftAmount = opts.driftAmount ?? 1;
  const rowWave = 0;
  const driftX = 0;
  const driftY = 0;

  let x = (u - 0.5) * size + driftX;
  let y = (v - 0.5) * size + rowWave * waveAmount + driftY;
  let z = 0;

  const angleZ = 0;
  let c = Math.cos(angleZ);
  let s = Math.sin(angleZ);
  let nx = x * c - y * s;
  let ny = x * s + y * c;
  x = nx;
  y = ny;

  c = Math.cos(cam.angleY);
  s = Math.sin(cam.angleY);
  nx = x * c + z * s;
  let nz = -x * s + z * c;
  x = nx;
  z = nz;

  c = Math.cos(cam.angleX);
  s = Math.sin(cam.angleX);
  ny = y * c - z * s;
  nz = y * s + z * c;
  y = ny;
  z = nz;

  const camera = 760;
  const p = camera / (camera + z);
  return {
    x: state.width * 0.5 + x * p,
    y: state.height * 0.5 + y * p,
    p,
    rowWave,
  };
}

function drawBackground(now) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, state.width, state.height);

  const glow = ctx.createRadialGradient(
    state.width * 0.5,
    state.height * 0.48,
    0,
    state.width * 0.5,
    state.height * 0.48,
    Math.max(state.width, state.height) * 0.42,
  );
  const pulse = 0.05 + Math.sin(now * 0.0011) * 0.015;
  glow.addColorStop(0, `rgba(255, 212, 122, ${pulse})`);
  glow.addColorStop(0.45, "rgba(156, 97, 42, 0.035)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, state.width, state.height);
}

function drawNodePoint(node, now, cam, alpha = 1, mix = 1, opts = {}) {
  const point = project(node, now, cam, opts);
  const c = mixNodeColor(node, mix);
  const cell = (panelSize() / (SAMPLE_SIZE / SAMPLE_STEP)) * point.p;
  const size = clamp(cell - 3, 2.4, 4.8);
  const x = point.x + (opts.offsetX || 0);
  const y = point.y + (opts.offsetY || 0);

  ctx.globalAlpha = alpha;
  ctx.fillStyle = colorString(c.r, c.g, c.b);
  ctx.fillRect(x - size * 0.5, y - size * 0.5, size, size);
}

function drawThreadNode(node, now, cam, alpha = 1, mix = 1) {
  const point = project(node, now, cam);
  const c = mixNodeColor(node, mix);
  const shimmer = 0.72 + Math.sin(now * 0.003 + node.phase) * 0.22;
  const size = Math.max(0.5, node.size * point.p);
  const horizontalLength = (node.threadLength + Math.abs(point.rowWave) * 0.7) * point.p;
  const verticalLength = (2.0 + node.threadLength * 0.32) * point.p;

  ctx.globalAlpha = alpha * shimmer * (node.edge < 0.05 ? 0.84 : 0.62);
  ctx.strokeStyle = colorString(c.r, c.g, c.b);
  ctx.lineWidth = Math.max(0.42, size * 0.62);
  ctx.beginPath();
  ctx.moveTo(point.x - horizontalLength, point.y);
  ctx.lineTo(point.x + horizontalLength * 0.8, point.y);
  ctx.stroke();

  if (node.colBand % 5 === 0 || node.edge < 0.03) {
    ctx.globalAlpha = alpha * shimmer * 0.36;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y - verticalLength);
    ctx.lineTo(point.x, point.y + verticalLength);
    ctx.stroke();
  }
}

function drawFabric(fabric, now, cam, alpha = 1, mix = 1) {
  if (!fabric) return;

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  for (const node of fabric.nodes) {
    drawNodePoint(node, now, cam, alpha, mix);
  }
  ctx.restore();
}

function transitionProgress(now) {
  if (!state.transition) return null;
  const raw = clamp((now - state.transition.start) / TRANSITION_MS, 0, 1);
  const phase = raw < 0.5 ? "out" : "in";
  const phaseT = phase === "out" ? raw / 0.5 : (raw - 0.5) / 0.5;
  return { raw, phase, phaseT };
}

/*
  抽丝切换效果：
  - 前半段：当前纹样被横向/纵向抽成细丝，向画面外拉开；
  - 后半段：新纹样从画面外以细丝形式回收成图；
  - 只替换切换动画，保留原来的图片数据、下拉框、画布尺寸和嵌入方式。
*/
function drawThreadPullNode(node, now, cam, progress, alpha = 1, mix = 1) {
  const entering = progress.phase === "in";
  const t = entering ? easeInOut(1 - progress.phaseT) : easeInOut(progress.phaseT);

  const point = project(node, now, cam, { driftAmount: 0.18, waveAmount: 0.2 });
  const c = mixNodeColor(node, mix);
  const cell = (panelSize() / (SAMPLE_SIZE / SAMPLE_STEP)) * point.p;
  const baseSize = clamp(cell - 3, 1.2, 3.8);

  const horizontal = node.horizontal ?? (node.rowBand % 2 === 0);
  const dir = node.dir || ((horizontal ? node.u : node.v) < 0.5 ? -1 : 1);

  const offscreenDistance = Math.max(state.width, state.height) * 0.95 + 260;
  const slideAmount = t * offscreenDistance * dir;

  let x = point.x;
  let y = point.y;
  if (horizontal) {
    x += slideAmount;
  } else {
    y += slideAmount;
  }

  const stretch = t;
  const w = horizontal
    ? baseSize + stretch * 92 * point.p
    : baseSize * Math.max(0.28, 1 - stretch * 0.55);
  const h = horizontal
    ? baseSize * Math.max(0.28, 1 - stretch * 0.55)
    : baseSize + stretch * 92 * point.p;

  const scan = Math.max(
    0,
    1 - Math.abs(node.u - ((now * 0.00042) % 1)) * 18,
    1 - Math.abs(node.v - ((now * 0.00032 + 0.3) % 1)) * 18,
  ) * (1 - stretch * 0.25);

  const glow = 18 + scan * 48;
  const r = clamp(c.r + glow, 0, 255) | 0;
  const g = clamp(c.g + glow, 0, 255) | 0;
  const b = clamp(c.b + glow, 0, 255) | 0;

  const fade = entering
    ? clamp(progress.phaseT * 1.35, 0, 1)
    : clamp(1 - Math.max(0, progress.phaseT - 0.92) / 0.08, 0, 1);

  ctx.globalAlpha = clamp(alpha * fade * (0.52 + scan * 0.35), 0.08, 1);
  ctx.fillStyle = colorString(r, g, b);
  ctx.fillRect(x - w * 0.5, y - h * 0.5, w, h);
}

function drawTransition(now, cam, progress) {
  const fabric = progress.phase === "out" ? state.fabric : state.nextFabric;
  if (!fabric) return;

  const mix = progress.phase === "in"
    ? easeInOut(clamp(progress.phaseT * 1.2, 0, 1))
    : 1;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const node of fabric.nodes) {
    drawThreadPullNode(node, now, cam, progress, 0.95, mix);
  }
  ctx.restore();
}

function finishTransition() {
  if (!state.transition) return;
  state.fabric = state.nextFabric;
  state.nextFabric = null;
  state.imageIndex = state.transition.nextIndex;
  select.value = String(state.imageIndex);
  state.transition = null;
  state.lastAutoSwitchAt = performance.now();
}

function animate(now) {
  const progress = transitionProgress(now);
  if (progress && progress.raw >= 1) {
    finishTransition();
  }

  const currentProgress = transitionProgress(now);
  if (!currentProgress && state.fabric && !state.loadingNext && now - state.lastAutoSwitchAt >= AUTO_SWITCH_MS) {
    const nextIndex = (state.imageIndex + 1) % IMAGES.length;
    switchImage(nextIndex, true);
  }

  const cam = autoCamera(now);
  drawBackground(now);

  if (currentProgress) {
    drawTransition(now, cam, currentProgress);
  } else {
    drawFabric(state.fabric, now, cam);
  }

  requestAnimationFrame(animate);
}

async function switchImage(newIndex, isAuto = false) {
  newIndex = Number(newIndex);
  if (newIndex === state.imageIndex || state.transition || state.loadingNext) {
    select.value = String(state.imageIndex);
    return;
  }

  state.loadingNext = true;
  state.lastAutoSwitchAt = performance.now();
  const nextFabric = await createFabric(newIndex);
  state.loadingNext = false;

  for (let i = 0; i < nextFabric.nodes.length; i++) {
    const old = state.fabric.nodes[i % state.fabric.nodes.length];
    nextFabric.nodes[i].fromR = old.r;
    nextFabric.nodes[i].fromG = old.g;
    nextFabric.nodes[i].fromB = old.b;
  }

  state.nextFabric = nextFabric;
  state.transition = {
    start: performance.now(),
    nextIndex: newIndex,
  };
  select.value = String(newIndex);
  if (!isAuto) state.lastAutoSwitchAt = performance.now();
}

function resetView() {
  state.yawOffset = 0;
  state.pitchOffset = 0;
}

select.addEventListener("change", () => {
  switchImage(select.value);
});

canvas.addEventListener("pointerdown", (e) => {
  state.dragging = true;
  state.lastX = e.clientX;
  state.lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener("pointermove", (e) => {
  if (!state.dragging) return;
  state.yawOffset += (e.clientX - state.lastX) * 0.0048;
  state.pitchOffset = clamp(state.pitchOffset + (e.clientY - state.lastY) * 0.0032, -0.55, 0.55);
  state.lastX = e.clientX;
  state.lastY = e.clientY;
});

canvas.addEventListener("pointerup", (e) => {
  state.dragging = false;
  try {
    canvas.releasePointerCapture(e.pointerId);
  } catch {
    // Pointer capture may already be released after a fast drag.
  }
});

canvas.addEventListener("pointercancel", () => {
  state.dragging = false;
});

canvas.addEventListener("dblclick", resetView);

window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "r") resetView();
  if (e.key === "ArrowLeft") state.yawOffset -= 0.12;
  if (e.key === "ArrowRight") state.yawOffset += 0.12;
  if (e.key === "ArrowUp") state.pitchOffset -= 0.08;
  if (e.key === "ArrowDown") state.pitchOffset += 0.08;
});

window.addEventListener("resize", resizeCanvas);

Promise.all(IMAGES.map(loadImage)).finally(async () => {
  resizeCanvas();
  state.fabric = await createFabric(state.imageIndex);
  state.lastAutoSwitchAt = performance.now();
  requestAnimationFrame(animate);
});
