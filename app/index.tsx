import Slider from '@react-native-community/slider';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, View as RNView, ScrollView, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text, View } from '@/components/Themed';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import Ionicons from '@expo/vector-icons/Ionicons';

// ─── Constants ──────────────────────────────────────────────────────────────

const NUM_BARS = 20;
const WAVEFORM_BARS = 40;
const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const CIRC_R = 78;
const CIRC_SIZE = 220;
const CIRC_C = CIRC_SIZE / 2;
const ACCENT = '#2f95dc';
const ACCENT_DIM = 'rgba(47, 149, 220, 0.15)';

// ─── Types ──────────────────────────────────────────────────────────────────

type VisMode = 'bars' | 'waveform' | 'circular';
type ColorScheme = 'black' | 'blue' | 'colorful';
type RepeatMode = 'none' | 'one' | 'all';

interface Track {
  id: string;
  name: string;
  uri: string;
  waveShape: number[];
}

// ─── Color helpers ──────────────────────────────────────────────────────────

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
      return ACCENT;
  }
}

function getBandColor(scheme: ColorScheme, band: 'bass' | 'mid' | 'treble', intensity: number): string {
  const idx = band === 'bass' ? 0 : band === 'mid' ? 10 : 19;
  return getBarColor(scheme, idx, NUM_BARS, intensity);
}

const COLOR_LABELS: Record<ColorScheme, string> = { black: 'Dark', blue: 'Blue', colorful: 'Color' };
const COLOR_KEYS: ColorScheme[] = ['black', 'blue', 'colorful'];

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function formatTime(s: number): string {
  if (!s || !isFinite(s)) return '0:00';
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

// ─── Bar heights hook ───────────────────────────────────────────────────────

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

// ─── Animated Bar ───────────────────────────────────────────────────────────

function Bar({ height, index, scheme, maxHeight }: {
  height: SharedValue<number>; index: number; scheme: ColorScheme; maxHeight: number;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    backgroundColor: getBarColor(scheme, index, NUM_BARS, Math.min(1, height.value / maxHeight)),
  }));
  return <Animated.View style={[styles.bar, animatedStyle]} />;
}

// ─── Waveform Display ───────────────────────────────────────────────────────

function WaveformDisplay({ waveShape, progress, scheme }: {
  waveShape: number[]; progress: number; scheme: ColorScheme;
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
    <RNView style={[styles.waveformWrapper, { width: totalW }]}>
      {waveShape.map((amp, i) => {
        const barH = Math.max(4, amp * H);
        const frac = i / waveShape.length;
        let c: string;
        if (scheme === 'black') c = `hsl(0,0%,${Math.round(30 + amp * 50)}%)`;
        else if (scheme === 'blue') c = `hsl(210,80%,${Math.round(35 + amp * 35)}%)`;
        else { const hue = Math.round(220 - amp * 220); c = `hsl(${hue},85%,${Math.round(45 + amp * 20)}%)`; }
        return (
          <RNView key={i} style={{
            width: W, height: barH, borderRadius: 2, backgroundColor: c,
            marginRight: GAP, alignSelf: 'center', opacity: frac <= progress ? 1 : 0.3,
          }} />
        );
      })}
      <Animated.View style={phStyle} />
    </RNView>
  );
}

// ─── Circular Bar ───────────────────────────────────────────────────────────

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

// ─── Playlist Modal ─────────────────────────────────────────────────────────

function PlaylistModal({ visible, tracks, currentIndex, onClose, onSelectTrack, onRemoveTrack }: {
  visible: boolean;
  tracks: Track[];
  currentIndex: number;
  onClose: () => void;
  onSelectTrack: (index: number) => void;
  onRemoveTrack: (index: number) => void;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <RNView style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Playlist ({tracks.length})
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color="#999" />
            </Pressable>
          </RNView>

          {/* Divider */}
          <RNView style={styles.modalDivider} />

          {tracks.length === 0 ? (
            <RNView style={styles.emptyPlaylist}>
              <Text style={styles.emptyPlaylistText}>No tracks added yet</Text>
            </RNView>
          ) : (
            <ScrollView
              style={styles.trackList}
              showsVerticalScrollIndicator={false}
            >
              {tracks.map((track, i) => {
                const active = i === currentIndex;
                return (
                  <Pressable
                    key={track.id}
                    style={[styles.trackRow, active && styles.trackRowActive]}
                    onPress={() => { onSelectTrack(i); onClose(); }}
                  >
                    {active ? (
                      <Ionicons name="play" size={14} color={ACCENT} style={styles.trackIcon} />
                    ) : (
                      <Text style={styles.trackNum}>{i + 1}</Text>
                    )}
                    <Text
                      style={[styles.trackName, active && styles.trackNameActive]}
                      numberOfLines={1}
                    >
                      {track.name}
                    </Text>
                    <Pressable
                      onPress={(e) => { e.stopPropagation(); onRemoveTrack(i); }}
                      hitSlop={10}
                      style={styles.removeBtn}
                    >
                      <Ionicons name="remove-circle-outline" size={18} color="#ccc" />
                    </Pressable>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function VisualizerScreen() {
  const router = useRouter();
  const engine = useAudioEngine();
  const barHeights = useBarHeights();
  const rafRef = useRef<number>(0);

  // Playlist state
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('none');
  const shuffleOrder = useRef<number[]>([]);

  // UI state
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(2);
  const [volume, setVolume] = useState(1);
  const [visMode, setVisMode] = useState<VisMode>('bars');
  const [colorScheme, setColorScheme] = useState<ColorScheme>('colorful');
  const [waveKey, setWaveKey] = useState(0);

  const currentTrack = tracks[currentIndex] ?? null;
  const currentTime = isSeeking ? seekValue : engine.currentTime;
  const progress = engine.duration > 0 ? currentTime / engine.duration : 0;

  // ── Sync FFT data → shared bar heights ──

  useEffect(() => {
    const update = () => {
      const data = engine.frequencyDataRef.current;
      for (let i = 0; i < barHeights.length; i++) {
        barHeights[i].value = (data[i] ?? 0) * 0.63 + 10;
      }
      rafRef.current = requestAnimationFrame(update);
    };
    if (engine.isPlaying) {
      rafRef.current = requestAnimationFrame(update);
    } else {
      for (const bar of barHeights) bar.value = withTiming(10, { duration: 400 });
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [engine.isPlaying, barHeights, engine.frequencyDataRef]);

  // ── Shuffle order generator ──

  const generateShuffleOrder = useCallback((length: number, current: number) => {
    const order = Array.from({ length }, (_, i) => i).filter(i => i !== current);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    shuffleOrder.current = [current, ...order];
  }, []);

  // ── Load track by index ──

  const loadTrack = useCallback((index: number) => {
    const track = tracks[index];
    if (!track) return;
    setCurrentIndex(index);
    engine.loadAudio(track.uri);
    setSpeedIndex(2);
    engine.setPlaybackRate(1);
    setWaveKey(k => k + 1);
    setTimeout(() => engine.play(), 100);
  }, [tracks, engine]);

  // ── Next / Previous ──

  const playNext = useCallback(() => {
    if (tracks.length === 0) return;
    if (shuffle) {
      const pos = shuffleOrder.current.indexOf(currentIndex);
      const next = (pos + 1) % shuffleOrder.current.length;
      loadTrack(shuffleOrder.current[next]);
    } else {
      const next = (currentIndex + 1) % tracks.length;
      if (next === 0 && repeat === 'none') return;
      loadTrack(next);
    }
  }, [tracks, currentIndex, shuffle, repeat, loadTrack]);

  const playPrev = useCallback(() => {
    if (tracks.length === 0) return;
    if (engine.currentTime > 3) {
      engine.seekTo(0);
      return;
    }
    if (shuffle) {
      const pos = shuffleOrder.current.indexOf(currentIndex);
      const prev = (pos - 1 + shuffleOrder.current.length) % shuffleOrder.current.length;
      loadTrack(shuffleOrder.current[prev]);
    } else {
      loadTrack((currentIndex - 1 + tracks.length) % tracks.length);
    }
  }, [tracks, currentIndex, shuffle, engine, loadTrack]);

  // ── Auto-advance when track ends ──

  useEffect(() => {
    if (!engine.didJustFinish) return;
    if (repeat === 'one') {
      engine.seekTo(0);
      engine.play();
      return;
    }
    playNext();
  }, [engine.didJustFinish]);

  // ── Pick audio files ──

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
        multiple: true,
      } as any);
      if (result.canceled) return;

      const newTracks: Track[] = result.assets.map((file: any) => ({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        name: file.name,
        uri: file.uri,
        waveShape: generateWaveformShape(WAVEFORM_BARS),
      }));

      setTracks(prev => {
        const updated = [...prev, ...newTracks];
        if (prev.length === 0) {
          setTimeout(() => {
            engine.loadAudio(newTracks[0].uri);
            engine.setPlaybackRate(1);
            setWaveKey(k => k + 1);
            setTimeout(() => engine.play(), 100);
          }, 50);
        }
        if (shuffle) generateShuffleOrder(updated.length, currentIndex);
        return updated;
      });
    } catch (error) {
      console.error('Error picking audio:', error);
    }
  };

  // ── Playback controls ──

  const togglePlayPause = () => {
    if (!currentTrack) return;
    if (engine.isPlaying) {
      engine.pause();
    } else {
      if (engine.currentTime >= engine.duration && engine.duration > 0) engine.seekTo(0);
      engine.play();
    }
  };

  const toggleShuffle = () => {
    const next = !shuffle;
    setShuffle(next);
    if (next) generateShuffleOrder(tracks.length, currentIndex);
  };

  const cycleRepeat = () => {
    setRepeat(r => r === 'none' ? 'all' : r === 'all' ? 'one' : 'none');
  };

  const removeTrack = (index: number) => {
    setTracks(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (index === currentIndex && updated.length > 0) {
        const newIdx = Math.min(index, updated.length - 1);
        setTimeout(() => loadTrack(newIdx), 50);
      }
      return updated;
    });
    if (index < currentIndex) setCurrentIndex(i => i - 1);
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

  const repeatActive = repeat !== 'none';

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

        {/* ── Visualizer area ── */}
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
                waveShape={currentTrack?.waveShape ?? generateWaveformShape(WAVEFORM_BARS)}
                progress={progress}
                scheme={colorScheme}
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
                {m === 'bars' ? 'Bars' : m === 'waveform' ? 'Wave' : 'Circle'}
              </Text>
            </Pressable>
          ))}

          <RNView style={styles.modeDivider} />

          <Pressable style={styles.colorBtn} onPress={cycleColor}>
            <Text style={styles.colorBtnText}>{COLOR_LABELS[colorScheme]}</Text>
          </Pressable>
        </View>

        {/* ── Player section ── */}
        {currentTrack ? (
          <View style={styles.playerSection}>
            <Text style={styles.fileName} numberOfLines={1}>
              {tracks.length > 1 ? `${currentIndex + 1}/${tracks.length}  ·  ` : ''}{currentTrack.name}
            </Text>

            <View style={styles.seekRow}>
              <Text style={styles.time}>{formatTime(currentTime)}</Text>
              <Slider
                style={styles.seekBar}
                minimumValue={0}
                maximumValue={engine.duration > 0 ? engine.duration : 1}
                value={currentTime}
                onSlidingStart={onSeekStart}
                onValueChange={setSeekValue}
                onSlidingComplete={onSeekComplete}
                minimumTrackTintColor={ACCENT}
                maximumTrackTintColor="#444"
                thumbTintColor={ACCENT}
              />
              <Text style={styles.time}>{formatTime(engine.duration)}</Text>
            </View>

            {/* ── Main controls ── */}
            <View style={styles.controlsRow}>
              <Pressable style={styles.ctrlBtn} onPress={cycleSpeed}>
                <Text style={styles.ctrlBtnText}>{PLAYBACK_SPEEDS[speedIndex]}x</Text>
              </Pressable>

              <Pressable style={styles.ctrlBtn} onPress={playPrev} disabled={tracks.length < 2}>
                <Ionicons name="play-skip-back" size={18} color={ACCENT} style={tracks.length < 2 ? styles.disabled : undefined} />
              </Pressable>

              <Pressable style={styles.playBtn} onPress={togglePlayPause}>
                <Ionicons name={engine.isPlaying ? 'pause' : 'play'} size={22} color="#fff" />
              </Pressable>

              <Pressable style={styles.ctrlBtn} onPress={playNext} disabled={tracks.length < 2}>
                <Ionicons name="play-skip-forward" size={18} color={ACCENT} style={tracks.length < 2 ? styles.disabled : undefined} />
              </Pressable>

              <Pressable style={styles.ctrlBtn} onPress={() => onVolumeChange(volume > 0 ? 0 : 1)}>
                <Ionicons name={volume === 0 ? 'volume-mute' : volume < 0.5 ? 'volume-low' : 'volume-high'} size={18} color={ACCENT} />
              </Pressable>
            </View>

            {/* ── Secondary controls ── */}
            <View style={styles.secondaryRow}>
              <Pressable
                style={[styles.secBtn, shuffle && styles.secBtnActive]}
                onPress={toggleShuffle}
              >
                <Ionicons name="shuffle" size={16} color={shuffle ? ACCENT : '#888'} />
              </Pressable>

              <Pressable
                style={[styles.secBtn, repeatActive && styles.secBtnActive]}
                onPress={cycleRepeat}
              >
                <Ionicons name="repeat" size={16} color={repeatActive ? ACCENT : '#888'} />
                {repeat === 'one' && <Text style={styles.repeatOneLabel}>1</Text>}
              </Pressable>

              <Pressable
                style={[styles.secBtn, styles.playlistBtn]}
                onPress={() => setShowPlaylist(true)}
              >
                <Ionicons name="list" size={16} color={ACCENT} />
                <Text style={styles.playlistBtnText}>{tracks.length}</Text>
              </Pressable>
            </View>

            {/* ── Volume slider ── */}
            <View style={styles.volRow}>
              <Ionicons name="volume-low" size={16} color="#888" />
              <Slider
                style={styles.volSlider}
                minimumValue={0}
                maximumValue={1}
                value={volume}
                onValueChange={onVolumeChange}
                minimumTrackTintColor={ACCENT}
                maximumTrackTintColor="#444"
                thumbTintColor={ACCENT}
              />
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Pick an audio file to start</Text>
          </View>
        )}

        <Pressable style={styles.pickBtn} onPress={pickAudio}>
          <Text style={styles.pickBtnText}>
            {tracks.length === 0 ? 'Pick Audio Files' : '+ Add More Files'}
          </Text>
        </Pressable>
      </SafeAreaView>

      <PlaylistModal
        visible={showPlaylist}
        tracks={tracks}
        currentIndex={currentIndex}
        onClose={() => setShowPlaylist(false)}
        onSelectTrack={loadTrack}
        onRemoveTrack={removeTrack}
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

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
    backgroundColor: ACCENT_DIM,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  bpmValue: { fontSize: 18, fontWeight: '800', color: ACCENT, fontFamily: MONO },
  bpmUnit: { fontSize: 10, fontWeight: '700', color: ACCENT, opacity: 0.7 },
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

  // Visualizer area
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
  modeBtnActive: { backgroundColor: ACCENT },
  modeBtnText: { fontSize: 12, fontWeight: '700', color: ACCENT },
  modeBtnTextActive: { color: '#fff' },
  modeDivider: { width: 1.5, height: 22, backgroundColor: '#888', marginHorizontal: 6, borderRadius: 1, opacity: 0.5 },
  colorBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#555',
    backgroundColor: 'transparent',
  },
  colorBtnText: { fontSize: 12, fontWeight: '700', color: '#888' },

  // Player section
  playerSection: { width: '100%', backgroundColor: 'transparent' },
  fileName: { fontSize: 13, opacity: 0.7, textAlign: 'center', marginBottom: 4 },

  seekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  seekBar: { flex: 1, height: 36, marginHorizontal: 6 },
  time: { fontSize: 12, fontFamily: MONO, minWidth: 36, textAlign: 'center' },

  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  ctrlBtn: {
    backgroundColor: ACCENT_DIM,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  ctrlBtnText: { fontSize: 15, fontWeight: '600', color: ACCENT },
  playBtn: {
    backgroundColor: ACCENT,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.25 },

  // Secondary controls (shuffle / repeat / playlist)
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  secBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#555',
    backgroundColor: 'transparent',
  },
  secBtnActive: { borderColor: ACCENT, backgroundColor: ACCENT_DIM },
  repeatOneLabel: { fontSize: 10, fontWeight: '800', color: ACCENT },
  playlistBtn: { borderColor: ACCENT_DIM },
  playlistBtnText: { fontSize: 12, fontWeight: '600', color: ACCENT },

  // Volume
  volRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  volSlider: { flex: 1, height: 28, marginLeft: 8, maxWidth: 200 },

  // Empty state
  emptyState: { paddingVertical: 20, backgroundColor: 'transparent' },
  emptyText: { fontSize: 15, opacity: 0.4 },

  // Pick button
  pickBtn: {
    backgroundColor: ACCENT,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  pickBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Playlist modal — light themed card
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    width: '100%',
    maxWidth: 420,
    maxHeight: '70%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  modalDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginHorizontal: 18,
  },
  trackList: { maxHeight: 340 },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  trackRowActive: {
    backgroundColor: '#f0f7ff',
  },
  trackNum: {
    fontSize: 13,
    fontWeight: '600',
    color: '#aaa',
    width: 24,
    textAlign: 'center',
  },
  trackIcon: { width: 24, textAlign: 'center' },
  trackName: { fontSize: 14, color: '#444', flex: 1, marginLeft: 10 },
  trackNameActive: { color: ACCENT, fontWeight: '600' },
  removeBtn: { padding: 6, marginLeft: 8 },
  emptyPlaylist: { padding: 40, alignItems: 'center' },
  emptyPlaylistText: { color: '#aaa', fontSize: 14 },
});
