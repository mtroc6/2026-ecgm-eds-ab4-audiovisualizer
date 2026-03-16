import { useState } from 'react';
import { StyleSheet, Pressable, Platform } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
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

  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const barHeights = useBarHeights();

  const isPlaying = status.playing;

  const animateBars = () => {
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
  };

  const stopBars = () => {
    barHeights.forEach((bar) => {
      bar.value = withTiming(10, { duration: 400 });
    });
  };

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio Visualizer</Text>

      <View style={styles.visualizerContainer}>
        {barHeights.map((height, index) => (
          <Bar key={index} height={height} index={index} />
        ))}
      </View>

      {fileName && (
        <View style={styles.trackInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {fileName}
          </Text>
          <Text style={styles.time}>
            {formatTime(status.currentTime)} / {formatTime(status.duration)}
          </Text>
        </View>
      )}

      <View style={styles.controls}>
        <Pressable style={styles.button} onPress={pickAudio}>
          <Text style={styles.buttonText}>Pick Audio File</Text>
        </Pressable>

        {fileName && (
          <Pressable style={styles.button} onPress={togglePlayPause}>
            <Text style={styles.buttonText}>
              {isPlaying ? 'Pause' : 'Play'}
            </Text>
          </Pressable>
        )}
      </View>
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
    marginBottom: 40,
  },
  visualizerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 160,
    gap: 4,
    marginBottom: 30,
    backgroundColor: 'transparent',
  },
  bar: {
    width: 12,
    borderRadius: 6,
    minHeight: 10,
  },
  trackInfo: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  fileName: {
    fontSize: 14,
    opacity: 0.8,
    maxWidth: 250,
  },
  time: {
    fontSize: 16,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'transparent',
  },
  button: {
    backgroundColor: '#2f95dc',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
