/**
 * Opt-in soundscape, synthesised with WebAudio (no audio files to download).
 *   ordinary realm: desert wind + a low dusk drone
 *   the Shift:      a filtered synth pad and a soft four-on-the-floor pulse
 *   crossing:       a noise whoosh sweeping up;  UI: short blips
 * Off by default. Starts only from a user gesture (the toggle), as browsers require.
 */
let ac = null, master = null, beds = null, realm = 'ordinary', pulseTimer = 0, on = false;

function noiseBuffer(ac, seconds = 2) {
  const b = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function build() {
  ac = new (window.AudioContext || window.webkitAudioContext)();
  master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
  const noise = noiseBuffer(ac);

  // ordinary: wind (filtered noise, slowly modulated) + drone (two detuned triangles)
  const ord = ac.createGain(); ord.gain.value = 0; ord.connect(master);
  const wind = ac.createBufferSource(); wind.buffer = noise; wind.loop = true;
  const wf = ac.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 500; wf.Q.value = 0.6;
  const wl = ac.createOscillator(); wl.frequency.value = 0.07; const wlg = ac.createGain(); wlg.gain.value = 260; wl.connect(wlg).connect(wf.frequency);
  const wg = ac.createGain(); wg.gain.value = 0.18; wind.connect(wf).connect(wg).connect(ord);
  const drone = [55, 55.4, 82.5].map((f) => { const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = f; const g = ac.createGain(); g.gain.value = 0.05; o.connect(g).connect(ord); return o; });

  // shift: pad (saws through a moving low-pass) + pulse
  const sh = ac.createGain(); sh.gain.value = 0; sh.connect(master);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 4;
  const lfo = ac.createOscillator(); lfo.frequency.value = 0.11; const lfog = ac.createGain(); lfog.gain.value = 600; lfo.connect(lfog).connect(lp.frequency);
  const pg = ac.createGain(); pg.gain.value = 0.045; lp.connect(pg).connect(sh);
  const pad = [110, 164.8, 220.5, 277.2].map((f, i) => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = (i - 1.5) * 7; o.connect(lp); return o; });

  [wind, wl, lfo, ...drone, ...pad].forEach((n) => n.start());
  beds = { ord, sh };
}

function kick() {
  if (!ac || realm !== 'shift') return;
  const t = ac.currentTime;
  const o = ac.createOscillator(); const g = ac.createGain();
  o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
  g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  o.connect(g).connect(beds.sh); o.start(t); o.stop(t + 0.32);
}

function crossfade() {
  if (!ac) return;
  const t = ac.currentTime;
  beds.ord.gain.setTargetAtTime(realm === 'ordinary' ? 1 : 0, t, 0.6);
  beds.sh.gain.setTargetAtTime(realm === 'shift' ? 1 : 0, t, 0.6);
  clearInterval(pulseTimer);
  if (realm === 'shift') pulseTimer = setInterval(kick, 500); // 120 bpm
}

export const sound = {
  get on() { return on; },
  async enable() {
    if (!ac) build();
    await ac.resume();
    on = true;
    master.gain.setTargetAtTime(0.9, ac.currentTime, 0.4);
    crossfade();
  },
  disable() {
    on = false;
    clearInterval(pulseTimer);
    if (ac) { master.gain.setTargetAtTime(0, ac.currentTime, 0.15); setTimeout(() => { if (!on) ac.suspend(); }, 600); }
  },
  setRealm(r) { if (r === realm) return; realm = r; if (on) crossfade(); },
  whoosh() {
    if (!on || !ac) return;
    const t = ac.currentTime;
    const src = ac.createBufferSource(); src.buffer = noiseBuffer(ac, 1.6);
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(200, t); f.frequency.exponentialRampToValueAtTime(5200, t + 1.1);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    src.connect(f).connect(g).connect(master); src.start(t);
  },
  blip(freq = 880) {
    if (!on || !ac) return;
    const t = ac.currentTime;
    const o = ac.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.06);
    const g = ac.createGain(); g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.14);
  },
};
