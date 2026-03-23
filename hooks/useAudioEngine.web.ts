/**
 * Web Audio API engine with real FFT frequency analysis and BPM detection.
 * This file is automatically resolved on web platform via Expo's .web.ts convention.
 */
import { useState, useRef, useCallback, useEffect } from 'react';

const FFT_SIZE = 512;
const NUM_BANDS = 20;

export function useAudioEngine() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bpm, setBpm] = useState(0);

  const frequencyDataRef = useRef<number[]>(new Array(NUM_BANDS).fill(0));

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);
  const lastStateUpdateRef = useRef<number>(0);

  // BPM detection refs
  const beatTimesRef = useRef<number[]>([]);
  const prevBassEnergyRef = useRef<number>(0);
  const energyHistoryRef = useRef<number[]>([]);

  const getOrCreateContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.75;
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
    }
    return { ctx: audioCtxRef.current, analyser: analyserRef.current! };
  }, []);

  const updateLoop = useCallback(() => {
    const analyser = analyserRef.current;
    const audio = audioRef.current;
    if (!analyser || !audio) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    // Map frequency bins → NUM_BANDS bars
    const binsPerBand = Math.floor(bufferLength / NUM_BANDS);
    const bands: number[] = [];
    for (let i = 0; i < NUM_BANDS; i++) {
      let sum = 0;
      const start = i * binsPerBand;
      for (let j = start; j < start + binsPerBand && j < bufferLength; j++) {
        sum += dataArray[j];
      }
      bands[i] = sum / binsPerBand;
    }
    frequencyDataRef.current = bands;

    // ── BPM detection: bass energy onset ──
    const bassEnergy = (bands[0] + bands[1] + bands[2] + bands[3]) / 4;
    const energyHistory = energyHistoryRef.current;
    energyHistory.push(bassEnergy);
    if (energyHistory.length > 43) energyHistory.shift(); // ~0.7 s window at 60 fps

    const avgEnergy =
      energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length;
    const now = performance.now();
    const lastBeat = beatTimesRef.current[beatTimesRef.current.length - 1] ?? 0;

    if (
      bassEnergy > avgEnergy * 1.4 &&
      bassEnergy > 100 &&
      bassEnergy > prevBassEnergyRef.current &&
      now - lastBeat > 280
    ) {
      beatTimesRef.current.push(now);
      if (beatTimesRef.current.length > 16) beatTimesRef.current.shift();

      const times = beatTimesRef.current;
      if (times.length > 4) {
        const intervals: number[] = [];
        for (let k = 1; k < times.length; k++) {
          intervals.push(times[k] - times[k - 1]);
        }
        intervals.sort((a, b) => a - b);
        const medianInterval = intervals[Math.floor(intervals.length / 2)];
        const newBpm = Math.round(60000 / medianInterval);
        if (newBpm >= 60 && newBpm <= 200) {
          setBpm(newBpm);
        }
      }
    }
    prevBassEnergyRef.current = bassEnergy;

    // Throttle React state updates for currentTime (~10 Hz)
    if (now - lastStateUpdateRef.current > 100) {
      setCurrentTime(audio.currentTime);
      lastStateUpdateRef.current = now;
    }

    rafRef.current = requestAnimationFrame(updateLoop);
  }, []);

  // ── Public API ────────────────────────────────────────────────────────────

  const loadAudio = useCallback(
    (uri: string) => {
      const { ctx, analyser } = getOrCreateContext();

      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
      }
      cancelAnimationFrame(rafRef.current);

      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.src = uri;
      audioRef.current = audio;

      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser);
      sourceRef.current = source;

      // Reset BPM tracking
      beatTimesRef.current = [];
      energyHistoryRef.current = [];
      prevBassEnergyRef.current = 0;
      setBpm(0);

      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        cancelAnimationFrame(rafRef.current);
        frequencyDataRef.current = new Array(NUM_BANDS).fill(0);
      });

      setCurrentTime(0);
      setIsPlaying(false);
    },
    [getOrCreateContext],
  );

  const play = useCallback(() => {
    const ctx = audioCtxRef.current;
    const audio = audioRef.current;
    if (!audio) return;

    if (ctx?.state === 'suspended') ctx.resume();
    audio.play();
    setIsPlaying(true);
    rafRef.current = requestAnimationFrame(updateLoop);
  }, [updateLoop]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
    cancelAnimationFrame(rafRef.current);
  }, []);

  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setVolume = useCallback((v: number) => {
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      audioRef.current?.pause();
      if (sourceRef.current) sourceRef.current.disconnect();
      audioCtxRef.current?.close();
    };
  }, []);

  return {
    isPlaying,
    currentTime,
    duration,
    bpm,
    frequencyDataRef,
    loadAudio,
    play,
    pause,
    seekTo,
    setVolume,
    setPlaybackRate,
  };
}
