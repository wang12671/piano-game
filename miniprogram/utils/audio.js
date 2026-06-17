// utils/audio.js
const NOTE_FREQUENCIES = [261.63, 293.66, 329.63, 349.23]; // C4, D4, E4, F4
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = wx.createWebAudioContext();
  }
  return audioCtx;
}

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

module.exports = {
  playNote
};
