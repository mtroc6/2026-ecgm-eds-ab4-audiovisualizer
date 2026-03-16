import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';

export default function AboutScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio Visualizer</Text>
      <View
        style={styles.separator}
        lightColor="#eee"
        darkColor="rgba(255,255,255,0.1)"
      />
      <Text style={styles.text}>
        A real-time audio visualizer built with React Native and Expo.
      </Text>
      <Text style={styles.text}>IPVC-ESTG — EDS Project, Group 4</Text>
      <Text style={styles.credits}>Hubert Stocki & Mateusz Troc</Text>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 20,
    height: 1,
    width: '80%',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 8,
  },
  credits: {
    fontSize: 14,
    marginTop: 12,
    opacity: 0.5,
  },
});
