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
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);

  // Filter presets based on selected tab
  const filteredPresets = PRESETS.filter(p => p.type === activeTab);

  // Sync video duration when loaded
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || recording.duration || 15);
    }
  };

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
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

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
    blurLevel: ImageBlurLevel
  ) => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

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
    const rawVideoW = videoEl?.videoWidth || 1280;
    const rawVideoH = videoEl?.videoHeight || 720;
    const videoRatio = rawVideoW / rawVideoH;

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

    // --- 3. DRAW INNER CARD SOFT SHADOW ---
    if (shadowBlurVal > 0) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = Math.round(shadowBlurVal * (canvasWidth / 1000));
      ctx.shadowOffsetY = Math.max(2, Math.round(shadowBlurVal * 0.3 * (canvasWidth / 1000)));
      ctx.fillStyle = '#18181b';
      
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, radius);
      ctx.fill();
      ctx.restore();
    }

    // --- 4. CLIPPED PATH & DRAW WINDOW CHROME WINDOW ---
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, radius);
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
    if (videoEl && videoEl.readyState >= 2) {
      ctx.drawImage(videoEl, videoX, videoY, drawW, drawH);
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
    const canvas = canvasRef.current;
    const video = videoRef.current;

    const render = () => {
      if (canvas && video) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
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
            imageBlur
          );
        }
      }
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [selectedBg, activeTab, paddingSize, windowChrome, cornerRadius, shadowIntensity, aspectRatio, imageBlur, customImageEl]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
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

      // Target Canvas Output resolution based on Aspect Ratio selection
      let outW = 1920;
      let outH = 1080;

      if (aspectRatio === '9-16') {
        outW = 1080;
        outH = 1920;
      } else if (aspectRatio === '1-1') {
        outW = 1080;
        outH = 1080;
      } else if (aspectRatio === 'original') {
        outW = exportVideo.videoWidth || 1920;
        outH = exportVideo.videoHeight || 1080;
      }

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = outW;
      exportCanvas.height = outH;
      const exportCtx = exportCanvas.getContext('2d');
      if (!exportCtx) throw new Error('Could not initialize canvas rendering context.');

      // Capture audio context
      const audioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new audioContextClass();
      
      const audioSource = audioCtx.createMediaElementSource(exportVideo);
      const audioDestination = audioCtx.createMediaStreamDestination();
      audioSource.connect(audioDestination);

      // Create mixed video/audio stream
      const canvasStream = exportCanvas.captureStream(30); // 30 FPS target
      const audioTrack = audioDestination.stream.getAudioTracks()[0];

      const mixedStream = new MediaStream();
      canvasStream.getVideoTracks().forEach(track => mixedStream.addTrack(track));
      if (audioTrack) {
        mixedStream.addTrack(audioTrack);
      }

      // Record Media
      let recorder: MediaRecorder;
      const mimeOptions = { mimeType: 'video/webm;codecs=vp9,opus' };
      try {
        recorder = new MediaRecorder(mixedStream, mimeOptions);
      } catch (e) {
        recorder = new MediaRecorder(mixedStream, { mimeType: 'video/webm' });
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
          imageBlur
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

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg text-brand-text font-sans animate-fade-in" id="canvas-studio-workspace">
      
      {/* 1. TOP HEADER NAVIGATION BAR */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-brand-border bg-brand-card" id="studio-header">
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
      <div className="grid grid-cols-1 lg:grid-cols-12 flex-1" id="studio-grid">
        
        {/* LEFT COLUMN: ACTIVE VIEWING CANVAS & PLAYBACK TIMELINE (9 COLS) */}
        <div className="lg:col-span-9 p-6 flex flex-col space-y-4" id="studio-editor-pane">
          
          {/* Canvas Presentation Frame */}
          <div className="relative flex-1 bg-brand-surface/40 rounded-2xl border border-brand-border flex items-center justify-center p-8 min-h-[340px] shadow-inner" id="canvas-presentation-frame">
            
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
                width={1280}
                height={720}
                className="max-h-full max-w-full object-contain bg-black"
                id="render-canvas"
              />
              
              {/* Playback center overlay */}
              {!isPlaying && (
                <button
                  onClick={togglePlay}
                  className="absolute inset-0 m-auto w-14 h-14 bg-black/80 hover:bg-[#191919] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all duration-150 active:scale-95 animate-pulse"
                >
                  <Play size={20} className="ml-1 fill-white" />
                </button>
              )}
            </div>

            {/* Hidden Video Source Object */}
            <video
              ref={videoRef}
              src={recording.url}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              className="hidden"
              playsInline
              muted={isMuted}
              loop
              preload="metadata"
            />
          </div>

          {/* PLAYBACK CONTROL HUD BAR */}
          <div className="flex items-center space-x-4 px-4 py-3 bg-brand-card border border-brand-border rounded-xl shadow-sm" id="playback-controls-hud">
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
          <div className="bg-brand-card border border-brand-border rounded-xl p-4 shadow-sm space-y-3" id="timeline-panel">
            
            {/* Toolbar Buttons row */}
            <div className="flex items-center justify-between pb-1" id="timeline-toolbar">
              <div className="flex items-center space-x-1.5">
                <button 
                  onClick={handleAddZoom}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-brand-surface border border-brand-border hover:bg-brand-surface/80 text-brand-text text-[11px] font-semibold rounded-lg transition-colors"
                >
                  <Plus size={11} />
                  <span>Add a segment</span>
                </button>

                <div className="h-4 w-[1px] bg-brand-border mx-1" />

                <button 
                  className="p-1.5 hover:bg-brand-surface rounded-lg text-brand-text-muted hover:text-brand-text transition-colors"
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
                  className="w-16 h-1 bg-brand-surface appearance-none rounded-full accent-brand-accent" 
                />

                <button 
                  className="p-1.5 hover:bg-brand-surface rounded-lg text-brand-text-muted hover:text-brand-text transition-colors"
                  title="Zoom In"
                  onClick={() => setZoomLevel(prev => Math.min(10, prev + 1))}
                >
                  <Search size={12} className="opacity-100" />
                </button>

                <button className="p-1.5 hover:bg-rose-50 rounded-lg text-brand-text-muted hover:text-rose-500 transition-colors" title="Delete Clip">
                  <Trash2 size={12} />
                </button>

                <button className="p-1.5 hover:bg-brand-surface rounded-lg text-brand-text-muted hover:text-brand-text transition-colors" title="Undo">
                  <Undo2 size={12} />
                </button>

                <button className="p-1.5 hover:bg-brand-surface rounded-lg text-brand-text-muted hover:text-brand-text transition-colors" title="Redo">
                  <Redo2 size={12} />
                </button>
              </div>

              <button
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime = 0;
                  setCurrentTime(0);
                }}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-brand-surface border border-brand-border hover:bg-brand-surface/80 text-brand-text-muted text-[11px] font-semibold rounded-lg transition-colors"
              >
                <RotateCcw size={11} />
                <span>Reset timeline</span>
              </button>
            </div>

            {/* Timeline track viewport */}
            <div 
              ref={timelineRef}
              onClick={handleTimelineClick}
              className="relative bg-brand-surface/20 border border-brand-border/60 rounded-lg p-3 min-h-[90px] select-none overflow-x-hidden cursor-ew-resize"
              id="timeline-track-view"
            >
              {/* Top row: time tick markings */}
              <div className="relative h-6 w-full border-b border-brand-border/60">
                {renderTimelineTicks()}
              </div>

              {/* Bottom row: visual video track representation */}
              <div className="relative mt-3 h-10 w-full bg-brand-surface/55 rounded-md border border-brand-border overflow-hidden flex items-center justify-center">
                <div className="absolute inset-y-0 left-0 bg-brand-accent/5 w-full flex items-center pl-4 font-mono text-[10px] text-brand-text-muted font-semibold select-none">
                  {recording.name} (Source Capture)
                </div>
                
                {/* Simulated Waveform / Video frames track */}
                <div className="flex space-x-1 opacity-20 pointer-events-none">
                  {Array.from({ length: 48 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="w-[3px] bg-brand-text rounded-full" 
                      style={{ height: `${20 + Math.sin(i * 0.4) * 15}px` }}
                    />
                  ))}
                </div>
              </div>

              {/* brand-accent Playhead Line indicating current position */}
              <div 
                className="absolute top-0 bottom-0 w-[2px] bg-brand-accent pointer-events-none z-10 transition-all duration-75"
                style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
              >
                {/* Triangular head badge */}
                <div className="absolute -top-1 -left-[5px] w-[12px] h-[12px] bg-brand-accent clip-triangle shadow-xs" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
              </div>
            </div>
          </div>

          {/* Compile errors display */}
          {exportError && (
            <div className="flex items-start space-x-1.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 animate-fade-in">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-600" />
              <div>
                <span className="font-semibold">Rendering Matrix Error:</span>
                <p className="mt-0.5 leading-relaxed">{exportError}</p>
              </div>
            </div>
          )}

          {/* Export process banner */}
          {isExporting && (
            <div className="p-4 bg-brand-card border border-brand-border rounded-xl space-y-2 animate-pulse shadow-sm">
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
        <div className="lg:col-span-3 bg-brand-card border-l border-brand-border p-6 flex flex-col justify-between h-full overflow-y-auto" id="studio-sidebar">
          
          <div className="space-y-6">
            {/* Sidebar header */}
            <div className="flex items-center justify-between pb-4 border-b border-brand-border">
              <div className="flex items-center space-x-2">
                <Settings size={18} className="text-brand-text animate-spin-slow" />
                <h3 className="font-semibold text-brand-text text-sm">Canvas Settings</h3>
              </div>
              <button className="text-brand-text-muted hover:text-brand-text transition-colors">
                <MoreVertical size={16} />
              </button>
            </div>

            {/* 1. ASPECT RATIO BOX */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-text-muted/80 block">Canvas</span>
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-brand-text block">Aspect Ratio</label>
                
                <div className="relative">
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as AspectRatioId)}
                    className="w-full px-3 py-2 bg-brand-surface hover:bg-brand-surface/80 border border-brand-border rounded-lg text-xs font-semibold text-brand-text outline-none appearance-none cursor-pointer focus:border-brand-accent transition-all"
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
            <div className="space-y-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-text-muted/80 block">Background</span>
              
              {/* Category Segmented Controls */}
              <div className="flex items-center bg-brand-surface border border-brand-border p-0.5 rounded-lg" id="background-categories-tabs">
                <button
                  type="button"
                  onClick={() => { setActiveTab('image'); setSelectedBg('macos-sonoma'); }}
                  className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-md text-[10px] font-bold transition-all duration-150 ${
                    activeTab === 'image' ? 'bg-brand-accent text-white shadow-sm' : 'text-brand-text-muted hover:text-brand-text'
                  }`}
                >
                  <ImageIcon size={10} />
                  <span>Image</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('gradient'); setSelectedBg('sunset-aurora'); }}
                  className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-md text-[10px] font-bold transition-all duration-150 ${
                    activeTab === 'gradient' ? 'bg-brand-accent text-white shadow-sm' : 'text-brand-text-muted hover:text-brand-text'
                  }`}
                >
                  <Palette size={10} />
                  <span>Gradient</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('color'); setSelectedBg('flat-white'); }}
                  className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-md text-[10px] font-bold transition-all duration-150 ${
                    activeTab === 'color' ? 'bg-brand-accent text-white shadow-sm' : 'text-brand-text-muted hover:text-brand-text'
                  }`}
                >
                  <Paintbrush size={10} />
                  <span>Color</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('none'); setSelectedBg('none'); }}
                  className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-md text-[10px] font-bold transition-all duration-150 ${
                    activeTab === 'none' ? 'bg-brand-accent text-white shadow-sm' : 'text-brand-text-muted hover:text-brand-text'
                  }`}
                >
                  <EyeOff size={10} />
                  <span>None</span>
                </button>
              </div>

              {/* Backdrop Presets Grid */}
              {activeTab !== 'none' && (
                <div className="grid grid-cols-4 gap-2" id="backdrop-presets-grid">
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
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={triggerCustomImageUpload}
                  className="w-full flex items-center justify-center space-x-1.5 py-2.5 bg-brand-surface hover:bg-brand-surface/85 border border-dashed border-brand-border rounded-lg text-brand-text-muted text-[11px] font-semibold transition-all cursor-pointer"
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

            {/* 3. IMAGE BLUR VALUE */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-brand-text-muted/80 block">Image blur</label>
              
              <div className="relative">
                <select
                  value={imageBlur}
                  onChange={(e) => setImageBlur(e.target.value as ImageBlurLevel)}
                  className="w-full px-3 py-2 bg-brand-surface hover:bg-brand-surface/80 border border-brand-border rounded-lg text-xs font-semibold text-brand-text outline-none appearance-none cursor-pointer focus:border-brand-accent transition-all"
                >
                  <option value="none">None</option>
                  <option value="low">Low Blur (12px)</option>
                  <option value="moderate">Moderate Blur (28px)</option>
                  <option value="high">High Blur (60px)</option>
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-brand-text-muted">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>

            {/* 4. MARGINS AND CORNERS SLIDERS */}
            <div className="space-y-4 pt-1">
              {/* Padding */}
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
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
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-brand-text-muted/80 block">Window Header Style</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['none', 'macos-dark', 'macos-light', 'windows-dark', 'windows-light'] as WindowChromeId[]).map((chrome) => {
                    const isActive = windowChrome === chrome;
                    return (
                      <button
                        key={chrome}
                        type="button"
                        onClick={() => setWindowChrome(chrome)}
                        className={`py-1.5 px-2 rounded-lg border text-[9px] font-bold text-center transition-all ${
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
              <div className="space-y-1.5">
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

          {/* 5. ADD ZOOM ACTION BUTTON */}
          <div className="pt-6 border-t border-brand-border" id="zoom-action-block">
            <button
              type="button"
              onClick={handleAddZoom}
              className="w-full flex items-center justify-center space-x-1.5 py-3 bg-brand-accent hover:bg-brand-accent-hover active:scale-[0.98] text-white text-[11px] font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              id="add-zoom-btn"
            >
              <Plus size={14} />
              <span>Add Zoom</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
