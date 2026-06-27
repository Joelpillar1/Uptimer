import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  stream: MediaStream | null;
  isActive: boolean;
  type?: 'bars' | 'wave';
}

export default function AudioVisualizer({ stream, isActive, type = 'bars' }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive || !stream || stream.getAudioTracks().length === 0) {
      // Clean up if inactive or no audio track
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const initAudio = () => {
      try {
        // Create AudioContext
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioCtxRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = type === 'wave' ? 2048 : 256;
        analyserRef.current = analyser;

        // Try connecting the stream
        // Sometimes displayMedia audio tracks can cause secure-context restrictions, handle gracefully
        const source = audioCtx.createMediaStreamSource(stream);
        sourceRef.current = source;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const canvas = canvasRef.current;
        if (!canvas) return;
        const canvasCtx = canvas.getContext('2d');
        if (!canvasCtx) return;

        const draw = () => {
          if (!canvasCtx || !canvas || !analyserRef.current) return;

          animationRef.current = requestAnimationFrame(draw);

          const width = canvas.width;
          const height = canvas.height;

          // Read frequency data
          if (type === 'wave') {
            analyserRef.current.getByteTimeDomainData(dataArray);
            canvasCtx.fillStyle = 'rgba(12, 13, 18, 0.4)';
            canvasCtx.fillRect(0, 0, width, height);

            canvasCtx.lineWidth = 2;
            canvasCtx.strokeStyle = '#6366f1'; // Indigo-500
            canvasCtx.beginPath();

            const sliceWidth = width / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
              const v = dataArray[i] / 128.0;
              const y = (v * height) / 2;

              if (i === 0) {
                canvasCtx.moveTo(x, y);
              } else {
                canvasCtx.lineTo(x, y);
              }

              x += sliceWidth;
            }

            canvasCtx.lineTo(width, height / 2);
            canvasCtx.stroke();
          } else {
            // Bars visualizer
            analyserRef.current.getByteFrequencyData(dataArray);
            canvasCtx.clearRect(0, 0, width, height);

            const barWidth = (width / bufferLength) * 1.6;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
              barHeight = (dataArray[i] / 255) * height * 0.95;

              // Elegant Anthropic clay / charcoal gradient
              const gradient = canvasCtx.createLinearGradient(0, height, 0, height - barHeight);
              gradient.addColorStop(0, '#6B665E'); // Slate
              gradient.addColorStop(1, '#D96B43'); // Coral Accent

              canvasCtx.fillStyle = gradient;
              
              // Rounded bars
              const radius = 1;
              const y = height - barHeight;
              
              canvasCtx.beginPath();
              if (canvasCtx.roundRect) {
                canvasCtx.roundRect(x, y, barWidth - 1, barHeight, [radius, radius, 0, 0]);
              } else {
                canvasCtx.rect(x, y, barWidth - 1, barHeight);
              }
              canvasCtx.fill();

              x += barWidth;
            }
          }
        };

        draw();
      } catch (err) {
        console.warn('Audio Visualizer setup failed:', err);
      }
    };

    initAudio();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, [stream, isActive, type]);

  return (
    <div className="flex items-center space-x-2">
      <div className="relative w-full h-8 bg-brand-surface/55 rounded-lg border border-brand-border overflow-hidden flex items-center px-2">
        <canvas
          ref={canvasRef}
          width={280}
          height={32}
          className="w-full h-full block"
        />
        {!stream || stream.getAudioTracks().length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-[9px] font-sans font-medium text-brand-text-muted/70 uppercase tracking-widest bg-brand-surface/30 select-none">
            No Audio Signal
          </div>
        ) : null}
      </div>
    </div>
  );
}
