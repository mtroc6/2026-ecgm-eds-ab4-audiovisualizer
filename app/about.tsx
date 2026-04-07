import { StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';

import { Text, View } from '@/components/Themed';
import { useTheme } from '@/context/ThemeContext';

const ACCENT = '#2f95dc';
type ThemeMode = 'auto' | 'light' | 'dark';
const THEME_OPTIONS: { key: ThemeMode; label: string }[] = [
  { key: 'auto', label: 'Auto' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

export default function AboutScreen() {
  const router = useRouter();
  const { mode, setMode } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.logo}>🎵</Text>
        <Text style={styles.title}>Audio Visualizer</Text>
        <Text style={styles.version}>v1.0</Text>

        <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />

        <Text style={styles.desc}>
          A real-time audio visualizer with FFT frequency analysis and BPM detection.
          Built with React Native, Expo, and Web Audio API.
        </Text>

        <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />

        <Text style={styles.sectionTitle}>Theme</Text>
        <View style={styles.themeRow}>
          {THEME_OPTIONS.map(({ key, label }) => (
            <Pressable
              key={key}
              style={[styles.themeBtn, mode === key && styles.themeBtnActive]}
              onPress={() => setMode(key)}
            >
              <Text style={[styles.themeBtnText, mode === key && styles.themeBtnTextActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />

        <Text style={styles.sectionTitle}>Team</Text>
        <Text style={styles.name}>Hubert Stocki</Text>
        <Text style={styles.name}>Mateusz Troc</Text>

        <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />

        <Text style={styles.org}>IPVC-ESTG — EDS Project, Group 4</Text>

        <Pressable style={styles.closeButton} onPress={() => router.back()}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    alignItems: 'center',
    maxWidth: 380,
    width: '100%',
    backgroundColor: 'transparent',
  },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: 'bold' },
  version: {
    fontSize: 13,
    opacity: 0.4,
    marginTop: 2,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  separator: { marginVertical: 16, height: 1, width: '60%' },
  desc: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.6,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    opacity: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  // Theme switcher
  themeRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'transparent',
  },
  themeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#ccc',
    backgroundColor: 'transparent',
  },
  themeBtnActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  themeBtnText: { fontSize: 13, fontWeight: '600', color: '#888' },
  themeBtnTextActive: { color: '#fff' },

  name: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  org: { fontSize: 13, opacity: 0.5, textAlign: 'center' },
  closeButton: {
    marginTop: 24,
    backgroundColor: ACCENT,
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 10,
  },
  closeText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
