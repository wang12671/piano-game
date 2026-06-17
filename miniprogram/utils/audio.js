// utils/audio.js
// C大调卡农和弦进行：C4 - E4 - G4 - C5 循环
const CANON_CHORD = [
  262,  // C4
  330,  // E4
  392,  // G4
  523   // C5
];

// 点击音符（C大调）- 与卡农和弦对应
const NOTE_FREQUENCIES = [262, 330, 392, 523]; // C4, E4, G4, C5

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

// 播放单个音符（音游敲击）
function playNote(columnIndex) {
  if (columnIndex < 0 || columnIndex > 3) return;

  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = NOTE_FREQUENCIES[columnIndex];

  // 敲击音量0.4，时值150ms
  gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.15);
}

// 播放卡农背景音乐音符
function playCanonNote() {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = CANON_CHORD[bgmNoteIndex];

  // 背景音乐音量0.2，柔和不干扰
  gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.3);

  bgmNoteIndex = (bgmNoteIndex + 1) % CANON_CHORD.length;
}

// 开始播放卡农背景音乐
function startBgm() {
  if (isBgmPlaying) return;
  isBgmPlaying = true;
  bgmNoteIndex = 0;
  
  // C大调卡农和弦循环，每300ms播放一个音符
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
