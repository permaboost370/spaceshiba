"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Real rocket engine: brown-noise rumble + sub-bass + high-freq hiss, filtered.
// No oscillator tones, no vibrato — just layered noise like an actual engine.
//  - launch: pitched noise whoosh + 90→40 Hz thump
//  - engine: looping brown-noise through lowpass (opens with multiplier)
//            + continuous sub-bass sine + subtle white-noise hiss
//  - cashOutDing: C–E–G–C major arpeggio on triangle waves
//  - crashBoom: descending saw + filtered explosion noise + sub thump
//  - tick: short pitched chirp; last-second tick is higher/louder
type Engine = {
  rumble: AudioBufferSourceNode;
  rumbleFilter: BiquadFilterNode;
  rumbleGain: GainNode;
  hiss: AudioBufferSourceNode;
  hissFilter: BiquadFilterNode;
  hissGain: GainNode;
  sub: OscillatorNode;
  subGain: GainNode;
  master: GainNode;
};

function buildBrownNoise(ctx: AudioContext, seconds: number) {
  const size = Math.floor(seconds * ctx.sampleRate);
  const buf = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < size; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    data[i] = last * 3.5;
  }
  return buf;
}

function buildWhiteNoise(ctx: AudioContext, seconds: number) {
  const size = Math.floor(seconds * ctx.sampleRate);
  const buf = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

export function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  mutedRef.current = muted;

  const ensureCtx = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (ctxRef.current) {
      if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
      return ctxRef.current;
    }
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return null;
    try {
      const ctx = new Ctx();
      const master = ctx.createGain();
      master.gain.value = 1;
      master.connect(ctx.destination);
      ctxRef.current = ctx;
      masterRef.current = master;
      return ctx;
    } catch {
      return null;
    }
  }, []);

  // Apply master mute without stopping the engine
  useEffect(() => {
    const m = masterRef.current;
    if (!m || !ctxRef.current) return;
    m.gain.setTargetAtTime(muted ? 0 : 1, ctxRef.current.currentTime, 0.05);
  }, [muted]);

  const launch = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx || !masterRef.current) return;
    const master = masterRef.current;
    const now = ctx.currentTime;

    const dur = 0.7;
    const buf = buildWhiteNoise(ctx, dur);
    const n = ctx.createBufferSource();
    n.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 3;
    bp.frequency.setValueAtTime(180, now);
    bp.frequency.exponentialRampToValueAtTime(5000, now + 0.6);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, now);
    ng.gain.exponentialRampToValueAtTime(0.4, now + 0.2);
    ng.gain.exponentialRampToValueAtTime(0.001, now + dur);
    n.connect(bp);
    bp.connect(ng);
    ng.connect(master);
    n.start();

    const thump = ctx.createOscillator();
    thump.type = "sine";
    thump.frequency.setValueAtTime(90, now);
    thump.frequency.exponentialRampToValueAtTime(40, now + 0.25);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.55, now);
    tg.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    thump.connect(tg);
    tg.connect(master);
    thump.start();
    thump.stop(now + 0.32);
  }, [ensureCtx]);

  const startEngine = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx || !masterRef.current) return;
    if (engineRef.current) return;
    const master = masterRef.current;
    const now = ctx.currentTime;

    const rumble = ctx.createBufferSource();
    rumble.buffer = buildBrownNoise(ctx, 4);
    rumble.loop = true;
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = "lowpass";
    rumbleFilter.frequency.value = 260;
    rumbleFilter.Q.value = 0.9;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 1.6;

    const hiss = ctx.createBufferSource();
    hiss.buffer = buildWhiteNoise(ctx, 4);
    hiss.loop = true;
    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = "bandpass";
    hissFilter.frequency.value = 1800;
    hissFilter.Q.value = 1.2;
    const hissGain = ctx.createGain();
    hissGain.gain.value = 0.05;

    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = 46;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.35;

    const engineMaster = ctx.createGain();
    engineMaster.gain.value = 0;

    rumble.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(engineMaster);
    hiss.connect(hissFilter);
    hissFilter.connect(hissGain);
    hissGain.connect(engineMaster);
    sub.connect(subGain);
    subGain.connect(engineMaster);
    engineMaster.connect(master);

    rumble.start();
    hiss.start();
    sub.start();

    engineMaster.gain.setValueAtTime(0, now);
    engineMaster.gain.linearRampToValueAtTime(0.28, now + 0.35);

    engineRef.current = {
      rumble,
      rumbleFilter,
      rumbleGain,
      hiss,
      hissFilter,
      hissGain,
      sub,
      subGain,
      master: engineMaster,
    };
  }, [ensureCtx]);

  const updateEngine = useCallback((multiplier: number) => {
    const ctx = ctxRef.current;
    const e = engineRef.current;
    if (!ctx || !e) return;
    const now = ctx.currentTime;

    // Rumble filter opens as the rocket pushes harder
    const cutoff = 260 + Math.min(480, (multiplier - 1) * 55);
    e.rumbleFilter.frequency.setTargetAtTime(cutoff, now, 0.12);

    // High-freq hiss rises slightly — feels like air rushing past
    const hissFreq = 1800 + Math.min(1400, (multiplier - 1) * 200);
    e.hissFilter.frequency.setTargetAtTime(hissFreq, now, 0.15);
    const hissVol = Math.min(0.14, 0.05 + (multiplier - 1) * 0.01);
    e.hissGain.gain.setTargetAtTime(hissVol, now, 0.1);

    // Overall engine volume climbs modestly
    const vol = Math.min(0.42, 0.28 + (multiplier - 1) * 0.014);
    e.master.gain.setTargetAtTime(vol, now, 0.12);
  }, []);

  const stopEngine = useCallback(() => {
    const ctx = ctxRef.current;
    const e = engineRef.current;
    if (!ctx || !e) return;
    const now = ctx.currentTime;
    engineRef.current = null;
    e.master.gain.cancelScheduledValues(now);
    e.master.gain.setTargetAtTime(0, now, 0.04);
    setTimeout(() => {
      try {
        e.rumble.stop();
        e.rumble.disconnect();
        e.hiss.stop();
        e.hiss.disconnect();
        e.sub.stop();
        e.sub.disconnect();
        e.rumbleFilter.disconnect();
        e.rumbleGain.disconnect();
        e.hissFilter.disconnect();
        e.hissGain.disconnect();
        e.subGain.disconnect();
        e.master.disconnect();
      } catch {
        /* ignore */
      }
    }, 300);
  }, []);

  const crashBoom = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx || !masterRef.current) return;
    const master = masterRef.current;
    const now = ctx.currentTime;

    const blast = ctx.createOscillator();
    blast.type = "sawtooth";
    blast.frequency.setValueAtTime(620, now);
    blast.frequency.exponentialRampToValueAtTime(55, now + 0.45);
    const bf = ctx.createBiquadFilter();
    bf.type = "lowpass";
    bf.frequency.setValueAtTime(2400, now);
    bf.frequency.exponentialRampToValueAtTime(220, now + 0.5);
    bf.Q.value = 2;
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.4, now);
    bg.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    blast.connect(bf);
    bf.connect(bg);
    bg.connect(master);
    blast.start();
    blast.stop(now + 0.6);

    const dur = 0.9;
    const buf = buildWhiteNoise(ctx, dur);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] *= Math.pow(1 - i / data.length, 2);
    }
    const n = ctx.createBufferSource();
    n.buffer = buf;
    const nf = ctx.createBiquadFilter();
    nf.type = "lowpass";
    nf.frequency.setValueAtTime(4500, now);
    nf.frequency.exponentialRampToValueAtTime(360, now + 0.6);
    const ng = ctx.createGain();
    ng.gain.value = 0.55;
    n.connect(nf);
    nf.connect(ng);
    ng.connect(master);
    n.start();

    const thump = ctx.createOscillator();
    thump.type = "sine";
    thump.frequency.setValueAtTime(130, now);
    thump.frequency.exponentialRampToValueAtTime(28, now + 0.45);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.75, now);
    tg.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    thump.connect(tg);
    tg.connect(master);
    thump.start();
    thump.stop(now + 0.6);
  }, [ensureCtx]);

  const cashOutDing = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx || !masterRef.current) return;
    const master = masterRef.current;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const start = now + i * 0.07;
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const oscHigh = ctx.createOscillator();
      oscHigh.type = "sine";
      oscHigh.frequency.value = freq * 2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.22, start + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.38);
      const gh = ctx.createGain();
      gh.gain.setValueAtTime(0, start);
      gh.gain.linearRampToValueAtTime(0.07, start + 0.012);
      gh.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      osc.connect(g);
      oscHigh.connect(gh);
      g.connect(master);
      gh.connect(master);
      osc.start(start);
      oscHigh.start(start);
      osc.stop(start + 0.42);
      oscHigh.stop(start + 0.3);
    });
  }, [ensureCtx]);

  const tick = useCallback((urgency: number = 1) => {
    const ctx = ensureCtx();
    if (!ctx || !masterRef.current) return;
    const master = masterRef.current;
    const now = ctx.currentTime;
    const freq = 620 + urgency * 220;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const oscHi = ctx.createOscillator();
    oscHi.type = "sine";
    oscHi.frequency.value = freq * 1.5;
    const peakGain = urgency >= 3 ? 0.13 : 0.07;
    const dur = urgency >= 3 ? 0.16 : 0.09;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(peakGain, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    const gh = ctx.createGain();
    gh.gain.setValueAtTime(0, now);
    gh.gain.linearRampToValueAtTime(0.03, now + 0.008);
    gh.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.7);
    osc.connect(g);
    oscHi.connect(gh);
    g.connect(master);
    gh.connect(master);
    osc.start();
    oscHi.start();
    osc.stop(now + dur + 0.02);
    oscHi.stop(now + dur + 0.02);
  }, [ensureCtx]);

  useEffect(() => {
    const unlock = () => {
      ensureCtx();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [ensureCtx]);

  return {
    muted,
    setMuted,
    launch,
    startEngine,
    updateEngine,
    stopEngine,
    crashBoom,
    cashOutDing,
    tick,
  };
}
