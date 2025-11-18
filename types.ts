export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface AudioMetrics {
  vol: number; // 0 to 1
}

export type AudioVisCallback = (metrics: AudioMetrics) => void;
