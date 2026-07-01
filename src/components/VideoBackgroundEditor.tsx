import React, { useState, useRef, useEffect } from 'react';
import { RecordingItem } from '../types';
import { 
  Play, 
  Pause, 
  ArrowLeft,
  Settings,
  MoreVertical,
  Volume2,
  VolumeX,
  Plus,
  RotateCcw,
  Undo2,
  Redo2,
  Trash2,
  Sparkles,
  Check,
  Upload,
  AlertCircle,
  RefreshCw,
  Search,
  ChevronDown,
  Scissors,
  Image as ImageIcon,
  Palette,
  Paintbrush,
  EyeOff
} from 'lucide-react';

interface VideoBackgroundEditorProps {
  recording: RecordingItem;
  onSaveWithBackground: (bgBlob: Blob, duration: number, name: string) => void;
  onBack: () => void;
}

export type AspectRatioId = 'original' | '16-9' | '9-16' | '1-1';
export type WindowChromeId = 'none' | 'macos-dark' | 'macos-light' | 'windows-dark' | 'windows-light';
export type ImageBlurLevel = 'none' | 'low' | 'moderate' | 'high';
export type BackgroundTypeTab = 'image' | 'gradient' | 'color' | 'none';

export interface TimelineSegment {
  id: string;
  type: 'trim' | 'zoom';
  start: number;
  end: number;
  zoomScale?: number;
}

interface BackgroundPreset {
  id: string;
  name: string;
  type: 'image' | 'gradient' | 'color';
  style: string; // for HTML preview CSS background
  primaryColor: string; // gradient description / thumbnail representation
}

// Beautiful preset list mapping to the UI mockup and designer requirements
const PRESETS: BackgroundPreset[] = [
  // --- IMAGES ---
  { id: 'macos-sonoma', name: 'macOS Sonoma', type: 'image', style: 'bg-gradient-to-br from-[#ff5e62] to-[#ff9966]', primaryColor: 'linear-gradient(135deg, #ff5e62, #ff9966, #7f00ff)' },
  { id: 'macos-dark-wave', name: 'macOS Dark Wave', type: 'image', style: 'bg-[#100624]', primaryColor: 'linear-gradient(135deg, #100624, #1b0728, #05010c)' },
  { id: 'windows-11-bloom', name: 'Win 11 Bloom', type: 'image', style: 'bg-gradient-to-br from-[#e6f0fa] to-[#b5d4f3]', primaryColor: 'linear-gradient(135deg, #e6f0fa, #b5d4f3, #4a90e2)' },
  { id: 'windows-11-dark', name: 'Win 11 Dark', type: 'image', style: 'bg-[#090e1a]', primaryColor: 'linear-gradient(135deg, #090e1a, #010307, #1e40af)' },
  { id: 'windows-xp-bliss', name: 'Bliss Hill (XP)', type: 'image', style: 'bg-gradient-to-br from-[#2a72e5] to-[#48c6ef]', primaryColor: 'linear-gradient(135deg, #2a72e5, #48c6ef, #4cd964)' },
  { id: 'minimal-studio', name: 'Studio Gray', type: 'image', style: 'bg-gradient-to-br from-[#f8fafc] to-[#cbd5e1]', primaryColor: 'linear-gradient(135deg, #f8fafc, #cbd5e1)' },
  
  // --- GRADIENTS ---
  { id: 'sunset-aurora', name: 'Sunset Aurora', type: 'gradient', style: 'bg-gradient-to-r from-[#f12711] to-[#f5af19]', primaryColor: 'linear-gradient(135deg, #f12711, #f5af19)' },
  { id: 'glassmorphism-blue', name: 'Aero Blue', type: 'gradient', style: 'bg-gradient-to-br from-[#00c6ff] to-[#0072ff]', primaryColor: 'linear-gradient(135deg, #00c6ff, #0072ff)' },
  { id: 'emerald-fusion', name: 'Royal Emerald', type: 'gradient', style: 'bg-gradient-to-br from-[#11998e] to-[#38ef7d]', primaryColor: 'linear-gradient(135deg, #11998e, #38ef7d)' },
  { id: 'neon-purple', name: 'Laser Neon', type: 'gradient', style: 'bg-gradient-to-br from-[#ec008c] to-[#fc6767]', primaryColor: 'linear-gradient(135deg, #ec008c, #fc6767)' },
  { id: 'cosmic-void', name: 'Deep Nebula', type: 'gradient', style: 'bg-gradient-to-br from-[#450a0a] to-[#030712]', primaryColor: 'linear-gradient(135deg, #450a0a, #030712)' },
  { id: 'tokyo-cyber', name: 'Tokyo Cyber', type: 'gradient', style: 'bg-gradient-to-br from-[#ff007f] to-[#7f00ff]', primaryColor: 'linear-gradient(135deg, #ff007f, #7f00ff)' },
  
  // --- COLORS ---
  { id: 'flat-white', name: 'Pure White', type: 'color', style: 'bg-white', primaryColor: '#ffffff' },
  { id: 'flat-black', name: 'Dark Charcoal', type: 'color', style: 'bg-zinc-900', primaryColor: '#18181b' },
  { id: 'flat-slate', name: 'Slate Gray', type: 'color', style: 'bg-slate-500', primaryColor: '#64748b' },
  { id: 'flat-lavender', name: 'Aesthetic Lavender', type: 'color', style: 'bg-purple-100', primaryColor: '#f3e8ff' },
  { id: 'flat-sage', name: 'Warm Sage', type: 'color', style: 'bg-[#cbd5e1]', primaryColor: '#cbd5e1' },
];

export default function VideoBackgroundEditor({ recording, onSaveWithBackground, onBack }: VideoBackgroundEditorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  
  // Customization States
  const [aspectRatio, setAspectRatio] = useState<AspectRatioId>('original');
  const [activeTab, setActiveTab] = useState<BackgroundTypeTab>('image');
  const [selectedBg, setSelectedBg] = useState<string>('macos-sonoma');
  const [imageBlur, setImageBlur] = useState<ImageBlurLevel>('none');
  const [paddingSize, setPaddingSize] = useState(40); // 10px to 120px (represents margins around video)
  const [cornerRadius, setCornerRadius] = useState(16); // video border radius
  const [shadowIntensity, setShadowIntensity] = useState(40); // outer shadow
  const [windowChrome, setWindowChrome] = useState<WindowChromeId>('macos-dark');
  const [zoomLevel, setZoomLevel] = useState(5); // default zoom index

  // Custom Background State
  const [customImageEl, setCustomImageEl] = useState<HTMLImageElement | null>(null);
  const [customImageName, setCustomImageName] = useState<string | null>(null);

  // Audio / Sound State
  const [isMuted, setIsMuted] = useState(false);

  // Player / Render Loop States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(recording.duration || 15);
  const [videoWidth, setVideoWidth] = useState(1920);
  const [videoHeight, setVideoHeight] = useState(1080);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);

  // Timeline Segments States
  const [segments, setSegments] = useState<TimelineSegment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  // CapCut-Style scrollable timeline states & refs
  const timelineViewportRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);

  // Interaction flags and timers to completely prevent recursive feedback loops and performance freezes
  const isUserInteracting = useRef(false);
  const scrollTimeoutRef = useRef<any>(null);
  const lastSeekTime = useRef(0);
  const pendingSeekTimeout = useRef<any>(null);

  const pxPerSec = zoomLevel * 20;

  // Throttled video seeking to prevent overwhelming the browser's video decoder thread
  const throttledSeek = (time: number) => {
    const now = Date.now();
    if (pendingSeekTimeout.current) {
      clearTimeout(pendingSeekTimeout.current);
    }

    if (now - lastSeekTime.current > 60) {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
      }
      lastSeekTime.current = now;
    } else {
      pendingSeekTimeout.current = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
        lastSeekTime.current = Date.now();
      }, 60);
    }
  };

  // Sync scroll position when currentTime changes programmatically (e.g., during playback)
  useEffect(() => {
    if (timelineViewportRef.current && !isUserInteracting.current) {
      const targetScrollLeft = currentTime * pxPerSec;
      if (Math.abs(timelineViewportRef.current.scrollLeft - targetScrollLeft) > 3) {
        timelineViewportRef.current.scrollLeft = targetScrollLeft;
      }
    }
  }, [currentTime, pxPerSec]);

  // Global mouse event listener for robust drag-to-scroll scrubbing
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        const dx = e.clientX - startX.current;
        if (timelineViewportRef.current) {
          timelineViewportRef.current.scrollLeft = startScrollLeft.current - dx;
        }
      }
    };
    const handleWindowMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          isUserInteracting.current = false;
        }, 150);
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      if (pendingSeekTimeout.current) clearTimeout(pendingSeekTimeout.current);
    };
  }, []);

  const handleViewportScroll = () => {
    if (timelineViewportRef.current && duration) {
      // Only process scroll events that are initiated by active user interaction
      if (!isUserInteracting.current && !isDragging.current) {
        return;
      }

      const scrollLeft = timelineViewportRef.current.scrollLeft;
      const newTime = Math.max(0, Math.min(duration, scrollLeft / pxPerSec));
      
      // Pause playback if user manually scrolls/seeks the timeline
      if (isPlaying) {
        if (videoRef.current) {
          videoRef.current.pause();
        }
        setIsPlaying(false);
      }

      setCurrentTime(newTime);
      throttledSeek(newTime);
    }
  };

  const handleWheel = () => {
    isUserInteracting.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isUserInteracting.current = false;
    }, 250);
  };

  const handleTouchStart = () => {
    isUserInteracting.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
  };

  const handleTouchEnd = () => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isUserInteracting.current = false;
    }, 150);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left-click
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select')) return;

    isDragging.current = true;
    startX.current = e.clientX;
    startScrollLeft.current = timelineViewportRef.current?.scrollLeft || 0;

    // Pause on drag-seek to give precise CapCut feeling
    if (isPlaying && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const calculateTickInterval = (pxPerSec: number) => {
    if (pxPerSec >= 150) return 0.5;
    if (pxPerSec >= 80) return 1;
    if (pxPerSec >= 40) return 2;
    if (pxPerSec >= 20) return 5;
    return 10;
  };

  const handleAddTrimSegment = () => {
    const start = currentTime;
    const end = Math.min(duration, currentTime + 2);
    const newSegment: TimelineSegment = {
      id: `seg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: 'trim',
      start,
      end,
    };
    setSegments(prev => [...prev, newSegment]);
    setSelectedSegmentId(newSegment.id);
  };

  const handleAddZoomSegment = () => {
    const start = currentTime;
    const end = Math.min(duration, currentTime + 2);
    const newSegment: TimelineSegment = {
      id: `seg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: 'zoom',
      start,
      end,
      zoomScale: 1.4,
    };
    setSegments(prev => [...prev, newSegment]);
    setSelectedSegmentId(newSegment.id);
  };

  const handleDeleteSegment = (id: string) => {
    setSegments(prev => prev.filter(seg => seg.id !== id));
    if (selectedSegmentId === id) {
      setSelectedSegmentId(null);
    }
  };

  const handleAdjustSegmentTime = (id: string, field: 'start' | 'end', delta: number) => {
    setSegments(prev => prev.map(seg => {
      if (seg.id !== id) return seg;
      if (field === 'start') {
        const newStart = Math.max(0, Math.min(seg.end - 0.2, seg.start + delta));
        return { ...seg, start: Number(newStart.toFixed(1)) };
      } else {
        const newEnd = Math.max(seg.start + 0.2, Math.min(duration, seg.end + delta));
        return { ...seg, end: Number(newEnd.toFixed(1)) };
      }
    }));
  };

  const handleAdjustZoomScale = (id: string, scale: number) => {
    setSegments(prev => prev.map(seg => {
      if (seg.id !== id) return seg;
      return { ...seg, zoomScale: scale };
    }));
  };

  // Filter presets based on selected tab
  const filteredPresets = PRESETS.filter(p => p.type === activeTab);

  // Sync video duration when loaded
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || recording.duration || 15);
      if (videoRef.current.videoWidth) {
        setVideoWidth(videoRef.current.videoWidth);
        setVideoHeight(videoRef.current.videoHeight);
      }
    }
  };

  // Robustly verify and set metadata on mount/recording change
  useEffect(() => {
    if (videoRef.current) {
      try {
        videoRef.current.load();
      } catch (e) {
        console.warn('Failed to load video on mount/change', e);
      }
      if (videoRef.current.readyState >= 1) {
        setDuration(videoRef.current.duration || recording.duration || 15);
        if (videoRef.current.videoWidth) {
          setVideoWidth(videoRef.current.videoWidth);
          setVideoHeight(videoRef.current.videoHeight);
        }
      }
    }
  }, [recording]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(e => console.log('Playback blocked', e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  };

  // Synchronize underlying video element muted property with React state to bypass standard React muted state sync issues
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Custom Image Upload handler
  const triggerCustomImageUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleCustomImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      img.onload = () => {
        setCustomImageEl(img);
        setCustomImageName(file.name);
        setSelectedBg('custom-image');
      };
    }
  };

  // Canvas drawing logic for a single frame
  const drawFrameToCanvas = (
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    videoEl: HTMLVideoElement | null,
    currentStyle: string,
    paddingVal: number,
    chromeStyle: WindowChromeId,
    radius: number,
    shadowBlurVal: number,
    blurLevel: ImageBlurLevel,
    isActiveZoom?: boolean,
    activeZoomScale?: number
  ) => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Force high quality smoothing for crisp and clear video scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Save context for entire background rendering
    ctx.save();

    // --- Apply Blur Filter (Standard HTML Canvas blur) ---
    if (blurLevel !== 'none') {
      const blurAmount = blurLevel === 'low' ? 12 : blurLevel === 'moderate' ? 28 : 60;
      ctx.filter = `blur(${blurAmount}px)`;
    }

    // --- 1. DRAW BACKGROUND BACKDROP ---
    if (activeTab === 'none') {
      // Dark/Transparent default
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
    else if (currentStyle === 'custom-image' && customImageEl) {
      // Center crop-fill uploaded image
      const imgRatio = customImageEl.width / customImageEl.height;
      const canvasRatio = canvasWidth / canvasHeight;
      let drawW = canvasWidth;
      let drawH = canvasHeight;
      let drawX = 0;
      let drawY = 0;

      if (imgRatio > canvasRatio) {
        drawW = canvasHeight * imgRatio;
        drawX = (canvasWidth - drawW) / 2;
      } else {
        drawH = canvasWidth / imgRatio;
        drawY = (canvasHeight - drawH) / 2;
      }
      ctx.drawImage(customImageEl, drawX, drawY, drawW, drawH);
    }
    else {
      // Preset background renderers
      if (currentStyle === 'macos-sonoma') {
        const grad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
        grad.addColorStop(0, '#ff5e62');
        grad.addColorStop(0.3, '#ff9966');
        grad.addColorStop(0.7, '#7f00ff');
        grad.addColorStop(1, '#00f2fe');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Warm organic ambient bloom centers
        ctx.fillStyle = 'rgba(255, 230, 100, 0.45)';
        ctx.beginPath();
        ctx.arc(canvasWidth * 0.7, canvasHeight * 0.2, canvasWidth * 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
        ctx.beginPath();
        ctx.arc(canvasWidth * 0.2, canvasHeight * 0.8, canvasWidth * 0.35, 0, Math.PI * 2);
        ctx.fill();
      } 
      else if (currentStyle === 'macos-dark-wave') {
        const grad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
        grad.addColorStop(0, '#100624');
        grad.addColorStop(0.5, '#05010c');
        grad.addColorStop(1, '#1b0728');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        ctx.fillStyle = 'rgba(219, 39, 119, 0.18)';
        ctx.beginPath();
        ctx.arc(canvasWidth * 0.8, canvasHeight * 0.6, canvasWidth * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      else if (currentStyle === 'windows-11-bloom') {
        const grad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
        grad.addColorStop(0, '#e6f0fa');
        grad.addColorStop(1, '#b5d4f3');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Simulated swirl bloom lines
        ctx.save();
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        for (let i = 0; i < 12; i++) {
          ctx.rotate((Math.PI * 2) / 12);
          ctx.fillStyle = i % 2 === 0 ? 'rgba(74, 144, 226, 0.15)' : 'rgba(92, 184, 253, 0.25)';
          ctx.beginPath();
          ctx.ellipse(0, -canvasHeight * 0.15, canvasWidth * 0.08, canvasHeight * 0.22, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      else if (currentStyle === 'windows-11-dark') {
        const grad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
        grad.addColorStop(0, '#090e1a');
        grad.addColorStop(1, '#010307');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        ctx.save();
        ctx.translate(canvasWidth / 2, canvasHeight * 0.55);
        for (let i = 0; i < 14; i++) {
          ctx.rotate((Math.PI * 2) / 14);
          ctx.fillStyle = i % 2 === 0 ? 'rgba(30, 64, 175, 0.18)' : 'rgba(14, 116, 144, 0.22)';
          ctx.beginPath();
          ctx.ellipse(0, -canvasHeight * 0.12, canvasWidth * 0.07, canvasHeight * 0.18, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      else if (currentStyle === 'windows-xp-bliss') {
        // Simple procedural bliss hill
        const skyGrad = ctx.createLinearGradient(0, 0, 0, canvasHeight * 0.65);
        skyGrad.addColorStop(0, '#1e80ea');
        skyGrad.addColorStop(1, '#6ec3ff');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Bliss green hill bezier curve
        const hillGrad = ctx.createLinearGradient(0, canvasHeight * 0.5, canvasWidth, canvasHeight);
        hillGrad.addColorStop(0, '#31a123');
        hillGrad.addColorStop(1, '#1b610c');
        ctx.fillStyle = hillGrad;
        ctx.beginPath();
        ctx.moveTo(0, canvasHeight * 0.65);
        ctx.bezierCurveTo(canvasWidth * 0.35, canvasHeight * 0.5, canvasWidth * 0.75, canvasHeight * 0.75, canvasWidth, canvasHeight * 0.62);
        ctx.lineTo(canvasWidth, canvasHeight);
        ctx.lineTo(0, canvasHeight);
        ctx.closePath();
        ctx.fill();
      }
      else {
        // Flat solid colors and basic gradients
        const preset = PRESETS.find(p => p.id === currentStyle);
        if (preset) {
          if (preset.type === 'color') {
            ctx.fillStyle = preset.primaryColor;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
          } else {
            // Gradient style parses or draws clean linear gradient
            const grad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
            if (preset.id === 'sunset-aurora') {
              grad.addColorStop(0, '#f12711');
              grad.addColorStop(1, '#f5af19');
            } else if (preset.id === 'glassmorphism-blue') {
              grad.addColorStop(0, '#00c6ff');
              grad.addColorStop(1, '#0072ff');
            } else if (preset.id === 'emerald-fusion') {
              grad.addColorStop(0, '#11998e');
              grad.addColorStop(1, '#38ef7d');
            } else if (preset.id === 'neon-purple') {
              grad.addColorStop(0, '#ec008c');
              grad.addColorStop(1, '#fc6767');
            } else if (preset.id === 'cosmic-void') {
              grad.addColorStop(0, '#450a0a');
              grad.addColorStop(1, '#030712');
            } else if (preset.id === 'tokyo-cyber') {
              grad.addColorStop(0, '#ff007f');
              grad.addColorStop(1, '#7f00ff');
            } else {
              grad.addColorStop(0, '#4b5563');
              grad.addColorStop(1, '#1f2937');
            }
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
          }
        } else {
          // Default backup slate
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
      }
    }

    ctx.restore(); // restores from blur filters to make sure video card is sharp

    // --- 2. PREPARE CARD POSITION & DIMENSIONS ---
    const rawVideoW = videoEl?.videoWidth || videoWidth || 1280;
    const rawVideoH = videoEl?.videoHeight || videoHeight || 720;
    const videoRatio = rawVideoH > 0 ? rawVideoW / rawVideoH : 1.777;

    // Outer padding size scaled relative to canvas size
    const pad = Math.max(15, Math.round(paddingSize * (canvasWidth / 1000)));
    
    // Available drawing bounds inside canvas minus the padding margins
    const availW = canvasWidth - pad * 2;
    const availH = canvasHeight - pad * 2;

    // Header Chrome setup
    const showHeader = chromeStyle !== 'none';
    const chromeHeaderH = showHeader ? Math.max(18, Math.round(canvasHeight * 0.055)) : 0;

    // Calculate maximum inner card sizing fitting the available boundaries
    let cardW = availW;
    let cardH = cardW / videoRatio + chromeHeaderH;

    if (cardH > availH) {
      cardH = availH;
      cardW = (cardH - chromeHeaderH) * videoRatio;
    }

    const cardX = (canvasWidth - cardW) / 2;
    const cardY = (canvasHeight - cardH) / 2;

    const videoX = cardX;
    const videoY = cardY + chromeHeaderH;
    const drawW = cardW;
    const drawH = cardH - chromeHeaderH;

    const safeRoundRect = (
      c: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) => {
      if (typeof c.roundRect === 'function') {
        c.roundRect(x, y, w, h, r);
      } else {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
      }
    };

    // --- 3. DRAW INNER CARD SOFT SHADOW ---
    if (shadowBlurVal > 0) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = Math.round(shadowBlurVal * (canvasWidth / 1000));
      ctx.shadowOffsetY = Math.max(2, Math.round(shadowBlurVal * 0.3 * (canvasWidth / 1000)));
      ctx.fillStyle = '#18181b';
      
      ctx.beginPath();
      safeRoundRect(ctx, cardX, cardY, cardW, cardH, radius);
      ctx.fill();
      ctx.restore();
    }

    // --- 4. CLIPPED PATH & DRAW WINDOW CHROME WINDOW ---
    ctx.save();
    ctx.beginPath();
    safeRoundRect(ctx, cardX, cardY, cardW, cardH, radius);
    ctx.clip();

    // Draw header block background
    if (showHeader) {
      let headBg = '#18181b';
      let headBorder = '#27272a';
      let headTextColor = '#d4d4d8';

      if (chromeStyle === 'macos-light') {
        headBg = '#f4f4f5';
        headBorder = '#e4e4e7';
        headTextColor = '#27272a';
      } else if (chromeStyle === 'windows-light') {
        headBg = '#f1f5f9';
        headBorder = '#cbd5e1';
        headTextColor = '#1e293b';
      } else if (chromeStyle === 'windows-dark') {
        headBg = '#0f172a';
        headBorder = '#1e293b';
        headTextColor = '#f1f5f9';
      }

      ctx.fillStyle = headBg;
      ctx.fillRect(cardX, cardY, cardW, chromeHeaderH);

      // Bottom boundary separator line
      ctx.fillStyle = headBorder;
      ctx.fillRect(cardX, cardY + chromeHeaderH - 1, cardW, 1);

      // Draw macOS stoplight dots
      if (chromeStyle.startsWith('macos')) {
        const dotY = cardY + chromeHeaderH / 2;
        const dotRadius = Math.max(3, Math.round(chromeHeaderH * 0.16));
        const spacing = Math.round(dotRadius * 2.8);
        const startX = cardX + Math.round(chromeHeaderH * 0.5);

        // Close (Red)
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(startX, dotY, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        // Minimize (Yellow)
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(startX + spacing, dotY, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        // Maximize (Green)
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(startX + spacing * 2, dotY, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      } 
      // Draw Windows window buttons
      else if (chromeStyle.startsWith('windows')) {
        const iconSize = Math.round(chromeHeaderH * 0.35);
        const rightPadding = Math.round(chromeHeaderH * 0.5);
        const spacing = Math.round(chromeHeaderH * 0.85);

        ctx.strokeStyle = headTextColor;
        ctx.lineWidth = 1;

        // X icon
        const xX = cardX + cardW - rightPadding - iconSize / 2;
        const xY = cardY + chromeHeaderH / 2;
        ctx.beginPath();
        ctx.moveTo(xX - iconSize/2, xY - iconSize/2);
        ctx.lineTo(xX + iconSize/2, xY + iconSize/2);
        ctx.moveTo(xX + iconSize/2, xY - iconSize/2);
        ctx.lineTo(xX - iconSize/2, xY + iconSize/2);
        ctx.stroke();

        // Maximize box
        const mX = xX - spacing;
        ctx.strokeRect(mX - iconSize/2, xY - iconSize/2, iconSize, iconSize);

        // Minimize line
        const minX = mX - spacing;
        ctx.beginPath();
        ctx.moveTo(minX - iconSize/2, xY + iconSize/2);
        ctx.lineTo(minX + iconSize/2, xY + iconSize/2);
        ctx.stroke();
      }

      // Render Title text
      ctx.fillStyle = headTextColor;
      ctx.font = `500 ${Math.max(9, Math.round(chromeHeaderH * 0.38))}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(recording.name.replace(/\.[^/.]+$/, ""), cardX + cardW / 2, cardY + chromeHeaderH / 2);
    }

    // --- 5. DRAW ACTIVE VIDEO FRAME ---
    if (videoEl && (videoEl.readyState >= 2 || videoEl.videoWidth > 0)) {
      try {
        if (isActiveZoom) {
          const scale = activeZoomScale || 1.4;
          const sw = rawVideoW / scale;
          const sh = rawVideoH / scale;
          const sx = (rawVideoW - sw) / 2;
          const sy = (rawVideoH - sh) / 2;
          ctx.drawImage(videoEl, sx, sy, sw, sh, videoX, videoY, drawW, drawH);
        } else {
          ctx.drawImage(videoEl, videoX, videoY, drawW, drawH);
        }
      } catch (e) {
        console.warn('Failed to draw active video frame onto canvas:', e);
        // Fallback placeholder inside card clip
        ctx.fillStyle = '#18181b';
        ctx.fillRect(videoX, videoY, drawW, drawH);
        
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Decoding video frame...', videoX + drawW / 2, videoY + drawH / 2);
      }
    } else {
      // Background inside clip until frame loads
      ctx.fillStyle = '#18181b';
      ctx.fillRect(videoX, videoY, drawW, drawH);
      
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Preparing video stream frame...', videoX + drawW / 2, videoY + drawH / 2);
    }

    ctx.restore();
  };

  // Real-time animation loop for canvas preview
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas && video) {
        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) {
          // Always render at maximum quality in the preview loop
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          const t = video.currentTime;
          const activeZoom = segments.find(s => s.type === 'zoom' && t >= s.start && t < s.end);
          drawFrameToCanvas(
            ctx,
            canvas.width,
            canvas.height,
            video,
            selectedBg,
            paddingSize,
            windowChrome,
            cornerRadius,
            shadowIntensity,
            imageBlur,
            !!activeZoom,
            activeZoom?.zoomScale
          );
        }
      }
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [selectedBg, activeTab, paddingSize, windowChrome, cornerRadius, shadowIntensity, aspectRatio, imageBlur, customImageEl, segments, videoWidth, videoHeight]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const t = videoRef.current.currentTime;
      const activeTrim = segments.find(s => s.type === 'trim' && t >= s.start && t < s.end);
      if (activeTrim) {
        videoRef.current.currentTime = activeTrim.end;
        setCurrentTime(activeTrim.end);
      } else {
        setCurrentTime(t);
      }
    }
  };

  // Timeline Click / Seek controller
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (timelineRef.current && duration) {
      const rect = timelineRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, clickX / rect.width));
      const newTime = pct * duration;
      if (videoRef.current) {
        videoRef.current.currentTime = newTime;
      }
      setCurrentTime(newTime);
    }
  };

  // --- CLIENT-SIDE RENDERING AND EXPORT ENGINE ---
  const startBackgroundExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);

    try {
      const originalBlob = recording.blob;
      
      // Create off-screen video to process at full resolution
      const exportVideo = document.createElement('video');
      exportVideo.src = URL.createObjectURL(originalBlob);
      exportVideo.muted = false;
      exportVideo.playsInline = true;

      await new Promise((resolve, reject) => {
        exportVideo.onloadedmetadata = resolve;
        exportVideo.onerror = () => reject(new Error('Failed to load video source for rendering'));
      });

      // Target Canvas Output resolution based on Aspect Ratio selection (supporting high-DPI/native upscale)
      let outW = 1920;
      let outH = 1080;
      const vWidth = exportVideo.videoWidth || 1920;
      const vHeight = exportVideo.videoHeight || 1080;
      const maxDim = Math.max(vWidth, vHeight);

      if (aspectRatio === '9-16') {
        outW = 1080;
        outH = 1920;
        if (maxDim > 1920) {
          outH = maxDim;
          outW = Math.round(maxDim * 9 / 16);
        }
      } else if (aspectRatio === '1-1') {
        outW = 1080;
        outH = 1080;
        if (maxDim > 1080) {
          outW = maxDim;
          outH = maxDim;
        }
      } else if (aspectRatio === 'original') {
        outW = vWidth;
        outH = vHeight;
      } else {
        // 16-9
        outW = 1920;
        outH = 1080;
        if (maxDim > 1920) {
          outW = maxDim;
          outH = Math.round(maxDim * 9 / 16);
        }
      }

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = outW;
      exportCanvas.height = outH;
      const exportCtx = exportCanvas.getContext('2d');
      if (!exportCtx) throw new Error('Could not initialize canvas rendering context.');
      exportCtx.imageSmoothingEnabled = true;
      exportCtx.imageSmoothingQuality = 'high';

      // Capture audio context
      const audioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new audioContextClass();
      
      const audioSource = audioCtx.createMediaElementSource(exportVideo);
      const audioDestination = audioCtx.createMediaStreamDestination();
      audioSource.connect(audioDestination);

      // Create mixed video/audio stream
      const canvasStream = exportCanvas.captureStream(60); // 60 fps = no dropped frames during render
      const audioTrack = audioDestination.stream.getAudioTracks()[0];

      const mixedStream = new MediaStream();
      canvasStream.getVideoTracks().forEach(track => mixedStream.addTrack(track));
      if (audioTrack) {
        mixedStream.addTrack(audioTrack);
      }

      // Record Media
      // High-bitrate settings: VP9 @ 16 Mbps + Opus @ 320 kbps = broadcast-grade output
      const isVerticalExport = outH > outW;
      const videoBpsExport = isVerticalExport ? 12_000_000 : 16_000_000;

      let recorder: MediaRecorder;
      const mimeOptions = {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: videoBpsExport,
        audioBitsPerSecond: 320_000,
      };
      try {
        recorder = new MediaRecorder(mixedStream, mimeOptions);
      } catch (e) {
        recorder = new MediaRecorder(mixedStream, {
          mimeType: 'video/webm',
          videoBitsPerSecond: videoBpsExport,
          audioBitsPerSecond: 320_000,
        });
      }

      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      let processInterval: number;
      
      recorder.onstop = () => {
        clearInterval(processInterval);
        audioCtx.close();
        
        const finalBlob = new Blob(chunks, { type: 'video/webm' });
        const presetObj = PRESETS.find(p => p.id === selectedBg);
        const nameSuffix = presetObj ? presetObj.name.toLowerCase().replace(/\s+/g, '-') : 'custom';
        
        onSaveWithBackground(finalBlob, duration, nameSuffix);
        setIsExporting(false);
        setExportProgress(100);
      };

      // Go to starting point
      exportVideo.currentTime = 0;
      await new Promise<void>((resolve) => {
        exportVideo.onseeked = () => resolve();
      });

      // Start Recording
      recorder.start();
      exportVideo.play();

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const frameDuration = 1000 / 30; // 30 FPS render ticks
      processInterval = window.setInterval(() => {
        if (exportVideo.paused || exportVideo.ended || exportVideo.currentTime >= duration) {
          exportVideo.pause();
          recorder.stop();
          clearInterval(processInterval);
          return;
        }

        const currentT = exportVideo.currentTime;
        const activeTrim = segments.find(s => s.type === 'trim' && currentT >= s.start && currentT < s.end);
        if (activeTrim) {
          exportVideo.currentTime = activeTrim.end;
          return;
        }

        const activeZoom = segments.find(s => s.type === 'zoom' && currentT >= s.start && currentT < s.end);

        // Render high-res compiled frame
        drawFrameToCanvas(
          exportCtx,
          outW,
          outH,
          exportVideo,
          selectedBg,
          paddingSize,
          windowChrome,
          cornerRadius,
          shadowIntensity,
          imageBlur,
          !!activeZoom,
          activeZoom?.zoomScale
        );

        // Progress calculation
        const prog = (exportVideo.currentTime / duration) * 100;
        setExportProgress(Math.min(Math.round(prog), 99));
      }, frameDuration);

    } catch (err: any) {
      console.error('Background rendering failed:', err);
      setExportError(err.message || 'Rendering failed.');
      setIsExporting(false);
    }
  };

  // High-fidelity Time Formatting: MM:SS.CC (with centiseconds matching mockup screenshot)
  const formatSecsWithMs = (seconds: number) => {
    if (isNaN(seconds)) return '00:00.00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const formatSecs = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Timeline dynamic ticks renderer
  const renderTimelineTicks = () => {
    const ticks = [];
    const tickCount = 8;
    const interval = duration / (tickCount - 1);
    for (let i = 0; i < tickCount; i++) {
      const timeVal = i * interval;
      ticks.push(
        <div key={i} className="flex flex-col items-center select-none" style={{ position: 'absolute', left: `${(timeVal / duration) * 100}%`, transform: 'translateX(-50%)' }}>
          <span className="text-[9px] font-mono font-medium text-slate-400 mb-1">{formatSecs(timeVal)}</span>
          <div className="w-[1px] h-1.5 bg-slate-200" />
        </div>
      );
    }
    return ticks;
  };

  // Aspect ratio display string helper
  const getAspectRatioName = (ratio: AspectRatioId) => {
    switch(ratio) {
      case '16-9': return '16:9 Landscape';
      case '9-16': return '9:16 Portrait';
      case '1-1': return '1:1 Square';
      default: return 'Original Ratio';
    }
  };

  // Simulated zoom levels
  const handleAddZoom = () => {
    // Cycles padding sizes to simulate zoom-in effects on the background canvas
    setPaddingSize(prev => prev >= 100 ? 20 : prev + 25);
  };

  // Dynamic high-fidelity resolution for preview canvas
  let previewW = 1920;
  let previewH = 1080;
  const maxDim = Math.max(videoWidth, videoHeight);

  if (aspectRatio === '9-16') {
    previewW = 1080;
    previewH = 1920;
    if (maxDim > 1920) {
      previewH = maxDim;
      previewW = Math.round(maxDim * 9 / 16);
    }
  } else if (aspectRatio === '1-1') {
    previewW = 1080;
    previewH = 1080;
    if (maxDim > 1080) {
      previewW = maxDim;
      previewH = maxDim;
    }
  } else if (aspectRatio === 'original') {
    previewW = videoWidth || 1920;
    previewH = videoHeight || 1080;
  } else {
    // 16-9
    previewW = 1920;
    previewH = 1080;
    if (maxDim > 1920) {
      previewW = maxDim;
      previewH = Math.round(maxDim * 9 / 16);
    }
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-brand-bg text-brand-text font-sans animate-fade-in" id="canvas-studio-workspace">
      
      {/* 1. TOP HEADER NAVIGATION BAR */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-brand-border bg-brand-card h-14 shrink-0" id="studio-header">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-sm font-semibold text-brand-text-muted hover:text-brand-text transition-colors"
          id="exit-edit-btn"
        >
          <ArrowLeft size={16} />
          <span>Recordings</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={startBackgroundExport}
            disabled={isExporting}
            className="flex items-center space-x-1.5 px-5 py-2 bg-brand-accent hover:bg-brand-accent-hover disabled:bg-brand-border disabled:text-brand-text-muted disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-[0.98]"
            id="compile-studio-btn"
          >
            {isExporting ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Exporting ({exportProgress}%)</span>
              </>
            ) : (
              <>
                <Upload size={13} className="rotate-180" />
                <span>Export</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. DUAL COLUMN CONTENT CANVAS & SETTINGS */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden" id="studio-grid">
        
        {/* LEFT COLUMN: ACTIVE VIEWING CANVAS & PLAYBACK TIMELINE (9 COLS) */}
        <div className="lg:col-span-9 p-4 flex flex-col space-y-3 h-full overflow-hidden" id="studio-editor-pane">
          
          {/* Canvas Presentation Frame */}
          <div className="relative flex-1 min-h-0 bg-brand-surface/40 rounded-2xl border border-brand-border flex items-center justify-center p-4 shadow-inner overflow-hidden" id="canvas-presentation-frame">
            
            {/* Elegant overlay progress bar when video is exporting/processing */}
            {isExporting && (
              <div className="absolute inset-0 z-50 bg-brand-bg/85 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-fade-in" id="export-overlay-panel">
                <div className="max-w-md w-full bg-brand-card border border-brand-border rounded-2xl p-6 shadow-2xl space-y-4 relative overflow-hidden" id="export-card">
                  {/* Subtle decorative glowing spot */}
                  <div className="absolute -top-12 -right-12 w-24 h-24 bg-brand-accent/20 rounded-full blur-xl pointer-events-none" />
                  
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/25 flex items-center justify-center text-brand-accent shrink-0 animate-spin">
                      <RefreshCw size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-brand-text tracking-tight">Exporting Video</h4>
                      <p className="text-[11px] text-brand-text-muted mt-0.5 leading-relaxed truncate">Rendering custom backdrops and layout dimensions...</p>
                    </div>
                    <span className="text-base font-black text-brand-accent font-mono shrink-0">{exportProgress}%</span>
                  </div>

                  {/* Progress bar container */}
                  <div className="space-y-1.5 pt-1">
                    <div className="w-full h-2 bg-brand-surface rounded-full overflow-hidden border border-brand-border/40">
                      <div 
                        className="h-full bg-brand-accent rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${exportProgress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-brand-text-muted font-medium">
                      <span>Synthesizing high-definition frames...</span>
                      <span>{exportProgress === 100 ? 'Finalizing download...' : 'Please do not close this window'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Aspect ratio-sensitive scaling container */}
            <div 
              className="relative shadow-2xl rounded-xl overflow-hidden max-h-full max-w-full flex items-center justify-center transition-all duration-300"
              style={{
                aspectRatio: aspectRatio === '16-9' ? '16/9' : aspectRatio === '9-16' ? '9/16' : aspectRatio === '1-1' ? '1/1' : undefined,
                width: aspectRatio === 'original' ? '100%' : undefined,
                height: aspectRatio !== 'original' ? '100%' : '100%',
              }}
            >
              <canvas
                ref={canvasRef}
                width={previewW}
                height={previewH}
                className="max-h-full max-w-full object-contain bg-black relative z-10"
                id="render-canvas"
              />
              
              {/* Playback center overlay */}
              {!isPlaying && (
                <button
                  onClick={togglePlay}
                  className="absolute inset-0 m-auto w-14 h-14 bg-black/80 hover:bg-[#191919] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all duration-150 active:scale-95 animate-pulse z-20"
                >
                  <Play size={20} className="ml-1 fill-white" />
                </button>
              )}

              {/* Hidden Video Source Object layered behind the canvas but within visible DOM to avoid browser background decoding suspends */}
              <video
                ref={videoRef}
                src={recording.url}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onLoadedData={handleLoadedMetadata}
                onCanPlay={handleLoadedMetadata}
                onPlaying={handleLoadedMetadata}
                onDurationChange={handleLoadedMetadata}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: 0.001,
                  zIndex: 0,
                  pointerEvents: 'none',
                }}
                playsInline
                muted={isMuted}
                loop
                preload="auto"
              />
            </div>
          </div>

          {/* PLAYBACK CONTROL HUD BAR */}
          <div className="flex items-center space-x-4 px-4 py-2.5 bg-brand-card border border-brand-border rounded-xl shadow-sm shrink-0" id="playback-controls-hud">
            {/* Play Trigger */}
            <button
              onClick={togglePlay}
              className="text-brand-text hover:text-brand-accent transition-colors shrink-0"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={18} className="fill-brand-text" /> : <Play size={18} className="fill-brand-text" />}
            </button>

            {/* Sound Mute Trigger */}
            <button
              onClick={handleMuteToggle}
              className="text-brand-text hover:text-brand-accent transition-colors shrink-0"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            {/* Exact Centisecond Time Display Counter */}
            <div className="text-[11px] font-mono font-semibold text-brand-text-muted shrink-0 select-none">
              {formatSecsWithMs(currentTime)} <span className="text-brand-border">/</span> {formatSecsWithMs(duration)}
            </div>

            {/* Main Progress Seek Slider track */}
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
                className="w-full h-1.5 bg-brand-surface rounded-lg appearance-none cursor-pointer accent-brand-accent"
                style={{
                  background: `linear-gradient(to right, var(--color-brand-accent, #D96B43) ${(currentTime / (duration || 100)) * 100}%, var(--color-brand-surface, #F4EFE6) ${(currentTime / (duration || 100)) * 100}%)`
                }}
                id="playback-slider"
              />
            </div>
          </div>

          {/* TIMELINE EDIT PANEL WORKSPACE */}
          <div className="bg-brand-card border border-brand-border rounded-xl p-3 shadow-sm space-y-3 shrink-0" id="timeline-panel">
            
            {/* Toolbar Row */}
            <div className="flex items-center justify-between pb-0.5" id="timeline-toolbar">
              <div className="flex items-center space-x-1.5">
                <button 
                  onClick={handleAddTrimSegment}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-500 hover:text-rose-600 text-[11px] font-bold rounded-lg transition-colors"
                  title="Cut out/exclude a region from the video"
                >
                  <Scissors size={11} />
                  <span>✂️ Trim</span>
                </button>

                <button 
                  onClick={handleAddZoomSegment}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-500 hover:text-amber-600 text-[11px] font-bold rounded-lg transition-colors"
                  title="Apply zoom enhancement to a range"
                >
                  <Search size={11} />
                  <span>🔍 Zoom</span>
                </button>

                <div className="h-4 w-[1px] bg-brand-border mx-1" />

                <button 
                  className="p-1 hover:bg-brand-surface rounded-lg text-brand-text-muted hover:text-brand-text transition-colors"
                  title="Zoom Out"
                  onClick={() => setZoomLevel(prev => Math.max(1, prev - 1))}
                >
                  <Search size={12} className="opacity-70 scale-95" />
                </button>
                
                <input 
                  type="range" 
                  min={1} 
                  max={10} 
                  value={zoomLevel} 
                  onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                  className="w-16 h-1 bg-brand-surface appearance-none rounded-full accent-brand-accent cursor-pointer" 
                />

                <button 
                  className="p-1 hover:bg-brand-surface rounded-lg text-brand-text-muted hover:text-brand-text transition-colors"
                  title="Zoom In"
                  onClick={() => setZoomLevel(prev => Math.min(10, prev + 1))}
                >
                  <Search size={12} className="opacity-100" />
                </button>

                <button 
                  onClick={() => {
                    setSegments([]);
                    setSelectedSegmentId(null);
                  }}
                  className="p-1 hover:bg-rose-50 rounded-lg text-brand-text-muted hover:text-rose-500 transition-colors" 
                  title="Clear All Segments"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              <div className="flex items-center space-x-2">
                {/* Current position badge */}
                <span className="text-[11px] font-mono bg-brand-surface border border-brand-border px-2 py-1 rounded text-brand-text font-bold">
                  {formatSecsWithMs(currentTime)} / {formatSecsWithMs(duration)}
                </span>

                <button
                  onClick={() => {
                    if (videoRef.current) videoRef.current.currentTime = 0;
                    setCurrentTime(0);
                  }}
                  className="flex items-center space-x-1 px-2 py-1 bg-brand-surface border border-brand-border hover:bg-brand-surface/80 text-brand-text-muted text-[11px] font-semibold rounded-lg transition-colors"
                >
                  <RotateCcw size={11} />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Scrollable Viewport Wrapper */}
            <div className="relative border border-brand-border/60 rounded-xl bg-brand-surface/10 p-0 shadow-inner overflow-hidden min-h-[140px]" id="timeline-capcut-wrapper">
              
              {/* STATIC PLAYHEAD NEEDLE (Centered in the viewport) */}
              <div 
                className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-brand-accent pointer-events-none z-30 flex flex-col items-center"
                style={{ transform: 'translateX(-50%)' }}
                id="capcut-playhead"
              >
                {/* Triangular playhead cap */}
                <div className="w-3 h-3 bg-brand-accent rounded-b-sm shadow-md" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)' }} />
                {/* Dynamic line glow */}
                <div className="w-[2px] flex-1 bg-gradient-to-b from-brand-accent via-brand-accent/70 to-brand-accent/20" />
              </div>

              {/* Scrollable Track Container */}
              <div 
                ref={timelineViewportRef}
                onScroll={handleViewportScroll}
                onMouseDown={handleMouseDown}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                className="w-full h-full overflow-x-auto overflow-y-hidden select-none cursor-ew-resize scrollbar-none flex flex-col justify-start relative pt-7 pb-2.5"
                style={{ scrollBehavior: 'auto' }}
                id="timeline-tracks-viewport"
              >
                
                {/* INNER FLEX CONTAINER representing the full scrolling range */}
                <div className="flex items-stretch h-full relative" style={{ width: '100%' }}>
                  
                  {/* START SPACER: 50% of the viewport width so 0s can align with the center line */}
                  <div className="shrink-0" style={{ width: '50%' }} />

                  {/* ACTIVE TIMELINE CONTAINER (Ruler + Tracks) */}
                  <div className="relative shrink-0 flex flex-col justify-between" style={{ width: `${duration * pxPerSec}px` }} id="timeline-actual-content">
                    
                    {/* 1. RULER TRACK (Timestamps & ticks) */}
                    <div className="absolute top-[-24px] left-0 right-0 h-5 border-b border-brand-border/40" id="ruler-layer">
                      {/* Dynamic time ticks */}
                      {(() => {
                        const tickInterval = calculateTickInterval(pxPerSec);
                        const ticks = [];
                        const subTickInterval = tickInterval / 5;

                        for (let timeVal = 0; timeVal <= duration; timeVal += subTickInterval) {
                          const isLabelTick = Math.abs(timeVal % tickInterval) < 0.001 || timeVal === 0;
                          const isHalfTick = Math.abs(timeVal % (tickInterval / 2)) < 0.001;
                          const leftPx = timeVal * pxPerSec;

                          ticks.push(
                            <div 
                              key={timeVal.toFixed(2)} 
                              className="absolute bottom-0 flex flex-col items-center"
                              style={{ left: `${leftPx}px` }}
                            >
                              {isLabelTick && (
                                <span className="text-[9px] font-mono font-medium text-slate-400 mb-1 absolute bottom-3 -translate-x-1/2 select-none pointer-events-none">
                                  {formatSecs(timeVal)}
                                </span>
                              )}
                              <div className={`w-[1px] ${isLabelTick ? 'h-2 bg-slate-400' : isHalfTick ? 'h-1.5 bg-slate-300' : 'h-1 bg-slate-200'}`} />
                            </div>
                          );
                        }
                        return ticks;
                      })()}
                    </div>

                    {/* 2. EDITS TRACK LAYER (Trim & Zoom segments) */}
                    <div className="relative h-7 w-full bg-brand-surface/30 rounded-md border border-brand-border/30 mb-2 overflow-hidden flex items-center" id="edits-layer-track">
                      <span className="absolute left-2.5 text-[8px] font-bold text-brand-text-muted/60 uppercase select-none pointer-events-none z-10">
                        Edits / Ranges
                      </span>
                      {segments.length === 0 ? (
                        <span className="mx-auto text-[9px] text-brand-text-muted/40 italic select-none pointer-events-none">
                          No trims or zoom levels applied
                        </span>
                      ) : (
                        segments.map((seg) => {
                          const leftPx = seg.start * pxPerSec;
                          const widthPx = (seg.end - seg.start) * pxPerSec;
                          const isSelected = selectedSegmentId === seg.id;

                          return (
                            <div
                              key={seg.id}
                              onClick={(e) => {
                                e.stopPropagation(); // prevent seek
                                setSelectedSegmentId(seg.id);
                              }}
                              className={`absolute h-[22px] rounded flex items-center justify-between px-1.5 cursor-pointer transition-all border text-[9px] font-bold select-none z-20 ${
                                seg.type === 'trim'
                                  ? isSelected
                                    ? 'bg-rose-500/40 border-rose-500 text-rose-50 ring-2 ring-rose-400'
                                    : 'bg-rose-500/20 border-rose-500/50 text-rose-200 hover:bg-rose-500/30'
                                  : isSelected
                                    ? 'bg-amber-500/40 border-amber-500 text-amber-50 ring-2 ring-amber-400'
                                    : 'bg-amber-500/20 border-amber-500/50 text-amber-200 hover:bg-amber-500/30'
                              }`}
                              style={{
                                left: `${leftPx}px`,
                                width: `${widthPx}px`,
                              }}
                            >
                              <span className="truncate flex items-center space-x-1">
                                {seg.type === 'trim' ? (
                                  <>
                                    <Scissors size={8} className="shrink-0 text-rose-300" />
                                    <span>Trimmed</span>
                                  </>
                                ) : (
                                  <>
                                    <Search size={8} className="shrink-0 text-amber-300" />
                                    <span>Zoom {seg.zoomScale || 1.4}x</span>
                                  </>
                                )}
                              </span>
                              {isSelected && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSegment(seg.id);
                                  }}
                                  className="p-0.5 hover:bg-black/30 rounded text-white shrink-0 ml-1"
                                  title="Delete segment"
                                >
                                  <Trash2 size={8} />
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* 3. PRIMARY VIDEO TRACK LAYER */}
                    <div className="relative h-12 w-full bg-brand-surface/60 rounded-md border border-brand-border/80 overflow-hidden flex items-center justify-between" id="video-layer-track">
                      <div className="absolute inset-y-0 left-2.5 flex items-center font-semibold text-[9px] text-brand-text-muted/70 tracking-tight z-10 select-none pointer-events-none">
                        🎬 {recording.name || 'Original Recording'}
                      </div>

                      {/* Generated Waveform frames in track */}
                      <div className="flex items-center space-x-0.5 px-4 h-full w-full justify-center opacity-30 pointer-events-none">
                        {(() => {
                          const waveLinesCount = Math.floor((duration * pxPerSec) / 5);
                          return Array.from({ length: Math.max(10, Math.min(200, waveLinesCount)) }).map((_, i) => (
                            <div 
                              key={i} 
                              className="w-[2px] bg-brand-text rounded-full" 
                              style={{ height: `${12 + Math.sin(i * 0.3) * 16 + Math.cos(i * 0.7) * 6}px` }}
                            />
                          ));
                        })()}
                      </div>
                    </div>

                  </div>

                  {/* END SPACER: 50% of the viewport width */}
                  <div className="shrink-0" style={{ width: '50%' }} />

                </div>

              </div>

            </div>

            {/* If a segment is selected, show its editing sub-panel */}
            {(() => {
              const selectedSeg = segments.find(s => s.id === selectedSegmentId);
              if (!selectedSeg) return null;
              return (
                <div className="bg-brand-surface border border-brand-border rounded-lg p-2.5 flex flex-wrap gap-3 items-center justify-between text-xs animate-fade-in mt-2" id="segment-settings-hud">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${selectedSeg.type === 'trim' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                    <span className="font-bold text-brand-text capitalize text-[11px]">{selectedSeg.type} Segment Controls</span>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {/* Start adjustment */}
                    <div className="flex items-center space-x-1">
                      <span className="text-brand-text-muted text-[11px]">Start:</span>
                      <button 
                        type="button"
                        onClick={() => handleAdjustSegmentTime(selectedSeg.id, 'start', -0.1)}
                        className="px-1 py-0.5 bg-brand-card border border-brand-border rounded hover:bg-brand-surface text-[10px] font-mono"
                      >-0.1s</button>
                      <span className="font-mono font-bold w-12 text-center text-brand-text">{selectedSeg.start.toFixed(1)}s</span>
                      <button 
                        type="button"
                        onClick={() => handleAdjustSegmentTime(selectedSeg.id, 'start', 0.1)}
                        className="px-1 py-0.5 bg-brand-card border border-brand-border rounded hover:bg-brand-surface text-[10px] font-mono"
                      >+0.1s</button>
                    </div>

                    {/* End adjustment */}
                    <div className="flex items-center space-x-1">
                      <span className="text-brand-text-muted text-[11px]">End:</span>
                      <button 
                        type="button"
                        onClick={() => handleAdjustSegmentTime(selectedSeg.id, 'end', -0.1)}
                        className="px-1 py-0.5 bg-brand-card border border-brand-border rounded hover:bg-brand-surface text-[10px] font-mono"
                      >-0.1s</button>
                      <span className="font-mono font-bold w-12 text-center text-brand-text">{selectedSeg.end.toFixed(1)}s</span>
                      <button 
                        type="button"
                        onClick={() => handleAdjustSegmentTime(selectedSeg.id, 'end', 0.1)}
                        className="px-1 py-0.5 bg-brand-card border border-brand-border rounded hover:bg-brand-surface text-[10px] font-mono"
                      >+0.1s</button>
                    </div>

                    {/* Zoom scale slider */}
                    {selectedSeg.type === 'zoom' && (
                      <div className="flex items-center space-x-1">
                        <span className="text-brand-text-muted text-[11px]">Factor:</span>
                        <input 
                          type="range"
                          min={1.1}
                          max={2.5}
                          step={0.1}
                          value={selectedSeg.zoomScale || 1.4}
                          onChange={(e) => handleAdjustZoomScale(selectedSeg.id, parseFloat(e.target.value))}
                          className="w-16 h-1 bg-brand-card rounded accent-brand-accent cursor-pointer"
                        />
                        <span className="font-mono font-bold w-8 text-[11px]">{(selectedSeg.zoomScale || 1.4).toFixed(1)}x</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteSegment(selectedSeg.id)}
                    className="flex items-center space-x-1 px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-md text-[10px] font-bold transition-all"
                  >
                    <Trash2 size={10} />
                    <span>Remove Segment</span>
                  </button>
                </div>
              );
            })()}
          </div>

          {/* Compile errors display */}
          {exportError && (
            <div className="flex items-start space-x-1.5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 animate-fade-in shrink-0">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-600" />
              <div>
                <span className="font-semibold">Rendering Matrix Error:</span>
                <p className="mt-0.5 leading-relaxed">{exportError}</p>
              </div>
            </div>
          )}

          {/* Export process banner */}
          {isExporting && (
            <div className="p-4 bg-brand-card border border-brand-border rounded-xl space-y-2 animate-pulse shadow-sm shrink-0">
              <div className="flex items-center justify-between text-xs">
                <span className="text-brand-text-muted font-semibold flex items-center space-x-1.5">
                  <RefreshCw size={12} className="animate-spin text-brand-accent" />
                  <span>Synthesizing high-definition frames on canvas ...</span>
                </span>
                <span className="text-brand-accent font-bold font-mono">{exportProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-brand-surface rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-accent transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: CANVAS SETTINGS SIDEBAR (3 COLS) */}
        <div className="lg:col-span-3 bg-brand-card border-l border-brand-border p-4 flex flex-col h-full overflow-hidden" id="studio-sidebar">
          
          {/* Sidebar header */}
          <div className="flex items-center justify-between pb-3 border-b border-brand-border shrink-0">
            <div className="flex items-center space-x-2">
              <Settings size={16} className="text-brand-text animate-spin-slow" />
              <h3 className="font-semibold text-brand-text text-xs">Canvas Settings</h3>
            </div>
            <button className="text-brand-text-muted hover:text-brand-text transition-colors">
              <MoreVertical size={14} />
            </button>
          </div>

          {/* Scrollable Settings Area */}
          <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1" id="studio-sidebar-settings">
            
            {/* 1. ASPECT RATIO BOX */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-text-muted/80 block">Canvas</span>
              
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-brand-text block">Aspect Ratio</label>
                
                <div className="relative">
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as AspectRatioId)}
                    className="w-full px-2.5 py-1.5 bg-brand-surface hover:bg-brand-surface/80 border border-brand-border rounded-lg text-xs font-semibold text-brand-text outline-none appearance-none cursor-pointer focus:border-brand-accent transition-all"
                  >
                    <option value="original">Original Aspect Ratio</option>
                    <option value="16-9">16:9 Landscape</option>
                    <option value="9-16">9:16 Portrait</option>
                    <option value="1-1">1:1 Square</option>
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-brand-text-muted">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. BACKGROUND SELECTOR */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-text-muted/80 block">Background</span>
              
              {/* Category Segmented Controls */}
              <div className="flex items-center bg-brand-surface border border-brand-border p-0.5 rounded-lg" id="background-categories-tabs">
                <button
                  type="button"
                  onClick={() => { setActiveTab('image'); setSelectedBg('macos-sonoma'); }}
                  className={`flex-1 flex items-center justify-center space-x-1 py-1 rounded-md text-[10px] font-bold transition-all duration-150 ${
                    activeTab === 'image' ? 'bg-brand-accent text-white shadow-sm' : 'text-brand-text-muted hover:text-brand-text'
                  }`}
                >
                  <ImageIcon size={10} />
                  <span>Image</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('gradient'); setSelectedBg('sunset-aurora'); }}
                  className={`flex-1 flex items-center justify-center space-x-1 py-1 rounded-md text-[10px] font-bold transition-all duration-150 ${
                    activeTab === 'gradient' ? 'bg-brand-accent text-white shadow-sm' : 'text-brand-text-muted hover:text-brand-text'
                  }`}
                >
                  <Palette size={10} />
                  <span>Grad</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('color'); setSelectedBg('flat-white'); }}
                  className={`flex-1 flex items-center justify-center space-x-1 py-1 rounded-md text-[10px] font-bold transition-all duration-150 ${
                    activeTab === 'color' ? 'bg-brand-accent text-white shadow-sm' : 'text-brand-text-muted hover:text-brand-text'
                  }`}
                >
                  <Paintbrush size={10} />
                  <span>Color</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('none'); setSelectedBg('none'); }}
                  className={`flex-1 flex items-center justify-center space-x-1 py-1 rounded-md text-[10px] font-bold transition-all duration-150 ${
                    activeTab === 'none' ? 'bg-brand-accent text-white shadow-sm' : 'text-brand-text-muted hover:text-brand-text'
                  }`}
                >
                  <EyeOff size={10} />
                  <span>None</span>
                </button>
              </div>

              {/* Backdrop Presets Grid */}
              {activeTab !== 'none' && (
                <div className="grid grid-cols-4 gap-1.5" id="backdrop-presets-grid">
                  {filteredPresets.map((preset) => {
                    const isSelected = selectedBg === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedBg(preset.id)}
                        className={`aspect-square w-full rounded-lg border-2 overflow-hidden relative transition-all duration-150 ${
                          isSelected ? 'border-brand-accent scale-[1.05] shadow-xs' : 'border-transparent hover:scale-105 hover:border-brand-border'
                        }`}
                        title={preset.name}
                      >
                        {preset.type === 'color' ? (
                          <div className="w-full h-full shadow-inner" style={{ backgroundColor: preset.primaryColor }} />
                        ) : (
                          <div className="w-full h-full shadow-inner" style={{ background: preset.primaryColor }} />
                        )}
                        
                        {isSelected && (
                          <div className="absolute inset-0 bg-black/10 flex items-center justify-center text-white">
                            <Check size={11} className="drop-shadow-xs stroke-[3px]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Custom uploader trigger widget */}
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={triggerCustomImageUpload}
                  className="w-full flex items-center justify-center space-x-1.5 py-2 bg-brand-surface hover:bg-brand-surface/85 border border-dashed border-brand-border rounded-lg text-brand-text-muted text-[11px] font-semibold transition-all cursor-pointer"
                >
                  <Upload size={12} />
                  <span>{customImageName ? `Change: ${customImageName.substring(0, 15)}...` : 'Upload custom image'}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCustomImageChange}
                  className="hidden"
                />
              </div>
            </div>



            {/* 4. MARGINS AND CORNERS SLIDERS */}
            <div className="space-y-3 pt-0.5">
              {/* Padding */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold uppercase tracking-wider text-brand-text-muted/80">Padding</span>
                  <span className="font-mono font-bold text-brand-text">{paddingSize}px</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={120}
                  step={1}
                  value={paddingSize}
                  onChange={(e) => setPaddingSize(parseInt(e.target.value))}
                  className="w-full h-1 bg-brand-surface rounded-lg appearance-none cursor-pointer accent-brand-accent"
                />
              </div>

              {/* Corner Roundedness */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold uppercase tracking-wider text-brand-text-muted/80">Corners</span>
                  <span className="font-mono font-bold text-brand-text">{cornerRadius}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={32}
                  step={1}
                  value={cornerRadius}
                  onChange={(e) => setCornerRadius(parseInt(e.target.value))}
                  className="w-full h-1 bg-brand-surface rounded-lg appearance-none cursor-pointer accent-brand-accent"
                />
              </div>

              {/* Simulated Window Chrome Frame Type */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-brand-text-muted/80 block">Window Header Style</label>
                <div className="grid grid-cols-2 gap-1">
                  {(['none', 'macos-dark', 'macos-light', 'windows-dark', 'windows-light'] as WindowChromeId[]).map((chrome) => {
                    const isActive = windowChrome === chrome;
                    return (
                      <button
                        key={chrome}
                        type="button"
                        onClick={() => setWindowChrome(chrome)}
                        className={`py-1 px-1.5 rounded-lg border text-[9px] font-bold text-center transition-all ${
                          isActive 
                            ? 'border-brand-accent bg-brand-surface text-brand-text shadow-sm' 
                            : 'border-brand-border text-brand-text-muted bg-brand-card hover:bg-brand-surface hover:text-brand-text'
                        }`}
                      >
                        {chrome === 'none' && 'No Header'}
                        {chrome === 'macos-dark' && 'macOS Dark'}
                        {chrome === 'macos-light' && 'macOS Light'}
                        {chrome === 'windows-dark' && 'Win Dark'}
                        {chrome === 'windows-light' && 'Win Light'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Shadow blur */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold uppercase tracking-wider text-brand-text-muted/80">Outer Shadow</span>
                  <span className="font-mono font-bold text-brand-text">{shadowIntensity}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={2}
                  value={shadowIntensity}
                  onChange={(e) => setShadowIntensity(parseInt(e.target.value))}
                  className="w-full h-1 bg-brand-surface rounded-lg appearance-none cursor-pointer accent-brand-accent"
                />
              </div>
            </div>

          </div>



        </div>

      </div>

    </div>
  );
}
