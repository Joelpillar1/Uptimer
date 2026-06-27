import { useState, useRef, useEffect } from 'react';
import { RecordingItem } from '../types';
import { Play, Pause, Scissors, Download, Film, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

interface VideoTrimmerProps {
  recording: RecordingItem;
  onSaveTrimmed: (trimmedBlob: Blob, duration: number) => void;
}

export default function VideoTrimmer({ recording, onSaveTrimmed }: VideoTrimmerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(recording.duration || 0);
  
  // Trimming states (in seconds)
  const [startTrim, setStartTrim] = useState(0);
  const [endTrim, setEndTrim] = useState(recording.duration || 10);
  const [isTrimming, setIsTrimming] = useState(false);
  const [trimProgress, setTrimProgress] = useState(0);
  const [trimError, setTrimError] = useState<string | null>(null);

  // Synchronize duration once metadata loads
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      if (videoDuration && !isNaN(videoDuration)) {
        setDuration(videoDuration);
        setEndTrim(videoDuration);
      }
    }
  };

  useEffect(() => {
    // Reset trimmer if recording changes
    setStartTrim(0);
    setDuration(recording.duration || 0);
    setEndTrim(recording.duration || 10);
    setIsPlaying(false);
    setTrimError(null);
  }, [recording]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        // If current time is outside trim bounds, seek to startTrim first
        if (currentTime < startTrim || currentTime > endTrim) {
          videoRef.current.currentTime = startTrim;
        }
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);

      // Loop or stop if exceeds endTrim
      if (time >= endTrim) {
        videoRef.current.pause();
        setIsPlaying(false);
        videoRef.current.currentTime = startTrim;
      }
    }
  };

  const handleStartTrimChange = (val: number) => {
    const newVal = Math.min(val, endTrim - 0.5); // At least 0.5s segment
    setStartTrim(newVal);
    if (videoRef.current) {
      videoRef.current.currentTime = newVal;
      setCurrentTime(newVal);
    }
  };

  const handleEndTrimChange = (val: number) => {
    const newVal = Math.max(val, startTrim + 0.5);
    setEndTrim(newVal);
    if (videoRef.current) {
      videoRef.current.currentTime = newVal;
      setCurrentTime(newVal);
    }
  };

  // Canvas and Web Audio-based re-recorder for 100% Client-Side Trimming!
  const startClientSideTrimming = async () => {
    if (isTrimming) return;
    setIsTrimming(true);
    setTrimProgress(0);
    setTrimError(null);

    try {
      const originalBlob = recording.blob;
      const trimDuration = endTrim - startTrim;

      // 1. Create a clean hidden video element
      const tempVideo = document.createElement('video');
      tempVideo.src = URL.createObjectURL(originalBlob);
      tempVideo.muted = false; // We need audio track
      tempVideo.playsInline = true;
      
      await new Promise((resolve) => {
        tempVideo.onloadedmetadata = resolve;
      });

      const width = tempVideo.videoWidth || 1280;
      const height = tempVideo.videoHeight || 720;

      // 2. Create Canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not create canvas 2D context.');
      }

      // 3. Set up Web Audio for capturing video's audio output
      const audioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new audioContextClass();
      
      const source = audioCtx.createMediaElementSource(tempVideo);
      const destination = audioCtx.createMediaStreamDestination();
      
      // Connect to destination so it gets recorded, and also to speakers (or muted)
      source.connect(destination);
      
      // OPTIONAL: connect source to speakers so user can monitor if they wish. 
      // To keep it silent & fast, we can avoid connecting to audioCtx.destination, which is awesome!
      // source.connect(audioCtx.destination); 

      // 4. Capture Canvas stream and merge with destination audio track
      const canvasStream = canvas.captureStream(30); // 30fps target for trimming rendering
      const audioTrack = destination.stream.getAudioTracks()[0];
      
      const mixedStream = new MediaStream();
      canvasStream.getVideoTracks().forEach(track => mixedStream.addTrack(track));
      if (audioTrack) {
        mixedStream.addTrack(audioTrack);
      }

      // 5. Setup MediaRecorder
      const options = { mimeType: 'video/webm;codecs=vp9,opus' };
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(mixedStream, options);
      } catch (e) {
        recorder = new MediaRecorder(mixedStream, { mimeType: 'video/webm' });
      }

      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      let processInterval: number | null = null;

      recorder.onstop = () => {
        if (processInterval) clearInterval(processInterval);
        
        // Clean up audio
        audioCtx.close();
        
        const trimmedBlob = new Blob(chunks, { type: recording.blob.type });
        onSaveTrimmed(trimmedBlob, trimDuration);
        setIsTrimming(false);
        setTrimProgress(100);
      };

      // 6. Seek to start time
      tempVideo.currentTime = startTrim;
      
      await new Promise<void>((resolve) => {
        tempVideo.onseeked = () => {
          resolve();
        };
      });

      // 7. Start recording and playback
      recorder.start();
      tempVideo.play();

      // Ensure audio context is running (needed due to browser user-gesture restrictions)
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      // 8. Render loop
      const frameDuration = 1000 / 30; // ~33ms
      processInterval = window.setInterval(() => {
        if (tempVideo.paused || tempVideo.ended || tempVideo.currentTime >= endTrim) {
          tempVideo.pause();
          recorder.stop();
          if (processInterval) clearInterval(processInterval);
          return;
        }

        // Draw frame
        ctx.drawImage(tempVideo, 0, 0, width, height);

        // Calculate progress
        const currentProgress = ((tempVideo.currentTime - startTrim) / trimDuration) * 100;
        setTrimProgress(Math.min(Math.round(currentProgress), 99));
      }, frameDuration);

    } catch (err: any) {
      console.error('Trimming failed:', err);
      setTrimError(err.message || 'Browser failed to re-render segment.');
      setIsTrimming(false);
    }
  };

  // Format seconds to MM:SS
  const formatTime = (timeInSecs: number) => {
    if (isNaN(timeInSecs)) return '00:00';
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-brand-card rounded-xl border border-brand-border p-5 relative shadow-sm" id="video-trimmer">
      <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-brand-border/60">
        <div className="p-1.5 bg-brand-accent/10 rounded-lg text-brand-accent">
          <Scissors size={18} />
        </div>
        <div>
          <h3 className="font-serif font-semibold text-brand-text">Video Trimmer</h3>
        </div>
      </div>

      {/* Main Player Display */}
      <div className="relative rounded-lg overflow-hidden bg-black aspect-video mb-4 border border-brand-border shadow-sm group">
        <video
          ref={videoRef}
          src={recording.url}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          className="w-full h-full object-contain cursor-pointer"
          onClick={togglePlay}
          id="trimmer-video-player"
          playsInline
          muted
          preload="metadata"
        />

        {/* Big play button overlay */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-12 h-12 bg-[#191919]/90 hover:bg-brand-accent text-white rounded-full flex items-center justify-center shadow transition-all duration-150 active:scale-95"
          >
            <Play size={20} className="ml-1 fill-white" />
          </button>
        )}

        {/* Duration HUD */}
        <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/85 border border-brand-border/40 text-[9px] font-mono rounded text-white">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Editor Controls & Dual Slider */}
      <div className="space-y-4">
        {/* Bounds Display */}
        <div className="grid grid-cols-3 text-xs font-mono text-brand-text select-none px-1">
          <div className="text-left">
            <span className="text-[9px] uppercase text-brand-text-muted block font-sans">Start Point</span>
            <span className="text-brand-accent font-semibold text-xs">{formatTime(startTrim)}</span>
          </div>
          <div className="text-center">
            <span className="text-[9px] uppercase text-brand-text-muted block font-sans">Selected Range</span>
            <span className="text-brand-text font-bold text-xs">
              {formatTime(endTrim - startTrim)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[9px] uppercase text-brand-text-muted block font-sans">End Point</span>
            <span className="text-brand-accent font-semibold text-xs">{formatTime(endTrim)}</span>
          </div>
        </div>

        {/* Dual Range Sliders Container */}
        <div className="relative h-6 flex items-center bg-brand-surface border border-brand-border rounded-lg px-2">
          {/* Active timeline bar */}
          <div 
            className="absolute h-1 bg-brand-accent/35 rounded"
            style={{
              left: `${(startTrim / duration) * 100}%`,
              right: `${100 - (endTrim / duration) * 100}%`
            }}
          />

          {/* Current playhead bar */}
          <div 
            className="absolute w-0.5 h-3.5 bg-brand-text/60 z-10 pointer-events-none"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />

          {/* Slider Inputs */}
          <input
            type="range"
            min={0}
            max={duration || 10}
            step={0.1}
            value={startTrim}
            onChange={(e) => handleStartTrimChange(parseFloat(e.target.value))}
            className="absolute w-full h-1 opacity-100 bg-transparent appearance-none pointer-events-auto cursor-pointer z-20 
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-accent [&::-webkit-slider-thumb]:cursor-col-resize"
          />

          <input
            type="range"
            min={0}
            max={duration || 10}
            step={0.1}
            value={endTrim}
            onChange={(e) => handleEndTrimChange(parseFloat(e.target.value))}
            className="absolute w-full h-1 opacity-100 bg-transparent appearance-none pointer-events-auto cursor-pointer z-20
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-text [&::-webkit-slider-thumb]:cursor-col-resize"
          />
        </div>

        {/* Trigger Button & State Display */}
        <div className="flex items-center space-x-2 pt-1">
          <button
            onClick={togglePlay}
            className="flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-brand-surface hover:bg-brand-surface/80 text-brand-text text-xs font-semibold rounded-lg border border-brand-border transition-all"
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            <span>{isPlaying ? 'Pause' : 'Preview Cut'}</span>
          </button>

          <button
            onClick={startClientSideTrimming}
            disabled={isTrimming || endTrim <= startTrim}
            className="flex-1 flex items-center justify-center space-x-1.5 px-4 py-1.5 bg-[#191919] hover:bg-brand-accent disabled:bg-brand-text-muted/20 text-white disabled:text-brand-text-muted text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed"
          >
            {isTrimming ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                <span>Trimming ({trimProgress}%)</span>
              </>
            ) : (
              <>
                <Scissors size={12} />
                <span>Export Trimmed Slice</span>
              </>
            )}
          </button>
        </div>

        {/* Trimming Overlay Loader */}
        {isTrimming && (
          <div className="p-3 bg-brand-surface border border-brand-border rounded-lg space-y-2 animate-pulse">
            <div className="flex items-center justify-between text-xs text-brand-text">
              <span className="font-semibold flex items-center space-x-1.5">
                <Sparkles size={12} className="text-brand-accent" />
                <span>Re-rendering segment...</span>
              </span>
              <span className="font-mono text-brand-accent">{trimProgress}%</span>
            </div>
            <div className="w-full h-1 bg-brand-border rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand-accent transition-all duration-300"
                style={{ width: `${trimProgress}%` }}
              />
            </div>
          </div>
        )}

        {trimError && (
          <div className="flex items-start space-x-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-rose-600" />
            <p>
              <span className="font-bold">Error:</span> {trimError}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
