export type RecordingStatus = 'idle' | 'countdown' | 'recording' | 'paused' | 'review';

export type VideoResolution = '1080p' | '720p' | '1440p' | '4k' | 'auto';
export type VideoFPS = 30 | 60;
export type VideoFormat = 'webm' | 'mp4' | 'webm-h264' | 'webm-vp9' | 'webm-vp8';
export type PiPPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'bottom-center' | 'top-center' | 'split-right' | 'split-left' | 'split-bottom' | 'split-top';
export type CameraShape = 'circle' | 'square' | 'pill' | 'hexagon' | 'heart';

export interface RecorderConfig {
  resolution: VideoResolution;
  fps: VideoFPS;
  format: VideoFormat;
  micEnabled: boolean;
  cameraEnabled: boolean;
  pipPosition: PiPPosition;
  cameraShape: CameraShape;
  countdownDuration: number; // in seconds (e.g., 3, 5, or 0 for none)
  videoBitRate: number; // in bps, e.g., 5000000 (5 Mbps)
  audioBitRate: number; // in bps, e.g., 128000 (128 Kbps)
  sourceType?: 'screen' | 'camera';
  cameraSize?: number;  // camera size in percent (e.g., 10 to 45)
}

export interface KeyboardShortcuts {
  startStop: string;
  pauseResume: string;
  screenshot: string;
  toggleMic: string;
  toggleCamera: string;
}

export interface RecordingItem {
  id: string;
  name: string;
  blob: Blob;
  url: string;
  duration: number; // in seconds
  timestamp: string;
  size: number; // in bytes
  format: string;
  resolution: string;
  isTrimmed?: boolean;
}

export interface ScreenshotItem {
  id: string;
  name: string;
  dataUrl: string;
  timestamp: string;
}
