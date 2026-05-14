const root = document.documentElement;
const revealTargets = document.querySelectorAll("[data-reveal], .reveal-item, .site-footer");
const storageKey = "lamp_prototype_selection";

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      }
    });
  },
  {
    threshold: 0.05,
    rootMargin: "0px 0px -4% 0px",
  },
);

revealTargets.forEach((target) => revealObserver.observe(target));

const updateScrollEffects = () => {
  const scroll = window.scrollY;
  root.style.setProperty("--hero-shift", `${Math.min(scroll, window.innerHeight) * 0.25}px`);
};

updateScrollEffects();
window.addEventListener("scroll", updateScrollEffects, { passive: true });

document.addEventListener("pointermove", (event) => {
  const x = (event.clientX / window.innerWidth - 0.5) * 2;
  const y = (event.clientY / window.innerHeight - 0.5) * 2;
  root.style.setProperty("--pointer-x", x.toFixed(3));
  root.style.setProperty("--pointer-y", y.toFixed(3));
});

const formatDotDate = (date) =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replaceAll("/", ".");

document.querySelectorAll("[data-today]").forEach((node) => {
  node.textContent = formatDotDate(new Date());
});

const photoData = {
  photo01: { title: "夜游水岸", tag: "夜游水岸", src: "./1x/丝巾/画板 1.png" },
  photo02: { title: "桥灯巡游", tag: "桥灯巡游", src: "./1x/丝巾/画板 2.png" },
  photo03: { title: "花火映鳞", tag: "花火映鳞", src: "./1x/丝巾/画板 3.png" },
  photo04: { title: "金鳞近景", tag: "金鳞近景", src: "./1x/丝巾/画板 4.png" },
  photo05: { title: "流光丝影", tag: "流光丝影", src: "./1x/丝巾/画板 5.png" },
  photo06: { title: "夜色纹光", tag: "夜色纹光", src: "./1x/丝巾/画板 6.png" },
  photo07: { title: "挂毯回响", tag: "挂毯回响", src: "./1x/挂毯/画板 8.png" },
  photo08: { title: "锦面余韵", tag: "锦面余韵", src: "./1x/挂毯/画板 9.png" },
};

const photoKeyAliases = {
  night: "photo01",
  bridge: "photo02",
  fireworks: "photo03",
  gold: "photo04",
};

const stickerData = {
  fish: { label: "鱼灯贴纸" },
  spark: { label: "花火贴纸" },
  lantern: { label: "灯笼贴纸" },
  plain: { label: "留白" },
};

const readSelection = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    const savedPhoto = photoKeyAliases[saved.photo] || saved.photo;
    return {
      photo: Object.hasOwn(photoData, savedPhoto) ? savedPhoto : "photo01",
      sticker: Object.hasOwn(stickerData, saved.sticker) ? saved.sticker : "fish",
    };
  } catch {
    return { photo: "photo01", sticker: "fish" };
  }
};

const selection = readSelection();

const saveSelection = () => {
  localStorage.setItem(storageKey, JSON.stringify(selection));
};

const photoScene = document.getElementById("photo-scene");
const stickerLayer = document.getElementById("sticker-layer");
const photoTitle = document.getElementById("photo-title");
const photoDate = document.getElementById("photo-date");
const memoryScene = document.getElementById("memory-scene");
const snapshotSticker = document.getElementById("snapshot-sticker");
const captureSelection = document.getElementById("capture-selection");
const capturePhotoTag = document.getElementById("capture-photo-tag");
const captureStickerTag = document.getElementById("capture-sticker-tag");
const memoryCaption = document.getElementById("memory-caption");
const memoryMeta = document.getElementById("memory-meta");

const renderSelection = () => {
  const photo = photoData[selection.photo];
  const sticker = stickerData[selection.sticker];

  if (photoScene) {
    photoScene.dataset.photo = selection.photo;
    photoScene.style.background = `linear-gradient(180deg, rgba(8, 6, 14, 0.12), rgba(8, 6, 14, 0.38)), url("${photo.src}") center / cover no-repeat`;
  }
  if (stickerLayer) stickerLayer.dataset.sticker = selection.sticker;
  if (memoryScene) {
    memoryScene.dataset.photo = selection.photo;
    memoryScene.style.background = `linear-gradient(180deg, rgba(8, 6, 14, 0.12), rgba(8, 6, 14, 0.38)), url("${photo.src}") center / cover no-repeat`;
  }
  if (snapshotSticker) snapshotSticker.dataset.sticker = selection.sticker;
  if (photoTitle) photoTitle.textContent = photo.title;
  if (photoDate) photoDate.textContent = formatDotDate(new Date());
  if (captureSelection) captureSelection.textContent = `${photo.title} + ${sticker.label}`;
  if (capturePhotoTag) capturePhotoTag.textContent = photo.tag;
  if (captureStickerTag) captureStickerTag.textContent = sticker.label;

  document.querySelectorAll("[data-photo-select]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.photoSelect === selection.photo);
  });

  document.querySelectorAll("[data-sticker-select]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.stickerSelect === selection.sticker);
  });
};

document.querySelectorAll("[data-photo-select]").forEach((button) => {
  button.addEventListener("click", () => {
    selection.photo = button.dataset.photoSelect;
    saveSelection();
    renderSelection();
  });
});

document.querySelectorAll("[data-sticker-select]").forEach((button) => {
  button.addEventListener("click", () => {
    selection.sticker = button.dataset.stickerSelect;
    saveSelection();
    renderSelection();
  });
});

renderSelection();

const stage = document.getElementById("dance-pool");
const stageFish = document.getElementById("dance-fish");
const trailCanvas = document.getElementById("dance-canvas");
let stageState = { x: 0, y: 0 };

if (stage && stageFish && trailCanvas) {
  const context = trailCanvas.getContext("2d");
  const particles = [];
  let stageRect = stage.getBoundingClientRect();

  const resizeCanvas = () => {
    stageRect = stage.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    trailCanvas.width = stageRect.width * ratio;
    trailCanvas.height = stageRect.height * ratio;
    trailCanvas.style.width = `${stageRect.width}px`;
    trailCanvas.style.height = `${stageRect.height}px`;

    if (context) {
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
  };

  const setFishTransform = (x, y) => {
    const translateX = x * 52;
    const translateY = y * 34;
    const rotate = x * 18 + y * 6;
    const scale = 1 + Math.abs(x) * 0.04;
    stageFish.style.transform = `translate(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px)) rotate(${rotate}deg) scale(${scale})`;
    stage.style.background = `
      radial-gradient(circle at ${50 + x * 10}% ${44 + y * 8}%, rgba(255, 79, 184, 0.28), transparent 28%),
      radial-gradient(circle at ${35 - x * 12}% ${22 - y * 10}%, rgba(255, 255, 255, 0.16), transparent 18%),
      linear-gradient(180deg, rgba(20, 7, 27, 0.9), rgba(6, 4, 11, 0.94))
    `;
  };

  const addParticle = (x, y) => {
    particles.push({
      x,
      y,
      radius: 10 + Math.random() * 12,
      alpha: 0.34 + Math.random() * 0.28,
      hue: Math.random() > 0.5 ? "255,79,184" : "122,255,218",
      driftX: (Math.random() - 0.5) * 0.35,
      driftY: -0.16 - Math.random() * 0.24,
    });
  };

  const animateTrail = () => {
    if (!context) return;
    context.clearRect(0, 0, stageRect.width, stageRect.height);

    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.x += particle.driftX;
      particle.y += particle.driftY;
      particle.radius *= 0.985;
      particle.alpha *= 0.968;

      if (particle.alpha < 0.025 || particle.radius < 1) {
        particles.splice(index, 1);
        continue;
      }

      const gradient = context.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        particle.radius,
      );
      gradient.addColorStop(0, `rgba(${particle.hue}, ${particle.alpha})`);
      gradient.addColorStop(1, `rgba(${particle.hue}, 0)`);

      context.fillStyle = gradient;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fill();
    }

    requestAnimationFrame(animateTrail);
  };

  const updateStageState = (event) => {
    const x = ((event.clientX - stageRect.left) / stageRect.width - 0.5) * 2;
    const y = ((event.clientY - stageRect.top) / stageRect.height - 0.5) * 2;

    stageState = {
      x: Math.max(-1, Math.min(1, x)),
      y: Math.max(-1, Math.min(1, y)),
    };

    setFishTransform(stageState.x, stageState.y);
    addParticle(event.clientX - stageRect.left, event.clientY - stageRect.top);
  };

  stage.addEventListener("pointerenter", resizeCanvas);
  stage.addEventListener("pointermove", updateStageState);
  stage.addEventListener("pointerleave", () => {
    stageState = { x: 0, y: 0 };
    setFishTransform(0, 0);
  });

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  setFishTransform(0, 0);
  animateTrail();
}

const memoryFish = document.getElementById("memory-fish");
const captureButton = document.getElementById("capture-button");
const captureFlash = document.getElementById("capture-flash");

if (captureButton && memoryFish && memoryCaption && memoryMeta) {
  captureButton.addEventListener("click", () => {
    const photo = photoData[selection.photo];
    const sticker = stickerData[selection.sticker];
    const rotation = stageState.x * 18 + stageState.y * 6;
    const offsetX = stageState.x * 12;
    const offsetY = stageState.y * 8;
    const motion = Math.abs(stageState.x) + Math.abs(stageState.y);
    const now = new Date();

    memoryFish.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg)`;

    if (motion < 0.35) {
      memoryCaption.textContent = `${photo.title} 留住了一段安静灯影`;
    } else if (stageState.x > 0) {
      memoryCaption.textContent = `${photo.title} 正向东风摆尾`;
    } else {
      memoryCaption.textContent = `${photo.title} 在回身时亮起`;
    }

    memoryMeta.textContent = `${formatDotDate(now)} · ${now.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      })} · ${sticker.label}`;

    if (captureFlash) {
      captureFlash.classList.remove("is-active");
      void captureFlash.offsetWidth;
      captureFlash.classList.add("is-active");
    }
  });
}

const customsVideoMap = {
  "鼓藏节": "./习俗/视频/鼓藏节.mp4",
  "苗年": "./习俗/视频/苗年.mp4",
  "古瓢舞": "./习俗/视频/古瓢舞.mp4",
  "婚嫁习俗": "./习俗/视频/婚嫁习俗.mp4",
};

const motifData = {
  "鸟纹": {
    video: "./纹样/鸟纹.mp4",
    text: "百鸟衣的灵魂图腾，象征祖先的羽翼与通天的神力。",
  },
  "蝴蝶纹": {
    video: "./纹样/蝴蝶纹.mp4",
    text: "苗族的创世之母，万物由她孵化，生命由此开始。",
  },
  "龙纹": {
    video: "./纹样/龙纹.mp4",
    text: "守护水与丰收的善龙，不同于汉族的威严，苗龙更亲切灵动。",
  },
  "鱼纹": {
    video: "./纹样/鱼纹.mp4",
    text: "繁衍与富足的象征，多子多福的朴素愿望。",
  },
  "花草纹": {
    video: "./纹样/花草纹.mp4",
    text: "山野间的生命力，是苗人栖居的土地之诗。",
  },
  "纹样总览": {
    video: "./纹样/纹样总览.mp4",
    text: "光明与方向的标记，指引灵魂回归东方故土。",
  },
};

const processVideoMap = {
  "种棉纺纱": "./工序/种棉纺纱.mp4",
  "织布": "./工序/织布.mp4",
  "蚕丝绣片": "./工序/蚕丝绣片.mp4",
  "染布": "./工序/染布.mp4",
  "成衣": "./工序/成衣.mp4",
};

function setVideoSource(video, src) {
  if (!video || !src) return;
  if (video.dataset.currentSrc === src) return;
  video.dataset.currentSrc = src;
  video.src = encodeURI(src);
  video.load();
}

function playSelectedVideo(video, placeholder, src, hideOnEnd = false) {
  if (!video || !placeholder || !src) return;
  setVideoSource(video, src);
  video.classList.add("is-visible");
  placeholder.classList.add("is-hidden");
  const playPromise = video.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {});
  }

  if (hideOnEnd) {
    video.onended = () => {
      video.classList.remove("is-visible");
      placeholder.classList.remove("is-hidden");
    };
  }
}

const customsVideo = document.getElementById("customs-video");
const customsVideoPlaceholder = document.getElementById("customs-video-placeholder");
const customsRouteButtons = document.querySelectorAll("[data-customs-video]");

customsRouteButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.customsVideo;
    const src = customsVideoMap[key];
    if (!src) return;

    customsRouteButtons.forEach((node) => node.classList.toggle("is-active", node === button));
    playSelectedVideo(customsVideo, customsVideoPlaceholder, src, true);
  });
});

if (customsVideo && customsVideoPlaceholder) {
  customsVideo.addEventListener("ended", () => {
    customsRouteButtons.forEach((node) => node.classList.remove("is-active"));
  });
}

const motifVideo = document.getElementById("motif-video");
const motifVideoPlaceholder = document.getElementById("motif-video-placeholder");
const motifDescription = document.getElementById("motif-description");
const motifButtons = document.querySelectorAll("[data-motif-key]");

function setMotif(key) {
  const item = motifData[key];
  if (!item || !motifDescription) return;

  motifDescription.textContent = item.text;
  motifButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.motifKey === key);
  });

  if (motifVideo && motifVideoPlaceholder) {
    playSelectedVideo(motifVideo, motifVideoPlaceholder, item.video, false);
  }
}

motifButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setMotif(button.dataset.motifKey);
  });
});

if (motifDescription) {
  const activeMotif = document.querySelector("[data-motif-key].is-active")?.dataset.motifKey || "鸟纹";
  motifDescription.textContent = motifData[activeMotif].text;
}

const processVideo = document.getElementById("process-video");
const processVideoPlaceholder = document.getElementById("process-video-placeholder");
const processButtons = document.querySelectorAll(".process-button[data-process-key]");
const processFloatCards = document.querySelectorAll(".process-float-card[data-process-key]");

function setProcess(key) {
  const src = processVideoMap[key];
  if (!src) return;

  processButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.processKey === key);
  });

  processFloatCards.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.processKey === key);
  });

  if (processVideo && processVideoPlaceholder) {
    playSelectedVideo(processVideo, processVideoPlaceholder, src, false);
  }
}

[...processButtons, ...processFloatCards].forEach((button) => {
  button.addEventListener("click", () => {
    setProcess(button.dataset.processKey);
  });
});
