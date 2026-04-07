declare module 'expo-music-info-2' {
  interface MusicMetadata {
    title?: string;
    artist?: string;
    album?: string;
    picture?: { pictureData: string };
  }

  interface MusicInfoOptions {
    title?: boolean;
    artist?: boolean;
    album?: boolean;
    picture?: boolean;
  }

  function getMusicInfoAsync(uri: string, options?: MusicInfoOptions): Promise<MusicMetadata | null>;
  export default { getMusicInfoAsync };
}
