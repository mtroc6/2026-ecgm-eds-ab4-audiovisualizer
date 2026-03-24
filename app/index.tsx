import Slider from '@react-native-community/slider';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, View as RNView, ScrollView, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Text, View } from '@/components/Themed';

const NUM_BARS = 20;
const WAVEFORM_BARS = 40;
const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

// ─── Types ─────────────────────────────────────────────────────────────────
type VisMode = 'bars' | 'waveform' | 'circular';
type ColorScheme = 'black' | 'blue' | 'colorful';
type RepeatMode = 'none' | 'one' | 'all';

interface Track {
  id: string;
  name: string;
  uri: string;
  waveShape: number[];
}

// ─── Color scheme logic ────────────────────────────────────────────────────
function getBarColor(scheme: ColorScheme, index: number, total: number, intensity: number): string {
  switch (scheme) {
    case 'black':
      return `hsl(0, 0%, ${Math.round(30 + intensity * 60)}%)`;
    case 'blue':
      return `hsl(210, ${Math.round(60 + intensity * 30)}%, ${Math.round(35 + intensity * 40)}%)`;
    case 'colorful':
      const hue = (index / total) * 260 + 180;
      return `hsl(${hue}, 90%, ${Math.round(35 + intensity * 35)}%)`;
    default:
      return '#2f95dc';
  }
}

function getBandColor(scheme: ColorScheme, band: 'bass' | 'mid' | 'treble', intensity: number): string {
  const bandIndex = band === 'bass' ? 0 : band === 'mid' ? 10 : 19;
  return getBarColor(scheme, bandIndex, NUM_BARS, intensity);
}

const COLOR_SCHEME_LABELS: Record<ColorScheme, string> = {
  black: '⚫ Dark',
  blue: '🔵 Blue',
  colorful: '🌈 Color',
};
const COLOR_SCHEME_KEYS: ColorScheme[] = ['black', 'blue', 'colorful'];

function getBand(index: number, total: number): 'bass' | 'mid' | 'treble' {
  const third = total / 3;
  if (index < third) return 'bass';
  if (index < third * 2) return 'mid';
  return 'treble';
}

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

// ─── Bar heights hook ──────────────────────────────────────────────────────
function useBarHeights() {
  const b0 = useSharedValue(10); const b1 = useSharedValue(10); const b2 = useSharedValue(10);
  const b3 = useSharedValue(10); const b4 = useSharedValue(10); const b5 = useSharedValue(10);
  const b6 = useSharedValue(10); const b7 = useSharedValue(10); const b8 = useSharedValue(10);
  const b9 = useSharedValue(10); const b10 = useSharedValue(10); const b11 = useSharedValue(10);
  const b12 = useSharedValue(10); const b13 = useSharedValue(10); const b14 = useSharedValue(10);
  const b15 = useSharedValue(10); const b16 = useSharedValue(10); const b17 = useSharedValue(10);
  const b18 = useSharedValue(10); const b19 = useSharedValue(10);
  return [b0,b1,b2,b3,b4,b5,b6,b7,b8,b9,b10,b11,b12,b13,b14,b15,b16,b17,b18,b19];
}

// ─── Bar component ─────────────────────────────────────────────────────────
function Bar({ height, index, scheme, maxHeight }: { height: SharedValue<number>; index: number; scheme: ColorScheme; maxHeight: number }) {
  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    backgroundColor: getBarColor(scheme, index, NUM_BARS, Math.min(1, height.value / maxHeight)),
  }));
  return <Animated.View style={[styles.bar, animatedStyle]} />;
}

// ─── Waveform Display ──────────────────────────────────────────────────────
function WaveformDisplay({ waveShape, progress, scheme }: { waveShape: number[]; progress: number; scheme: ColorScheme; isPlaying: boolean }) {
  const WAVEFORM_HEIGHT = 120;
  const BAR_WIDTH = 6;
  const GAP = 5;
  const totalWidth = waveShape.length * (BAR_WIDTH + GAP);
  const playheadX = useSharedValue(0);
  playheadX.value = withTiming(progress * totalWidth, { duration: 120, easing: Easing.linear });
  const playheadStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: playheadX.value - 1,
    top: -8,
    width: 2,
    height: WAVEFORM_HEIGHT + 16,
    backgroundColor: '#fff',
    borderRadius: 1,
    opacity: 0.9,
  }));
  return (
    <View style={[styles.waveformWrapper, { width: totalWidth }]}>
      {waveShape.map((amp, i) => {
        const barH = Math.max(4, amp * WAVEFORM_HEIGHT);
        let barColor: string;
        if (scheme === 'black') barColor = `hsl(0, 0%, ${Math.round(30 + amp * 50)}%)`;
        else if (scheme === 'blue') barColor = `hsl(210, 80%, ${Math.round(35 + amp * 35)}%)`;
        else { const hue = Math.round(220 - amp * 220); barColor = `hsl(${hue}, 85%, ${Math.round(45 + amp * 20)}%)`; }
        return (
          <View key={i} style={{ width: BAR_WIDTH, height: barH, borderRadius: 2, backgroundColor: barColor, marginRight: GAP, alignSelf: 'center', opacity: i / waveShape.length <= progress ? 1 : 0.3 }} />
        );
      })}
      <Animated.View style={playheadStyle} />
    </View>
  );
}

// ─── Circular Bar ──────────────────────────────────────────────────────────
function CircularBar({ height, index, total, scheme }: { height: SharedValue<number>; index: number; total: number; scheme: ColorScheme }) {
  const angle = (index / total) * 2 * Math.PI;
  const RADIUS = 72;
  const cx = 110 + RADIUS * Math.cos(angle - Math.PI / 2);
  const cy = 110 + RADIUS * Math.sin(angle - Math.PI / 2);
  const animatedStyle = useAnimatedStyle(() => {
    const len = height.value * 0.45 + 8;
    return {
      position: 'absolute' as const,
      width: 6, height: len, borderRadius: 3,
      backgroundColor: getBarColor(scheme, index, total, Math.min(1, height.value / 150)),
      left: cx - 3, top: cy - len,
      transform: [{ rotate: `${(angle * 180) / Math.PI}deg` }],
      transformOrigin: `3px ${len}px`,
    };
  });
  return <Animated.View style={animatedStyle} />;
}

// ─── Playlist Modal ────────────────────────────────────────────────────────
function PlaylistModal({
  visible,
  tracks,
  currentIndex,
  onClose,
  onSelectTrack,
  onRemoveTrack,
}: {
  visible: boolean;
  tracks: Track[];
  currentIndex: number;
  onClose: () => void;
  onSelectTrack: (index: number) => void;
  onRemoveTrack: (index: number) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <RNView style={styles.modalOverlay}>
        <RNView style={styles.modalContainer}>
          <RNView style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🎵 Playlist ({tracks.length})</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </RNView>

          {tracks.length === 0 ? (
            <RNView style={styles.emptyPlaylist}>
              <Text style={styles.emptyPlaylistText}>No tracks added yet</Text>
            </RNView>
          ) : (
            <ScrollView style={styles.trackList}>
              {tracks.map((track, index) => (
                <Pressable
                  key={track.id}
                  style={[styles.trackItem, index === currentIndex && styles.trackItemActive]}
                  onPress={() => { onSelectTrack(index); onClose(); }}
                >
                  <RNView style={styles.trackItemLeft}>
                    {index === currentIndex && <Text style={styles.playingIndicator}>▶ </Text>}
                    <Text
                      style={[styles.trackName, index === currentIndex && styles.trackNameActive]}
                      numberOfLines={1}
                    >
                      {index + 1}. {track.name}
                    </Text>
                  </RNView>
                  <Pressable
                    onPress={() => onRemoveTrack(index)}
                    style={styles.removeButton}
                    hitSlop={8}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </Pressable>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </RNView>
      </RNView>
    </Modal>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────
export default function VisualizerScreen() {
  // Playlist state
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('none');
  const shuffleOrder = useRef<number[]>([]);

  // Player state
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(2);
  const [volume, setVolume] = useState(1);
  const [visMode, setVisMode] = useState<VisMode>('bars');
  const [colorScheme, setColorScheme] = useState<ColorScheme>('colorful');
  const [waveKey, setWaveKey] = useState(0);

  const player = useAudioPlayer(null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const barHeights = useBarHeights();
  const isPlaying = status.playing;

  const currentTrack = tracks[currentIndex] ?? null;
  const currentTime = isSeeking ? seekValue : status.currentTime;
  const progress = status.duration > 0 ? currentTime / status.duration : 0;

  // ── Auto-advance when track finishes ──────────────────────────────────────
  useEffect(() => {
    if (!status.didJustFinish) return;
    if (repeat === 'one') {
      player.seekTo(0);
      player.play();
      animateBars();
      return;
    }
    playNext();
  }, [status.didJustFinish]);

  // ── Shuffle order generator ───────────────────────────────────────────────
  const generateShuffleOrder = (length: number, currentIdx: number) => {
    const order = Array.from({ length }, (_, i) => i).filter(i => i !== currentIdx);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    shuffleOrder.current = [currentIdx, ...order];
  };

  // ── Load track by index ───────────────────────────────────────────────────
  const loadTrack = useCallback((index: number, autoPlay = true) => {
    const track = tracks[index];
    if (!track) return;
    setCurrentIndex(index);
    player.replace({ uri: track.uri });
    setSpeedIndex(2);
    player.playbackRate = 1;
    setWaveKey(k => k + 1);
    if (autoPlay) {
      setTimeout(() => { player.play(); animateBars(); }, 100);
    }
  }, [tracks, player]);

  // ── Next track ────────────────────────────────────────────────────────────
  const playNext = useCallback(() => {
    if (tracks.length === 0) return;
    if (shuffle) {
      const pos = shuffleOrder.current.indexOf(currentIndex);
      const nextPos = (pos + 1) % shuffleOrder.current.length;
      loadTrack(shuffleOrder.current[nextPos]);
    } else {
      const next = (currentIndex + 1) % tracks.length;
      if (next === 0 && repeat === 'none') {
        stopBars();
        return;
      }
      loadTrack(next);
    }
  }, [tracks, currentIndex, shuffle, repeat]);

  // ── Previous track ────────────────────────────────────────────────────────
  const playPrev = useCallback(() => {
    if (tracks.length === 0) return;
    // If more than 3s in — restart current track
    if (status.currentTime > 3) {
      player.seekTo(0);
      return;
    }
    if (shuffle) {
      const pos = shuffleOrder.current.indexOf(currentIndex);
      const prevPos = (pos - 1 + shuffleOrder.current.length) % shuffleOrder.current.length;
      loadTrack(shuffleOrder.current[prevPos]);
    } else {
      loadTrack((currentIndex - 1 + tracks.length) % tracks.length);
    }
  }, [tracks, currentIndex, shuffle, status.currentTime]);

  // ── Animation helpers ─────────────────────────────────────────────────────
  const animateBars = useCallback(() => {
    barHeights.forEach((bar, i) => {
      const band = getBand(i, NUM_BARS);
      const maxH = band === 'bass' ? 150 : band === 'mid' ? 120 : 80;
      const minDur = band === 'bass' ? 280 : band === 'mid' ? 180 : 90;
      bar.value = withRepeat(
        withSequence(
          withTiming(Math.random() * maxH + 20, { duration: Math.random() * 200 + minDur, easing: Easing.inOut(Easing.ease) }),
          withTiming(Math.random() * 40 + 10, { duration: Math.random() * 200 + minDur, easing: Easing.inOut(Easing.ease) })
        ), -1, true
      );
    });
  }, [barHeights]);

  const stopBars = useCallback(() => {
    barHeights.forEach(bar => { bar.value = withTiming(10, { duration: 400 }); });
  }, [barHeights]);

  // ── Pick audio files ──────────────────────────────────────────────────────
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
          // First load — start playing immediately
          setTimeout(() => {
            player.replace({ uri: newTracks[0].uri });
            player.playbackRate = 1;
            setWaveKey(k => k + 1);
            setTimeout(() => { player.play(); animateBars(); }, 100);
          }, 50);
        }
        return updated;
      });

      if (shuffle) generateShuffleOrder(tracks.length + newTracks.length, currentIndex);
    } catch (error) {
      console.error('Error picking audio:', error);
    }
  };

  const togglePlayPause = () => {
    if (!currentTrack) return;
    if (isPlaying) { player.pause(); stopBars(); }
    else {
      if (status.currentTime >= status.duration && status.duration > 0) player.seekTo(0);
      player.play(); animateBars();
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

  const onSeekStart = () => { setIsSeeking(true); setSeekValue(status.currentTime); };
  const onSeekComplete = (value: number) => { player.seekTo(value); setIsSeeking(false); };
  const cycleSpeed = () => {
    const nextIndex = (speedIndex + 1) % PLAYBACK_SPEEDS.length;
    setSpeedIndex(nextIndex);
    player.playbackRate = PLAYBACK_SPEEDS[nextIndex];
  };
  const onVolumeChange = (value: number) => { setVolume(value); player.volume = value; };
  const cycleColorScheme = () => {
    const idx = COLOR_SCHEME_KEYS.indexOf(colorScheme);
    setColorScheme(COLOR_SCHEME_KEYS[(idx + 1) % COLOR_SCHEME_KEYS.length]);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const repeatLabel = repeat === 'none' ? '🔁' : repeat === 'all' ? '🔁' : '🔂';
  const repeatActive = repeat !== 'none';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio Visualizer</Text>

      {/* ── Frequency band labels ── */}
      <View style={styles.bandLabels}>
        <Text style={[styles.bandLabel, { color: getBandColor(colorScheme, 'bass', 0.8) }]}>BASS</Text>
        <Text style={[styles.bandLabel, { color: getBandColor(colorScheme, 'mid', 0.8) }]}>MID</Text>
        <Text style={[styles.bandLabel, { color: getBandColor(colorScheme, 'treble', 0.8) }]}>TREBLE</Text>
      </View>

      {/* ── Visualizer ── */}
      {visMode === 'bars' && (
        <View style={styles.visualizerContainer}>
          {barHeights.map((height, index) => (
            <Bar key={index} height={height} index={index} scheme={colorScheme} maxHeight={150} />
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
            isPlaying={isPlaying}
          />
        </View>
      )}
      {visMode === 'circular' && (
        <RNView style={styles.circularContainer}>
          {barHeights.map((height, index) => (
            <CircularBar key={index} height={height} index={index} total={NUM_BARS} scheme={colorScheme} />
          ))}
          <RNView style={[styles.circularCenter, { backgroundColor: getBandColor(colorScheme, 'mid', 0.9) }]} />
        </RNView>
      )}

      {/* ── Mode buttons ── */}
      <View style={styles.modeSwitchRow}>
        {(['bars', 'waveform', 'circular'] as VisMode[]).map((mode) => (
          <Pressable
            key={mode}
            style={[styles.modeButton, visMode === mode && styles.modeButtonActive]}
            onPress={() => setVisMode(mode)}
          >
            <Text style={[styles.modeButtonText, visMode === mode && styles.modeButtonTextActive]}>
              {mode === 'bars' ? '▮▮▮ Bars' : mode === 'waveform' ? '〜 Wave' : '◎ Circle'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── Color button ── */}
      <View style={styles.colorRow}>
        <Pressable style={styles.colorButton} onPress={cycleColorScheme}>
          <Text style={styles.colorButtonText}>{COLOR_SCHEME_LABELS[colorScheme]}</Text>
        </Pressable>
      </View>

      {/* ── Track info ── */}
      {currentTrack ? (
        <>
          <View style={styles.trackInfo}>
            <Text style={styles.fileName} numberOfLines={1}>
              {tracks.length > 1 ? `${currentIndex + 1}/${tracks.length} · ` : ''}{currentTrack.name}
            </Text>
          </View>

          <View style={styles.seekContainer}>
            <Text style={styles.time}>{formatTime(currentTime)}</Text>
            <Slider
              style={styles.seekBar}
              minimumValue={0}
              maximumValue={status.duration > 0 ? status.duration : 1}
              value={currentTime}
              onSlidingStart={onSeekStart}
              onValueChange={(v) => setSeekValue(v)}
              onSlidingComplete={onSeekComplete}
              minimumTrackTintColor="#2f95dc"
              maximumTrackTintColor="#555"
              thumbTintColor="#2f95dc"
            />
            <Text style={styles.time}>{formatTime(status.duration)}</Text>
          </View>

          {/* ── Playback controls ── */}
          <View style={styles.controls}>
            <Pressable style={styles.controlButton} onPress={cycleSpeed}>
              <Text style={styles.controlButtonText}>{PLAYBACK_SPEEDS[speedIndex]}x</Text>
            </Pressable>

            {/* Prev */}
            <Pressable style={styles.controlButton} onPress={playPrev} disabled={tracks.length < 2}>
              <Text style={[styles.controlButtonText, tracks.length < 2 && styles.disabled]}>⏮</Text>
            </Pressable>

            {/* Play/Pause */}
            <Pressable style={styles.playButton} onPress={togglePlayPause}>
              <Text style={styles.playButtonText}>{isPlaying ? '⏸' : '▶'}</Text>
            </Pressable>

            {/* Next */}
            <Pressable style={styles.controlButton} onPress={playNext} disabled={tracks.length < 2}>
              <Text style={[styles.controlButtonText, tracks.length < 2 && styles.disabled]}>⏭</Text>
            </Pressable>

            <Pressable style={styles.controlButton} onPress={() => onVolumeChange(volume > 0 ? 0 : 1)}>
              <Text style={styles.controlButtonText}>
                {volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
              </Text>
            </Pressable>
          </View>

          {/* ── Shuffle / Repeat / Playlist ── */}
          <View style={styles.extraControls}>
            <Pressable
              style={[styles.extraButton, shuffle && styles.extraButtonActive]}
              onPress={toggleShuffle}
            >
              <Text style={[styles.extraButtonText, shuffle && styles.extraButtonTextActive]}>🔀 Shuffle</Text>
            </Pressable>

            <Pressable
              style={[styles.extraButton, repeatActive && styles.extraButtonActive]}
              onPress={cycleRepeat}
            >
              <Text style={[styles.extraButtonText, repeatActive && styles.extraButtonTextActive]}>
                {repeat === 'one' ? '🔂 One' : '🔁 Repeat'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.extraButton}
              onPress={() => setShowPlaylist(true)}
            >
              <Text style={styles.extraButtonText}>📋 {tracks.length}</Text>
            </Pressable>
          </View>

          <View style={styles.volumeContainer}>
            <Text style={styles.volumeLabel}>Volume</Text>
            <Slider
              style={styles.volumeBar}
              minimumValue={0}
              maximumValue={1}
              value={volume}
              onValueChange={onVolumeChange}
              minimumTrackTintColor="#2f95dc"
              maximumTrackTintColor="#555"
              thumbTintColor="#2f95dc"
            />
          </View>
        </>
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Pick audio files to start</Text>
        </View>
      )}

      {/* ── Add files button ── */}
      <Pressable style={styles.pickButton} onPress={pickAudio}>
        <Text style={styles.pickButtonText}>
          {tracks.length === 0 ? 'Pick Audio Files' : '+ Add More Files'}
        </Text>
      </Pressable>

      {/* ── Playlist Modal ── */}
      <PlaylistModal
        visible={showPlaylist}
        tracks={tracks}
        currentIndex={currentIndex}
        onClose={() => setShowPlaylist(false)}
        onSelectTrack={(index) => { loadTrack(index); }}
        onRemoveTrack={removeTrack}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 14 },

  bandLabels: { flexDirection: 'row', justifyContent: 'space-around', width: '80%', marginBottom: 6, backgroundColor: 'transparent' },
  bandLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },

  visualizerContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', height: 160, gap: 4, marginBottom: 16, backgroundColor: 'transparent' },
  bar: { width: 12, borderRadius: 6, minHeight: 10 },

  waveformContainer: { height: 160, marginBottom: 16, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', width: '100%', backgroundColor: 'transparent' },
  waveformWrapper: { flexDirection: 'row', alignItems: 'center', position: 'relative', height: 136 },

  circularContainer: { width: 220, height: 220, marginBottom: 16, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  circularCenter: { width: 20, height: 20, borderRadius: 10, position: 'absolute', top: 100, left: 100, opacity: 0.9 },

  modeSwitchRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 10, backgroundColor: 'transparent' },
  modeButton: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#2f95dc', backgroundColor: 'transparent' },
  modeButtonActive: { backgroundColor: '#2f95dc' },
  modeButtonText: { fontSize: 13, fontWeight: '700', color: '#2f95dc' },
  modeButtonTextActive: { color: '#fff' },

  colorRow: { alignItems: 'center', marginBottom: 14, backgroundColor: 'transparent' },
  colorButton: { paddingHorizontal: 20, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#888', backgroundColor: 'transparent' },
  colorButtonText: { fontSize: 13, fontWeight: '600' },

  trackInfo: { alignItems: 'center', marginBottom: 8, backgroundColor: 'transparent' },
  fileName: { fontSize: 14, opacity: 0.8, maxWidth: 300 },

  seekContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 12, backgroundColor: 'transparent' },
  seekBar: { flex: 1, height: 40, marginHorizontal: 8 },
  time: { fontSize: 13, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), minWidth: 40, textAlign: 'center' },

  controls: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, backgroundColor: 'transparent' },
  playButton: { backgroundColor: '#2f95dc', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  playButtonText: { fontSize: 22, color: '#fff' },
  controlButton: { backgroundColor: 'rgba(47, 149, 220, 0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, minWidth: 44, alignItems: 'center' },
  controlButtonText: { fontSize: 16, fontWeight: '600', color: '#2f95dc' },
  disabled: { opacity: 0.3 },

  extraControls: { flexDirection: 'row', gap: 8, marginBottom: 12, backgroundColor: 'transparent' },
  extraButton: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#888', backgroundColor: 'transparent' },
  extraButtonActive: { borderColor: '#2f95dc', backgroundColor: 'rgba(47,149,220,0.12)' },
  extraButtonText: { fontSize: 13, fontWeight: '600', opacity: 0.7 },
  extraButtonTextActive: { color: '#2f95dc', opacity: 1 },

  volumeContainer: { flexDirection: 'row', alignItems: 'center', width: '80%', marginBottom: 16, backgroundColor: 'transparent' },
  volumeLabel: { fontSize: 13, opacity: 0.6, marginRight: 8 },
  volumeBar: { flex: 1, height: 32 },

  placeholder: { marginBottom: 20, backgroundColor: 'transparent' },
  placeholderText: { fontSize: 16, opacity: 0.5 },

  pickButton: { backgroundColor: '#2f95dc', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginBottom: 8 },
  pickButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#1a1a2e', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  closeButton: { padding: 4 },
  closeButtonText: { fontSize: 18, color: '#888' },
  trackList: { padding: 12 },
  trackItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 14, borderRadius: 10, marginBottom: 6, backgroundColor: 'rgba(255,255,255,0.05)' },
  trackItemActive: { backgroundColor: 'rgba(47,149,220,0.2)', borderWidth: 1, borderColor: '#2f95dc' },
  trackItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  playingIndicator: { color: '#2f95dc', fontWeight: '700', fontSize: 12 },
  trackName: { fontSize: 14, color: 'rgba(255,255,255,0.8)', flex: 1 },
  trackNameActive: { color: '#2f95dc', fontWeight: '600' },
  removeButton: { padding: 4, marginLeft: 8 },
  removeButtonText: { color: '#888', fontSize: 14 },
  emptyPlaylist: { padding: 40, alignItems: 'center' },
  emptyPlaylistText: { color: '#888', fontSize: 16 },
});
