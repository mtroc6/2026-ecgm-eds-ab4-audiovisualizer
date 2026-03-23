/**
 * Native audio engine — wraps expo-audio with simulated frequency data.
 * Real FFT is not available on native without a native module, so bar
 * animations remain procedural. The web variant (.web.ts) uses Web Audio API
 * for real frequency analysis.
 */
import { useRef, useCallback, useEffect } from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

const NUM_BANDS = 20;

export function useAudioEngine() {
  const player = useAudioPlayer(null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const frequencyDataRef = useRef<number[]>(new Array(NUM_BANDS).fill(0));
  const rafRef = useRef<number>(0);

  // Simulated frequency data driven by playback state
  useEffect(() => {
    const update = () => {
      if (status.playing) {
        const bands: number[] = [];
        for (let i = 0; i < NUM_BANDS; i++) {
          const max = i < 7 ? 220 : i < 14 ? 170 : 110;
          bands.push(Math.random() * max + 20);
        }
        frequencyDataRef.current = bands;
      } else {
        frequencyDataRef.current = new Array(NUM_BANDS).fill(0);
      }
      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
  }, [status.playing]);

  const loadAudio = useCallback(
    (uri: string) => {
      player.replace({ uri });
    },
    [player],
  );

  const play = useCallback(() => {
    player.play();
  }, [player]);

  const pause = useCallback(() => {
    player.pause();
  }, [player]);

  const seekTo = useCallback(
    (time: number) => {
      player.seekTo(time);
    },
    [player],
  );

  const setVolume = useCallback(
    (v: number) => {
      player.volume = v;
    },
    [player],
  );

  const setPlaybackRate = useCallback(
    (rate: number) => {
      player.playbackRate = rate;
    },
    [player],
  );

  return {
    isPlaying: status.playing,
    currentTime: status.currentTime,
    duration: status.duration,
    bpm: 0, // Not available on native without a native FFT module
    frequencyDataRef,
    loadAudio,
    play,
    pause,
    seekTo,
    setVolume,
    setPlaybackRate,
  };
}
