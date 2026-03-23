import { useState, useRef, useEffect } from 'react';
import { StyleSheet, Pressable, Platform, View as RNView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import Slider from '@react-native-community/slider';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';

import { Text, View } from '@/components/Themed';
import { useAudioEngine } from '@/hooks/useAudioEngine';

const NUM_BARS = 20;
const WAVEFORM_BARS = 40;
const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const CIRC_R = 78;
const CIRC_SIZE = 220;
const CIRC_C = CIRC_SIZE / 2;

// ─── Types ──────────────────────────────────────────────────────────
type VisMode = 'bars' | 'waveform' | 'circular';
type ColorScheme = 'black' | 'blue' | 'colorful';

// ─── Color helpers ──────────────────────────────────────────────────
function getBarColor(scheme: ColorScheme, index: number, total: number, intensity: number): string {
  switch (scheme) {
    case 'black': {
      const l = Math.round(30 + intensity * 60);
      return `hsl(0, 0%, ${l}%)`;
    }
    case 'blue': {
      const l = Math.round(35 + intensity * 40);
      const s = Math.round(60 + intensity * 30);
      return `hsl(210, ${s}%, ${l}%)`;
    }
    case 'colorful': {
      const h = (index / total) * 260 + 180;
      const l = Math.round(35 + intensity * 35);
      return `hsl(${h}, 90%, ${l}%)`;
    }
    default:
      return '#2f95dc';
  }
}

function getBandColor(scheme: ColorScheme, band: 'bass' | 'mid' | 'treble', intensity: number): string {
  const idx = band === 'bass' ? 0 : band === 'mid' ? 10 : 19;
  return getBarColor(scheme, idx, NUM_BARS, intensity);
}

const COLOR_ICONS: Record<ColorScheme, string> = { black: '⚫', blue: '🔵', colorful: '🌈' };
const COLOR_KEYS: ColorScheme[] = ['black', 'blue', 'colorful'];

// ─── Waveform shape generator ───────────────────────────────────────
function generateWaveformShape(count: number): number[] {
  const result: number[] = [];
  let prev = 0.5;
  for (let i = 0; i < count; i++) {
    const delta = (Math.random() - 0.5) * 0.3;
    prev = Math.max(0.08, Math.min(1, prev + delta));
    result.push(Math.random() > 0.85 ? Math.min(1, prev * 1.8) : prev);
  }
  return result;
}

// ─── Bar heights hook ───────────────────────────────────────────────
function useBarHeights() {
  const b0 = useSharedValue(10); const b1 = useSharedValue(10);
  const b2 = useSharedValue(10); const b3 = useSharedValue(10);
  const b4 = useSharedValue(10); const b5 = useSharedValue(10);
  const b6 = useSharedValue(10); const b7 = useSharedValue(10);
  const b8 = useSharedValue(10); const b9 = useSharedValue(10);
  const b10 = useSharedValue(10); const b11 = useSharedValue(10);
  const b12 = useSharedValue(10); const b13 = useSharedValue(10);
  const b14 = useSharedValue(10); const b15 = useSharedValue(10);
  const b16 = useSharedValue(10); const b17 = useSharedValue(10);
  const b18 = useSharedValue(10); const b19 = useSharedValue(10);
  return [b0, b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11, b12, b13, b14, b15, b16, b17, b18, b19];
}

// ─── Animated Bar (Bars mode) ───────────────────────────────────────
function Bar({ height, index, scheme, maxHeight }: {
  height: SharedValue<number>; index: number; scheme: ColorScheme; maxHeight: number;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    backgroundColor: getBarColor(scheme, index, NUM_BARS, Math.min(1, height.value / maxHeight)),
  }));
  return <Animated.View style={[styles.bar, animatedStyle]} />;
}

// ─── Waveform Display ───────────────────────────────────────────────
function WaveformDisplay({ waveShape, progress, scheme }: {
  waveShape: number[]; progress: number; scheme: ColorScheme; isPlaying: boolean;
}) {
  const H = 120, W = 6, GAP = 5;
  const totalW = waveShape.length * (W + GAP);
  const playheadX = useSharedValue(0);
  playheadX.value = withTiming(progress * totalW, { duration: 120, easing: Easing.linear });

  const phStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const, left: playheadX.value - 1, top: -8,
    width: 2, height: H + 16, backgroundColor: '#fff', borderRadius: 1, opacity: 0.9,
  }));

  return (
    <View style={[styles.waveformWrapper, { width: totalW }]}>
      {waveShape.map((amp, i) => {
        const barH = Math.max(4, amp * H);
        const frac = i / waveShape.length;
        let c: string;
        if (scheme === 'black') c = `hsl(0,0%,${Math.round(30 + amp * 50)}%)`;
        else if (scheme === 'blue') c = `hsl(210,80%,${Math.round(35 + amp * 35)}%)`;
        else { const hue = Math.round(220 - amp * 220); c = `hsl(${hue},85%,${Math.round(45 + amp * 20)}%)`; }
        return (
          <View key={i} style={{
            width: W, height: barH, borderRadius: 2, backgroundColor: c,
            marginRight: GAP, alignSelf: 'center', opacity: frac <= progress ? 1 : 0.3,
          }} />
        );
      })}
      <Animated.View style={phStyle} />
    </View>
  );
}

// ─── Circular Bar ───────────────────────────────────────────────────
function CircularBar({ height, index, total, scheme }: {
  height: SharedValue<number>; index: number; total: number; scheme: ColorScheme;
}) {
  const angle = (index / total) * 2 * Math.PI;
  const cx = CIRC_C + CIRC_R * Math.cos(angle - Math.PI / 2);
  const cy = CIRC_C + CIRC_R * Math.sin(angle - Math.PI / 2);

  const animatedStyle = useAnimatedStyle(() => {
    const intensity = Math.min(1, height.value / 150);
    const len = height.value * 0.4 + 8;
    return {
      position: 'absolute' as const, width: 7, height: len, borderRadius: 3.5,
      backgroundColor: getBarColor(scheme, index, total, intensity),
      left: cx - 3.5, top: cy - len,
      transform: [{ rotate: `${(angle * 180) / Math.PI}deg` }],
      transformOrigin: `3.5px ${len}px`,
    };
  });

  return <Animated.View style={animatedStyle} />;
}

// ─── Main Screen ────────────────────────────────────────────────────
export default function VisualizerScreen() {
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(2);
  const [volume, setVolume] = useState(1);
  const [visMode, setVisMode] = useState<VisMode>('bars');
  const [colorScheme, setColorScheme] = useState<ColorScheme>('colorful');
  const [waveKey, setWaveKey] = useState(0);
  const [waveShapes, setWaveShapes] = useState<number[][]>([generateWaveformShape(WAVEFORM_BARS)]);

  const engine = useAudioEngine();
  const barHeights = useBarHeights();
  const rafRef = useRef<number>(0);

  const isPlaying = engine.isPlaying;
  const currentTime = isSeeking ? seekValue : engine.currentTime;
  const progress = engine.duration > 0 ? currentTime / engine.duration : 0;

  // ── Sync FFT → shared values ──
  useEffect(() => {
    const update = () => {
      const data = engine.frequencyDataRef.current;
      for (let i = 0; i < barHeights.length; i++) {
        barHeights[i].value = (data[i] ?? 0) * 0.63 + 10;
      }
      rafRef.current = requestAnimationFrame(update);
    };
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(update);
    } else {
      for (const bar of barHeights) bar.value = withTiming(10, { duration: 400 });
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, barHeights, engine.frequencyDataRef]);

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      const file = result.assets[0];
      setFileName(file.name);
      engine.loadAudio(file.uri);
      setSpeedIndex(2);
      engine.setPlaybackRate(1);
      setWaveShapes([generateWaveformShape(WAVEFORM_BARS)]);
      setWaveKey(k => k + 1);
    } catch (error) {
      console.error('Error picking audio:', error);
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      engine.pause();
    } else {
      if (engine.currentTime >= engine.duration && engine.duration > 0) engine.seekTo(0);
      engine.play();
    }
  };

  const onSeekStart = () => { setIsSeeking(true); setSeekValue(engine.currentTime); };
  const onSeekComplete = (v: number) => { engine.seekTo(v); setIsSeeking(false); };
  const cycleSpeed = () => {
    const n = (speedIndex + 1) % PLAYBACK_SPEEDS.length;
    setSpeedIndex(n);
    engine.setPlaybackRate(PLAYBACK_SPEEDS[n]);
  };
  const onVolumeChange = (v: number) => { setVolume(v); engine.setVolume(v); };
  const cycleColor = () => {
    setColorScheme(COLOR_KEYS[(COLOR_KEYS.indexOf(colorScheme) + 1) % COLOR_KEYS.length]);
  };

  const fmt = (s: number) => {
    if (!s || !isFinite(s)) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  const currentWaveShape = waveShapes[0] ?? generateWaveformShape(WAVEFORM_BARS);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.title}>Audio Visualizer</Text>
          <View style={styles.headerRight}>
            {engine.bpm > 0 && (
              <View style={styles.bpmBadge}>
                <Text style={styles.bpmValue}>{engine.bpm}</Text>
                <Text style={styles.bpmUnit}>BPM</Text>
              </View>
            )}
            <Pressable style={styles.infoBtn} onPress={() => router.push('/about')}>
              <Text style={styles.infoBtnText}>i</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Band labels ── */}
        <View style={styles.bandLabels}>
          <Text style={[styles.bandLabel, { color: getBandColor(colorScheme, 'bass', 0.8) }]}>BASS</Text>
          <Text style={[styles.bandLabel, { color: getBandColor(colorScheme, 'mid', 0.8) }]}>MID</Text>
          <Text style={[styles.bandLabel, { color: getBandColor(colorScheme, 'treble', 0.8) }]}>TREBLE</Text>
        </View>

        {/* ── Visualizer area (flex) ── */}
        <View style={styles.visArea}>
          {visMode === 'bars' && (
            <View style={styles.barsContainer}>
              {barHeights.map((h, i) => (
                <Bar key={i} height={h} index={i} scheme={colorScheme} maxHeight={170} />
              ))}
            </View>
          )}
          {visMode === 'waveform' && (
            <View style={styles.waveformContainer}>
              <WaveformDisplay
                key={waveKey}
                waveShape={currentWaveShape}
                progress={progress}
                scheme={colorScheme}
                isPlaying={isPlaying}
              />
            </View>
          )}
          {visMode === 'circular' && (
            <RNView style={styles.circularContainer}>
              {barHeights.map((h, i) => (
                <CircularBar key={i} height={h} index={i} total={NUM_BARS} scheme={colorScheme} />
              ))}
              <RNView style={[styles.circularCenter, { backgroundColor: getBandColor(colorScheme, 'mid', 0.9) }]} />
            </RNView>
          )}
        </View>

        {/* ── Mode + Color row ── */}
        <View style={styles.modeRow}>
          {(['bars', 'waveform', 'circular'] as VisMode[]).map((m) => (
            <Pressable
              key={m}
              style={[styles.modeBtn, visMode === m && styles.modeBtnActive]}
              onPress={() => setVisMode(m)}
            >
              <Text style={[styles.modeBtnText, visMode === m && styles.modeBtnTextActive]}>
                {m === 'bars' ? '▮▮▮ Bars' : m === 'waveform' ? '〜 Wave' : '◎ Circle'}
              </Text>
            </Pressable>
          ))}
          <Pressable style={styles.colorBtn} onPress={cycleColor}>
            <Text style={styles.colorBtnText}>{COLOR_ICONS[colorScheme]}</Text>
          </Pressable>
        </View>

        {/* ── Player section ── */}
        {fileName ? (
          <View style={styles.playerSection}>
            <Text style={styles.fileName} numberOfLines={1}>{fileName}</Text>

            <View style={styles.seekRow}>
              <Text style={styles.time}>{fmt(currentTime)}</Text>
              <Slider
                style={styles.seekBar}
                minimumValue={0}
                maximumValue={engine.duration > 0 ? engine.duration : 1}
                value={currentTime}
                onSlidingStart={onSeekStart}
                onValueChange={setSeekValue}
                onSlidingComplete={onSeekComplete}
                minimumTrackTintColor="#2f95dc"
                maximumTrackTintColor="#444"
                thumbTintColor="#2f95dc"
              />
              <Text style={styles.time}>{fmt(engine.duration)}</Text>
            </View>

            <View style={styles.controlsRow}>
              <Pressable style={styles.ctrlBtn} onPress={cycleSpeed}>
                <Text style={styles.ctrlBtnText}>{PLAYBACK_SPEEDS[speedIndex]}x</Text>
              </Pressable>
              <Pressable style={styles.playBtn} onPress={togglePlayPause}>
                <Text style={styles.playBtnText}>{isPlaying ? '⏸' : '▶'}</Text>
              </Pressable>
              <Pressable style={styles.ctrlBtn} onPress={() => onVolumeChange(volume > 0 ? 0 : 1)}>
                <Text style={styles.ctrlBtnText}>
                  {volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
                </Text>
              </Pressable>
              <Slider
                style={styles.volSlider}
                minimumValue={0}
                maximumValue={1}
                value={volume}
                onValueChange={onVolumeChange}
                minimumTrackTintColor="#2f95dc"
                maximumTrackTintColor="#444"
                thumbTintColor="#2f95dc"
              />
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Pick an audio file to start</Text>
          </View>
        )}

        <Pressable style={styles.pickBtn} onPress={pickAudio}>
          <Text style={styles.pickBtnText}>{fileName ? 'Change File' : 'Pick Audio File'}</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────
const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'transparent',
  },
  bpmBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    backgroundColor: 'rgba(47, 149, 220, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  bpmValue: { fontSize: 18, fontWeight: '800', color: '#2f95dc', fontFamily: MONO },
  bpmUnit: { fontSize: 10, fontWeight: '700', color: '#2f95dc', opacity: 0.7 },
  infoBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBtnText: { fontSize: 14, fontWeight: '600', fontStyle: 'italic', opacity: 0.5 },

  // Band labels
  bandLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 300,
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  bandLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },

  // Visualizer area — flex fills available space
  visArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 140,
    backgroundColor: 'transparent',
  },

  // Bars
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 150,
    gap: 3,
    backgroundColor: 'transparent',
  },
  bar: { width: 11, borderRadius: 5, minHeight: 10 },

  // Waveform
  waveformContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    width: '100%',
    backgroundColor: 'transparent',
  },
  waveformWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    height: 130,
  },

  // Circular
  circularContainer: {
    width: CIRC_SIZE,
    height: CIRC_SIZE,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularCenter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    position: 'absolute',
    top: CIRC_C - 9,
    left: CIRC_C - 9,
    opacity: 0.9,
  },

  // Mode + Color row
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 8,
    backgroundColor: 'transparent',
  },
  modeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#2f95dc',
    backgroundColor: 'transparent',
  },
  modeBtnActive: { backgroundColor: '#2f95dc' },
  modeBtnText: { fontSize: 12, fontWeight: '700', color: '#2f95dc' },
  modeBtnTextActive: { color: '#fff' },
  colorBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#555',
    backgroundColor: 'transparent',
    marginLeft: 4,
  },
  colorBtnText: { fontSize: 14 },

  // Player section
  playerSection: { width: '100%', backgroundColor: 'transparent' },
  fileName: { fontSize: 13, opacity: 0.7, textAlign: 'center', marginBottom: 4 },

  seekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  seekBar: { flex: 1, height: 36, marginHorizontal: 6 },
  time: { fontSize: 12, fontFamily: MONO, minWidth: 36, textAlign: 'center' },

  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  ctrlBtn: {
    backgroundColor: 'rgba(47, 149, 220, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  ctrlBtnText: { fontSize: 15, fontWeight: '600', color: '#2f95dc' },
  playBtn: {
    backgroundColor: '#2f95dc',
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnText: { fontSize: 20, color: '#fff' },
  volSlider: { flex: 1, height: 32, maxWidth: 120 },

  // Empty state
  emptyState: { paddingVertical: 20, backgroundColor: 'transparent' },
  emptyText: { fontSize: 15, opacity: 0.4 },

  // Pick button
  pickBtn: {
    backgroundColor: '#2f95dc',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  pickBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
