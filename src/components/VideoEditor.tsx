import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RecordingItem } from '../types';
import {
  ArrowLeft, Download, Play, Pause, Check,
  Scissors, Trash2, RotateCcw, Sparkles, Music, Volume2, VolumeX,
  MousePointer, Plus, Undo2, Redo2, Save, Monitor, ZoomIn, Search, AlertTriangle
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Segment {
  id: string;
  start: number;   // seconds
  end: number;     // seconds
  deleted: boolean;
  speed?: number;  // clip speed factor
}

interface ZoomEffect {
  id: string;
  time: number;
  duration: number;
  zoomLevel: number;
  x: number;
  y: number;
  cursorFollowing: boolean;
  enabled: boolean;
}

interface CursorKeyframe {
  time: number;
  x: number;
  y: number;
  clicked: boolean;
}

interface EditorHistoryState {
  selectedBg: string;
  padding: number;
  cornerRadius: number;
  shadowIntensity: number;
  showChrome: boolean;
  blurBackground: boolean;
  blurIntensity: number;
  canvasPlatform: string;
  segments: Segment[];
  zoomEffects: ZoomEffect[];
  bgMusicId: string;
  bgMusicVolume: number;
  micEnhanced: boolean;
  clickHighlights: boolean;
  motionBlur: boolean;
  deviceFrame: boolean;
  cursorSize: number;
  cursorSmoothing: number;
}

interface Preset {
  id: string;
  label: string;
  url: string;
  thumbnailCss: string;
}

interface PlatformPreset {
  id: string;
  label: string;
  width: number;
  height: number;
}

interface VideoEditorProps {
  recording: RecordingItem;
  onBack: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const fmt = (s: number) => {
  if (!isFinite(s) || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Presets
// ─────────────────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    id: 'apple-hill-light',
    label: 'Hill Light',
    url: '/backgrounds/apple-hill-light.png',
    thumbnailCss: 'url(/backgrounds/apple-hill-light.png) center/cover no-repeat',
  },
  {
    id: 'apple-hill-dark',
    label: 'Hill Dark',
    url: '/backgrounds/apple-hill-dark.png',
    thumbnailCss: 'url(/backgrounds/apple-hill-dark.png) center/cover no-repeat',
  },
  {
    id: 'apple-ventura-light',
    label: 'Ventura Light',
    url: '/backgrounds/apple-ventura-light.png',
    thumbnailCss: 'url(/backgrounds/apple-ventura-light.png) center/cover no-repeat',
  },
  {
    id: 'apple-ventura-dark',
    label: 'Ventura Dark',
    url: '/backgrounds/apple-ventura-dark.png',
    thumbnailCss: 'url(/backgrounds/apple-ventura-dark.png) center/cover no-repeat',
  },
  {
    id: 'apple-monterey',
    label: 'Monterey',
    url: '/backgrounds/apple-monterey.png',
    thumbnailCss: 'url(/backgrounds/apple-monterey.png) center/cover no-repeat',
  },
  {
    id: 'gradient-aurora',
    label: 'Aurora Glow',
    url: '/backgrounds/gradient-aurora.png',
    thumbnailCss: 'url(/backgrounds/gradient-aurora.png) center/cover no-repeat',
  },
  {
    id: 'gradient-flow',
    label: 'Fluid Wave',
    url: '/backgrounds/gradient-flow.png',
    thumbnailCss: 'url(/backgrounds/gradient-flow.png) center/cover no-repeat',
  },
  {
    id: 'gradient-dusk',
    label: 'Dusk Curve',
    url: '/backgrounds/gradient-dusk.png',
    thumbnailCss: 'url(/backgrounds/gradient-dusk.png) center/cover no-repeat',
  },
  {
    id: 'gradient-mesh',
    label: 'Neon Mesh',
    url: '/backgrounds/gradient-mesh.png',
    thumbnailCss: 'url(/backgrounds/gradient-mesh.png) center/cover no-repeat',
  },
  {
    id: 'gradient-sunset',
    label: 'Sunset Ridge',
    url: '/backgrounds/gradient-sunset.png',
    thumbnailCss: 'url(/backgrounds/gradient-sunset.png) center/cover no-repeat',
  },
  {
    id: 'gradient-sphere',
    label: 'Sphere Ripple',
    url: '/backgrounds/gradient-sphere.png',
    thumbnailCss: 'url(/backgrounds/gradient-sphere.png) center/cover no-repeat',
  },
  {
    id: 'gradient-waves',
    label: 'Emerald Waves',
    url: '/backgrounds/gradient-waves.png',
    thumbnailCss: 'url(/backgrounds/gradient-waves.png) center/cover no-repeat',
  },
  {
    id: 'gradient-hills',
    label: 'Pastel Hills',
    url: '/backgrounds/gradient-hills.png',
    thumbnailCss: 'url(/backgrounds/gradient-hills.png) center/cover no-repeat',
  },
  {
    id: 'gradient-glass',
    label: 'Frosted Glass',
    url: '/backgrounds/gradient-glass.png',
    thumbnailCss: 'url(/backgrounds/gradient-glass.png) center/cover no-repeat',
  },
  {
    id: 'gradient-abstract',
    label: 'Cosmic Angles',
    url: '/backgrounds/gradient-abstract.png',
    thumbnailCss: 'url(/backgrounds/gradient-abstract.png) center/cover no-repeat',
  },
];

const PLATFORMS: PlatformPreset[] = [
  { id: 'youtube', label: 'YouTube (16:9)', width: 1920, height: 1080 },
  { id: 'tiktok', label: 'TikTok (9:16)', width: 1080, height: 1920 },
  { id: 'square', label: 'Instagram (1:1)', width: 1080, height: 1080 },
  { id: 'portrait', label: 'Portrait (4:5)', width: 1080, height: 1350 },
];

const MUSIC_TRACKS = [
  { id: 'none', label: 'No Music', url: '' },
  { id: 'lofi', label: 'Lofi Chill Beat', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'tech', label: 'Tech Innovation', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { id: 'uplifting', label: 'Corporate Uplifting', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Light-themed Slider sub-component
// ─────────────────────────────────────────────────────────────────────────────

function Slider({ label, value, min, max, step, unit = '', onChange, onChangeEnd }: {
  label: string; value: number; min: number; max: number; step: number;
  unit?: string; onChange: (v: number) => void; onChangeEnd?: () => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-brand-text-muted">{label}</span>
        <span className="text-[10px] font-mono text-brand-text-muted/60">{value}{unit}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-brand-border cursor-pointer">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-brand-accent pointer-events-none"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          onMouseUp={onChangeEnd}
          onTouchEnd={onChangeEnd}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-brand-accent shadow pointer-events-none transition-transform"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Light-themed Toggle sub-component
// ─────────────────────────────────────────────────────────────────────────────

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-medium text-brand-text-muted">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none ${value ? 'bg-brand-accent' : 'bg-brand-border'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${value ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas constants
// ─────────────────────────────────────────────────────────────────────────────

const CHROME_H = 40;

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function VideoEditor({ recording, onBack }: VideoEditorProps) {
  // ── Refs ─────────────────────────────────────────────────────────────────
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);
  const rafRef       = useRef<number>(0);
  const playingRef   = useRef(false);

  // Background Music Refs
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const synthIntervalRef = useRef<number | null>(null);
  const synthAudioCtxRef = useRef<AudioContext | null>(null);

  // Web Audio Nodes for Mic Enhancement
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const voiceBoostRef = useRef<BiquadFilterNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);

  const segmentsRef  = useRef<Segment[]>([]);
  const timelineRef  = useRef<HTMLDivElement>(null);
  const playheadRef  = useRef<HTMLDivElement>(null);
  const currentTimeLabelRef = useRef<HTMLSpanElement>(null);
  const viewportRef  = useRef<HTMLDivElement>(null);
  const [timelineScrollPct, setTimelineScrollPct] = useState(0);

  // Performance synchronization refs
  const renderFrameRef = useRef<() => void>(() => {});
  const micEnhancedRef = useRef(false);
  const zoomEffectsRef = useRef<ZoomEffect[]>([]);
  const lastStateUpdateRef = useRef(0);
  const loadingImagesRef = useRef<Record<string, boolean>>({});

  // ── Background / frame state ──────────────────────────────────────────────
  const [selectedBg,      setSelectedBg]      = useState('apple-hill-light');
  const [padding,         setPadding]         = useState(8);
  const [cornerRadius,    setCornerRadius]    = useState(20);
  const [shadowIntensity, setShadowIntensity] = useState(65);
  const [showChrome,      setShowChrome]      = useState(true);
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  // ── Expanded editor feature states ──────────────────────────────────────────
  const [platform,        setPlatform]        = useState('youtube');
  const [blurBackground,  setBlurBackground]  = useState(true);
  const [blurIntensity,   setBlurIntensity]   = useState(15);
  const [musicTracks, setMusicTracks] = useState([
    { id: 'none', label: 'No Music', url: '' },
    { id: 'lofi', label: 'Lofi Chill Beat', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { id: 'tech', label: 'Tech Innovation', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
    { id: 'uplifting', label: 'Corporate Uplifting', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
  ]);
  const [bgMusicId,       setBgMusicId]       = useState('none');
  const [bgMusicVolume,   setBgMusicVolume]   = useState(30);
  const [micEnhanced,     setMicEnhanced]     = useState(false);
  const [clickHighlights, setClickHighlights] = useState(true);
  const [showCursor,      setShowCursor]      = useState(true);
  const [motionBlur,      setMotionBlur]      = useState(true);
  const [zoomEffects,     setZoomEffects]     = useState<ZoomEffect[]>([]);
  const [cursorKeyframes, setCursorKeyframes] = useState<CursorKeyframe[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [selectedZoomId, setSelectedZoomId] = useState<string | null>(null);
  const [projectName,     setProjectName]     = useState(`Project - ${recording.name}`);
  const [sidebarTab,      setSidebarTab]      = useState<'style' | 'audio' | 'zoom' | 'clips'>('style');
  const [toast,           setToast]           = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [dragOverTime,    setDragOverTime]    = useState<number | null>(null);
  
  // New cursor style and device frame states
  const [deviceFrame,     setDeviceFrame]     = useState(false);
  const [cursorSize,      setCursorSize]      = useState(1.2);
  const [cursorSmoothing, setCursorSmoothing] = useState(3);

  // Undo / Redo stacks
  const [history, setHistory] = useState<EditorHistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // ── Playback state ────────────────────────────────────────────────────────
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,   setDuration]   = useState(0);

  // ── Timeline segment state ─────────────────────────────────────────────────
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(5);

  const formatSecsWithMs = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '00:00.00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // ── Export state ──────────────────────────────────────────────────────────
  const [isExporting, setIsExporting] = useState(false);
  const [exportDone,  setExportDone]  = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDone,  setUploadDone]  = useState(false);

  // Preloaded Image elements Cache
  const [imagesLoaded, setImagesLoaded] = useState<Record<string, HTMLImageElement>>({});

  // Toast helper
  const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Keep refs in sync
  useEffect(() => { playingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { segmentsRef.current = segments; }, [segments]);
  useEffect(() => { zoomEffectsRef.current = zoomEffects; }, [zoomEffects]);
  useEffect(() => { micEnhancedRef.current = micEnhanced; }, [micEnhanced]);

  const durationRef = useRef(0);
  useEffect(() => { durationRef.current = duration; }, [duration]);

  // Keep the last segment synced with the duration if it exceeds it or falls short
  useEffect(() => {
    if (duration > 0 && segments.length > 0) {
      const lastSeg = segments[segments.length - 1];
      if (Math.abs(lastSeg.end - duration) > 0.1) {
        setSegments(prev => {
          if (prev.length === 0) return prev;
          const next = prev.map(s => ({ ...s }));
          next[next.length - 1].end = duration;
          return next;
        });
      }
    }
  }, [duration, segments.length]);

  // ─── Preload images ─────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    PRESETS.forEach(p => {
      const img = new Image();
      img.src = p.url;
      const handleLoad = () => {
        if (!active) return;
        setImagesLoaded(prev => ({ ...prev, [p.id]: img }));
      };
      img.onload = handleLoad;
      img.onerror = () => {
        console.warn(`Failed to load background image: ${p.url}`);
      };
      if (img.complete && img.naturalWidth !== 0) {
        handleLoad();
      }
    });

    return () => {
      active = false;
    };
  }, []);

  // ─── Cursor Interpolation ────────────────────────────────────────────────
  const getCursorPosAtTime = useCallback((t: number) => {
    if (cursorKeyframes.length === 0) return { cx: 0.5, cy: 0.5 };

    const getRawPos = (time: number) => {
      const sorted = [...cursorKeyframes].sort((a, b) => a.time - b.time);
      let k1 = sorted[0];
      let k2 = sorted[sorted.length - 1];

      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].time <= time && sorted[i + 1].time > time) {
          k1 = sorted[i];
          k2 = sorted[i + 1];
          break;
        }
      }

      if (k1.time === k2.time || time <= k1.time) {
        return { cx: k1.x, cy: k1.y };
      }
      if (time >= k2.time) {
        return { cx: k2.x, cy: k2.y };
      }

      const ratio = (time - k1.time) / (k2.time - k1.time);
      const smooth = ratio * ratio * (3 - 2 * ratio);
      return {
        cx: k1.x + (k2.x - k1.x) * smooth,
        cy: k1.y + (k2.y - k1.y) * smooth
      };
    };

    if (cursorSmoothing > 0) {
      const windowSecs = cursorSmoothing * 0.08; // up to ~0.8s smoothing window
      const samples = 6;
      let totalX = 0;
      let totalY = 0;
      let totalWeight = 0;

      for (let i = 0; i < samples; i++) {
        const sampleT = t - (windowSecs * (i / (samples - 1)));
        if (sampleT < 0) continue;

        const pos = getRawPos(sampleT);
        const weight = 1 - (i / samples) * 0.5;
        totalX += pos.cx * weight;
        totalY += pos.cy * weight;
        totalWeight += weight;
      }

      if (totalWeight > 0) {
        return { cx: totalX / totalWeight, cy: totalY / totalWeight };
      }
    }

    return getRawPos(t);
  }, [cursorKeyframes, cursorSmoothing]);

  // ─── Setup Web Audio pipeline for Vocal Enhancement ───────────────────────
  const setupAudioPipeline = useCallback(() => {
    const video = videoRef.current;
    if (!video || sourceNodeRef.current) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaElementSource(video);
      sourceNodeRef.current = source;

      // High-pass filter (rumble reduction)
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = micEnhancedRef.current ? 120 : 10;
      filterNodeRef.current = hp;

      // Peaking filter (vocal presence boost)
      const boost = ctx.createBiquadFilter();
      boost.type = 'peaking';
      boost.frequency.value = 2500;
      boost.Q.value = 1.0;
      boost.gain.value = micEnhancedRef.current ? 4.5 : 0;
      voiceBoostRef.current = boost;

      // Compressor node (level smoothing)
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = micEnhancedRef.current ? -32 : -5;
      comp.knee.value = 30;
      comp.ratio.value = 12;
      comp.attack.value = 0.003;
      comp.release.value = 0.25;
      compressorRef.current = comp;

      // Connect source -> HP -> Boost -> Compressor -> Destination
      source.connect(hp);
      hp.connect(boost);
      boost.connect(comp);
      comp.connect(ctx.destination);
    } catch (err) {
      console.warn('AudioContext setup error (likely already attached):', err);
    }
  }, []);

  // Keep filters in sync with Mic Enhancement toggle
  useEffect(() => {
    if (filterNodeRef.current) {
      filterNodeRef.current.frequency.setValueAtTime(micEnhanced ? 120 : 10, audioCtxRef.current?.currentTime ?? 0);
    }
    if (voiceBoostRef.current) {
      voiceBoostRef.current.gain.setValueAtTime(micEnhanced ? 4.5 : 0, audioCtxRef.current?.currentTime ?? 0);
    }
    if (compressorRef.current) {
      compressorRef.current.threshold.setValueAtTime(micEnhanced ? -32 : -5, audioCtxRef.current?.currentTime ?? 0);
    }
  }, [micEnhanced]);

  // Procedural Music Synthesizer (Offline Fallback beat generator)
  const startSynthMusic = useCallback(() => {
    if (synthIntervalRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      synthAudioCtxRef.current = ctx;

      let step = 0;
      const chords = [
        [261.63, 329.63, 392.00, 493.88], // Cmaj7
        [220.00, 261.63, 329.63, 392.00], // Am7
        [174.61, 220.00, 261.63, 349.23], // Fmaj7
        [196.00, 246.94, 293.66, 392.00]  // G7
      ];

      const playNote = (freq: number, start: number, duration: number, vol: number) => {
        if (!synthAudioCtxRef.current || synthAudioCtxRef.current.state === 'closed') return;
        const osc = synthAudioCtxRef.current.createOscillator();
        const gainNode = synthAudioCtxRef.current.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gainNode.gain.setValueAtTime(0, start);
        gainNode.gain.linearRampToValueAtTime(vol * (bgMusicVolume / 100) * 0.1, start + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        osc.connect(gainNode);
        gainNode.connect(synthAudioCtxRef.current.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      synthIntervalRef.current = window.setInterval(() => {
        if (!synthAudioCtxRef.current || synthAudioCtxRef.current.state === 'closed') return;
        const now = synthAudioCtxRef.current.currentTime;
        const chordIndex = Math.floor(step / 8) % chords.length;
        const beat = step % 8;

        if (beat === 0) {
          chords[chordIndex].forEach(f => playNote(f, now, 2.8, 0.22));
        }

        if (beat === 2 || beat === 5) {
          const chord = chords[chordIndex];
          const randomNote = chord[Math.floor(Math.random() * chord.length)] * 2;
          playNote(randomNote, now, 0.6, 0.12);
        }

        step++;
      }, 450);
    } catch (e) {
      console.warn("Synth beat generation failed:", e);
    }
  }, [bgMusicVolume]);

  const stopSynthMusic = useCallback(() => {
    if (synthIntervalRef.current) {
      clearInterval(synthIntervalRef.current);
      synthIntervalRef.current = null;
    }
    if (synthAudioCtxRef.current) {
      synthAudioCtxRef.current.close().catch(() => {});
      synthAudioCtxRef.current = null;
    }
  }, []);

  // HTML5 audio elements control
  useEffect(() => {
    if (bgMusicId === 'none') {
      if (bgAudioRef.current) {
        bgAudioRef.current.pause();
        bgAudioRef.current = null;
      }
      stopSynthMusic();
      return;
    }

    const track = musicTracks.find(t => t.id === bgMusicId);
    if (!track) return;

    stopSynthMusic();

    const audio = new Audio(track.url);
    audio.loop = true;
    audio.volume = bgMusicVolume / 100;
    bgAudioRef.current = audio;

    audio.onerror = () => {
      console.warn("External music failed to fetch, loading local synthesizer!");
      if (isPlaying) {
        startSynthMusic();
      }
    };

    if (isPlaying) {
      audio.play().catch(() => {
        startSynthMusic();
      });
    }

    return () => {
      audio.pause();
      stopSynthMusic();
    };
  }, [bgMusicId, isPlaying, startSynthMusic, stopSynthMusic, bgMusicVolume, musicTracks]);

  // Sync music play/pause
  useEffect(() => {
    const audio = bgAudioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.currentTime = (videoRef.current?.currentTime ?? 0) % (audio.duration || 180);
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // ─── Undo & Redo (State History Stack) ───────────────────────────────────
  const saveHistoryState = useCallback((customSegs?: Segment[], customZooms?: ZoomEffect[], overrides?: Partial<EditorHistoryState>) => {
    const nextState: EditorHistoryState = {
      selectedBg: overrides?.selectedBg !== undefined ? overrides.selectedBg : selectedBg,
      padding,
      cornerRadius,
      shadowIntensity,
      showChrome,
      blurBackground: overrides?.blurBackground !== undefined ? overrides.blurBackground : blurBackground,
      blurIntensity,
      canvasPlatform: platform,
      segments: customSegs || segments,
      zoomEffects: customZooms || zoomEffects,
      bgMusicId,
      bgMusicVolume,
      micEnhanced,
      clickHighlights,
      motionBlur,
      deviceFrame,
      cursorSize,
      cursorSmoothing
    };

    setHistory(prev => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, nextState];
    });
    setHistoryIndex(prev => prev + 1);
  }, [selectedBg, padding, cornerRadius, shadowIntensity, showChrome, blurBackground, blurIntensity, platform, segments, zoomEffects, bgMusicId, bgMusicVolume, micEnhanced, clickHighlights, motionBlur, deviceFrame, cursorSize, cursorSmoothing, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const prevIdx = historyIndex - 1;
    setHistoryIndex(prevIdx);
    const state = history[prevIdx];
    if (state) {
      setSelectedBg(state.selectedBg);
      setPadding(state.padding);
      setCornerRadius(state.cornerRadius);
      setShadowIntensity(state.shadowIntensity);
      setShowChrome(state.showChrome);
      setBlurBackground(state.blurBackground);
      setBlurIntensity(state.blurIntensity);
      setPlatform(state.canvasPlatform);
      setSegments(state.segments);
      setZoomEffects(state.zoomEffects);
      setBgMusicId(state.bgMusicId);
      setBgMusicVolume(state.bgMusicVolume);
      setMicEnhanced(state.micEnhanced);
      setClickHighlights(state.clickHighlights);
      setMotionBlur(state.motionBlur);
      setDeviceFrame(state.deviceFrame !== undefined ? state.deviceFrame : false);
      setCursorSize(state.cursorSize !== undefined ? state.cursorSize : 1.2);
      setCursorSmoothing(state.cursorSmoothing !== undefined ? state.cursorSmoothing : 3);
      triggerToast("Undo applied", "info");
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const nextIdx = historyIndex + 1;
    setHistoryIndex(nextIdx);
    const state = history[nextIdx];
    if (state) {
      setSelectedBg(state.selectedBg);
      setPadding(state.padding);
      setCornerRadius(state.cornerRadius);
      setShadowIntensity(state.shadowIntensity);
      setShowChrome(state.showChrome);
      setBlurBackground(state.blurBackground);
      setBlurIntensity(state.blurIntensity);
      setPlatform(state.canvasPlatform);
      setSegments(state.segments);
      setZoomEffects(state.zoomEffects);
      setBgMusicId(state.bgMusicId);
      setBgMusicVolume(state.bgMusicVolume);
      setMicEnhanced(state.micEnhanced);
      setClickHighlights(state.clickHighlights);
      setMotionBlur(state.motionBlur);
      setDeviceFrame(state.deviceFrame !== undefined ? state.deviceFrame : false);
      setCursorSize(state.cursorSize !== undefined ? state.cursorSize : 1.2);
      setCursorSmoothing(state.cursorSmoothing !== undefined ? state.cursorSmoothing : 3);
      triggerToast("Redo applied", "info");
    }
  }, [history, historyIndex]);

  // Bind Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [undo, redo]);

  // Autosave and load
  useEffect(() => {
    const saved = localStorage.getItem(`project_config_${recording.id}`);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.projectName) setProjectName(state.projectName);
        if (state.selectedBg) setSelectedBg(state.selectedBg);
        if (state.padding !== undefined) setPadding(state.padding);
        if (state.cornerRadius !== undefined) setCornerRadius(state.cornerRadius);
        if (state.shadowIntensity !== undefined) setShadowIntensity(state.shadowIntensity);
        if (state.showChrome !== undefined) setShowChrome(state.showChrome);
        if (state.canvasPlatform) setPlatform(state.canvasPlatform);
        if (state.blurBackground !== undefined) setBlurBackground(state.blurBackground);
        if (state.blurIntensity !== undefined) setBlurIntensity(state.blurIntensity);
        if (state.bgMusicId) setBgMusicId(state.bgMusicId);
        if (state.bgMusicVolume !== undefined) setBgMusicVolume(state.bgMusicVolume);
        if (state.micEnhanced !== undefined) setMicEnhanced(state.micEnhanced);
        if (state.clickHighlights !== undefined) setClickHighlights(state.clickHighlights);
        if (state.showCursor !== undefined) setShowCursor(state.showCursor);
        if (state.motionBlur !== undefined) setMotionBlur(state.motionBlur);
        if (state.segments) setSegments(state.segments);
        if (state.zoomEffects) setZoomEffects(state.zoomEffects);
        if (state.deviceFrame !== undefined) setDeviceFrame(state.deviceFrame);
        if (state.cursorSize !== undefined) setCursorSize(state.cursorSize);
        if (state.cursorSmoothing !== undefined) setCursorSmoothing(state.cursorSmoothing);

        const initHistory: EditorHistoryState = {
          selectedBg: state.selectedBg || 'apple-hill-light',
          padding: state.padding !== undefined ? state.padding : 8,
          cornerRadius: state.cornerRadius !== undefined ? state.cornerRadius : 20,
          shadowIntensity: state.shadowIntensity !== undefined ? state.shadowIntensity : 65,
          showChrome: state.showChrome !== undefined ? state.showChrome : true,
          blurBackground: state.blurBackground !== undefined ? state.blurBackground : true,
          blurIntensity: state.blurIntensity !== undefined ? state.blurIntensity : 15,
          canvasPlatform: state.canvasPlatform || 'youtube',
          segments: state.segments || [],
          zoomEffects: state.zoomEffects || [],
          bgMusicId: state.bgMusicId || 'none',
          bgMusicVolume: state.bgMusicVolume !== undefined ? state.bgMusicVolume : 30,
          micEnhanced: state.micEnhanced !== undefined ? state.micEnhanced : false,
          clickHighlights: state.clickHighlights !== undefined ? state.clickHighlights : true,
          motionBlur: state.motionBlur !== undefined ? state.motionBlur : true,
          deviceFrame: state.deviceFrame !== undefined ? state.deviceFrame : false,
          cursorSize: state.cursorSize !== undefined ? state.cursorSize : 1.2,
          cursorSmoothing: state.cursorSmoothing !== undefined ? state.cursorSmoothing : 3,
        };
        setHistory([initHistory]);
        setHistoryIndex(0);
      } catch (err) {
        console.error("Error loading project state:", err);
      }
    }
  }, [recording.id]);

  useEffect(() => {
    const state = {
      projectName,
      selectedBg,
      padding,
      cornerRadius,
      shadowIntensity,
      showChrome,
      canvasPlatform: platform,
      blurBackground,
      blurIntensity,
      bgMusicId,
      bgMusicVolume,
      micEnhanced,
      clickHighlights,
      showCursor,
      motionBlur,
      segments,
      zoomEffects,
      deviceFrame,
      cursorSize,
      cursorSmoothing
    };
    localStorage.setItem(`project_config_${recording.id}`, JSON.stringify(state));
  }, [projectName, selectedBg, padding, cornerRadius, shadowIntensity, showChrome, platform, blurBackground, blurIntensity, bgMusicId, bgMusicVolume, micEnhanced, clickHighlights, showCursor, motionBlur, segments, zoomEffects, deviceFrame, cursorSize, cursorSmoothing, recording.id]);

  // ─── Canvas frame renderer ─────────────────────────────────────────────
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // ── Always render at maximum quality ─────────────────────────────────
    ctx.imageSmoothingEnabled  = true;
    ctx.imageSmoothingQuality  = 'high';

    const activePlatform = PLATFORMS.find(p => p.id === platform) || PLATFORMS[0];
    const canvasW = activePlatform.width;
    const canvasH = activePlatform.height;

    ctx.clearRect(0, 0, canvasW, canvasH);

    // Draw background (preset image or scaled-up blurred video)
    if (blurBackground) {
      ctx.save();
      const videoAspect = video.videoWidth / video.videoHeight || 16/9;
      const canvasAspect = canvasW / canvasH;
      let drawW = canvasW;
      let drawH = canvasH;
      let drawX = 0;
      let drawY = 0;
      if (videoAspect > canvasAspect) {
        drawW = canvasH * videoAspect;
        drawX = (canvasW - drawW) / 2;
      } else {
        drawH = canvasW / videoAspect;
        drawY = (canvasH - drawH) / 2;
      }
      ctx.filter = `blur(${blurIntensity}px) brightness(0.55)`;
      ctx.drawImage(video, drawX, drawY, drawW, drawH);
      ctx.restore();
    } else {
      let bgImg = imagesLoaded[selectedBg];
      if (!bgImg && !loadingImagesRef.current[selectedBg]) {
        loadingImagesRef.current[selectedBg] = true;
        const preset = PRESETS.find(p => p.id === selectedBg);
        if (preset) {
          const img = new Image();
          img.src = preset.url;
          img.onload = () => {
            setImagesLoaded(prev => ({ ...prev, [selectedBg]: img }));
            loadingImagesRef.current[selectedBg] = false;
          };
          img.onerror = () => {
            console.warn(`Failed to load background image: ${preset.url}`);
            loadingImagesRef.current[selectedBg] = false;
          };
        }
      }

      if (bgImg && bgImg.complete && bgImg.naturalWidth !== 0) {
        ctx.drawImage(bgImg, 0, 0, canvasW, canvasH);
      } else {
        ctx.fillStyle = '#F4EFE6';
        ctx.fillRect(0, 0, canvasW, canvasH);
      }
    }

    const pad = Math.round((padding / 100) * Math.min(canvasW, canvasH));
    const maxW = canvasW - pad * 2;
    const maxH = canvasH - pad * 2;
    const videoAspect = video.videoWidth / video.videoHeight || 16/9;

    let bw = maxW;
    let bh = maxW / videoAspect;
    if (bh > maxH) {
      bh = maxH;
      bw = maxH * videoAspect;
    }

    const bx = Math.round((canvasW - bw) / 2);
    const by = Math.round((canvasH - bh) / 2);
    const cr = Math.round((cornerRadius / 50) * 30);
    const chromePx = showChrome ? CHROME_H : 0;

    // Shadow
    if (shadowIntensity > 0) {
      ctx.save();
      ctx.shadowColor   = `rgba(0,0,0,${shadowIntensity / 100})`;
      ctx.shadowBlur    = pad * 0.8 + 20;
      ctx.shadowOffsetY = pad * 0.2 + 10;
      roundRect(ctx, bx, by, bw, bh, cr);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.restore();
    }

    // Clip entire box
    ctx.save();
    roundRect(ctx, bx, by, bw, bh, cr);
    ctx.clip();

    // macOS Window Chrome
    if (showChrome) {
      const tg = ctx.createLinearGradient(0, by, 0, by + chromePx);
      tg.addColorStop(0, '#3a3a3c');
      tg.addColorStop(1, '#2c2c2e');
      ctx.fillStyle = tg;
      ctx.fillRect(bx, by, bw, chromePx);

      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(bx, by + chromePx - 1, bw, 1);

      const dotY = by + chromePx / 2;
      [{ x: bx + 26, fill: '#ff5f57', ring: '#e0443e' },
       { x: bx + 52, fill: '#febc2e', ring: '#d4a017' },
       { x: bx + 78, fill: '#28c840', ring: '#14a830' }]
        .forEach(({ x, fill, ring }) => {
          ctx.beginPath(); ctx.arc(x, dotY, 8, 0, Math.PI * 2);
          ctx.fillStyle = ring; ctx.fill();
          ctx.beginPath(); ctx.arc(x, dotY, 7, 0, Math.PI * 2);
          ctx.fillStyle = fill; ctx.fill();
        });
    }

    // Video content area (nested clip)
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, bx, by + chromePx, bw, bh - chromePx, cr);
    ctx.clip();

    // Active Zoom effect
    const ct = video.currentTime;
    const activeZoom = zoomEffects.find(z => z.enabled && ct >= z.time && ct < z.time + z.duration);

    if (activeZoom) {
      const elapsed = ct - activeZoom.time;
      const easeTime = 0.3;
      let zoomScale = 1.0;

      if (elapsed < easeTime) {
        const progress = elapsed / easeTime;
        const ease = progress * progress * (3 - 2 * progress);
        zoomScale = 1.0 + (activeZoom.zoomLevel - 1.0) * ease;
      } else if (elapsed > activeZoom.duration - easeTime) {
        const progress = (activeZoom.duration - elapsed) / easeTime;
        const ease = progress * progress * (3 - 2 * progress);
        zoomScale = 1.0 + (activeZoom.zoomLevel - 1.0) * ease;
      } else {
        zoomScale = activeZoom.zoomLevel;
      }

      let zoomCenterX, zoomCenterY;
      if (activeZoom.cursorFollowing) {
        const { cx, cy } = getCursorPosAtTime(ct);
        zoomCenterX = bx + cx * bw;
        zoomCenterY = by + chromePx + cy * (bh - chromePx);
      } else {
        zoomCenterX = bx + activeZoom.x * bw;
        zoomCenterY = by + chromePx + activeZoom.y * (bh - chromePx);
      }

      // Transform
      ctx.translate(zoomCenterX, zoomCenterY);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-zoomCenterX, -zoomCenterY);

      // Render radial motion blur during zoom
      if (motionBlur && isPlaying && elapsed > 0.05 && elapsed < activeZoom.duration - 0.05) {
        const scaleOffsets = [-0.012, -0.006, 0.006, 0.012];
        scaleOffsets.forEach(offset => {
          ctx.save();
          ctx.translate(zoomCenterX, zoomCenterY);
          ctx.scale(1 + offset, 1 + offset);
          ctx.translate(-zoomCenterX, -zoomCenterY);
          ctx.globalAlpha = 0.12;
          ctx.drawImage(video, bx, by + chromePx, bw, bh - chromePx);
          ctx.restore();
        });
      }
    }

    // Draw raw video frame
    ctx.drawImage(video, bx, by + chromePx, bw, bh - chromePx);
    ctx.restore(); // Restore video crop clip / zoom transforms

    // Draw Device Frame (MacBook frame)
    if (deviceFrame) {
      // 1. Draw outer space-gray aluminum body shell
      ctx.save();
      const shellOffset = Math.round(bw * 0.005) + 3;
      ctx.strokeStyle = '#8E8E93'; // space gray aluminum
      ctx.lineWidth = Math.round(bw * 0.008) + 1;
      roundRect(ctx, bx - shellOffset, by - shellOffset, bw + shellOffset * 2, bh + shellOffset * 2, cr + 4);
      ctx.stroke();
      ctx.restore();

      // 2. Draw black glass bezel border
      ctx.save();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.round(bw * 0.015) + 4;
      roundRect(ctx, bx, by, bw, bh, cr);
      ctx.stroke();
      ctx.restore();

      // 3. Draw a tiny camera lens dot at top bezel center
      ctx.fillStyle = '#1C1C1E';
      ctx.beginPath();
      ctx.arc(bx + bw / 2, by + 8, Math.round(bw * 0.003) + 1, 0, Math.PI * 2);
      ctx.fill();

      // 4. Draw green camera status indicator LED light
      ctx.fillStyle = '#30D158';
      ctx.beginPath();
      ctx.arc(bx + bw / 2 + 10, by + 8, Math.round(bw * 0.001) + 0.5, 0, Math.PI * 2);
      ctx.fill();

      // 5. Draw MacBook hinge notch cutout at the bottom edge center
      ctx.fillStyle = '#8E8E93';
      ctx.beginPath();
      const notchW = Math.round(bw * 0.08) + 10;
      ctx.roundRect(bx + (bw - notchW) / 2, by + bh - 2, notchW, Math.round(bh * 0.008) + 2, 2);
      ctx.fill();
    }

    // Draw Custom Cursor
    if (showCursor) {
      const { cx, cy } = getCursorPosAtTime(ct);
      const cursorPX = bx + cx * bw;
      const cursorPY = by + chromePx + cy * (bh - chromePx);

      // Cursor motion blur trail
      if (motionBlur && isPlaying) {
        const delays = [0.03, 0.02, 0.01];
        delays.forEach((delay, index) => {
          const trailTime = Math.max(0, ct - delay);
          const { cx: tx, cy: ty } = getCursorPosAtTime(trailTime);
          const tPX = bx + tx * bw;
          const tPY = by + chromePx + ty * (bh - chromePx);

          ctx.save();
          ctx.translate(tPX, tPY);
          ctx.scale(cursorSize, cursorSize);
          ctx.globalAlpha = 0.15 * (index + 1);
          ctx.fillStyle = 'white';
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, 0); ctx.lineTo(0, 15); ctx.lineTo(4, 11); ctx.lineTo(9, 16); ctx.lineTo(11, 14); ctx.lineTo(6, 9); ctx.lineTo(11, 9); ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.restore();
        });
      }

      // Draw Main Cursor Pointer (macOS layout style)
      ctx.save();
      ctx.translate(cursorPX, cursorPY);
      ctx.scale(cursorSize, cursorSize);
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 15);
      ctx.lineTo(4, 11);
      ctx.lineTo(9, 16);
      ctx.lineTo(11, 14);
      ctx.lineTo(6, 9);
      ctx.lineTo(11, 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Draw Click Highlight ripple animations
    if (clickHighlights) {
      cursorKeyframes.forEach(k => {
        if (k.clicked && ct >= k.time && ct < k.time + 0.6) {
          const elapsed = ct - k.time;
          const radius = (elapsed / 0.6) * 35;
          const opacity = 1 - (elapsed / 0.6);
          const rPX = bx + k.x * bw;
          const rPY = by + chromePx + k.y * (bh - chromePx);

          ctx.save();
          ctx.beginPath();
          ctx.arc(rPX, rPY, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(217, 107, 67, ${opacity})`;
          ctx.lineWidth = 3 * (1 - elapsed / 0.6);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(rPX, rPY, 4 * (1 - elapsed / 0.6), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(217, 107, 67, ${opacity * 0.8})`;
          ctx.fill();
          ctx.restore();
        }
      });
    }

    ctx.restore(); // Restore outer box clip
  }, [selectedBg, imagesLoaded, padding, cornerRadius, shadowIntensity, showChrome, platform, blurBackground, blurIntensity, zoomEffects, cursorKeyframes, showCursor, motionBlur, clickHighlights, isPlaying, getCursorPosAtTime]);

  useEffect(() => {
    renderFrameRef.current = renderFrame;
  }, [renderFrame]);

  // Helper to directly update playhead and label elements in DOM for 60fps smoothness, and throttle state updates
  const updateDOMPlayhead = useCallback((time: number) => {
    if (!duration) return;

    // Update playhead style directly
    const playhead = playheadRef.current;
    if (playhead) {
      playhead.style.left = `${(time / duration) * 100}%`;
    }

    // Auto-scroll the timeline viewport to keep the playhead visible (CapCut-style)
    const viewport = document.getElementById('timeline-tracks-viewport') as HTMLElement | null;
    if (viewport) {
      const zoomedWidth = viewport.scrollWidth;
      const playheadPx = (time / duration) * zoomedWidth;
      const viewW = viewport.clientWidth;
      const scrollLeft = viewport.scrollLeft;
      const rightEdge = scrollLeft + viewW;
      const leftEdge  = scrollLeft;
      const triggerZone = 80; // px from edge before we scroll

      if (playheadPx > rightEdge - triggerZone) {
        // Scroll so playhead sits at ~40% from left
        viewport.scrollLeft = Math.max(0, playheadPx - viewW * 0.4);
      } else if (playheadPx < leftEdge + triggerZone) {
        viewport.scrollLeft = Math.max(0, playheadPx - triggerZone);
      }
    }

    // Update label text directly
    const label = currentTimeLabelRef.current;
    if (label) {
      label.textContent = fmt(time);
    }

    // Throttle React state setCurrentTime call to avoid rendering lag during playback
    const now = performance.now();
    if (now - lastStateUpdateRef.current > 150) {
      lastStateUpdateRef.current = now;
      setCurrentTime(time);
    }
  }, [duration]);

  // ─── Animation loop ─────────────────────────────────────────────────────
  const startLoop = useCallback(() => {
    const loop = () => {
      if (renderFrameRef.current) {
        renderFrameRef.current();
      }
      if (videoRef.current) {
        const ct = videoRef.current.currentTime;
        updateDOMPlayhead(ct);

        // Manage segment speed playbackRate
        const activeSeg = segmentsRef.current.find(s => ct >= s.start && ct <= s.end && !s.deleted);
        if (activeSeg) {
          const desiredSpeed = activeSeg.speed || 1;
          if (videoRef.current.playbackRate !== desiredSpeed) {
            videoRef.current.playbackRate = desiredSpeed;
          }
        } else {
          if (videoRef.current.playbackRate !== 1) {
            videoRef.current.playbackRate = 1;
          }
        }
      }
      if (playingRef.current) rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [updateDOMPlayhead]);

  // Re-render static frame on settings change
  useEffect(() => { renderFrame(); }, [renderFrame]);

  // ─── Video event listeners ─────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onMeta = () => {
      let dur = video.duration;
      if (!dur || isNaN(dur) || !isFinite(dur) || dur <= 0) {
        dur = recording.duration || 15;
      }
      setDuration(dur);
      
      // Load or build default segments if not loaded from localStorage
      if (segmentsRef.current.length === 0) {
        setSegments([{ id: 'seg-0', start: 0, end: dur, deleted: false, speed: 1 }]);
      }

      // Generate default click events & zoom animations if not restored
      if (zoomEffectsRef.current.length === 0) {
        setZoomEffects([]);
        setCursorKeyframes([]);
      }

      setupAudioPipeline();
      if (renderFrameRef.current) renderFrameRef.current();
    };

    const onTimeUpdate = () => {
      const ct = video.currentTime;
      updateDOMPlayhead(ct);

      // Check if duration has resolved to a finite number
      const dur = video.duration;
      if (dur && !isNaN(dur) && isFinite(dur) && dur > 0 && Math.abs(dur - durationRef.current) > 0.2) {
        setDuration(dur);
      }

      // Skip deleted segments during playback
      if (playingRef.current) {
        const inDeleted = segmentsRef.current.find(s => s.deleted && ct >= s.start && ct < s.end);
        if (inDeleted) {
          const nextActive = segmentsRef.current
            .filter(s => !s.deleted && s.start >= inDeleted.end)
            .sort((a, b) => a.start - b.start)[0];
          if (nextActive) {
            video.currentTime = nextActive.start;
          } else {
            video.pause();
            // Fire ended event to finish export or play-once flow
            const event = new Event('ended');
            video.dispatchEvent(event);
          }
        }
      }
    };

    const onPlay  = () => {
      setIsPlaying(true);
      setupAudioPipeline();
      // Resume audio context
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      startLoop();
    };
    const onPause = () => { 
      setIsPlaying(false); 
      cancelAnimationFrame(rafRef.current); 
      setCurrentTime(video.currentTime);
      if (renderFrameRef.current) renderFrameRef.current(); 
    };
    const onEnded = () => { 
      setIsPlaying(false); 
      cancelAnimationFrame(rafRef.current); 
      setCurrentTime(video.currentTime);
      if (renderFrameRef.current) renderFrameRef.current(); 
    };

    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('loadeddata', () => { if (video.readyState >= 2 && renderFrameRef.current) renderFrameRef.current(); });
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('play',  onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);

    if (video.readyState >= 1) onMeta();

    return () => {
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('play',  onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      cancelAnimationFrame(rafRef.current);
    };
  }, [startLoop, setupAudioPipeline]);

  // ─── Playback ──────────────────────────────────────────────────────────
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      const firstActive = segments
        .filter(s => !s.deleted && s.end > (video.currentTime || 0))
        .sort((a, b) => a.start - b.start)[0];
      if (firstActive && video.currentTime >= firstActive.end) {
        video.currentTime = firstActive.start;
      }
      video.play().catch(() => {});
    }
  };

  // ─── Timeline segment dragging (Crop Trim) ──────────────────────────────────
  const handleLeftDrag = (e: React.MouseEvent, segId: string) => {
    e.stopPropagation();
    const startX = e.clientX;
    const initialSegments = [...segments];
    const targetIdx = initialSegments.findIndex(s => s.id === segId);
    if (targetIdx === -1) return;
    const seg = initialSegments[targetIdx];
    const initialStart = seg.start;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const timelineRect = timelineRef.current?.getBoundingClientRect();
      if (!timelineRect || !duration) return;
      const deltaX = moveEvent.clientX - startX;
      const deltaSecs = (deltaX / timelineRect.width) * duration;
      
      const prevSeg = initialSegments[targetIdx - 1];
      const minLimit = prevSeg ? prevSeg.start + 0.1 : 0;
      const newStart = Math.max(minLimit, Math.min(seg.end - 0.2, initialStart + deltaSecs));
      
      setSegments(prev => {
        const next = prev.map(s => ({ ...s }));
        const idx = next.findIndex(s => s.id === segId);
        if (idx === -1) return prev;
        next[idx].start = newStart;
        if (next[idx - 1]) {
          next[idx - 1].end = newStart;
        }
        return next;
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      saveHistoryState();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleRightDrag = (e: React.MouseEvent, segId: string) => {
    e.stopPropagation();
    const startX = e.clientX;
    const initialSegments = [...segments];
    const targetIdx = initialSegments.findIndex(s => s.id === segId);
    if (targetIdx === -1) return;
    const seg = initialSegments[targetIdx];
    const initialEnd = seg.end;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const timelineRect = timelineRef.current?.getBoundingClientRect();
      if (!timelineRect || !duration) return;
      const deltaX = moveEvent.clientX - startX;
      const deltaSecs = (deltaX / timelineRect.width) * duration;
      
      const nextSeg = initialSegments[targetIdx + 1];
      const maxLimit = nextSeg ? nextSeg.end - 0.1 : duration;
      const newEnd = Math.max(seg.start + 0.2, Math.min(maxLimit, initialEnd + deltaSecs));
      
      setSegments(prev => {
        const next = prev.map(s => ({ ...s }));
        const idx = next.findIndex(s => s.id === segId);
        if (idx === -1) return prev;
        next[idx].end = newEnd;
        if (next[idx + 1]) {
          next[idx + 1].start = newEnd;
        }
        return next;
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      saveHistoryState();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleZoomLeftDrag = (e: React.MouseEvent, zoomId: string) => {
    e.stopPropagation();
    const startX = e.clientX;
    const initialZooms = [...zoomEffectsRef.current];
    const targetIdx = initialZooms.findIndex(z => z.id === zoomId);
    if (targetIdx === -1) return;
    const zoom = initialZooms[targetIdx];
    const initialTime = zoom.time;
    const initialEnd = zoom.time + zoom.duration;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const timelineRect = timelineRef.current?.getBoundingClientRect();
      if (!timelineRect || !duration) return;
      const deltaX = moveEvent.clientX - startX;
      const deltaSecs = (deltaX / timelineRect.width) * duration;
      
      const newTime = Math.max(0, Math.min(initialEnd - 0.2, initialTime + deltaSecs));
      const newDuration = initialEnd - newTime;
      
      setZoomEffects(prev => {
        return prev.map(z => z.id === zoomId ? { ...z, time: newTime, duration: newDuration } : z);
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      saveHistoryState(undefined, zoomEffectsRef.current);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleZoomRightDrag = (e: React.MouseEvent, zoomId: string) => {
    e.stopPropagation();
    const startX = e.clientX;
    const initialZooms = [...zoomEffectsRef.current];
    const targetIdx = initialZooms.findIndex(z => z.id === zoomId);
    if (targetIdx === -1) return;
    const zoom = initialZooms[targetIdx];
    const initialDuration = zoom.duration;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const timelineRect = timelineRef.current?.getBoundingClientRect();
      if (!timelineRect || !duration) return;
      const deltaX = moveEvent.clientX - startX;
      const deltaSecs = (deltaX / timelineRect.width) * duration;
      
      const newDuration = Math.max(0.2, initialDuration + deltaSecs);
      
      setZoomEffects(prev => {
        return prev.map(z => z.id === zoomId ? { ...z, duration: newDuration } : z);
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      saveHistoryState(undefined, zoomEffectsRef.current);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // ─── Timeline helpers ──────────────────────────────────────────────────
  const splitAtCurrentTime = () => {
    const ct = videoRef.current?.currentTime ?? 0;
    if (!duration || ct <= 0 || ct >= duration) return;
    setSegments(prev => {
      const idx = prev.findIndex(s => !s.deleted && s.start < ct && s.end > ct);
      if (idx === -1) return prev;
      const seg = prev[idx];
      const ts  = Date.now();
      const next = [...prev];
      next.splice(idx, 1,
        { id: `${seg.id}-${ts}a`, start: seg.start, end: ct,      deleted: false, speed: seg.speed || 1 },
        { id: `${seg.id}-${ts}b`, start: ct,         end: seg.end, deleted: false, speed: seg.speed || 1 },
      );
      saveHistoryState(next);
      return next;
    });
    triggerToast("Segment split successful", "success");
  };

  const handleTrimAtCurrentTime = () => {
    const ct = videoRef.current?.currentTime ?? 0;
    if (!duration || ct < 0 || ct >= duration) return;
    setSegments(prev => {
      const idx = prev.findIndex(s => !s.deleted && s.start < ct && s.end > ct);
      if (idx === -1) {
        triggerToast("Seek to an active segment to trim/skip", "error");
        return prev;
      }
      const seg = prev[idx];
      const ts = Date.now();
      const next = [...prev];
      const skipDur = 2.0; // Default 2s skip zone
      if (ct + skipDur < seg.end) {
        const segA = { id: `${seg.id}-${ts}a`, start: seg.start, end: ct, deleted: false, speed: seg.speed || 1 };
        const segB = { id: `${seg.id}-${ts}b`, start: ct, end: ct + skipDur, deleted: true, speed: seg.speed || 1 };
        const segC = { id: `${seg.id}-${ts}c`, start: ct + skipDur, end: seg.end, deleted: false, speed: seg.speed || 1 };
        next.splice(idx, 1, segA, segB, segC);
        setSelectedSegmentId(segB.id);
      } else {
        const segA = { id: `${seg.id}-${ts}a`, start: seg.start, end: ct, deleted: false, speed: seg.speed || 1 };
        const segB = { id: `${seg.id}-${ts}b`, start: ct, end: seg.end, deleted: true, speed: seg.speed || 1 };
        next.splice(idx, 1, segA, segB);
        setSelectedSegmentId(segB.id);
      }
      saveHistoryState(next);
      return next;
    });
    triggerToast("Skip zone added successfully", "success");
  };

  const handleZoomAtCurrentTime = () => {
    const newZoom: ZoomEffect = {
      id: `zoom-${Date.now()}`,
      time: currentTime,
      duration: 2.0,
      zoomLevel: 1.6,
      x: 0.5,
      y: 0.5,
      cursorFollowing: true,
      enabled: true
    };
    const nextZooms = [...zoomEffects, newZoom];
    setZoomEffects(nextZooms);
    saveHistoryState(undefined, nextZooms);
    triggerToast("Zoom effect added at " + fmt(currentTime), "success");
  };

  const handleResetTimeline = () => {
    const defaultSegs = [{ id: 'seg-0', start: 0, end: duration, deleted: false, speed: 1 }];
    setSegments(defaultSegs);
    setZoomEffects([]);
    setSelectedSegmentId(null);
    setSelectedZoomId(null);
    saveHistoryState(defaultSegs, []);
    triggerToast("Timeline reset to original", "info");
  };

  const deleteSegment = (id: string) => {
    const next = segments.map(s => s.id === id ? { ...s, deleted: true } : s);
    setSegments(next);
    saveHistoryState(next);
    triggerToast("Segment removed", "info");
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const customTrackId = `custom-${Date.now()}`;
    const newTrack = {
      id: customTrackId,
      label: `Uploaded: ${file.name}`,
      url: url
    };

    setMusicTracks(prev => [...prev, newTrack]);
    setBgMusicId(customTrackId);
    triggerToast("Custom sound imported successfully!", "success");
  };

  const restoreSegment = (id: string) => {
    const next = segments.map(s => s.id === id ? { ...s, deleted: false } : s);
    setSegments(next);
    saveHistoryState(next);
    triggerToast("Segment restored", "success");
  };

  const snapToActiveSegment = useCallback((t: number): number => {
    const inDeleted = segmentsRef.current.find(s => s.deleted && t >= s.start && t < s.end);
    if (!inDeleted) return t;

    const nextActive = segmentsRef.current
      .filter(s => !s.deleted && s.start >= inDeleted.end)
      .sort((a, b) => a.start - b.start)[0];
    
    if (nextActive) {
      return nextActive.start;
    }

    return inDeleted.start;
  }, []);

  const handleTimelineDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect || !duration) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setDragOverTime(ratio * duration);
  };

  const handleTimelineDragLeave = () => {
    setDragOverTime(null);
  };

  const handleTimelineDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverTime(null);

    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect || !duration) return;

    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const dropTime = ratio * duration;

    const toolType = e.dataTransfer.getData("text/plain");

    if (toolType === "tool-skip") {
      setSegments(prev => {
        const idx = prev.findIndex(s => !s.deleted && s.start < dropTime && s.end > dropTime);
        if (idx === -1) {
          triggerToast("Drop on an active segment to skip/split", "error");
          return prev;
        }
        const seg = prev[idx];
        const ts = Date.now();
        const next = [...prev];
        
        // 3-second split/skip logic
        const skipDur = 3.0;
        if (dropTime + skipDur < seg.end) {
          const segA = { id: `${seg.id}-${ts}a`, start: seg.start, end: dropTime, deleted: false, speed: seg.speed || 1 };
          const segB = { id: `${seg.id}-${ts}b`, start: dropTime, end: dropTime + skipDur, deleted: true, speed: seg.speed || 1 };
          const segC = { id: `${seg.id}-${ts}c`, start: dropTime + skipDur, end: seg.end, deleted: false, speed: seg.speed || 1 };
          next.splice(idx, 1, segA, segB, segC);
          saveHistoryState(next);
          setSelectedSegmentId(segB.id);
        } else {
          const segA = { id: `${seg.id}-${ts}a`, start: seg.start, end: dropTime, deleted: false, speed: seg.speed || 1 };
          const segB = { id: `${seg.id}-${ts}b`, start: dropTime, end: seg.end, deleted: true, speed: seg.speed || 1 };
          next.splice(idx, 1, segA, segB);
          saveHistoryState(next);
          setSelectedSegmentId(segB.id);
        }
        
        triggerToast("Dropped skip zone: 3s section skipped", "success");
        return next;
      });
    } else if (toolType === "tool-zoom") {
      const newZoom: ZoomEffect = {
        id: `zoom-${Date.now()}`,
        time: dropTime,
        duration: 3.0, // Default 3s zoom effect
        zoomLevel: 1.6,
        x: 0.5,
        y: 0.5,
        cursorFollowing: false,
        enabled: true
      };
      setZoomEffects(prev => {
        const next = [...prev, newZoom];
        saveHistoryState(undefined, next);
        return next;
      });
      // Seek video to the zoom effect for preview
      const video = videoRef.current;
      if (video) {
        const targetTime = snapToActiveSegment(dropTime + 0.05);
        video.currentTime = targetTime;
        setCurrentTime(targetTime);
        renderFrame();
      }
      setSidebarTab('zoom');
      triggerToast("Zoom effect added at drop location", "success");
    }
  };

  const handleSegmentSlide = (e: React.MouseEvent, segId: string) => {
    const target = e.target as HTMLElement;
    if (target.closest('.cursor-ew-resize') || target.closest('button')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect || !duration) return;

    const startX = e.clientX;
    const initialSegments = [...segments];
    const targetIdx = initialSegments.findIndex(s => s.id === segId);
    if (targetIdx === -1) return;

    const targetSeg = initialSegments[targetIdx];
    const segDuration = targetSeg.end - targetSeg.start;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = (deltaX / rect.width) * duration;

      setSegments(prev => {
        const next = prev.map(s => ({ ...s }));
        const idx = next.findIndex(s => s.id === segId);
        if (idx === -1) return prev;

        const currentSeg = next[idx];
        const prevSeg = next[idx - 1];
        const nextSeg = next[idx + 1];

        let newStart = targetSeg.start + deltaTime;
        let newEnd = targetSeg.end + deltaTime;

        const minLimit = prevSeg ? prevSeg.start + 0.1 : 0;
        const maxLimit = nextSeg ? nextSeg.end - 0.1 : duration;

        if (newStart < minLimit) {
          newStart = minLimit;
          newEnd = newStart + segDuration;
        }
        if (newEnd > maxLimit) {
          newEnd = maxLimit;
          newStart = newEnd - segDuration;
        }

        currentSeg.start = newStart;
        currentSeg.end = newEnd;

        if (prevSeg) {
          prevSeg.end = newStart;
        }
        if (nextSeg) {
          nextSeg.start = newEnd;
        }

        return next;
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      saveHistoryState();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleZoomMarkerDrag = (e: React.MouseEvent, zoomId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLElement;
    if (target.closest('.cursor-ew-resize') || target.closest('button')) {
      return;
    }

    setSelectedZoomId(zoomId);
    setSelectedSegmentId(null);
    setSidebarTab('zoom');

    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect || !duration) return;

    const startX = e.clientX;
    const initialZoom = zoomEffects.find(z => z.id === zoomId);
    if (!initialZoom) return;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = (deltaX / rect.width) * duration;
      let newTime = initialZoom.time + deltaTime;

      newTime = Math.max(0, Math.min(duration - initialZoom.duration, newTime));

      setZoomEffects(prev => prev.map(z => z.id === zoomId ? { ...z, time: newTime } : z));

      const video = videoRef.current;
      if (video) {
        const targetTime = snapToActiveSegment(newTime + 0.05);
        video.currentTime = targetTime;
        setCurrentTime(targetTime);
        renderFrame();
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      saveHistoryState(undefined, zoomEffectsRef.current);
      triggerToast("Zoom effect repositioned", "info");
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const seekToRatio = (ratio: number) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    let t = Math.max(0, Math.min(duration, ratio * duration));
    t = snapToActiveSegment(t);
    video.currentTime = t;
    updateDOMPlayhead(t);
    renderFrame();
  };

  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;

    const handleDrag = (moveEvent: MouseEvent) => {
      const ratio = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
      seekToRatio(ratio);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Avoid triggering scrubbing on drag handles or buttons
    const target = e.target as HTMLElement;
    if (target.closest('.cursor-ew-resize') || target.closest('button')) {
      return;
    }

    setSelectedSegmentId(null);
    setSelectedZoomId(null);

    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;

    const handleDrag = (moveEvent: MouseEvent) => {
      const ratio = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
      seekToRatio(ratio);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    const initialRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekToRatio(initialRatio);

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Active (non-deleted) duration
  const activeDuration = segments.filter(s => !s.deleted).reduce((acc, s) => acc + (s.end - s.start), 0);

  // ─── Export (with Audio mixing, voice filters & background loops!) ──────
  const handleExport = async () => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video || isExporting) return;

    setIsExporting(true);
    setExportDone(false);

    try {
      video.pause();
      const activeSegs = segmentsRef.current
        .filter(s => !s.deleted)
        .sort((a, b) => a.start - b.start);

      if (!activeSegs.length) { setIsExporting(false); return; }

      video.currentTime = activeSegs[0].start;
      await new Promise(r => setTimeout(r, 400));
      renderFrame();

      const activePlatform = PLATFORMS.find(p => p.id === platform) || PLATFORMS[0];
      const canvasStream = canvas.captureStream(60); // 60 fps capture = no dropped frames
      
      // Setup Web Audio Mixing Destination
      const exportStream = new MediaStream();
      canvasStream.getVideoTracks().forEach(t => exportStream.addTrack(t));

      let exportAudioTrack: MediaStreamTrack | null = null;
      if (audioCtxRef.current) {
        const ctx = audioCtxRef.current;
        const dest = ctx.createMediaStreamDestination();

        // Connect enhanced vocal nodes (compressor is the final node of mic chain)
        if (compressorRef.current) {
          compressorRef.current.connect(dest);
        }

        // Connect and play background music in the export context
        if (bgMusicId !== 'none' && bgAudioRef.current) {
          try {
            const musicSource = ctx.createMediaElementSource(bgAudioRef.current);
            const musicGain = ctx.createGain();
            musicGain.gain.setValueAtTime(bgMusicVolume / 100, ctx.currentTime);
            musicSource.connect(musicGain);
            musicGain.connect(dest);
            musicGain.connect(ctx.destination);
          } catch (e) {
            // Already connected, ignore
          }
        }

        if (dest.stream.getAudioTracks().length > 0) {
          exportAudioTrack = dest.stream.getAudioTracks()[0];
        }
      }

      if (exportAudioTrack) {
        exportStream.addTrack(exportAudioTrack);
      }

      // Pick best available codec (VP9 > VP8 fallback)
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9' : 'video/webm;codecs=vp8';

      // Set a high bitrate so exported quality matches the original recording.
      // 1080p VP9 @ 16 Mbps video + 320 kbps audio gives broadcast-grade output.
      const activePlatformForExport = PLATFORMS.find(p => p.id === platform) || PLATFORMS[0];
      const isVertical = activePlatformForExport.height > activePlatformForExport.width;
      const videoBps = isVertical ? 12_000_000 : 16_000_000; // 12 Mbps vertical, 16 Mbps horizontal

      const recorder = new MediaRecorder(exportStream, {
        mimeType,
        videoBitsPerSecond: videoBps,
        audioBitsPerSecond: 320_000,
      });
      const chunks: Blob[] = [];

      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement('a'), { href: url, download: `uptimer-export-${projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.webm` });
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsExporting(false);
        setExportDone(true);
        triggerToast("Video exported and downloaded!", "success");
        setTimeout(() => setExportDone(false), 3000);
      };

      recorder.start(100);
      playingRef.current = true;

      // Play background music if enabled
      if (bgAudioRef.current && bgMusicId !== 'none') {
        bgAudioRef.current.currentTime = video.currentTime;
        bgAudioRef.current.play().catch(() => {});
      } else if (bgMusicId !== 'none') {
        startSynthMusic();
      }

      const exportLoop = () => {
        renderFrame();
        if (playingRef.current) rafRef.current = requestAnimationFrame(exportLoop);
      };
      rafRef.current = requestAnimationFrame(exportLoop);

      video.play().catch(() => {});
      setIsPlaying(true);

      const onEnd = () => {
        video.removeEventListener('ended', onEnd);
        playingRef.current = false;
        cancelAnimationFrame(rafRef.current);
        setIsPlaying(false);
        if (bgAudioRef.current) bgAudioRef.current.pause();
        stopSynthMusic();
        setTimeout(() => recorder.stop(), 200);
      };
      video.addEventListener('ended', onEnd);

    } catch (e) {
      console.error("Export failure:", e);
      setIsExporting(false);
      triggerToast("Export failed", "error");
    }
  };

  const handleCloudShare = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setUploadDone(true);
      const shareUrl = `https://uptimer.app/share/v_${Math.random().toString(36).substring(2, 8)}`;
      navigator.clipboard.writeText(shareUrl);
      triggerToast("Uploaded to cloud! Share link copied to clipboard.", "success");
      setTimeout(() => setUploadDone(false), 5000);
    }, 2000);
  };

  const canSplit = duration > 0 && currentTime > 0.1 && currentTime < duration - 0.1 &&
    segments.some(s => !s.deleted && s.start < currentTime && s.end > currentTime);

  const activePlatform = PLATFORMS.find(p => p.id === platform) || PLATFORMS[0];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-brand-bg select-none" id="video-editor-root">

      {/* ══ TOP BAR ════════════════════════════════════════════════════════ */}
      <div className="flex-none flex items-center px-5 h-14 border-b border-brand-border bg-brand-bg justify-between">
        {/* Left: Back */}
        <button
          onClick={() => setShowBackConfirm(true)}
          className="flex items-center gap-1.5 text-brand-text-muted hover:text-brand-text transition-colors duration-150 text-[13px] font-medium"
          id="editor-back-btn"
        >
          <ArrowLeft size={15} strokeWidth={2} />
          Back
        </button>

        {/* Center: Project Naming & Save */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-brand-surface border border-brand-border hover:border-brand-text/20 focus:border-brand-accent rounded px-2.5 py-1 text-[13px] font-semibold text-brand-text focus:outline-none w-48 md:w-64 transition"
          />
          <button
            onClick={() => {
              const state = {
                projectName,
                selectedBg,
                padding,
                cornerRadius,
                shadowIntensity,
                showChrome,
                canvasPlatform: platform,
                blurBackground,
                blurIntensity,
                bgMusicId,
                bgMusicVolume,
                micEnhanced,
                clickHighlights,
                showCursor,
                motionBlur,
                segments,
                zoomEffects,
              };
              localStorage.setItem(`project_config_${recording.id}`, JSON.stringify(state));
              triggerToast("Project saved successfully!", "success");
            }}
            className="p-1.5 rounded-lg bg-brand-surface hover:bg-brand-border text-brand-text-muted hover:text-brand-text transition"
            title="Save Project (Ctrl+S)"
          >
            <Save size={14} />
          </button>
          <span className="text-[10px] text-brand-text-muted/40 font-mono italic hidden md:inline">Auto-saved</span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 h-8 rounded-lg text-[12px] font-semibold transition-all duration-200 disabled:opacity-50"
            style={{
              background: exportDone ? 'rgba(40,200,64,0.12)' : '#D96B43',
              color: exportDone ? '#28c840' : '#fff',
            }}
            id="editor-export-btn"
          >
            {exportDone ? (
              <><Check size={13} strokeWidth={2.5} /><span>Exported!</span></>
            ) : isExporting ? (
              <><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg><span>Exporting…</span></>
            ) : (
              <><Download size={13} strokeWidth={2} /><span>Export</span></>
            )}
          </button>

          <button
            onClick={handleCloudShare}
            disabled={isUploading}
            className="flex items-center gap-1.5 px-3.5 h-8 rounded-lg text-[12px] font-semibold transition-all duration-200 border border-brand-border bg-brand-surface text-brand-text hover:bg-brand-surface/80 disabled:opacity-50"
            id="editor-share-btn"
          >
            {uploadDone ? (
              <><Check size={13} strokeWidth={2.5} className="text-emerald-500" /><span>Copied!</span></>
            ) : isUploading ? (
              <><svg className="animate-spin text-brand-accent" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg><span>Uploading…</span></>
            ) : (
              <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg><span>Share Link</span></>
            )}
          </button>
        </div>
      </div>

      {/* ══ MAIN CONTENT ═══════════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* ── Left column: canvas + timeline stacked ── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

          {/* Canvas Preview Area */}
          <div
            className="flex-1 min-h-0 flex items-center justify-center p-6"
            style={{
              background: '#F4EFE6',
              backgroundImage: 'radial-gradient(rgba(105,100,89,0.13) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
            id="editor-preview-area"
          >
            <div
              className="relative w-full flex items-center justify-center max-h-full"
              style={{
                maxWidth: `min(calc((100vh - 360px) * ${activePlatform.width / activePlatform.height}), 100%)`,
                maxHeight: '100%',
                aspectRatio: `${activePlatform.width} / ${activePlatform.height}`
              }}
            >
              <canvas
                ref={canvasRef}
                width={activePlatform.width}
                height={activePlatform.height}
                className="w-full h-full block rounded-xl"
                style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.10)' }}
                id="editor-canvas"
              />

              {/* Play button overlay */}
              <button
                onClick={togglePlay}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
                style={{
                  background: 'rgba(255,255,255,0.85)',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  opacity: isPlaying ? 0 : 1,
                  pointerEvents: isPlaying ? 'none' : 'auto',
                  color: '#D96B43',
                }}
                id="editor-canvas-play"
              >
                <Play size={20} strokeWidth={2} className="ml-0.5" />
              </button>

              {/* Exporting overlay */}
              {isExporting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-brand-bg/85 backdrop-blur-sm z-30">
                  <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D96B43" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <span className="text-brand-text font-semibold text-sm">Rendering & Compiling Video…</span>
                  <span className="text-brand-text-muted text-[10px]">Processing vocal enhance & audio layers</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Timeline (inside left column, below canvas) ── */}
          <div
            className="flex-none border-t border-brand-border bg-brand-card"
            style={{ height: 280 }}
            id="editor-timeline"
          >
            <div className="h-full flex flex-col px-5 py-2.5 gap-1.5">

              {/* 1. Playback Seek HUD Row */}
              <div className="flex items-center space-x-3 px-1 py-0.5 shrink-0 select-none" id="timeline-hud">
                {/* Play/Pause Button */}
                <button
                  onClick={togglePlay}
                  className="text-brand-text hover:text-brand-accent transition-colors shrink-0"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={15} className="fill-brand-text" /> : <Play size={15} className="fill-brand-text" />}
                </button>

                {/* Volume/Mute Button */}
                <button
                  onClick={() => setIsMuted(prev => !prev)}
                  className="text-brand-text hover:text-brand-accent transition-colors shrink-0"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>

                {/* Time Display with Centiseconds */}
                <div className="text-xs font-mono font-semibold text-brand-text-muted shrink-0">
                  {formatSecsWithMs(currentTime)} <span className="text-brand-border/60">/</span> {formatSecsWithMs(duration)}
                </div>

                {/* Seek Slider Track */}
                <div className="flex-1 flex items-center relative h-5">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.01}
                    value={currentTime}
                    onChange={(e) => {
                      const time = parseFloat(e.target.value);
                      if (videoRef.current) {
                        videoRef.current.currentTime = time;
                      }
                      setCurrentTime(time);
                    }}
                    className="w-full h-1 bg-brand-surface rounded-lg appearance-none cursor-pointer accent-brand-accent focus:outline-none"
                    style={{
                      background: `linear-gradient(to right, #D96B43 ${(currentTime / (duration || 100)) * 100}%, #EDE8E0 ${(currentTime / (duration || 100)) * 100}%)`
                    }}
                    id="playback-slider"
                  />
                </div>
              </div>

              {/* 2. Toolbar Row */}
              <div className="flex items-center justify-between pb-0.5 select-none shrink-0" id="timeline-toolbar">
                <div className="flex items-center space-x-1.5">
                  {/* Zoom and Trim Buttons Side by Side */}
                  <div className="flex items-center bg-white border border-brand-border rounded-lg p-0.5 shadow-sm">
                    <button
                      onClick={handleZoomAtCurrentTime}
                      className="flex items-center space-x-1 px-3 py-1 bg-transparent hover:bg-slate-50 text-xs font-bold rounded-md text-slate-700 transition"
                      title="Add Zoom Effect"
                    >
                      <ZoomIn size={11} className="text-slate-500" />
                      <span>Zoom</span>
                    </button>
                    <button
                      onClick={handleTrimAtCurrentTime}
                      className="flex items-center space-x-1 px-3 py-1 bg-transparent hover:bg-slate-50 border-l border-brand-border text-xs font-bold rounded-md text-slate-700 transition"
                      title="Trim / Skip segment"
                    >
                      <Scissors size={11} className="text-slate-500" />
                      <span>Trim</span>
                    </button>
                  </div>

                  {/* Trash Icon Button */}
                  <button
                    onClick={() => {
                      if (selectedSegmentId) {
                        deleteSegment(selectedSegmentId);
                      } else {
                        triggerToast("Select a segment on the timeline to delete", "info");
                      }
                    }}
                    className="p-1.5 bg-white hover:bg-rose-50 border border-brand-border rounded-lg text-slate-500 hover:text-rose-600 transition shadow-sm"
                    title="Delete selected segment"
                  >
                    <Trash2 size={11} />
                  </button>

                  <div className="h-4 w-[1px] bg-brand-border mx-1" />

                  {/* Undo & Redo Buttons */}
                  <button
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    className="p-1.5 bg-white hover:bg-slate-50 border border-brand-border rounded-lg text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-sm"
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo2 size={11} />
                  </button>
                  <button
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    className="p-1.5 bg-white hover:bg-slate-50 border border-brand-border rounded-lg text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-sm"
                    title="Redo (Ctrl+Y)"
                  >
                    <Redo2 size={11} />
                  </button>

                  <div className="h-4 w-[1px] bg-brand-border mx-1" />

                  {/* Reset timeline Button */}
                  <button
                    onClick={handleResetTimeline}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-slate-50 border border-brand-border text-[11px] font-bold rounded-lg text-slate-700 transition shadow-sm"
                    title="Reset Timeline to Original"
                  >
                    <RotateCcw size={11} className="text-slate-500 animate-spin-hover" />
                    <span>Reset timeline</span>
                  </button>
                </div>

                {/* Timeline zoom slider */}
                <div className="flex items-center space-x-1.5 bg-white border border-brand-border px-2.5 py-1 rounded-lg text-xs shadow-sm">
                  <span className="text-[10px] text-slate-400 font-bold select-none">-</span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={zoomLevel}
                    onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                    className="w-16 h-1 bg-slate-200 appearance-none rounded-full accent-brand-accent cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400 font-bold select-none">+</span>
                </div>
              </div>

              {/* ──────────────────────────────────────────────────────────────────
                  CapCut-style track container:
                  • Outer box is FIXED — scissors are pinned absolutely at edges
                  • Inner viewport scrolls + zooms between the scissors
              ─────────────────────────────────────────────────────────────────── */}
              <div className="relative w-full flex-1 pt-1 min-h-0 flex flex-col" id="timeline-row-wrapper">

                {/* Fixed outer track box — scissors NEVER move */}
                <div className="relative flex-1 bg-slate-100 border border-slate-200 rounded-lg overflow-hidden" id="timeline-track-container">

                  {/* ✂ Left Scissor end-cap — fixed static overlay */}
                  <div className="absolute left-0 top-0 bottom-0 w-6 bg-slate-100 border-r border-slate-200 flex items-center justify-center z-45 text-slate-400 pointer-events-none rounded-l-lg">
                    <Scissors size={12} className="rotate-90 scale-x-[-1]" />
                  </div>

                  {/* ✂ Right Scissor end-cap — fixed static overlay */}
                  <div className="absolute right-0 top-0 bottom-0 w-6 bg-slate-100 border-l border-slate-200 flex items-center justify-center z-45 text-slate-400 pointer-events-none rounded-r-lg">
                    <Scissors size={12} className="rotate-90" />
                  </div>

                  {/* Scrollable + zoomable inner viewport (clips scroll under scissors) */}
                  <div
                    ref={viewportRef}
                    className="absolute inset-0 overflow-x-auto overflow-y-hidden scrollbar-none"
                    id="timeline-tracks-viewport"
                    onScroll={(e) => {
                      const el = e.currentTarget;
                      const max = el.scrollWidth - el.clientWidth;
                      setTimelineScrollPct(max > 0 ? (el.scrollLeft / max) * 100 : 0);
                    }}
                  >
                    {/* Ruler ticks row — absolutely positioned at top, scales with zoom */}
                    <div
                      className="absolute top-0 left-0 right-0 h-7 z-10 pointer-events-none"
                      style={{ width: `${100 + (zoomLevel - 1) * 30}%` }}
                    >
                      <div className="relative w-full h-full border-b border-brand-border/40">
                        {duration > 0 && Array.from({ length: Math.ceil(duration / 2) + 1 }).map((_, i) => {
                          const timeVal = i * 2;
                          if (timeVal > duration) return null;
                          const pct = (timeVal / duration) * 100;
                          return (
                            <div
                              key={timeVal}
                              className="absolute top-0 bottom-0 flex flex-col justify-between items-center select-none"
                              style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
                            >
                              <span className="text-[10px] font-mono font-semibold text-slate-500 leading-none">{fmt(timeVal)}</span>
                              <div className="w-[1px] h-1.5 bg-slate-300" />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Zoomed content width wrapper */}
                    <div
                      className="relative h-full"
                      style={{ width: `${100 + (zoomLevel - 1) * 30}%` }}
                    >
                      {/* Three-zone track: ZOOM pad | TRIM pad | CLIP track */}
                      <div
                        ref={timelineRef}
                        className="absolute bottom-0 left-0 right-0 cursor-pointer overflow-hidden rounded-lg border border-slate-200"
                        style={{ top: 28 }}
                        onMouseDown={handleTimelineMouseDown}
                        onDragOver={handleTimelineDragOver}
                        onDragLeave={handleTimelineDragLeave}
                        onDrop={handleTimelineDrop}
                        id="timeline-track"
                      >
                        <div
                          className="absolute top-0 left-0 right-0 overflow-hidden"
                          style={{
                            height: 42,
                            background: 'linear-gradient(180deg, #f8f6ff 0%, #f1eeff 100%)',
                            borderBottom: '1px solid #e5e0f5',
                          }}
                        >
                          <div
                            className="absolute inset-0 opacity-25 pointer-events-none"
                            style={{
                              backgroundImage: 'radial-gradient(circle, #a78bfa 0.8px, transparent 0.8px)',
                              backgroundSize: '8px 8px',
                            }}
                          />
                          <div className="absolute left-1.5 top-0 bottom-0 flex items-center pointer-events-none z-10">
                            <span className="text-[7px] font-black uppercase tracking-widest text-violet-400/55 select-none">ZOOM</span>
                          </div>

                          {duration > 0 && zoomEffects.map(z => {
                            const leftPct  = (z.time / duration) * 100;
                            const widthPct = (z.duration / duration) * 100;
                            const isSelected = selectedZoomId === z.id;
                            return (
                              <div
                                key={z.id}
                                className="absolute top-1 bottom-1 z-30 select-none"
                                style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: 54 }}
                              >
                                <div
                                  className={`relative w-full h-full rounded-full flex items-center justify-between overflow-hidden transition-all duration-150 ${
                                    isSelected ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
                                  }`}
                                  style={{
                                    background: isSelected
                                      ? 'linear-gradient(90deg, #6d28d9, #7c3aed, #8b5cf6)'
                                      : 'linear-gradient(90deg, #7c3aed88, #8b5cf688, #a78bfa88)',
                                    boxShadow: isSelected
                                      ? '0 2px 12px rgba(109,40,217,0.35), inset 0 1px 0 rgba(255,255,255,0.25)'
                                      : '0 1px 4px rgba(109,40,217,0.18), inset 0 1px 0 rgba(255,255,255,0.2)',
                                    border: isSelected ? '1.5px solid #7c3aed' : '1px solid rgba(139,92,250,0.4)',
                                  }}
                                  onMouseDown={(e) => handleZoomMarkerDrag(e, z.id)}
                                >
                                  {/* Left resize grip — thin trackpad-style */}
                                  {isSelected && (
                                    <div
                                      className="absolute left-0 top-0 bottom-0 w-2.5 flex items-center justify-center z-40 cursor-ew-resize rounded-l-full hover:bg-white/15"
                                      onMouseDown={(e) => handleZoomLeftDrag(e, z.id)}
                                    >
                                      <div className="w-[1.5px] h-3 bg-white/70 rounded-full" />
                                    </div>
                                  )}
                                  {/* Label */}
                                  <div className={`flex items-center gap-1 text-white min-w-0 z-10 ${isSelected ? 'ml-3 mr-1' : 'mx-2'}`}>
                                    <ZoomIn size={7} strokeWidth={2.5} className="shrink-0 opacity-90" />
                                    <span className="text-[8px] font-extrabold tracking-wide uppercase truncate opacity-90">{z.zoomLevel}x</span>
                                  </div>
                                  {/* Delete button */}
                                  <button
                                    className="shrink-0 mr-1 z-40 w-3.5 h-3.5 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white/90 text-[10px] font-extrabold leading-none transition"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => { e.stopPropagation(); const next = zoomEffects.filter(x => x.id !== z.id); setZoomEffects(next); saveHistoryState(undefined, next); triggerToast("Zoom effect removed", "info"); }}
                                  >×</button>
                                  {/* Right resize grip — thin trackpad-style */}
                                  {isSelected && (
                                    <div
                                      className="absolute right-0 top-0 bottom-0 w-2.5 flex items-center justify-center z-40 cursor-ew-resize rounded-r-full hover:bg-white/15"
                                      onMouseDown={(e) => handleZoomRightDrag(e, z.id)}
                                    >
                                      <div className="w-[1.5px] h-3 bg-white/70 rounded-full" />
                                    </div>
                                  )}
                                  <div className="absolute inset-x-0 top-0 h-px bg-white/30 rounded-full pointer-events-none" />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* ── ZONE 2: Trim Pad (middle 30%) ── */}
                        <div
                          className="absolute left-0 right-0 overflow-hidden"
                          style={{
                            top: 42,
                            height: 42,
                            background: 'linear-gradient(180deg, #fff6f6 0%, #ffeaea 100%)',
                            borderBottom: '1px solid #fecaca',
                          }}
                        >
                          <div
                            className="absolute inset-0 opacity-25 pointer-events-none"
                            style={{
                              backgroundImage: 'radial-gradient(circle, #f87171 0.8px, transparent 0.8px)',
                              backgroundSize: '8px 8px',
                            }}
                          />
                          <div className="absolute left-1.5 top-0 bottom-0 flex items-center pointer-events-none z-10">
                            <span className="text-[7px] font-black uppercase tracking-widest text-rose-400/55 select-none">TRIM</span>
                          </div>

                          {duration > 0 && segments.filter(s => s.deleted).map(seg => {
                            const leftPct  = (seg.start / duration) * 100;
                            const widthPct = ((seg.end - seg.start) / duration) * 100;
                            const isSelected = selectedSegmentId === seg.id;
                            return (
                              <div
                                key={seg.id}
                                className="absolute top-1 bottom-1 z-30 select-none"
                                style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: 54 }}
                              >
                                <div
                                  className={`relative w-full h-full rounded-full flex items-center justify-between overflow-hidden transition-all duration-150 ${
                                    isSelected ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
                                  }`}
                                  style={{
                                    background: isSelected
                                      ? 'linear-gradient(90deg, #be123c, #e11d48, #fb7185)'
                                      : 'linear-gradient(90deg, #e11d4888, #fb718588, #fda4af88)',
                                    boxShadow: isSelected
                                      ? '0 2px 12px rgba(190,18,60,0.35), inset 0 1px 0 rgba(255,255,255,0.25)'
                                      : '0 1px 4px rgba(190,18,60,0.18), inset 0 1px 0 rgba(255,255,255,0.2)',
                                    border: isSelected ? '1.5px solid #e11d48' : '1px solid rgba(251,113,133,0.4)',
                                  }}
                                  onMouseDown={(e) => { setSelectedSegmentId(seg.id); setSelectedZoomId(null); setSidebarTab('clips'); handleSegmentSlide(e, seg.id); }}
                                >
                                  {/* Left resize grip */}
                                  {isSelected && (
                                    <div
                                      className="absolute left-0 top-0 bottom-0 w-2.5 flex items-center justify-center z-40 cursor-ew-resize rounded-l-full hover:bg-white/15"
                                      onMouseDown={(e) => handleLeftDrag(e, seg.id)}
                                    >
                                      <div className="w-[1.5px] h-3 bg-white/70 rounded-full" />
                                    </div>
                                  )}
                                  {/* Label */}
                                  <div className={`flex items-center gap-1 text-white min-w-0 z-10 ${isSelected ? 'ml-3 mr-1' : 'mx-2'}`}>
                                    <Scissors size={7} strokeWidth={2.5} className="shrink-0 opacity-90" />
                                    <span className="text-[8px] font-extrabold tracking-wide uppercase truncate opacity-90">Trim</span>
                                  </div>
                                  {/* Restore button */}
                                  <button
                                    className="shrink-0 mr-1 z-40 h-3.5 px-1.5 rounded-full bg-white/25 hover:bg-white/45 flex items-center justify-center text-white/90 text-[7px] font-extrabold leading-none tracking-wide uppercase transition gap-0.5"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => { e.stopPropagation(); restoreSegment(seg.id); }}
                                  >
                                    <RotateCcw size={6} strokeWidth={3} />
                                  </button>
                                  {/* Right resize grip */}
                                  {isSelected && (
                                    <div
                                      className="absolute right-0 top-0 bottom-0 w-2.5 flex items-center justify-center z-40 cursor-ew-resize rounded-r-full hover:bg-white/15"
                                      onMouseDown={(e) => handleRightDrag(e, seg.id)}
                                    >
                                      <div className="w-[1.5px] h-3 bg-white/70 rounded-full" />
                                    </div>
                                  )}
                                  <div className="absolute inset-x-0 top-0 h-px bg-white/30 rounded-full pointer-events-none" />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* ── ZONE 3: Clip Track (bottom 35%) ── */}
                        <div
                          className="absolute left-0 right-0 bottom-0"
                          style={{ top: 84 }}
                        >
                          {/* Drag-and-drop indicator */}
                          {dragOverTime !== null && (
                            <div
                              className="absolute top-0 bottom-0 w-0.5 border-l-2 border-dashed border-brand-accent pointer-events-none z-30"
                              style={{ left: `${(dragOverTime / duration) * 100}%` }}
                            >
                              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-brand-accent text-white text-[8px] font-mono rounded shadow font-semibold z-40">
                                {fmt(dragOverTime)}
                              </div>
                            </div>
                          )}

                          {/* Active Clip Segments only */}
                          {duration > 0 && segments.filter(s => !s.deleted).map(seg => {
                            const leftPct  = (seg.start / duration) * 100;
                            const widthPct = ((seg.end - seg.start) / duration) * 100;
                            const isSelected = selectedSegmentId === seg.id;
                            return (
                              <div
                                key={seg.id}
                                className={`absolute top-0 bottom-0 group transition-all duration-150 ${
                                  isSelected ? 'ring-2 ring-brand-accent ring-inset z-10' : ''
                                }`}
                                style={{
                                  left: `${leftPct}%`,
                                  width: `${widthPct}%`,
                                  background: isSelected ? 'rgba(217,107,67,0.9)' : 'rgba(217,107,67,0.72)',
                                  borderRight: '1.5px solid rgba(255,255,255,0.4)',
                                }}
                                onMouseDown={(e) => {
                                  setSelectedSegmentId(seg.id);
                                  setSelectedZoomId(null);
                                  setSidebarTab('clips');
                                  handleSegmentSlide(e, seg.id);
                                }}
                              >
                                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-extrabold select-none pointer-events-none uppercase tracking-wider text-white/90">
                                  Clip
                                </span>
                                {isSelected && (
                                  <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-brand-accent cursor-ew-resize flex items-center justify-center rounded-l-md z-30" onMouseDown={(e) => handleLeftDrag(e, seg.id)}>
                                    <div className="w-0.5 h-6 bg-white/80 rounded-full" />
                                  </div>
                                )}
                                {isSelected && (
                                  <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-brand-accent cursor-ew-resize flex items-center justify-center rounded-r-md z-30" onMouseDown={(e) => handleRightDrag(e, seg.id)}>
                                    <div className="w-0.5 h-6 bg-white/80 rounded-full" />
                                  </div>
                                )}
                                {seg.speed && seg.speed !== 1 && (
                                  <span className="absolute right-3 bottom-1.5 px-1 bg-black/40 text-[8px] font-mono text-white/80 rounded select-none">{seg.speed}x</span>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                                  <div className="pointer-events-auto">
                                    <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); deleteSegment(seg.id); }} className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold bg-white/90 text-red-500 shadow hover:bg-white">
                                      <Trash2 size={9} strokeWidth={2.5} />Delete
                                    </button>
                                  </div>
                                </div>
                                {widthPct > 12 && (
                                  <span className="absolute left-1.5 top-1.5 text-[8px] font-mono text-white/40 pointer-events-none select-none">{fmt(seg.start)}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Playhead — spans all three zones */}
                        {duration > 0 && (
                          <div
                            ref={playheadRef}
                            className="absolute top-0 bottom-0 w-0.5 z-40 pointer-events-none"
                            style={{ left: `${(currentTime / duration) * 100}%`, background: '#191919' }}
                          >
                            <div
                              className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full cursor-grab active:cursor-grabbing shadow-md border-2 border-white z-50 pointer-events-auto"
                              style={{ background: '#191919' }}
                              onMouseDown={handlePlayheadMouseDown}
                              title="Drag to scrub"
                            />
                            <div
                              className="absolute top-0 bottom-0 -left-2 w-5 cursor-grab active:cursor-grabbing z-40 pointer-events-auto"
                              onMouseDown={handlePlayheadMouseDown}
                            />
                          </div>
                        )}
                      </div>{/* end three-zone track */}
                    </div>{/* end zoomed-content wrapper */}
                  </div>{/* end timeline-tracks-viewport */}
                </div>{/* end timeline-track-container */}
              {/* ── Custom horizontal scroll slider ── */}
              {zoomLevel > 1 && (
                <div className="flex-none px-1 pb-1 pt-1.5">
                  <div className="relative h-3 flex items-center">
                    {/* Track background */}
                    <div className="absolute inset-y-1 inset-x-0 rounded-full bg-slate-200" />
                    {/* Filled portion */}
                    <div
                      className="absolute inset-y-1 left-0 rounded-full bg-slate-400/50 pointer-events-none"
                      style={{ width: `${timelineScrollPct}%` }}
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={0.1}
                      value={timelineScrollPct}
                      onChange={(e) => {
                        const pct = parseFloat(e.target.value);
                        setTimelineScrollPct(pct);
                        const el = viewportRef.current;
                        if (el) {
                          const max = el.scrollWidth - el.clientWidth;
                          el.scrollLeft = (pct / 100) * max;
                        }
                      }}
                      className="relative w-full h-full appearance-none bg-transparent cursor-pointer"
                      style={{
                        // Custom thumb via inline CSS so no Tailwind purge issues
                        WebkitAppearance: 'none',
                      }}
                      id="timeline-scroll-slider"
                    />
                  </div>
                </div>
              )}
              </div>{/* end timeline-row-wrapper */}
            </div>{/* end inner flex col */}
          </div>{/* end editor-timeline */}

        </div>{/* end left column */}

        {/* ── Settings Sidebar (Tabbed layout) ── */}
        <div
          className="flex-none flex flex-col bg-brand-card border-l border-brand-border overflow-hidden"
          style={{ width: 280 }}
          id="editor-sidebar"
        >
          {/* Tab selectors */}
          <div className="flex items-center space-x-1 bg-brand-surface p-1 rounded-lg border border-brand-border mx-3 mt-3">
            <button
              onClick={() => setSidebarTab('style')}
              className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                sidebarTab === 'style' ? 'bg-brand-text text-brand-bg shadow-sm font-semibold' : 'text-brand-text-muted hover:text-brand-text'
              }`}
            >
              <Sparkles size={11} />
              <span>Style</span>
            </button>
            <button
              onClick={() => setSidebarTab('audio')}
              className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                sidebarTab === 'audio' ? 'bg-brand-text text-brand-bg shadow-sm font-semibold' : 'text-brand-text-muted hover:text-brand-text'
              }`}
            >
              <Music size={11} />
              <span>Audio</span>
            </button>
            <button
              onClick={() => setSidebarTab('clips')}
              className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                sidebarTab === 'clips' ? 'bg-brand-text text-brand-bg shadow-sm font-semibold' : 'text-brand-text-muted hover:text-brand-text'
              }`}
            >
              <Scissors size={11} />
              <span>Clips</span>
            </button>
            <button
              onClick={() => setSidebarTab('zoom')}
              className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                sidebarTab === 'zoom' ? 'bg-brand-text text-brand-bg shadow-sm font-semibold' : 'text-brand-text-muted hover:text-brand-text'
              }`}
            >
              <MousePointer size={11} />
              <span>Effects</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">

            {/* TAB 1: STYLE SETTINGS */}
            {sidebarTab === 'style' && (
              <div className="space-y-6 animate-fade-in">
                {/* Platform canvas sizes */}
                <section>
                  <h3 className="text-[9px] font-bold tracking-widest text-brand-text-muted/60 uppercase mb-3 block">Canvas Size</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {PLATFORMS.map(p => {
                      const active = platform === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => { setPlatform(p.id); saveHistoryState(); }}
                          className={`flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all text-[11px] font-medium ${
                            active
                              ? 'bg-brand-accent/10 border-brand-accent text-brand-accent shadow-sm'
                              : 'bg-brand-surface border-brand-border text-brand-text-muted hover:border-brand-text/20'
                          }`}
                        >
                          <span className="font-semibold">{p.label.split(' ')[0]}</span>
                          <span className="text-[9px] text-brand-text-muted/50 mt-0.5">{p.label.split(' ')[1]}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <div className="h-px bg-brand-border" />

                {/* Card formatting */}
                <section>
                  <h3 className="text-[9px] font-bold tracking-widest text-brand-text-muted/60 uppercase mb-4">Frame Style</h3>
                  <div className="space-y-5">
                    <Slider label="Padding"       value={padding}         min={0}  max={20}  step={1} unit="%" onChange={setPadding} onChangeEnd={saveHistoryState} />
                    <Slider label="Corner Radius" value={cornerRadius}    min={0}  max={50}  step={1}       onChange={setCornerRadius} onChangeEnd={saveHistoryState} />
                    <Slider label="Shadow Depth"  value={shadowIntensity} min={0}  max={100} step={5} unit="%" onChange={setShadowIntensity} onChangeEnd={saveHistoryState} />
                    <Toggle label="Window Chrome" value={showChrome} onChange={(v) => { setShowChrome(v); saveHistoryState(); }} />
                    <Toggle label="MacBook Device Frame" value={deviceFrame} onChange={(v) => { setDeviceFrame(v); saveHistoryState(); }} />
                  </div>
                </section>

                <div className="h-px bg-brand-border" />

                {/* Background formatting */}
                <section className="space-y-4">
                  <h3 className="text-[9px] font-bold tracking-widest text-brand-text-muted/60 uppercase block">Backdrop Background</h3>
                  
                  <Toggle label="Glassmorphic Video Blur" value={blurBackground} onChange={(v) => { setBlurBackground(v); saveHistoryState(); }} />
                  
                  {blurBackground && (
                    <Slider label="Blur Intensity" value={blurIntensity} min={0} max={40} step={1} unit="px" onChange={setBlurIntensity} onChangeEnd={saveHistoryState} />
                  )}

                  <div className="h-px bg-brand-border/40 my-3" />

                  <label className="text-[10px] text-brand-text-muted block font-medium">Preset Images</label>
                  <div className="grid grid-cols-5 gap-2 mt-1">
                    {PRESETS.map(preset => {
                      const active = !blurBackground && selectedBg === preset.id;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => {
                            setSelectedBg(preset.id);
                            setBlurBackground(false);
                            saveHistoryState(undefined, undefined, { selectedBg: preset.id, blurBackground: false });
                          }}
                          className="flex flex-col items-center gap-1 group"
                          title={preset.label}
                        >
                          <div
                            className="w-full flex items-center justify-center transition-all duration-150 rounded-lg hover:scale-105"
                            style={{
                              aspectRatio: '1',
                              background: preset.thumbnailCss,
                              outline: active ? '2px solid #D96B43' : '1px solid #E6E1D8',
                              outlineOffset: active ? 1 : 0,
                            }}
                          >
                            {active && (
                              <div className="w-3.5 h-3.5 rounded-full bg-white/20 flex items-center justify-center">
                                <Check size={8} color="white" strokeWidth={3.5} />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {/* TAB 2: AUDIO SETTINGS */}
            {sidebarTab === 'audio' && (
              <div className="space-y-6 animate-fade-in">
                <section className="space-y-4">
                  <h3 className="text-[9px] font-bold tracking-widest text-brand-text-muted/60 uppercase">Vocal Enhancer</h3>
                  <div className="p-3 bg-brand-surface border border-brand-border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Sparkles size={14} className="text-brand-accent" />
                        <span className="text-xs font-semibold text-brand-text">Studio Mic Enhancement</span>
                      </div>
                      <button
                        onClick={() => { setMicEnhanced(!micEnhanced); saveHistoryState(); }}
                        className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none ${micEnhanced ? 'bg-brand-accent' : 'bg-brand-border'}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${micEnhanced ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                    <p className="text-[10px] text-brand-text-muted leading-relaxed">
                      Removes room reverb, background noise, keyboard clicks, and boosts vocal presence dynamically.
                    </p>
                  </div>
                </section>

                <div className="h-px bg-brand-border" />

                <section className="space-y-4">
                  <h3 className="text-[9px] font-bold tracking-widest text-brand-text-muted/60 uppercase">Background Music</h3>
                  <div>
                    <label className="text-[10px] text-brand-text-muted block mb-1.5 font-medium">Select Track</label>
                    <select
                      value={bgMusicId}
                      onChange={(e) => { setBgMusicId(e.target.value); saveHistoryState(); }}
                      className="w-full p-2 rounded-lg bg-brand-surface border border-brand-border text-xs text-brand-text focus:outline-none focus:border-brand-accent font-medium"
                    >
                      {musicTracks.map(track => (
                        <option key={track.id} value={track.id}>{track.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-2">
                    <label className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-brand-border hover:border-brand-text/30 cursor-pointer text-[11px] text-brand-text-muted bg-brand-surface/40 hover:bg-brand-surface transition-all font-semibold">
                      <Plus size={12} />
                      <span>Import Audio File</span>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={handleAudioUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {bgMusicId !== 'none' && (
                    <Slider
                      label="Music Volume"
                      value={bgMusicVolume}
                      min={0}
                      max={100}
                      step={5}
                      unit="%"
                      onChange={setBgMusicVolume}
                      onChangeEnd={saveHistoryState}
                    />
                  )}
                </section>
              </div>
            )}

            {/* TAB 3: CLIP EDITING & SPEEDS */}
            {sidebarTab === 'clips' && (
              <div className="space-y-6 animate-fade-in">
                <section className="space-y-4">
                  <h3 className="text-[9px] font-bold tracking-widest text-brand-text-muted/60 uppercase">Speed Control</h3>
                  {selectedSegmentId ? (
                    (() => {
                      const selectedSeg = segments.find(s => s.id === selectedSegmentId);
                      if (!selectedSeg) return null;
                      
                      return (
                        <div className="space-y-4 p-3 bg-brand-surface border border-brand-border rounded-lg">
                          <div>
                            <span className="text-[10px] text-brand-text-muted block font-mono">Clip Boundaries</span>
                            <div className="flex justify-between items-center text-xs mt-1 text-brand-text font-semibold">
                              <span>Start: {fmt(selectedSeg.start)}</span>
                              <span>End: {fmt(selectedSeg.end)}</span>
                            </div>
                            <span className="text-[9px] text-brand-text-muted/50 mt-1 block">Drag the handles on the timeline for fine cropping.</span>
                          </div>

                          <div className="h-px bg-brand-border" />

                          <div>
                            <span className="text-[10px] text-brand-text-muted block mb-2 font-medium">Playback Speed</span>
                            <div className="grid grid-cols-3 gap-1">
                              {[0.5, 1.0, 1.25, 1.5, 2.0, 4.0].map(s => {
                                const active = (selectedSeg.speed || 1.0) === s;
                                return (
                                  <button
                                    key={s}
                                    onClick={() => {
                                      const next = segments.map(seg => seg.id === selectedSegmentId ? { ...seg, speed: s } : seg);
                                      setSegments(next);
                                      saveHistoryState(next);
                                    }}
                                    className={`py-1 text-center rounded border font-mono text-[10px] font-semibold transition ${
                                      active
                                        ? 'bg-brand-accent text-white border-brand-accent'
                                        : 'bg-brand-card border-brand-border text-brand-text-muted hover:border-brand-text/25'
                                    }`}
                                  >
                                    {s}x
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="h-px bg-brand-border" />

                          <button
                            onClick={() => {
                              if (selectedSeg.deleted) restoreSegment(selectedSegmentId);
                              else deleteSegment(selectedSegmentId);
                            }}
                            className={`w-full py-1.5 rounded-lg text-xs font-semibold text-center border transition ${
                              selectedSeg.deleted
                                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500 hover:bg-emerald-500/25'
                                : 'bg-rose-500/10 border-rose-500/25 text-rose-500 hover:bg-rose-500/25'
                            }`}
                          >
                            {selectedSeg.deleted ? 'Restore Clip Segment' : 'Delete Clip Segment'}
                          </button>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 bg-brand-surface border border-brand-border border-dashed rounded-lg text-center text-brand-text-muted">
                      <Scissors size={18} className="opacity-40 mb-1.5" />
                      <span className="text-[11px] font-medium">No segment selected</span>
                      <span className="text-[9px] text-brand-text-muted/60 mt-1 max-w-[160px] leading-relaxed">
                        Click on any segment in the timeline track below to adjust its crop margins and speed.
                      </span>
                    </div>
                  )}
                </section>

                <div className="h-px bg-brand-border" />

                <section className="space-y-4">
                  <h3 className="text-[9px] font-bold tracking-widest text-brand-text-muted/60 uppercase">Timeline Tools</h3>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", "tool-skip");
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className="flex items-center gap-3 p-3 bg-brand-surface hover:bg-brand-surface/80 border border-brand-border border-dashed rounded-lg cursor-grab active:cursor-grabbing transition animate-fade-in"
                  >
                    <div className="p-2 bg-rose-500/10 text-rose-500 rounded-lg">
                      <Scissors size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-brand-text block">Cut & Skip Tool</span>
                      <span className="text-[9px] text-brand-text-muted block mt-0.5">Drag & drop onto timeline to skip a section</span>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* TAB 4: CURSOR EFFECTS & ZOOM EDITOR */}
            {sidebarTab === 'zoom' && (
              <div className="space-y-6 animate-fade-in">
                {/* Visual cursor settings */}
                <section className="space-y-3">
                  <h3 className="text-[9px] font-bold tracking-widest text-brand-text-muted/60 uppercase">Cursor style</h3>
                  <div className="space-y-3.5 p-3 bg-brand-surface border border-brand-border rounded-lg">
                    <Toggle label="Render Custom macOS Pointer" value={showCursor} onChange={(v) => { setShowCursor(v); saveHistoryState(); }} />
                    <Toggle label="Click Ripple Highlights" value={clickHighlights} onChange={(v) => { setClickHighlights(v); saveHistoryState(); }} />
                    <Toggle label="Cinematic Motion Blur" value={motionBlur} onChange={(v) => { setMotionBlur(v); saveHistoryState(); }} />
                    
                    {showCursor && (
                      <>
                        <div className="h-px bg-brand-border/40 my-2" />
                        <Slider
                          label="Cursor Size"
                          value={cursorSize}
                          min={0.5}
                          max={3.0}
                          step={0.1}
                          unit="x"
                          onChange={setCursorSize}
                          onChangeEnd={saveHistoryState}
                        />
                        <Slider
                          label="Cursor Smoothing"
                          value={cursorSmoothing}
                          min={0}
                          max={10}
                          step={1}
                          unit=""
                          onChange={setCursorSmoothing}
                          onChangeEnd={saveHistoryState}
                        />
                      </>
                    )}
                  </div>
                </section>

                <div className="h-px bg-brand-border" />

                {/* Auto Zoom Editor */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[9px] font-bold tracking-widest text-brand-text-muted/60 uppercase">Zoom effects</h3>
                    <span className="px-1.5 py-0.5 rounded bg-brand-surface border border-brand-border text-[9px] font-mono text-brand-text-muted">
                      {zoomEffects.length} active
                    </span>
                  </div>

                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", "tool-zoom");
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className="flex items-center gap-3 p-3 bg-brand-surface hover:bg-brand-surface/80 border border-brand-border border-dashed rounded-lg cursor-grab active:cursor-grabbing transition mb-3 animate-fade-in"
                  >
                    <div className="p-2 bg-brand-accent/10 text-brand-accent rounded-lg">
                      <Plus size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-brand-text block">Zoom Effect Tool</span>
                      <span className="text-[9px] text-brand-text-muted block mt-0.5">Drag & drop onto timeline to place zoom</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const newZoom: ZoomEffect = {
                        id: `zoom-${Date.now()}`,
                        time: currentTime,
                        duration: 2.0,
                        zoomLevel: 1.6,
                        x: 0.5,
                        y: 0.5,
                        cursorFollowing: true,
                        enabled: true
                      };
                      const nextZooms = [...zoomEffects, newZoom];
                      setZoomEffects(nextZooms);
                      saveHistoryState(undefined, nextZooms);
                      triggerToast("Zoom effect added at " + fmt(currentTime), "success");
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-brand-accent text-white hover:bg-brand-accent-hover text-xs font-semibold transition"
                  >
                    <Plus size={13} />
                    Add Zoom at {fmt(currentTime)}
                  </button>

                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {zoomEffects.length === 0 ? (
                      <div className="p-4 bg-brand-surface border border-brand-border border-dashed rounded-lg text-center text-[10px] text-brand-text-muted">
                        No zoom keyframes added yet.
                      </div>
                    ) : (
                      zoomEffects.map((z, idx) => {
                        const isCardSelected = selectedZoomId === z.id;
                        return (
                          <div
                            key={z.id}
                            onClick={() => {
                              setSelectedZoomId(z.id);
                              setSelectedSegmentId(null);
                              const video = videoRef.current;
                              if (video) {
                                video.currentTime = z.time + 0.05;
                                setCurrentTime(z.time + 0.05);
                                renderFrame();
                              }
                            }}
                            className={`p-2.5 bg-brand-surface border rounded-lg space-y-2 relative cursor-pointer transition-colors ${
                              isCardSelected ? 'border-brand-accent shadow-sm ring-1 ring-brand-accent/20' : 'border-brand-border hover:border-brand-accent/40'
                            }`}
                          >
                          <button
                            onClick={() => {
                              const next = zoomEffects.filter(itm => itm.id !== z.id);
                              setZoomEffects(next);
                              saveHistoryState(undefined, next);
                              triggerToast("Zoom effect removed", "info");
                            }}
                            className="absolute top-2 right-2 text-brand-text-muted hover:text-rose-500 transition"
                          >
                            <Trash2 size={11} />
                          </button>

                          <div className="flex justify-between items-center text-[10px] font-semibold text-brand-text">
                            <span>Effect #{idx + 1} at {fmt(z.time)}</span>
                          </div>

                          <div className="space-y-2 pt-1.5 border-t border-brand-border/40">
                            <Slider
                              label="Zoom Factor"
                              value={z.zoomLevel}
                              min={0.5}
                              max={3.0}
                              step={0.1}
                              unit="x"
                              onChange={(v) => {
                                const next = zoomEffects.map(itm => itm.id === z.id ? { ...itm, zoomLevel: v } : itm);
                                setZoomEffects(next);
                              }}
                              onChangeEnd={saveHistoryState}
                            />
                            <Slider
                              label="Duration"
                              value={z.duration}
                              min={0.5}
                              max={5.0}
                              step={0.1}
                              unit="s"
                              onChange={(v) => {
                                const next = zoomEffects.map(itm => itm.id === z.id ? { ...itm, duration: v } : itm);
                                setZoomEffects(next);
                              }}
                              onChangeEnd={saveHistoryState}
                            />
                            <div className="flex items-center justify-between text-[10px] text-brand-text-muted">
                              <span>Track cursor position</span>
                              <button
                                onClick={() => {
                                  const next = zoomEffects.map(itm => itm.id === z.id ? { ...itm, cursorFollowing: !itm.cursorFollowing } : itm);
                                  setZoomEffects(next);
                                  saveHistoryState(undefined, next);
                                }}
                                className={`relative w-8 h-4 rounded-full transition-colors ${z.cursorFollowing ? 'bg-brand-accent' : 'bg-brand-border'}`}
                              >
                                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${z.cursorFollowing ? 'left-4.5' : 'left-0.5'}`} />
                              </button>
                            </div>

                            {!z.cursorFollowing && (
                              <div className="space-y-2 mt-2 pt-1 border-t border-brand-border/20 animate-fade-in">
                                <Slider
                                  label="Zoom Center X"
                                  value={Math.round(z.x * 100)}
                                  min={0}
                                  max={100}
                                  step={1}
                                  unit="%"
                                  onChange={(v) => {
                                    const next = zoomEffects.map(itm => itm.id === z.id ? { ...itm, x: v / 100 } : itm);
                                    setZoomEffects(next);
                                  }}
                                  onChangeEnd={saveHistoryState}
                                />
                                <Slider
                                  label="Zoom Center Y"
                                  value={Math.round(z.y * 100)}
                                  min={0}
                                  max={100}
                                  step={1}
                                  unit="%"
                                  onChange={(v) => {
                                    const next = zoomEffects.map(itm => itm.id === z.id ? { ...itm, y: v / 100 } : itm);
                                    setZoomEffects(next);
                                  }}
                                  onChangeEnd={saveHistoryState}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                    )}
                  </div>
                </section>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Hidden video */}
      <video
        ref={videoRef}
        src={recording.url}
        preload="auto"
        playsInline
        className="absolute opacity-0 pointer-events-none"
        style={{ width: 1, height: 1 }}
        id="editor-video-source"
      />

      {/* Beautiful custom confirmation alert modal when leaving the editor */}
      {showBackConfirm && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-sm w-full p-6 flex flex-col items-center text-center gap-4 animate-scale-up">
            
            {/* Warning Icon Badge */}
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100">
              <AlertTriangle size={22} />
            </div>

            {/* Typography */}
            <div className="flex flex-col gap-1.5">
              <h3 className="text-[15px] font-bold text-slate-800 leading-tight">
                Discard unsaved changes?
              </h3>
              <p className="text-[12px] text-slate-500 leading-normal">
                Any edits, splits, vocal enhancements, or zoom keyframes you've added to this project will be permanently lost.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 w-full mt-2">
              <button
                onClick={() => setShowBackConfirm(false)}
                className="flex-1 py-2 px-4 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50 active:bg-slate-100 transition shadow-sm"
              >
                Keep Editing
              </button>
              <button
                onClick={() => {
                  setShowBackConfirm(false);
                  onBack();
                }}
                className="flex-1 py-2 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs rounded-xl transition shadow-md shadow-rose-600/10"
              >
                Discard Changes
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Elegant toast notification overlay */}
      {toast && (
        <div className="fixed bottom-6 right-6 flex items-center space-x-2 px-3.5 py-2.5 bg-brand-text text-brand-bg text-xs rounded-lg shadow-lg z-50 animate-fade-in font-medium">
          <span className={`w-1.5 h-1.5 rounded-full ${toast.type === 'success' ? 'bg-emerald-400' : toast.type === 'error' ? 'bg-rose-400' : 'bg-brand-accent'}`} />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
