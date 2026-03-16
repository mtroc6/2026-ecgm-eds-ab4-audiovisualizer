import { useState, useCallback } from 'react';
import { StyleSheet, Pressable, Platform } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import Slider from '@react-native-community/slider';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';

import { Text, View } from '@/components/Themed';

const NUM_BARS = 20;
const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function useBarHeights() {
  const b0 = useSharedValue(10);
  const b1 = useSharedValue(10);
  const b2 = useSharedValue(10);
  const b3 = useSharedValue(10);
  const b4 = useSharedValue(10);
  const b5 = useSharedValue(10);
  const b6 = useSharedValue(10);
  const b7 = useSharedValue(10);
  const b8 = useSharedValue(10);
  const b9 = useSharedValue(10);
  const b10 = useSharedValue(10);
  const b11 = useSharedValue(10);
  const b12 = useSharedValue(10);
  const b13 = useSharedValue(10);
  const b14 = useSharedValue(10);
  const b15 = useSharedValue(10);
  const b16 = useSharedValue(10);
  const b17 = useSharedValue(10);
  const b18 = useSharedValue(10);
  const b19 = useSharedValue(10);
  return [b0, b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11, b12, b13, b14, b15, b16, b17, b18, b19];
}

export default function VisualizerScreen() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(2); // default 1x
  const [volume, setVolume] = useState(1);

  const player = useAudioPlayer(null, { updateInterval: 200 });
  const status = useAudioPlayerStatus(player);
  const barHeights = useBarHeights();

  const isPlaying = status.playing;

  const animateBars = useCallback(() => {
    barHeights.forEach((bar) => {
      const randomHeight = Math.random() * 120 + 20;
      const randomDuration = Math.random() * 300 + 150;
      bar.value = withRepeat(
        withSequence(
          withTiming(randomHeight, {
            duration: randomDuration,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(Math.random() * 60 + 10, {
            duration: randomDuration,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        true
      );
    });
  }, [barHeights]);

  const stopBars = useCallback(() => {
    barHeights.forEach((bar) => {
      bar.value = withTiming(10, { duration: 400 });
    });
  }, [barHeights]);

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setFileName(file.name);
      player.replace({ uri: file.uri });
      setSpeedIndex(2);
      player.playbackRate = 1;
    } catch (error) {
      console.error('Error picking audio:', error);
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      player.pause();
      stopBars();
    } else {
      if (status.currentTime >= status.duration && status.duration > 0) {
        player.seekTo(0);
      }
      player.play();
      animateBars();
    }
  };

  const onSeekStart = () => {
    setIsSeeking(true);
    setSeekValue(status.currentTime);
  };

  const onSeekComplete = (value: number) => {
    player.seekTo(value);
    setIsSeeking(false);
  };

  const cycleSpeed = () => {
    const nextIndex = (speedIndex + 1) % PLAYBACK_SPEEDS.length;
    setSpeedIndex(nextIndex);
    player.playbackRate = PLAYBACK_SPEEDS[nextIndex];
  };

  const onVolumeChange = (value: number) => {
    setVolume(value);
    player.volume = value;
  };

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentTime = isSeeking ? seekValue : status.currentTime;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio Visualizer</Text>

      <View style={styles.visualizerContainer}>
        {barHeights.map((height, index) => (
          <Bar key={index} height={height} index={index} />
        ))}
      </View>

      {fileName ? (
        <>
          <View style={styles.trackInfo}>
            <Text style={styles.fileName} numberOfLines={1}>
              {fileName}
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

          <View style={styles.controls}>
            <Pressable style={styles.controlButton} onPress={cycleSpeed}>
              <Text style={styles.controlButtonText}>
                {PLAYBACK_SPEEDS[speedIndex]}x
              </Text>
            </Pressable>

            <Pressable style={styles.playButton} onPress={togglePlayPause}>
              <Text style={styles.playButtonText}>
                {isPlaying ? '⏸' : '▶'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.controlButton}
              onPress={() => onVolumeChange(volume > 0 ? 0 : 1)}
            >
              <Text style={styles.controlButtonText}>
                {volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
              </Text>
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
          <Text style={styles.placeholderText}>
            Pick an audio file to start
          </Text>
        </View>
      )}

      <Pressable style={styles.pickButton} onPress={pickAudio}>
        <Text style={styles.pickButtonText}>
          {fileName ? 'Change Audio File' : 'Pick Audio File'}
        </Text>
      </Pressable>
    </View>
  );
}

function Bar({
  height,
  index,
}: {
  height: SharedValue<number>;
  index: number;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  const hue = (index / NUM_BARS) * 260 + 180;

  return (
    <Animated.View
      style={[
        styles.bar,
        { backgroundColor: `hsl(${hue}, 80%, 60%)` },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  visualizerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 160,
    gap: 4,
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  bar: {
    width: 12,
    borderRadius: 6,
    minHeight: 10,
  },
  trackInfo: {
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  fileName: {
    fontSize: 14,
    opacity: 0.8,
    maxWidth: 280,
  },
  seekContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  seekBar: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
  },
  time: {
    fontSize: 13,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    minWidth: 40,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  playButton: {
    backgroundColor: '#2f95dc',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonText: {
    fontSize: 22,
    color: '#fff',
  },
  controlButton: {
    backgroundColor: 'rgba(47, 149, 220, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 48,
    alignItems: 'center',
  },
  controlButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2f95dc',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  volumeLabel: {
    fontSize: 13,
    opacity: 0.6,
    marginRight: 8,
  },
  volumeBar: {
    flex: 1,
    height: 32,
  },
  placeholder: {
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  placeholderText: {
    fontSize: 16,
    opacity: 0.5,
  },
  pickButton: {
    backgroundColor: '#2f95dc',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  pickButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
