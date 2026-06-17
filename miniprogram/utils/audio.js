// utils/audio.js
// 卡农旋律音符（帕赫贝尔卡农 D大调简化版）
const CANON_NOTES = [
  // D大调卡农基础旋律
  293.66, 330, 349.23, 392, 440, 349.23, 392, 330,  // 第1段
  293.66, 330, 349.23, 392, 440, 349.23, 392, 330,  // 第2段
  262, 293.66, 330, 349.23, 392, 330, 349.23, 293.66, // 第3段
  262, 293.66, 330, 349.23, 392, 330, 349.23, 293.66, // 第4段
];

// 点击音符（C大调）
const NOTE_FREQUENCIES = [261.63, 293.66, 329.63, 349.23]; // C4, D4, E4, F4

let audioCtx = null;
let bgmInterval = null;
let bgmNoteIndex = 0;
let isBgmPlaying = false;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = wx.createWebAudioContext();
  }
  return audioCtx;
}

// 播放单个音符
function playNote(columnIndex) {
  if (columnIndex < 0 || columnIndex > 3) return;

  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = NOTE_FREQUENCIES[columnIndex];

  gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.2);
}

// 播放卡农背景音乐音符
function playCanonNote() {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = CANON_NOTES[bgmNoteIndex];

  // 背景音乐音量较小
  gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.3);

  bgmNoteIndex = (bgmNoteIndex + 1) % CANON_NOTES.length;
}

// 开始播放卡农背景音乐
function startBgm() {
  if (isBgmPlaying) return;
  isBgmPlaying = true;
  bgmNoteIndex = 0;
  
  // 每300ms播放一个音符
  bgmInterval = setInterval(() => {
    if (isBgmPlaying) {
      playCanonNote();
    }
  }, 300);
}

// 停止背景音乐
function stopBgm() {
  isBgmPlaying = false;
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }
}

module.exports = {
  playNote,
  startBgm,
  stopBgm
};
