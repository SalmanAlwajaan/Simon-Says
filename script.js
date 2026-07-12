"use strict";

/* =============================================
   Utility: nav, reveal animations, footer year
   ============================================= */

document.getElementById("year").textContent = new Date().getFullYear();

const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");

navToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

/* =============================================
   QR codes (team) — generated locally with qrcodejs
   ============================================= */

const teamLinks = [
  { id: "qr-ahmad", url: "https://www.linkedin.com/in/ahmad-alfares-8520b71b1" },
  { id: "qr-shihan", url: "https://www.linkedin.com/in/shihan-bin-fahidah-b17455352" },
  { id: "qr-salman", url: "https://www.linkedin.com/in/salwajaan" },
];

teamLinks.forEach(({ id, url }) => {
  const el = document.getElementById(id);
  if (el && window.QRCode) {
    new QRCode(el, {
      text: url,
      width: 128,
      height: 128,
      colorDark: "#31219B",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M,
    });
  }
});

/* =============================================
   Audio engine (Web Audio API — no audio files)
   ============================================= */

let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playTone(freq, duration = 0.32, type = "sine") {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;

  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.28, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playSuccessChime() {
  playTone(523.25, 0.16);
  setTimeout(() => playTone(659.25, 0.22), 140);
}

function playGameOverTone() {
  playTone(196.0, 0.5, "sawtooth");
}

/* =============================================
   Simon Says — game logic
   ============================================= */

const COLORS = {
  red: { freq: 261.63 },   // C4
  green: { freq: 329.63 }, // E4
  blue: { freq: 392.0 },   // G4
  yellow: { freq: 523.25 } // C5
};
const COLOR_NAMES = Object.keys(COLORS);

const DIFFICULTY = {
  easy: { startLevel: 1, flash: 600, gap: 420 },
  normal: { startLevel: 2, flash: 460, gap: 320 },
  hard: { startLevel: 4, flash: 320, gap: 220 },
};

const BEST_SCORE_KEY = "simonSaysBestScore";

const padButtons = Array.from(document.querySelectorAll(".pad-btn"));
const startBtn = document.getElementById("startBtn");
const gameMessage = document.getElementById("gameMessage");
const statLevel = document.getElementById("statLevel");
const statBest = document.getElementById("statBest");
const diffOptions = document.getElementById("diffOptions");

let difficulty = "easy";
let sequence = [];
let playerIndex = 0;
let state = "idle"; // idle | playing | input | gameover
let bestScore = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;

statBest.textContent = bestScore;

diffOptions.querySelectorAll(".diff-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (state === "playing" || state === "input") return;
    diffOptions.querySelectorAll(".diff-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    difficulty = btn.dataset.diff;
  });
});

function randomColor() {
  return COLOR_NAMES[Math.floor(Math.random() * COLOR_NAMES.length)];
}

function setMessage(text, variant) {
  gameMessage.textContent = text;
  gameMessage.classList.remove("nice", "over");
  if (variant) gameMessage.classList.add(variant);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function playSequence() {
  state = "playing";
  setPadsEnabled(false);
  setMessage("راقب النمط...");
  const cfg = DIFFICULTY[difficulty];

  await sleep(500);

  for (let i = 0; i < sequence.length; i++) {
    const color = sequence[i];
    const btn = padButtons.find((b) => b.dataset.color === color);
    btn.classList.add("lit");
    playTone(COLORS[color].freq, cfg.flash / 1000);
    await sleep(cfg.flash);
    btn.classList.remove("lit");
    await sleep(cfg.gap);
  }

  playerIndex = 0;
  state = "input";
  setPadsEnabled(true);
  setMessage("دورك الآن!");
}

function setPadsEnabled(enabled) {
  padButtons.forEach((b) => (b.disabled = !enabled));
}

function startGame() {
  getAudioCtx();
  sequence = [];
  const cfg = DIFFICULTY[difficulty];
  for (let i = 1; i <= cfg.startLevel; i++) {
    sequence.push(randomColor());
  }
  startBtn.style.display = "none";
  statLevel.textContent = sequence.length;
  playSequence();
}

function handleCorrectStep() {
  playerIndex++;
  statLevel.textContent = sequence.length;

  if (playerIndex === sequence.length) {
    // round cleared
    state = "playing";
    setPadsEnabled(false);
    setMessage("!NICE", "nice");
    playSuccessChime();

    setTimeout(() => {
      sequence.push(randomColor());
      statLevel.textContent = sequence.length;
      playSequence();
    }, 900);
  }
}

function endGame() {
  state = "gameover";
  setPadsEnabled(false);
  playGameOverTone();

  const finalScore = Math.max(sequence.length - 1, 0);
  if (finalScore > bestScore) {
    bestScore = finalScore;
    localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
  }
  statBest.textContent = bestScore;
  statLevel.textContent = finalScore;

  setMessage(`GAME OVER — النتيجة: ${finalScore}`, "over");
  startBtn.textContent = "العب مرة أخرى";
  startBtn.style.display = "inline-flex";
}

function handleWrongStep() {
  endGame();
}

padButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (state !== "input") return;
    const expected = sequence[playerIndex];

    btn.classList.add("lit");
    playTone(COLORS[btn.dataset.color].freq, 0.25);
    setTimeout(() => btn.classList.remove("lit"), 180);

    if (expected === btn.dataset.color) {
      handleCorrectStep();
    } else {
      handleWrongStep();
    }
  });
});

startBtn.addEventListener("click", startGame);
