"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Fun space-y synthesis. All sounds are generated on the fly with Web Audio.
//  - launch: noise whoosh sweeping up + sub-bass thump
//  - engine: two detuned saws + sub sine octave + vibrato LFO + resonant lowpass
//            that opens as multiplier climbs
//  - cashOutDing: bright C–E–G–C major arpeggio w/ triangle + sine octave sparkle
//  - crashBoom: descending sawtooth blast + exploding filtered noise + sub thump
//  - tick: two-voice chirp; last-second tick is higher pitch for urgency
type Engine = {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  subOsc: OscillatorNode;
  vibratoOsc: OscillatorNode;
  vibratoGain: GainNode;
  filter: BiquadFilterNode;
  gain: GainNode;
};

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

  const launch = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx || !masterRef.current || mutedRef.current) return;
    const master = masterRef.current;
    const now = ctx.currentTime;

    const dur = 0.65;
    const bufSize = Math.floor(dur * ctx.sampleRate);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      // ramp up envelope so the whoosh accelerates
      const env = Math.min(1, i / (bufSize * 0.5));
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 3;
    bp.frequency.setValueAtTime(180, now);
    bp.frequency.exponentialRampToValueAtTime(5200, now + 0.55);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, now);
    ng.gain.exponentialRampToValueAtTime(0.35, now + 0.2);
    ng.gain.exponentialRampToValueAtTime(0.001, now + dur);
    noise.connect(bp);
    bp.connect(ng);
    ng.connect(master);
    noise.start();

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

    const osc1 = ctx.createOscillator();
    osc1.type = "sawtooth";
    osc1.frequency.value = 120;
    const osc2 = ctx.createOscillator();
    osc2.type = "sawtooth";
    osc2.frequency.value = 121.4;
    const subOsc = ctx.createOscillator();
    subOsc.type = "sine";
    subOsc.frequency.value = 60;

    const vibratoOsc = ctx.createOscillator();
    vibratoOsc.type = "sine";
    vibratoOsc.frequency.value = 5.2;
    const vibratoGain = ctx.createGain();
    vibratoGain.gain.value = 2.5;
    vibratoOsc.connect(vibratoGain);
    vibratoGain.connect(osc1.frequency);
    vibratoGain.connect(osc2.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 750;
    filter.Q.value = 4;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    subOsc.connect(gain);
    gain.connect(master);

    osc1.start();
    osc2.start();
    subOsc.start();
    vibratoOsc.start();

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(mutedRef.current ? 0 : 0.07, now + 0.18);

    engineRef.current = {
      osc1,
      osc2,
      subOsc,
      vibratoOsc,
      vibratoGain,
      filter,
      gain,
    };
  }, [ensureCtx]);

  const updateEngine = useCallback((multiplier: number) => {
    const ctx = ctxRef.current;
    const engine = engineRef.current;
    if (!ctx || !engine) return;
    const now = ctx.currentTime;

    const baseFreq = 120 + Math.min(680, (multiplier - 1) * 80);
    engine.osc1.frequency.setTargetAtTime(baseFreq, now, 0.04);
    engine.osc2.frequency.setTargetAtTime(baseFreq * 1.013, now, 0.04);
    engine.subOsc.frequency.setTargetAtTime(baseFreq / 2, now, 0.05);

    const vol = mutedRef.current
      ? 0
      : Math.min(0.16, 0.06 + (multiplier - 1) * 0.012);
    engine.gain.gain.setTargetAtTime(vol, now, 0.05);

    const cutoff = 700 + Math.min(3600, (multiplier - 1) * 380);
    engine.filter.frequency.setTargetAtTime(cutoff, now, 0.08);

    // as it climbs, vibrato intensifies slightly for a frantic feel
    const vibDepth = 2 + Math.min(8, (multiplier - 1) * 0.6);
    engine.vibratoGain.gain.setTargetAtTime(vibDepth, now, 0.08);
  }, []);

  const stopEngine = useCallback(() => {
    const ctx = ctxRef.current;
    const engine = engineRef.current;
    if (!ctx || !engine) return;
    const now = ctx.currentTime;
    engineRef.current = null;
    engine.gain.gain.cancelScheduledValues(now);
    engine.gain.gain.setTargetAtTime(0, now, 0.03);
    setTimeout(() => {
      try {
        engine.osc1.stop();
        engine.osc1.disconnect();
        engine.osc2.stop();
        engine.osc2.disconnect();
        engine.subOsc.stop();
        engine.subOsc.disconnect();
        engine.vibratoOsc.stop();
        engine.vibratoOsc.disconnect();
        engine.vibratoGain.disconnect();
        engine.filter.disconnect();
        engine.gain.disconnect();
      } catch {}
    }, 250);
  }, []);

  const crashBoom = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx || !masterRef.current || mutedRef.current) return;
    const master = masterRef.current;
    const now = ctx.currentTime;

    // Descending pitch blast (the whistle-before-impact)
    const blast = ctx.createOscillator();
    blast.type = "sawtooth";
    blast.frequency.setValueAtTime(620, now);
    blast.frequency.exponentialRampToValueAtTime(55, now + 0.45);
    const blastFilter = ctx.createBiquadFilter();
    blastFilter.type = "lowpass";
    blastFilter.frequency.setValueAtTime(2400, now);
    blastFilter.frequency.exponentialRampToValueAtTime(220, now + 0.5);
    blastFilter.Q.value = 2;
    const blastGain = ctx.createGain();
    blastGain.gain.setValueAtTime(0.4, now);
    blastGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    blast.connect(blastFilter);
    blastFilter.connect(blastGain);
    blastGain.connect(master);
    blast.start();
    blast.stop(now + 0.6);

    // Explosion noise with darkening filter
    const dur = 0.85;
    const bufSize = Math.floor(dur * ctx.sampleRate);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      const env = Math.pow(1 - i / bufSize, 2);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.setValueAtTime(4500, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(380, now + 0.6);
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.55;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start();

    // Sub-bass thump for gut-punch
    const thump = ctx.createOscillator();
    thump.type = "sine";
    thump.frequency.setValueAtTime(130, now);
    thump.frequency.exponentialRampToValueAtTime(28, now + 0.45);
    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(0.75, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    thump.connect(thumpGain);
    thumpGain.connect(master);
    thump.start();
    thump.stop(now + 0.6);
  }, [ensureCtx]);

  const cashOutDing = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx || !masterRef.current || mutedRef.current) return;
    const master = masterRef.current;
    const now = ctx.currentTime;
    // C major arpeggio, 4 quick notes — coin-collect flavor
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

  // urgency 1 (3s) → 2 (2s) → 3 (1s): higher pitch, slightly louder for the final beep.
  const tick = useCallback((urgency: number = 1) => {
    const ctx = ensureCtx();
    if (!ctx || !masterRef.current || mutedRef.current) return;
    const master = masterRef.current;
    const now = ctx.currentTime;
    const freq = 620 + urgency * 220;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const oscHi = ctx.createOscillator();
    oscHi.type = "sine";
    oscHi.frequency.value = freq * 1.5;
    const g = ctx.createGain();
    const peakGain = urgency >= 3 ? 0.13 : 0.07;
    const dur = urgency >= 3 ? 0.16 : 0.09;
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
