/* Jest setup: use the official in-memory AsyncStorage mock. */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/* Sounds are decoration: silence them in tests. */
jest.mock('expo-audio', () => ({
  createAudioPlayer: () => ({ play: jest.fn(), seekTo: jest.fn(() => Promise.resolve()), volume: 1 }),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));
