# Audio Visualizer

> IPVC-ESTG — Engenharia de Software, Group 4

A real-time audio visualizer built with **React Native**, **Expo**, and **Web Audio API**. Supports multiple visualization modes, playlist management, and real-time FFT frequency analysis with BPM detection.

---

## Features

- **Three visualization modes** — Bars, Waveform, and Circular — all driven by real-time audio data
- **Real FFT analysis** — Web Audio API `AnalyserNode` maps frequency bins to 20 bands (web platform)
- **BPM detection** — bass energy onset detection with median interval calculation
- **Playlist management** — multi-file picker, queue, shuffle, repeat (one/all), next/previous track
- **Playlist search** — real-time filtering by track name or artist
- **Sleep timer** — configurable presets (15/30/60 min) with live countdown and auto-pause
- **ID3 metadata** — extracts title, artist, and album from MP3 files (native platforms)
- **Playback controls** — play/pause, seek, volume, playback speed (0.5x–2x)
- **Color schemes** — Dark, Blue, and Colorful themes for visualizations
- **Theme switcher** — Auto / Light / Dark mode toggle
- **About screen** — app info, team credits, and theme settings

---

## Group Members

| Name | Student ID |
|------|------------|
| Hubert Stocki | 37160 |
| Mateusz Troc | 37183 |

---

## Tech Stack

- **React Native 0.83** + **Expo SDK 55** + **TypeScript**
- **expo-router** — file-based routing
- **expo-audio** — audio playback
- **expo-music-info-2** — ID3 tag extraction (native)
- **react-native-reanimated** — smooth animations
- **Web Audio API** — real-time FFT frequency analysis (web)
- **@expo/vector-icons** (Ionicons) — UI icons

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- Yarn
- Expo Go app (mobile) or a web browser

### Installation

```bash
# Clone the repository
git clone https://github.com/mtroc6/2026-ecgm-eds-ab4-audiovisualizer.git
cd 2026-ecgm-eds-ab4-audiovisualizer

# Install dependencies
yarn install

# Start the development server
npx expo start

# Or start web version directly
npx expo start --web
```

---

## Project Structure

```
app/
  _layout.tsx        # Root Stack navigator with theme support
  index.tsx          # Main visualizer screen
  about.tsx          # About modal with theme switcher
hooks/
  useAudioEngine.ts      # Native audio engine (simulated FFT)
  useAudioEngine.web.ts  # Web Audio API engine (real FFT + BPM)
components/
  Themed.tsx         # Theme-aware Text/View components
context/
  ThemeContext.tsx    # Global theme state (Auto/Light/Dark)
constants/
  Colors.ts          # Light/dark color definitions
```

---

## Sprint History

| Sprint | Dates | Scrum Master | Key Features |
|--------|-------|--------------|--------------|
| 1 | 03/03 – 10/03 | Mateusz Troc | Project setup, repo config |
| 2 | 11/03 – 17/03 | Hubert Stocki | MVP: file picker, playback, visualizer, controls, waveform/circular modes |
| 3 | 18/03 – 24/03 | Mateusz Troc | FFT audio analysis, BPM detection, playlist & queue management |
| 4 | 25/03 – 07/04 | Hubert Stocki | ID3 metadata, theme switcher, playlist search, sleep timer, cleanup |
t the development server
npx expo start
```

---

## License

This project is created for academic purposes at IPVC-ESTG.
