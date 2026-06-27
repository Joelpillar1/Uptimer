import { useState, useEffect, useRef } from 'react';
import {
  RecordingStatus,
  VideoResolution,
  VideoFPS,
  VideoFormat,
  PiPPosition,
  CameraShape,
  RecorderConfig,
  KeyboardShortcuts,
  RecordingItem,
  ScreenshotItem,
} from '../types';
import {
  Monitor,
  Video,
  Mic,
  MicOff,
  Camera,
  Play,
  Square,
  Pause,
  RotateCcw,
  Settings,
  Sliders,
  Sparkles,
  Download,
  Trash2,
  Volume2,
  FileVideo,
  Grid,
  Info,
  Clock,
  HardDrive,
  Scissors,
  CheckCircle2,
  RefreshCw,
  Keyboard
} from 'lucide-react';
import AudioVisualizer from './AudioVisualizer';
import ShortcutSettings from './ShortcutSettings';
import ScreenshotGallery from './ScreenshotGallery';
import VideoTrimmer from './VideoTrimmer';

export default function RecorderDashboard() {
  // --- 1. CONFIGURATION STATES ---
  const [config, setConfig] = useState<RecorderConfig>({
    resolution: '4k',
    fps: 60,
    format: 'webm',
    micEnabled: true,
    cameraEnabled: false,
    pipPosition: 'bottom-right',
    cameraShape: 'circle',
    countdownDuration: 3,
    videoBitRate: 35000000, // 35 Mbps default
    audioBitRate: 320000,   // 320 Kbps master audio default
    sourceType: 'screen',
  });

  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const [shortcuts, setShortcuts] = useState<KeyboardShortcuts>({
    startStop: 'Alt+R',
    pauseResume: 'Alt+P',
    screenshot: 'Alt+S',
    toggleMic: 'Alt+M',
    toggleCamera: 'Alt+C',
  });

  // Load shortcuts from localStorage on start
  useEffect(() => {
    const savedShortcuts = localStorage.getItem('screen_recorder_shortcuts');
    if (savedShortcuts) {
      try {
        setShortcuts(JSON.parse(savedShortcuts));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleUpdateShortcuts = (newShortcuts: KeyboardShortcuts) => {
    setShortcuts(newShortcuts);
    localStorage.setItem('screen_recorder_shortcuts', JSON.stringify(newShortcuts));
  };

  const handleResetShortcuts = () => {
    const defaults = {
      startStop: 'Alt+R',
      pauseResume: 'Alt+P',
      screenshot: 'Alt+S',
      toggleMic: 'Alt+M',
      toggleCamera: 'Alt+C',
    };
    handleUpdateShortcuts(defaults);
  };

  // --- 2. RECORDING STATE ENGINE ---
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [countdown, setCountdown] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [estimatedSize, setEstimatedSize] = useState(0);
  const [activeReviewItem, setActiveReviewItem] = useState<RecordingItem | null>(null);

  // Lists of captures
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);

  // UI Tabs / Panels
  const [sidebarTab, setSidebarTab] = useState<'source' | 'settings' | 'shortcuts'>('source');

  // Toasts
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    setIsInIframe(typeof window !== 'undefined' && window.self !== window.top);
  }, []);

  // Stream state for clean conditional rendering of video element
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (mainPreviewVideoRef.current) {
      mainPreviewVideoRef.current.srcObject = activeStream;
      if (activeStream) {
        mainPreviewVideoRef.current.muted = true;
        mainPreviewVideoRef.current.play().catch((e) => console.log('Autoplay play error:', e));
      }
    }
  }, [activeStream]);

  // --- 3. REF OBJECTS FOR WEBRTC AND RENDERING ---
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const compositeStreamRef = useRef<MediaStream | null>(null);
  
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const mainPreviewVideoRef = useRef<HTMLVideoElement | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const renderLoopIdRef = useRef<number | null>(null);

  // Media Recording Ref Objects
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const actualMimeTypeRef = useRef<string>('');
  const timerIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isSharingRef = useRef(false);

  // --- Toast Trigger helper ---
  const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- 4. STREAM MANAGEMENT AND COMPOSITING ---

  // Stop all active streams
  const stopAllStreams = () => {
    if (renderLoopIdRef.current) {
      cancelAnimationFrame(renderLoopIdRef.current);
      renderLoopIdRef.current = null;
    }
    
    // Stop all tracks
    [screenStreamRef, cameraStreamRef, micStreamRef, compositeStreamRef].forEach((streamRef) => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    });

    if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
    if (mainPreviewVideoRef.current) mainPreviewVideoRef.current.srcObject = null;

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    isSharingRef.current = false;
    setActiveStream(null);
  };

  const ensureCameraStream = async (): Promise<boolean> => {
    let cameraStream = cameraStreamRef.current;
    const isCameraActive = cameraStream && cameraStream.getTracks().some(t => t.readyState === 'live');
    if (isCameraActive) {
      return true;
    }

    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      });
      cameraStreamRef.current = cameraStream;

      // Setup/update camera video element
      let cameraVideoElement = cameraVideoRef.current;
      if (!cameraVideoElement) {
        cameraVideoElement = document.createElement('video');
        cameraVideoElement.autoplay = true;
        cameraVideoElement.playsInline = true;
        cameraVideoElement.muted = true;
        cameraVideoRef.current = cameraVideoElement;
      }
      cameraVideoElement.srcObject = cameraStream;

      await new Promise<void>((resolve) => {
        cameraVideoElement!.onloadedmetadata = () => {
          cameraVideoElement!.play().then(() => resolve()).catch(() => resolve());
        };
      });
      return true;
    } catch (camErr) {
      console.warn('Webcam permission or access denied:', camErr);
      triggerToast('Webcam access denied. Camera layout disabled.', 'error');
      return false;
    }
  };

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  };

  // Start Live Preview Sharing
  const startSharing = async (isManualToggle = true): Promise<boolean> => {
    // Selective cleanup of composited canvas rendering and audio contexts to avoid memory leaks
    if (renderLoopIdRef.current) {
      cancelAnimationFrame(renderLoopIdRef.current);
      renderLoopIdRef.current = null;
    }
    if (compositeStreamRef.current) {
      compositeStreamRef.current.getTracks().forEach((track) => {
        // Only stop if this track is not part of the active screen/camera/mic source streams
        const isScreenTrack = screenStreamRef.current?.getTracks().includes(track);
        const isCameraTrack = cameraStreamRef.current?.getTracks().includes(track);
        const isMicTrack = micStreamRef.current?.getTracks().includes(track);
        if (!isScreenTrack && !isCameraTrack && !isMicTrack) {
          track.stop();
        }
      });
      compositeStreamRef.current = null;
    }
    if (mainPreviewVideoRef.current) {
      mainPreviewVideoRef.current.srcObject = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    triggerToast('Configuring media streams...', 'info');

    try {
      // 1. Get Screen / Display Media (if sourceType is 'screen')
      let screenStream = screenStreamRef.current;
      const isScreenActive = screenStream && screenStream.getTracks().some(t => t.readyState === 'live');

      if (config.sourceType !== 'camera') {
        if (isScreenActive) {
          console.log('Reusing active screen sharing stream');
        } else {
          if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());
            screenStreamRef.current = null;
          }

          const resConstraints: any = {
            video: {
              width: config.resolution === '4k' ? { ideal: 3840 } : config.resolution === '1440p' ? { ideal: 2560 } : config.resolution === '1080p' ? { ideal: 1920 } : { ideal: 1280 },
              height: config.resolution === '4k' ? { ideal: 2160 } : config.resolution === '1440p' ? { ideal: 1440 } : config.resolution === '1080p' ? { ideal: 1080 } : { ideal: 720 },
              frameRate: { ideal: config.fps },
            },
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
          };

          screenStream = await navigator.mediaDevices.getDisplayMedia(resConstraints);
          screenStreamRef.current = screenStream;

          // Listen for browser native 'Stop sharing' click
          screenStream.getVideoTracks()[0].onended = () => {
            triggerToast('Screen sharing stopped from browser.', 'info');
            stopSharingAndSave(true); // Stop cleanly
          };
        }
      } else {
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(t => t.stop());
          screenStreamRef.current = null;
        }
        screenStream = null;
      }

      // 2. Get Microphone (if enabled)
      let micStream = micStreamRef.current;
      const isMicActive = micStream && micStream.getTracks().some(t => t.readyState === 'live');

      if (config.micEnabled) {
        if (isMicActive) {
          console.log('Reusing active microphone stream');
        } else {
          if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(t => t.stop());
            micStreamRef.current = null;
          }
          try {
            micStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            });
            micStreamRef.current = micStream;
          } catch (micErr) {
            console.warn('Microphone permission or access denied:', micErr);
            triggerToast('Microphone access denied. Recording without mic.', 'error');
            micStream = null;
          }
        }
      } else {
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach(t => t.stop());
          micStreamRef.current = null;
        }
        micStream = null;
      }

      // 3. Get Webcam/Camera (if enabled OR we are in camera-only mode)
      if (config.cameraEnabled || config.sourceType === 'camera') {
        await ensureCameraStream();
      }

      // 4. Setup screen helper video elements to draw onto Canvas
      let screenVideoElement: HTMLVideoElement | null = null;
      if (screenStream) {
        if (screenVideoRef.current && screenVideoRef.current.srcObject === screenStream) {
          screenVideoElement = screenVideoRef.current;
        } else {
          screenVideoElement = document.createElement('video');
          screenVideoElement.autoplay = true;
          screenVideoElement.playsInline = true;
          screenVideoElement.muted = true;
          screenVideoElement.srcObject = screenStream;
          screenVideoRef.current = screenVideoElement;
          
          await new Promise<void>((resolve) => {
            screenVideoElement!.onloadedmetadata = () => {
              screenVideoElement!.play().then(() => resolve()).catch(() => resolve());
            };
          });
        }
      }

      // 5. Build Mixed Audio context
      const audioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new audioContextClass();
      audioContextRef.current = audioCtx;

      const audioDestination = audioCtx.createMediaStreamDestination();

      // Connect screen audio if present
      if (screenStream) {
        const screenAudioTracks = screenStream.getAudioTracks();
        if (screenAudioTracks.length > 0) {
          const screenAudioSource = audioCtx.createMediaStreamSource(new MediaStream([screenAudioTracks[0]]));
          screenAudioSource.connect(audioDestination);
        }
      }

      // Connect microphone if present
      if (micStream && micStream.getAudioTracks().length > 0) {
        const micAudioSource = audioCtx.createMediaStreamSource(new MediaStream([micStream.getAudioTracks()[0]]));
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = 1.2;
        micAudioSource.connect(gainNode);
        gainNode.connect(audioDestination);
      }

      // 6. Setup Canvas Compositor OR Direct Record
      isSharingRef.current = true;
      
      let finalVideoStream: MediaStream;

      if (config.sourceType === 'camera') {
        const cameraStream = cameraStreamRef.current;
        if (!cameraStream) {
          throw new Error('Camera stream is required for Camera Only mode');
        }
        finalVideoStream = cameraStream;
      } else {
        // ALWAYS use Canvas Compositor for Screen Mode to support seamless live camera overlay toggle!
        const canvas = document.createElement('canvas');
        
        // Match the video capture dimensions
        const capWidth = screenVideoElement ? screenVideoElement.videoWidth || 1920 : 1920;
        const capHeight = screenVideoElement ? screenVideoElement.videoHeight || 1080 : 1080;
        canvas.width = capWidth;
        canvas.height = capHeight;
        canvasRef.current = canvas;
        
        const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
        if (!ctx) throw new Error('Failed to get 2D canvas context');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        canvasCtxRef.current = ctx;

        // Compositor render frame loop
        const drawComposedFrame = () => {
          if (!isSharingRef.current || !canvasRef.current || !canvasCtxRef.current) return;

          const c = canvasRef.current;
          const context = canvasCtxRef.current;

          // 1. Draw base display screen
          if (screenVideoRef.current && screenVideoRef.current.readyState >= 2) {
            context.drawImage(screenVideoRef.current, 0, 0, c.width, c.height);
          } else {
            context.fillStyle = '#0f0e0d';
            context.fillRect(0, 0, c.width, c.height);
          }

          // 2. Draw Camera PIP Overlay if camera active and enabled
          if (configRef.current.cameraEnabled && cameraVideoRef.current && cameraStreamRef.current && cameraVideoRef.current.readyState >= 2) {
            // PIP sizing calculation
            const pipW = Math.round(c.width * 0.18);
            const pipH = Math.round(pipW * 0.75); // 4:3 standard aspect ratio crop
            const padding = Math.round(c.width * 0.02);

            let pipX = c.width - pipW - padding;
            let pipY = c.height - pipH - padding;

            if (configRef.current.pipPosition === 'top-left') {
              pipX = padding;
              pipY = padding;
            } else if (configRef.current.pipPosition === 'top-right') {
              pipX = c.width - pipW - padding;
              pipY = padding;
            } else if (configRef.current.pipPosition === 'bottom-left') {
              pipX = padding;
              pipY = c.height - pipH - padding;
            }

            context.save();
            if (configRef.current.cameraShape === 'circle') {
              const radius = Math.min(pipW, pipH) / 2;
              const cx = pipX + pipW / 2;
              const cy = pipY + pipH / 2;
              
              context.beginPath();
              context.arc(cx, cy, radius, 0, Math.PI * 2);
              context.clip();

              context.drawImage(cameraVideoRef.current, cx - radius, cy - radius, radius * 2, radius * 2);
            } else {
              const radius = 16;
              context.beginPath();
              context.roundRect(pipX, pipY, pipW, pipH, radius);
              context.clip();
              context.drawImage(cameraVideoRef.current, pipX, pipY, pipW, pipH);
            }
            context.restore();

            // Draw clean border stroke
            context.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            context.lineWidth = Math.round(c.width * 0.002) || 2;
            context.beginPath();
            if (configRef.current.cameraShape === 'circle') {
              const radius = Math.min(pipW, pipH) / 2;
              const cx = pipX + pipW / 2;
              const cy = pipY + pipH / 2;
              context.arc(cx, cy, radius, 0, Math.PI * 2);
            } else {
              const radius = 16;
              context.roundRect(pipX, pipY, pipW, pipH, radius);
            }
            context.stroke();
          }

          // Continue render frame at screen refresh rate
          renderLoopIdRef.current = requestAnimationFrame(drawComposedFrame);
        };

        // Start render loop
        drawComposedFrame();

        // Capture stream of composited canvas
        finalVideoStream = canvas.captureStream(config.fps);
      }

      // 7. Combine the composited video track with mixed audio track
      const outputStream = new MediaStream();
      finalVideoStream.getVideoTracks().forEach((track) => outputStream.addTrack(track));
      
      const mixedAudioTracks = audioDestination.stream.getAudioTracks();
      if (mixedAudioTracks.length > 0 && (config.micEnabled || screenStream)) {
        outputStream.addTrack(mixedAudioTracks[0]);
      } else if (finalVideoStream.getAudioTracks().length > 0) {
        outputStream.addTrack(finalVideoStream.getAudioTracks()[0]);
      }

      compositeStreamRef.current = outputStream;
      setActiveStream(outputStream);

      if (isManualToggle) {
        triggerToast('Video and audio sources connected successfully!', 'success');
      }
      return true;

    } catch (err: any) {
      console.error('Error starting screen capture:', err);
      let errMsg = err.message || 'Error accessing screenshare.';
      if (err.name === 'SecurityError' || err.message?.includes('permissions policy') || err.message?.includes('display-capture')) {
        errMsg = 'Screen sharing is restricted in this embedded preview iframe. Please click the "Open in new tab" icon at the top right of the preview to record your screen!';
      }
      triggerToast(errMsg, 'error');
      stopAllStreams();
      return false;
    }
  };

  // --- 5. COUNTDOWN & CAPTURING CORE ---

  const startCountdownAndRecord = async () => {
    // 1. Ensure stream is active, or attempt to auto-start sharing
    if (!compositeStreamRef.current) {
      const active = await startSharing(false);
      if (!active) return;
    }

    if (config.countdownDuration > 0) {
      setStatus('countdown');
      setCountdown(config.countdownDuration);
      
      const countInterval = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countInterval);
            triggerRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      triggerRecording();
    }
  };

  const triggerRecording = () => {
    if (!compositeStreamRef.current) return;
    
    setStatus('recording');
    setRecordingTime(0);
    setEstimatedSize(0);
    recordedChunksRef.current = [];

    // Formats mapping with robust browser-supported codec detection
    let mimeType = '';
    const candidates: string[] = [];

    if (config.format === 'webm') {
      candidates.push('video/webm;codecs=vp9,opus', 'video/webm;codecs=h264,opus', 'video/webm;codecs=vp8,opus', 'video/webm');
    } else if (config.format === 'webm-h264') {
      candidates.push('video/webm;codecs=h264,opus', 'video/webm');
    } else if (config.format === 'webm-vp8') {
      candidates.push('video/webm;codecs=vp8,opus', 'video/webm');
    } else if (config.format === 'mp4') {
      candidates.push('video/mp4;codecs=avc1,mp4a', 'video/mp4;codecs=h264,aac', 'video/mp4', 'video/quicktime');
    }

    for (const cand of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(cand)) {
        mimeType = cand;
        break;
      }
    }

    // Universal browser fallbacks if candidates aren't natively supported
    if (!mimeType) {
      const globalFallbacks = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=h264,opus',
        'video/webm',
        'video/mp4',
        'video/quicktime'
      ];
      for (const fb of globalFallbacks) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(fb)) {
          mimeType = fb;
          break;
        }
      }
    }

    // Set premium studio-grade bitrates
    let dynamicVideoBitRate = 10000000; // 10 Mbps baseline
    let dynamicAudioBitRate = 192000;   // 192 Kbps baseline

    if (config.resolution === '4k') {
      dynamicVideoBitRate = 35000000;   // 35 Mbps ProRes-like Cinematic Master
      dynamicAudioBitRate = 320000;     // 320 Kbps Audiophile Master quality
    } else if (config.resolution === '1440p') {
      dynamicVideoBitRate = 18000000;   // 18 Mbps Quad HD Retina
      dynamicAudioBitRate = 256000;     // 256 Kbps High Fidelity Studio
    } else if (config.resolution === '1080p') {
      dynamicVideoBitRate = 10000000;   // 10 Mbps Full HD Premium
      dynamicAudioBitRate = 192000;     // 192 Kbps CD quality
    } else {
      dynamicVideoBitRate = 5000000;    // 5 Mbps HD Balanced
      dynamicAudioBitRate = 128000;     // 128 Kbps Standard
    }

    // Boost bit budget for butter-smooth 60fps high-motion frames
    if (config.fps === 60) {
      dynamicVideoBitRate = Math.round(dynamicVideoBitRate * 1.5);
    }

    const recorderOptions = mimeType ? {
      mimeType,
      videoBitsPerSecond: dynamicVideoBitRate,
      audioBitsPerSecond: dynamicAudioBitRate,
    } : {
      videoBitsPerSecond: dynamicVideoBitRate,
      audioBitsPerSecond: dynamicAudioBitRate,
    };

    try {
      const recorder = new MediaRecorder(compositeStreamRef.current, recorderOptions);
      mediaRecorderRef.current = recorder;
      actualMimeTypeRef.current = mimeType || recorder.mimeType || '';

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          // Accumulate estimated size in real-time
          setEstimatedSize((prev) => prev + event.data.size);
        }
      };

      recorder.onstop = () => {
        compileAndSaveRecording();
      };

      // Record in chunks of 1 second for size updates
      recorder.start(1000);

      // Start elapsed timer
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      triggerToast('Recording started! Capture active.', 'success');

    } catch (e: any) {
      console.error('Failed to initialize MediaRecorder:', e);
      triggerToast('Format not supported. Starting default fallback recorder.', 'error');
      
      // Fallback
      try {
        const recorder = new MediaRecorder(compositeStreamRef.current);
        mediaRecorderRef.current = recorder;
        actualMimeTypeRef.current = recorder.mimeType || '';
        
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
            setEstimatedSize((prev) => prev + event.data.size);
          }
        };
        recorder.onstop = () => compileAndSaveRecording();
        recorder.start(1000);
        
        timerIntervalRef.current = window.setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      } catch (err) {
        triggerToast('Could not initialize recording engine.', 'error');
        setStatus('idle');
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && status === 'recording') {
      mediaRecorderRef.current.pause();
      setStatus('paused');
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      triggerToast('Recording paused.', 'info');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && status === 'paused') {
      mediaRecorderRef.current.resume();
      setStatus('recording');
      
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      
      triggerToast('Recording resumed.', 'success');
    }
  };

  const stopSharingAndSave = (isBrowserTrigger = false) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && (status === 'recording' || status === 'paused')) {
      mediaRecorderRef.current.stop();
    } else {
      setStatus('idle');
      stopAllStreams();
    }

    if (!isBrowserTrigger) {
      triggerToast('Recording completed! Processing file.', 'success');
    }
  };

  const compileAndSaveRecording = () => {
    if (recordedChunksRef.current.length === 0) {
      triggerToast('No video frames captured.', 'error');
      setStatus('idle');
      stopAllStreams();
      return;
    }

    let type = mediaRecorderRef.current?.mimeType || actualMimeTypeRef.current || 'video/webm';
    
    // Ensure accurate browser playback capability for generated Blobs (e.g., Safari requires MP4)
    const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (!type || type.includes('webm') && isSafari) {
      type = 'video/mp4';
    }

    const blob = new Blob(recordedChunksRef.current, { type });
    const url = URL.createObjectURL(blob);
    
    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = new Date().toISOString().split('T')[0];

    const newItem: RecordingItem = {
      id: crypto.randomUUID(),
      name: `recording-${dateStr}-${timestampStr.replace(/[\s:]/g, '_')}`,
      blob,
      url,
      duration: recordingTime,
      timestamp: `${dateStr} ${timestampStr}`,
      size: blob.size,
      format: type.split(';')[0].replace('video/', '').toUpperCase(),
      resolution: `${config.resolution.toUpperCase()} (${config.fps}fps)`,
    };

    setRecordings((prev) => [newItem, ...prev]);
    setActiveReviewItem(newItem);
    setStatus('review');
    
    // Stop streams now that file is saved
    stopAllStreams();
  };

  // --- 6. SCREENSHOT CAPTURER ---

  const takeScreenshot = async () => {
    // 1. If screen isn't sharing yet, offer quick immediate screenshot capture
    let needsCleanup = false;
    if (!compositeStreamRef.current) {
      triggerToast('Initiating quick capture shot...', 'info');
      const active = await startSharing(false);
      if (!active) return;
      needsCleanup = true;
      // Small timeout to allow canvas/stream frames to establish
      await new Promise(r => setTimeout(r, 400));
    }

    try {
      const canvas = document.createElement('canvas');
      let w = 1920;
      let h = 1080;

      // Use actual video element or canvas sizing if present
      if (canvasRef.current) {
        w = canvasRef.current.width;
        h = canvasRef.current.height;
      } else if (mainPreviewVideoRef.current) {
        w = mainPreviewVideoRef.current.videoWidth || 1920;
        h = mainPreviewVideoRef.current.videoHeight || 1080;
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw exactly what's on display with maximum clarity
      if (canvasRef.current) {
        // Drawing composite canvas
        ctx.drawImage(canvasRef.current, 0, 0);
      } else if (mainPreviewVideoRef.current) {
        // Draw direct stream video frame
        ctx.drawImage(mainPreviewVideoRef.current, 0, 0, w, h);
      }

      const dataUrl = canvas.toDataURL('image/png');
      const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = new Date().toISOString().split('T')[0];

      const newShot: ScreenshotItem = {
        id: crypto.randomUUID(),
        name: `screenshot-${dateStr}-${timestampStr.replace(/[\s:]/g, '_')}.png`,
        dataUrl,
        timestamp: `${dateStr} ${timestampStr}`,
      };

      setScreenshots((prev) => [newShot, ...prev]);
      triggerToast('Pristine high-fidelity screenshot saved & copied!', 'success');

      // Auto-copy to clipboard if ClipboardItem is supported
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ]);
      } catch (e) {
        // Fallback write dataurl text
        navigator.clipboard.writeText(dataUrl).catch(() => {});
      }

    } catch (e) {
      console.error(e);
      triggerToast('Could not snap screenshot.', 'error');
    } finally {
      if (needsCleanup) {
        stopAllStreams();
      }
    }
  };

  // --- 7. KEYBOARD SHORTCUTS INTERCEPTOR ---

  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Skip if editing forms/inputs
      const activeElem = document.activeElement;
      if (
        activeElem &&
        (activeElem.tagName === 'INPUT' ||
          activeElem.tagName === 'TEXTAREA' ||
          activeElem.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      const keysPressed: string[] = [];
      if (e.ctrlKey) keysPressed.push('Ctrl');
      if (e.metaKey) keysPressed.push('Meta');
      if (e.altKey) keysPressed.push('Alt');
      if (e.shiftKey) keysPressed.push('Shift');

      const mainKey = e.key;
      if (
        mainKey !== 'Control' &&
        mainKey !== 'Alt' &&
        mainKey !== 'Shift' &&
        mainKey !== 'Meta'
      ) {
        if (mainKey === ' ') {
          keysPressed.push('Space');
        } else {
          keysPressed.push(mainKey.toUpperCase());
        }
      }

      const shortcutString = keysPressed.join('+').toLowerCase();

      // Start / Stop Shortcut
      if (shortcutString === shortcuts.startStop.toLowerCase()) {
        e.preventDefault();
        if (status === 'recording' || status === 'paused') {
          stopSharingAndSave();
        } else {
          startCountdownAndRecord();
        }
      }

      // Pause / Resume Shortcut
      if (shortcutString === shortcuts.pauseResume.toLowerCase()) {
        e.preventDefault();
        if (status === 'recording') {
          pauseRecording();
        } else if (status === 'paused') {
          resumeRecording();
        }
      }

      // Screenshot Shortcut
      if (shortcutString === shortcuts.screenshot.toLowerCase()) {
        e.preventDefault();
        takeScreenshot();
      }

      // Toggle Mic Shortcut
      if (shortcutString === shortcuts.toggleMic.toLowerCase()) {
        e.preventDefault();
        setConfig((prev) => {
          const toggled = !prev.micEnabled;
          triggerToast(`Microphone input ${toggled ? 'Enabled' : 'Disabled'}. Re-establishing preview...`, 'info');
          return { ...prev, micEnabled: toggled };
        });
      }

      // Toggle Camera Shortcut
      if (shortcutString === shortcuts.toggleCamera.toLowerCase()) {
        e.preventDefault();
        setConfig((prev) => {
          const toggled = !prev.cameraEnabled;
          triggerToast(`Webcam Overlay ${toggled ? 'Enabled' : 'Disabled'}. Re-establishing preview...`, 'info');
          return { ...prev, cameraEnabled: toggled };
        });
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalShortcuts, true);
    };
  }, [shortcuts, status, config]);

  // Restart streams if core parameters change
  useEffect(() => {
    if (isSharingRef.current && status === 'idle') {
      startSharing(false);
    }
  }, [config.sourceType, config.micEnabled, config.resolution, config.fps]);

  // Dynamic camera toggle handling in real-time
  useEffect(() => {
    const handleDynamicCameraToggle = async () => {
      if (!isSharingRef.current) return;

      if (config.sourceType !== 'camera') {
        if (config.cameraEnabled) {
          const success = await ensureCameraStream();
          if (success) {
            triggerToast('Webcam overlay enabled successfully!', 'success');
          }
        } else {
          stopCameraStream();
          triggerToast('Webcam overlay disabled.', 'info');
        }
      }
    };

    handleDynamicCameraToggle();
  }, [config.cameraEnabled, config.sourceType]);

  // --- MEDIA SESSION & SILENT AUDIO BRIDGE FOR BACKGROUND/GLOBAL KEYS ---
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const pauseRecordingRef = useRef(pauseRecording);
  const resumeRecordingRef = useRef(resumeRecording);
  const stopSharingAndSaveRef = useRef(stopSharingAndSave);
  const takeScreenshotRef = useRef(takeScreenshot);

  useEffect(() => {
    pauseRecordingRef.current = pauseRecording;
    resumeRecordingRef.current = resumeRecording;
    stopSharingAndSaveRef.current = stopSharingAndSave;
    takeScreenshotRef.current = takeScreenshot;
  });

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (status === 'recording' || status === 'paused') {
      // Create and play silent loop audio element to keep background media session active
      if (!silentAudioRef.current) {
        const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
        audio.loop = true;
        silentAudioRef.current = audio;
      }
      
      if (status === 'recording') {
        silentAudioRef.current.play().catch((err) => {
          console.warn('Silent audio play blocked:', err);
        });
        navigator.mediaSession.playbackState = 'playing';
      } else {
        silentAudioRef.current.pause();
        navigator.mediaSession.playbackState = 'paused';
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Screen Recording Session',
        artist: 'Active Recorder',
        album: status === 'recording' ? '🔴 Recording...' : '⏸️ Paused',
        artwork: [
          { src: 'https://cdn-icons-png.flaticon.com/512/5278/5278658.png', sizes: '512x512', type: 'image/png' }
        ]
      });

      // Register Media Key actions
      try {
        navigator.mediaSession.setActionHandler('play', () => {
          resumeRecordingRef.current();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          pauseRecordingRef.current();
        });
        navigator.mediaSession.setActionHandler('stop', () => {
          stopSharingAndSaveRef.current(false);
        });
        // Previous Track & Next Track media keys can trigger screenshot capture!
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          takeScreenshotRef.current();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          takeScreenshotRef.current();
        });
      } catch (err) {
        console.warn('Error setting mediaSession action handlers:', err);
      }
    } else {
      // Idle or review, turn off background media session gracefully
      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
        silentAudioRef.current.currentTime = 0;
      }
      try {
        navigator.mediaSession.playbackState = 'none';
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('stop', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
      } catch (e) {
        // ignore
      }
    }
  }, [status]);

  // --- 8. ACTIONS ON COMPLETED CAPTURES ---

  const handleDownloadItem = (item: RecordingItem, ext = 'webm') => {
    const link = document.createElement('a');
    link.href = item.url;
    link.download = `${item.name}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast(`File downloading in .${ext} format!`, 'success');
  };

  const handleExportAsAudio = (item: RecordingItem) => {
    // Standard browsers stream recorded blobs in container formats.
    // Exporting just the audio is as simple as creating an audio/ogg or audio/webm download link using the original blob.
    const audioBlob = new Blob([item.blob], { type: 'audio/mp3' });
    const audioUrl = URL.createObjectURL(audioBlob);
    
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `${item.name}-audio-track.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Extracted Audio track downloaded successfully!', 'success');
  };

  const handleDeleteItem = (id: string) => {
    setRecordings((prev) => prev.filter((r) => r.id !== id));
    if (activeReviewItem?.id === id) {
      setActiveReviewItem(null);
      setStatus('idle');
    }
    triggerToast('Recording removed from session.', 'info');
  };

  const handleSaveTrimmed = (trimmedBlob: Blob, duration: number) => {
    if (!activeReviewItem) return;

    const trimmedUrl = URL.createObjectURL(trimmedBlob);
    const updatedRecordings = recordings.map((r) => {
      if (r.id === activeReviewItem.id) {
        return {
          ...r,
          blob: trimmedBlob,
          url: trimmedUrl,
          duration: Math.round(duration),
          size: trimmedBlob.size,
          isTrimmed: true,
        };
      }
      return r;
    });

    setRecordings(updatedRecordings);
    
    const updatedItem = updatedRecordings.find(r => r.id === activeReviewItem.id);
    if (updatedItem) {
      setActiveReviewItem(updatedItem);
    }
    
    triggerToast('Video trimmed & re-compiled successfully!', 'success');
  };

  // Format Helper: Bytes to human format
  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Format Helper: Seconds to MM:SS
  const formatSecs = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-wrapper">
      {/* LEFT COLUMN: ACTIVE SCREEN VIEW / REVIEW PLATFORM (8 COLS) */}
      <div className="lg:col-span-8 flex flex-col space-y-5">
        
        {isInIframe && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-xs animate-fade-in" id="iframe-permission-alert">
            <div className="mt-0.5 text-amber-500">
              <Info size={16} />
            </div>
            <div className="flex-1 space-y-1">
              <p className="font-semibold text-amber-500">Iframe Permissions Restriction Detected</p>
              <p className="text-brand-text-muted leading-relaxed">
                Most web browsers block screen capture (<code>getDisplayMedia</code>) inside embedded previews. 
                Please click the <span className="text-amber-500 font-semibold underline">"Open in new tab"</span> button at the top right of your preview pane to record your screen smoothly!
              </p>
            </div>
          </div>
        )}

        {/* Main Workspace Frame */}
        <div className="relative rounded-xl bg-[#12110F] border border-brand-border overflow-hidden shadow-sm flex flex-col" style={{ minHeight: '440px' }} id="primary-workspace">
          
          {/* Work Space Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border bg-brand-surface text-brand-text">
            <div className="flex items-center space-x-2">
              <span className="flex h-2 w-2 relative">
                {status === 'recording' ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-accent"></span>
                  </>
                ) : (
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${compositeStreamRef.current ? 'bg-emerald-600' : 'bg-brand-text-muted/40'}`}></span>
                )}
              </span>
              <span className="text-xs font-medium tracking-tight text-brand-text">
                {status === 'idle' ? 'Live Stream' : status === 'recording' ? 'Recording' : status === 'paused' ? 'Paused' : status === 'countdown' ? 'Countdown' : 'Review Capture'}
              </span>
            </div>

            {/* Quick config display */}
            <div className="flex items-center space-x-2 text-[10px] font-mono text-brand-text-muted">
              <span className="px-1.5 py-0.5 rounded bg-brand-card border border-brand-border">
                {config.resolution.toUpperCase()}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-brand-card border border-brand-border">
                {config.fps} FPS
              </span>
            </div>
          </div>

          {/* Active Preview Area */}
          <div className="relative flex-1 bg-black flex items-center justify-center min-h-[340px]">
            {/* Review mode video player */}
            {status === 'review' && activeReviewItem ? (
              <div className="w-full h-full flex flex-col justify-between">
                <div className="flex-1 max-h-[440px] relative bg-black flex items-center justify-center p-2">
                  <video
                    src={activeReviewItem.url}
                    controls
                    playsInline
                    muted
                    preload="metadata"
                    className="max-h-[380px] w-full rounded-lg object-contain shadow-lg"
                    id="review-video-player"
                  />
                </div>
              </div>
            ) : (
              // Active Camera / Display Preview feed
              <div className="w-full h-full relative flex items-center justify-center">
                {activeStream && (
                  <video
                    ref={mainPreviewVideoRef}
                    className="w-full h-full max-h-[460px] object-contain block"
                    id="main-stream-view"
                    playsInline
                    muted
                    preload="none"
                  />
                )}

                {/* Placeholder when idle/disconnected */}
                {!activeStream && status === 'idle' && (
                  <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent">
                      <Monitor size={22} />
                    </div>
                    <div>
                      <h4 className="font-serif font-medium text-slate-100 text-sm">No Active Screen Source</h4>
                    </div>
                    <button
                      onClick={() => startSharing(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-lg text-xs font-medium shadow-sm transition-all duration-150 active:scale-95"
                    >
                      <Video size={14} />
                      <span>Connect Screen / Camera</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Countdown Screen overlay */}
            {status === 'countdown' && (
              <div className="absolute inset-0 bg-[#12110F]/95 flex flex-col items-center justify-center z-40">
                <div className="text-brand-accent font-serif text-6xl md:text-7xl font-semibold">
                  {countdown}
                </div>
              </div>
            )}
          </div>

          {/* Controls bar */}
          <div className="px-4 py-3 bg-brand-surface border-t border-brand-border flex flex-col md:flex-row items-center justify-between gap-3">
            
            <div className="flex items-center space-x-3">
              {status === 'recording' || status === 'paused' ? (
                <div className="flex items-center space-x-2 text-xs">
                  <div className="flex items-center space-x-1 px-2.5 py-1 bg-brand-accent/10 border border-brand-accent/20 text-brand-accent rounded-lg font-mono">
                    <span className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-pulse mr-1" />
                    <span>{formatSecs(recordingTime)}</span>
                  </div>
                  <div className="flex items-center space-x-1 px-2.5 py-1 bg-brand-card border border-brand-border text-brand-text-muted rounded-lg font-mono">
                    <span>{formatBytes(estimatedSize)}</span>
                  </div>
                </div>
              ) : (
                <div className="w-1.5 h-1.5 bg-brand-text-muted/40 rounded-full" />
              )}

              {/* Real-time Audio wave */}
              <div className="w-28 md:w-36">
                <AudioVisualizer stream={compositeStreamRef.current} isActive={status === 'recording' || compositeStreamRef.current !== null} />
              </div>
            </div>

            {/* Core Action triggers */}
            <div className="flex items-center space-x-2">
              {status === 'idle' && (
                <>
                  <button
                    onClick={takeScreenshot}
                    className="p-2 bg-brand-card hover:bg-brand-surface text-brand-text rounded-lg border border-brand-border transition-all"
                    title="Take Snapshot"
                  >
                    <Camera size={15} />
                  </button>
                  {compositeStreamRef.current && (
                    <button
                      onClick={stopAllStreams}
                      className="px-3 py-1.5 bg-brand-card hover:bg-brand-surface border border-brand-border text-brand-text text-xs font-medium rounded-lg transition"
                    >
                      Disconnect Source
                    </button>
                  )}
                  <button
                    onClick={startCountdownAndRecord}
                    className="flex items-center space-x-1.5 px-4 py-1.5 bg-brand-accent hover:bg-brand-accent-hover text-white text-xs font-semibold rounded-lg transition shadow-sm"
                  >
                    <Play size={12} className="fill-white" />
                    <span>Start Recording</span>
                  </button>
                </>
              )}

              {status === 'recording' && (
                <>
                  <button
                    onClick={takeScreenshot}
                    className="p-2 bg-brand-card hover:bg-brand-surface text-brand-text rounded-lg border border-brand-border transition"
                    title="Snapshot"
                  >
                    <Camera size={15} />
                  </button>
                  <button
                    onClick={pauseRecording}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-brand-card hover:bg-brand-surface text-brand-text text-xs font-medium rounded-lg border border-brand-border transition"
                  >
                    <Pause size={12} />
                    <span>Pause</span>
                  </button>
                  <button
                    onClick={() => stopSharingAndSave(false)}
                    className="flex items-center space-x-1.5 px-4 py-1.5 bg-brand-accent hover:bg-brand-accent-hover text-white text-xs font-semibold rounded-lg transition"
                  >
                    <Square size={12} className="fill-white" />
                    <span>Stop & Save</span>
                  </button>
                </>
              )}

              {status === 'paused' && (
                <>
                  <button
                    onClick={resumeRecording}
                    className="flex items-center space-x-1 px-3.5 py-1.5 bg-[#191919] text-white text-xs font-semibold rounded-lg transition"
                  >
                    <Play size={12} className="fill-white" />
                    <span>Resume</span>
                  </button>
                  <button
                    onClick={() => stopSharingAndSave(false)}
                    className="flex items-center space-x-1.5 px-4 py-1.5 bg-brand-accent hover:bg-brand-accent-hover text-white text-xs font-semibold rounded-lg transition"
                  >
                    <Square size={12} className="fill-white" />
                    <span>Stop</span>
                  </button>
                </>
              )}

              {status === 'review' && activeReviewItem && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setStatus('idle');
                      setActiveReviewItem(null);
                      startSharing(false);
                    }}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-brand-card hover:bg-brand-surface text-brand-text text-xs font-medium rounded-lg border border-brand-border transition"
                  >
                    <RotateCcw size={12} />
                    <span>Record New</span>
                  </button>
                  <button
                    onClick={() => handleExportAsAudio(activeReviewItem)}
                    className="px-3 py-1.5 bg-brand-surface border border-brand-border text-brand-text hover:bg-brand-surface/80 text-xs font-medium rounded-lg transition"
                  >
                    Extract MP3
                  </button>
                  <button
                    onClick={() => handleDownloadItem(activeReviewItem)}
                    className="flex items-center space-x-1.5 px-4 py-1.5 bg-[#191919] hover:bg-brand-accent text-white text-xs font-semibold rounded-lg transition shadow-sm"
                  >
                    <Download size={12} />
                    <span>Save Video</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Trimmer Video Editor layout if in Review Deck */}
        {status === 'review' && activeReviewItem && (
          <VideoTrimmer
            recording={activeReviewItem}
            onSaveTrimmed={handleSaveTrimmed}
          />
        )}

        {/* SCREENSHOTS CONTAINER */}
        <ScreenshotGallery
          screenshots={screenshots}
          onDeleteScreenshot={(id) => setScreenshots((prev) => prev.filter((s) => s.id !== id))}
          onClearAll={() => setScreenshots([])}
        />
      </div>

      {/* RIGHT COLUMN: CONTROL PANEL, SETTINGS, AND HISTORY (4 COLS) */}
      <div className="lg:col-span-4 flex flex-col space-y-5">
        
        {/* Toggleable Control Panel */}
        <div className="bg-brand-card rounded-xl border border-brand-border p-5 relative flex flex-col shadow-sm" id="side-controls">
          <div className="flex items-center space-x-1 bg-brand-surface p-1 rounded-lg mb-4 border border-brand-border">
            <button
              onClick={() => setSidebarTab('source')}
              className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sidebarTab === 'source' ? 'bg-brand-text text-brand-bg shadow-sm' : 'text-brand-text-muted hover:text-brand-text'
              }`}
            >
              <Video size={12} />
              <span>Source</span>
            </button>
            <button
              onClick={() => setSidebarTab('shortcuts')}
              className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sidebarTab === 'shortcuts' ? 'bg-brand-text text-brand-bg shadow-sm' : 'text-brand-text-muted hover:text-brand-text'
              }`}
            >
              <Keyboard size={12} />
              <span>Shortcuts</span>
            </button>
            <button
              onClick={() => setSidebarTab('settings')}
              className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sidebarTab === 'settings' ? 'bg-brand-text text-brand-bg shadow-sm' : 'text-brand-text-muted hover:text-brand-text'
              }`}
            >
              <Settings size={12} />
              <span>Settings</span>
            </button>
          </div>

          {/* TAB 1: SOURCE CONFIG */}
          {sidebarTab === 'source' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-brand-text-muted block mb-1.5">Recording Source</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setConfig((prev) => ({ ...prev, sourceType: 'screen' }))}
                    className={`flex items-center justify-center space-x-1.5 p-2 rounded-lg border text-xs font-medium transition-all ${
                      config.sourceType !== 'camera'
                        ? 'bg-brand-surface border-brand-accent/30 text-brand-text font-semibold'
                        : 'bg-brand-card border-brand-border text-brand-text-muted hover:bg-brand-surface/50'
                    }`}
                  >
                    <Monitor size={14} />
                    <span>Screen Share</span>
                  </button>
                  <button
                    onClick={() => setConfig((prev) => ({ ...prev, sourceType: 'camera' }))}
                    className={`flex items-center justify-center space-x-1.5 p-2 rounded-lg border text-xs font-medium transition-all ${
                      config.sourceType === 'camera'
                        ? 'bg-brand-surface border-brand-accent/30 text-brand-text font-semibold'
                        : 'bg-brand-card border-brand-border text-brand-text-muted hover:bg-brand-surface/50'
                    }`}
                  >
                    <Video size={14} />
                    <span>Webcam Only</span>
                  </button>
                </div>
              </div>

              {config.sourceType !== 'camera' ? (
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-brand-text-muted block mb-1.5">Stream Layout</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setConfig((prev) => ({ ...prev, cameraEnabled: false }))}
                      className={`flex items-center justify-center space-x-1.5 p-2 rounded-lg border text-xs font-medium transition-all ${
                        !config.cameraEnabled
                          ? 'bg-brand-surface border-brand-accent/30 text-brand-text font-semibold'
                          : 'bg-brand-card border-brand-border text-brand-text-muted hover:bg-brand-surface/50'
                      }`}
                    >
                      <Monitor size={14} />
                      <span>Screen Only</span>
                    </button>
                    <button
                      onClick={() => setConfig((prev) => ({ ...prev, cameraEnabled: true }))}
                      className={`flex items-center justify-center space-x-1.5 p-2 rounded-lg border text-xs font-medium transition-all ${
                        config.cameraEnabled
                          ? 'bg-brand-surface border-brand-accent/30 text-brand-text font-semibold'
                          : 'bg-brand-card border-brand-border text-brand-text-muted hover:bg-brand-surface/50'
                      }`}
                    >
                      <Video size={14} />
                      <span>Screen + Camera</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] text-brand-text-muted leading-relaxed">
                  <p>
                    <span className="font-semibold text-emerald-500">Iframe Ready:</span> Recording via your local camera & mic is fully allowed and operational directly within this preview!
                  </p>
                </div>
              )}

              {/* Toggles */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-brand-text-muted block">Inputs</span>
                
                {/* Mic Toggle */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-brand-surface/60 border border-brand-border">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1 rounded ${config.micEnabled ? 'text-brand-accent' : 'text-brand-text-muted'}`}>
                      {config.micEnabled ? <Mic size={14} /> : <MicOff size={14} />}
                    </div>
                    <span className="text-xs font-medium text-brand-text">Microphone Input</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.micEnabled}
                      onChange={(e) => setConfig((prev) => ({ ...prev, micEnabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-brand-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-brand-border after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-brand-accent" />
                  </label>
                </div>

                {/* System Audio Tip */}
                <div className="p-2.5 bg-brand-surface/40 border border-brand-border rounded-lg text-[10px] text-brand-text-muted leading-relaxed">
                  <p>
                    <span className="font-semibold text-brand-text">Tip:</span> Ensure <span className="text-brand-accent">"Share system audio"</span> is checked in the browser window to capture application sounds.
                  </p>
                </div>
              </div>

              {/* Camera Configurations (only show if webcam overlay enabled) */}
              {config.cameraEnabled && (
                <div className="space-y-3 p-3 bg-brand-surface/40 border border-brand-border rounded-lg animate-fade-in">
                  <span className="text-[10px] font-semibold text-brand-text block pb-1 border-b border-brand-border/60">Camera Overlay</span>
                  
                  {/* Shape Selection */}
                  <div>
                    <span className="text-[9px] text-brand-text-muted block mb-1 font-mono uppercase">Shape</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setConfig((prev) => ({ ...prev, cameraShape: 'circle' }))}
                        className={`py-1 text-center text-xs rounded-lg font-medium border transition-all ${
                          config.cameraShape === 'circle' ? 'bg-brand-surface border-brand-accent/30 text-brand-text font-semibold' : 'bg-brand-card border-brand-border text-brand-text-muted'
                        }`}
                      >
                        Circle
                      </button>
                      <button
                        onClick={() => setConfig((prev) => ({ ...prev, cameraShape: 'square' }))}
                        className={`py-1 text-center text-xs rounded-lg font-medium border transition-all ${
                          config.cameraShape === 'square' ? 'bg-brand-surface border-brand-accent/30 text-brand-text font-semibold' : 'bg-brand-card border-brand-border text-brand-text-muted'
                        }`}
                      >
                        Rectangle
                      </button>
                    </div>
                  </div>

                  {/* Corner Position selection */}
                  <div>
                    <span className="text-[9px] text-brand-text-muted block mb-1 font-mono uppercase font-medium">Position</span>
                    <div className="grid grid-cols-2 gap-1.5 text-center text-[11px]">
                      {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as PiPPosition[]).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => setConfig((prev) => ({ ...prev, pipPosition: pos }))}
                          className={`py-1 rounded-lg border font-medium capitalize transition-all ${
                            config.pipPosition === pos ? 'bg-brand-surface border-brand-accent/30 text-brand-text font-semibold' : 'bg-brand-card border-brand-border text-brand-text-muted'
                          }`}
                        >
                          {pos.replace('-', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: KEYBOARD SHORTCUTS */}
          {sidebarTab === 'shortcuts' && (
            <ShortcutSettings
              shortcuts={shortcuts}
              onUpdateShortcuts={handleUpdateShortcuts}
              onResetShortcuts={handleResetShortcuts}
            />
          )}

          {/* TAB 3: GENERAL SETTINGS */}
          {sidebarTab === 'settings' && (
            <div className="space-y-4 animate-fade-in text-xs text-brand-text">
              {/* Output Resolution */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-brand-text-muted block mb-1.5">Video Quality</label>
                <select
                  value={config.resolution}
                  onChange={(e) => setConfig((prev) => ({ ...prev, resolution: e.target.value as VideoResolution }))}
                  className="w-full p-2 rounded-lg bg-brand-card border border-brand-border text-xs text-brand-text focus:outline-none focus:border-brand-accent font-medium"
                >
                  <option value="4k">ProRes 4K Cinematic Master (Ultra HD)</option>
                  <option value="1440p">Quad HD Retina Studio (1440p)</option>
                  <option value="1080p">Full HD Premium (1080p)</option>
                  <option value="720p">HD Balanced (720p)</option>
                </select>
              </div>

              {/* Frame Rate Selection */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-brand-text-muted block mb-1.5">Frame Rate</label>
                <div className="grid grid-cols-2 gap-2">
                  {[30, 60].map((fps) => (
                    <button
                      key={fps}
                      onClick={() => setConfig((prev) => ({ ...prev, fps: fps as VideoFPS }))}
                      className={`py-1.5 font-medium text-center rounded-lg border text-xs transition-all ${
                        config.fps === fps ? 'bg-brand-surface border-brand-accent/30 text-brand-text font-semibold' : 'bg-brand-card border-brand-border text-brand-text-muted'
                      }`}
                    >
                      {fps} FPS
                    </button>
                  ))}
                </div>
              </div>

              {/* Countdown duration */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-brand-text-muted block mb-1.5">Delay Countdown</label>
                <select
                  value={config.countdownDuration}
                  onChange={(e) => setConfig((prev) => ({ ...prev, countdownDuration: parseInt(e.target.value) }))}
                  className="w-full p-2 rounded-lg bg-brand-card border border-brand-border text-xs text-brand-text focus:outline-none focus:border-brand-accent font-medium"
                >
                  <option value={0}>No Delay</option>
                  <option value={3}>3 Seconds</option>
                  <option value={5}>5 Seconds</option>
                  <option value={10}>10 Seconds</option>
                </select>
              </div>

              {/* Video Codec Format */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-brand-text-muted block mb-1.5">Video Format</label>
                <select
                  value={config.format}
                  onChange={(e) => setConfig((prev) => ({ ...prev, format: e.target.value as VideoFormat }))}
                  className="w-full p-2 rounded-lg bg-brand-card border border-brand-border text-xs text-brand-text focus:outline-none focus:border-brand-accent font-medium"
                >
                  <option value="webm">WebM (VP9 - Recommended)</option>
                  <option value="webm-h264">WebM (H.264 - Compatible)</option>
                  <option value="webm-vp8">WebM (VP8 - Legacy)</option>
                  <option value="mp4">MP4 (Safari Native)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* SESSION RECORDINGS LIST (SIDEBAR LOGS) */}
        <div className="bg-brand-card rounded-xl border border-brand-border p-5 relative flex flex-col shadow-sm" id="recordings-history">
          <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-brand-border/60">
            <div className="p-1.5 bg-brand-accent/10 rounded-lg text-brand-accent">
              <FileVideo size={16} />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-brand-text">Recordings</h3>
            </div>
          </div>

          {/* List items */}
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 flex-1">
            {recordings.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-8">
                <FileVideo size={18} className="text-brand-text-muted mb-2 opacity-50" />
                <span className="text-xs text-brand-text-muted">No recordings yet</span>
              </div>
            ) : (
              recordings.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => {
                    setActiveReviewItem(rec);
                    setStatus('review');
                  }}
                  className={`group p-2.5 rounded-lg bg-brand-surface/40 border hover:border-brand-accent/40 transition duration-200 cursor-pointer ${
                    activeReviewItem?.id === rec.id && status === 'review'
                      ? 'border-brand-accent bg-brand-surface/85'
                      : 'border-brand-border'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      <div className="p-2 bg-brand-surface border border-brand-border rounded-lg text-brand-text-muted group-hover:text-brand-accent transition-all">
                        <FileVideo size={14} />
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-xs font-medium text-brand-text truncate max-w-[130px]" title={rec.name}>
                          {rec.name}
                        </h4>
                        <div className="flex items-center space-x-1.5 text-[10px] text-brand-text-muted font-mono mt-0.5">
                          <span>{formatSecs(rec.duration)}</span>
                          <span>•</span>
                          <span>{formatBytes(rec.size)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                      {rec.isTrimmed && (
                        <span className="px-1 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[9px] font-mono mr-1">
                          TRIMMED
                        </span>
                      )}
                      <button
                        onClick={() => handleDownloadItem(rec)}
                        className="p-1 hover:bg-brand-surface hover:text-brand-accent text-brand-text-muted rounded transition"
                        title="Download file"
                      >
                        <Download size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(rec.id)}
                        className="p-1 hover:bg-rose-50 hover:text-rose-600 text-brand-text-muted rounded transition"
                        title="Delete recording"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* FIXED FLOATING NOTIFICATION TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 flex items-center space-x-2 px-3.5 py-2.5 bg-brand-text text-brand-bg text-xs rounded-lg shadow-lg z-50">
          <span className={`w-1.5 h-1.5 rounded-full ${toast.type === 'success' ? 'bg-emerald-400' : toast.type === 'error' ? 'bg-rose-400' : 'bg-brand-accent'}`} />
          <span className="font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
