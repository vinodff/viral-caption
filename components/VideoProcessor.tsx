
import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Caption, StyleConfig, VideoProcessorRef } from '../types';

// Global cache to prevent "HTMLMediaElement already connected" errors
// This persists across React re-renders/StrictMode cycles for the same video element
const sourceCache = new WeakMap<HTMLVideoElement, MediaElementAudioSourceNode>();

interface VideoProcessorProps {
  videoSrc: string;
  captions: Caption[];
  styleConfig: StyleConfig;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  isExporting: boolean;
  onExportComplete: (url: string, mimeType: string) => void;
  onExportProgress: (progress: number) => void;
}

const VideoProcessor = forwardRef<VideoProcessorRef, VideoProcessorProps>(({
  videoSrc,
  captions,
  styleConfig,
  isPlaying,
  onTimeUpdate,
  onDurationChange,
  isExporting,
  onExportComplete,
  onExportProgress
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Store callbacks in refs to avoid useEffect re-triggering on parent re-renders
  const onExportCompleteRef = useRef(onExportComplete);
  const onExportProgressRef = useRef(onExportProgress);
  const onTimeUpdateRef = useRef(onTimeUpdate);

  useEffect(() => { onExportCompleteRef.current = onExportComplete; }, [onExportComplete]);
  useEffect(() => { onExportProgressRef.current = onExportProgress; }, [onExportProgress]);
  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate; }, [onTimeUpdate]);

  const [aspectRatio, setAspectRatio] = useState(9 / 16); // Default mobile

  // Expose captureFrame to parent
  useImperativeHandle(ref, () => ({
    captureFrame: () => {
      if (canvasRef.current) {
        return canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
      }
      return null;
    }
  }));

  // Helper to determine best supported MIME type
  const getBestMimeType = useCallback(() => {
    const types = [
      'video/webm;codecs=vp9,opus', // High quality WebM
      'video/webm;codecs=vp8,opus', // Broad compatibility WebM
      'video/webm;codecs=h264',
      'video/mp4', // Safari 
      'video/webm' // Generic fallback
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'video/webm'; // Fallback
  }, []);

  // Draw a single frame
  const drawFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw Video
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Find active caption
    const currentTime = video.currentTime;
    const activeCaption = captions.find(c => currentTime >= c.start && currentTime <= c.end);

    if (activeCaption) {
      const text = styleConfig.uppercase ? activeCaption.text.toUpperCase() : activeCaption.text;
      const fontSizePx = (canvas.height * styleConfig.fontSize) / 100;
      
      // Add fallback fonts for Native scripts (Telugu, Hindi, etc.)
      ctx.font = `900 ${fontSizePx}px "${styleConfig.fontFamily}", "Noto Sans Telugu", "Noto Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;

      const x = canvas.width / 2;
      const y = (canvas.height * styleConfig.yOffset) / 100;

      // Handle word wrapping
      const maxWidth = canvas.width * 0.9;
      const words = text.trim().split(/\s+/);
      let line = '';
      const lines = [];

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          lines.push(line);
          line = words[n] + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line);

      // Animation Logic
      let scale = 1;
      if (styleConfig.animation === 'pop') {
         // Pop in effect based on how far into the caption we are
         const duration = activeCaption.end - activeCaption.start;
         const progress = (currentTime - activeCaption.start) / duration;
         if (progress < 0.1) {
            scale = 0.8 + (progress * 2); // 0.8 -> 1.0
         } else {
            scale = 1;
         }
      }

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      // Draw Background Box if needed
      if (styleConfig.backgroundColor) {
        const lineHeight = fontSizePx * 1.2;
        const totalHeight = lines.length * lineHeight;
        const boxPadding = 20;
        
        let maxLineWidth = 0;
        lines.forEach(l => {
            const w = ctx.measureText(l).width;
            if (w > maxLineWidth) maxLineWidth = w;
        });

        ctx.fillStyle = styleConfig.backgroundColor;
        ctx.fillRect(
            -maxLineWidth / 2 - boxPadding, 
            -(totalHeight / 2) - boxPadding, 
            maxLineWidth + (boxPadding * 2), 
            totalHeight + (boxPadding * 2)
        );
      }

      // Draw Shadow
      if (styleConfig.shadow) {
        // Naive shadow parsing/defaulting
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;
        
        // If shadow string contains a color (simple check), use it
        if (styleConfig.shadow.includes('#') || styleConfig.shadow.includes('rgb')) {
             const parts = styleConfig.shadow.split(' ');
             const colorPart = parts.find(p => p.startsWith('#') || p.startsWith('rgb'));
             if (colorPart) ctx.shadowColor = colorPart;
        }
      } else {
        ctx.shadowColor = 'transparent';
      }

      // Word by word setup
      const isWordByWord = styleConfig.animation === 'word-by-word';
      let visibleWords = words.length;
      let globalWordIdx = 0;

      if (isWordByWord) {
        const duration = activeCaption.end - activeCaption.start;
        const elapsed = currentTime - activeCaption.start;
        const timePerWord = duration / words.length;
        visibleWords = Math.floor(elapsed / timePerWord) + 1;
      }

      lines.forEach((lineText, i) => {
        const lineY = (i - (lines.length - 1) / 2) * (fontSizePx * 1.2);
        const cleanLine = lineText.trim();
        
        if (isWordByWord) {
           const lineWords = cleanLine.split(/\s+/);
           // Measure entire line to calculate start X for manual centering
           const lineWidth = ctx.measureText(cleanLine).width;
           const spaceWidth = ctx.measureText(' ').width;
           
           // Start X (left aligned relative to center)
           let currentX = -lineWidth / 2;

           ctx.save();
           ctx.textAlign = 'left'; // Switch to left align for individual words
           
           lineWords.forEach((w) => {
              if (globalWordIdx < visibleWords) {
                 // Stroke
                 if (styleConfig.strokeWidth > 0) {
                    ctx.strokeStyle = styleConfig.strokeColor;
                    ctx.lineWidth = fontSizePx * styleConfig.strokeWidth;
                    ctx.strokeText(w, currentX, lineY);
                 }
                 // Fill
                 ctx.fillStyle = styleConfig.textColor;
                 ctx.fillText(w, currentX, lineY);
              }
              
              currentX += ctx.measureText(w).width + spaceWidth;
              globalWordIdx++;
           });
           
           ctx.restore();
        } else {
           // Standard Line Rendering
           if (styleConfig.strokeWidth > 0) {
             ctx.strokeStyle = styleConfig.strokeColor;
             ctx.lineWidth = fontSizePx * styleConfig.strokeWidth;
             ctx.strokeText(cleanLine, 0, lineY);
           }
           ctx.fillStyle = styleConfig.textColor;
           ctx.fillText(cleanLine, 0, lineY);
        }
      });

      ctx.restore();
    }
  }, [captions, styleConfig]);

  // Loop for playback
  const animate = useCallback(() => {
    drawFrame();
    if (videoRef.current) {
      onTimeUpdateRef.current(videoRef.current.currentTime);
    }
    if (isPlaying && !isExporting) {
      requestRef.current = requestAnimationFrame(animate);
    }
  }, [drawFrame, isPlaying, isExporting]);

  // Handle Video Playback State
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          // Ignore AbortError which happens if we pause while play is pending
          if (e.name !== 'AbortError') {
            console.error("Play error", e);
          }
        });
      }
      requestRef.current = requestAnimationFrame(animate);
    } else {
      video.pause();
      cancelAnimationFrame(requestRef.current!);
      drawFrame(); // Draw static frame when paused
    }

    return () => cancelAnimationFrame(requestRef.current!);
  }, [isPlaying, animate, drawFrame]);

  // Audio Setup: Initialize AudioContext and Source ONCE per video load
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    // Initialize AudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    // Reuse context if it exists and is running, otherwise create new
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContextClass();
    }
    const ctx = audioContextRef.current;

    try {
      // Use WeakMap cache to get/set source for this video element
      // This solves "already connected" error in React StrictMode or re-renders
      let source = sourceCache.get(video);
      if (!source) {
        source = ctx.createMediaElementSource(video);
        sourceCache.set(video, source);
      }
      
      audioSourceRef.current = source;
      
      // Connect to destination for preview playback
      source.connect(ctx.destination);
      
    } catch (err) {
      console.error("Audio setup failed:", err);
    }

    return () => {
      // We don't close the context immediately to avoid cutting audio during brief remounts
      // but we disconnect from destination to silence it
      if (audioSourceRef.current && audioContextRef.current) {
        try {
            audioSourceRef.current.disconnect(audioContextRef.current.destination);
        } catch (e) {
            // ignore disconnect errors
        }
      }
    };
  }, [videoSrc]);


  // Initial Setup when videoSrc changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.src = videoSrc;
    video.onloadedmetadata = () => {
      onDurationChange(video.duration);
      if (canvasRef.current) {
        canvasRef.current.width = video.videoWidth;
        canvasRef.current.height = video.videoHeight;
        setAspectRatio(video.videoWidth / video.videoHeight);
      }
      drawFrame();
    };
  }, [videoSrc, onDurationChange, drawFrame]);

  // Export Logic
  useEffect(() => {
    if (!isExporting) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const mimeType = getBestMimeType();
    let mediaRecorder: MediaRecorder;
    let chunks: Blob[] = [];
    let exportAnimationFrame: number;

    const startExport = async () => {
        // 0. CRITICAL: Unmute for capture
        video.muted = false;
        video.volume = 1.0;

        // 1. Setup Audio Stream for Recorder
        let audioStream: MediaStream | null = null;
        
        if (audioContextRef.current && audioSourceRef.current) {
            const ctx = audioContextRef.current;
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }

            // Create a destination specifically for recording
            const dest = ctx.createMediaStreamDestination();
            audioDestRef.current = dest;
            
            // Connect the existing source to the recording destination
            // Note: It remains connected to ctx.destination (speakers) so user can hear progress
            audioSourceRef.current.connect(dest);
            
            audioStream = dest.stream;
        } else {
            console.warn("Audio context/source not ready for export");
        }

        // 2. Setup Combined Stream
        // Capture at 60fps to support smoother playback if source is 60fps
        const canvasStream = canvas.captureStream(60); 
        const combinedTracks = [...canvasStream.getVideoTracks()];
        
        if (audioStream && audioStream.getAudioTracks().length > 0) {
            combinedTracks.push(...audioStream.getAudioTracks());
        }

        const combinedStream = new MediaStream(combinedTracks);

        // 3. Configure Recorder
        // Increase bitrate to 8Mbps for high quality output (closer to source)
        const options: MediaRecorderOptions = {
            mimeType: mimeType,
            videoBitsPerSecond: 8000000, 
            audioBitsPerSecond: 192000,
        };
        
        try {
            mediaRecorder = new MediaRecorder(combinedStream, options);
        } catch (e) {
            console.error("Recorder fallback", e);
            mediaRecorder = new MediaRecorder(combinedStream);
        }
        
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                chunks.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            onExportCompleteRef.current(url, mimeType);
            
            // Cleanup
            video.pause();
            video.currentTime = 0;
            
            // Disconnect recording destination
            if (audioSourceRef.current && audioDestRef.current) {
                try { audioSourceRef.current.disconnect(audioDestRef.current); } catch (e) {}
            }
        };

        // 4. Start Playback & Recording
        
        // Ensure we are at the start
        video.currentTime = 0;
        
        // Handler for when playback actually begins
        const onPlaying = () => {
            video.removeEventListener('playing', onPlaying);
            
            // Start recording immediately to prevent start freeze
            if (mediaRecorder.state === 'inactive') {
                mediaRecorder.start(1000); 
                exportLoop();
            }
        };

        const onSeeked = async () => {
            video.removeEventListener('seeked', onSeeked);
            
            // Ensure audio context is running before we play/record
            if (audioContextRef.current?.state === 'suspended') {
                await audioContextRef.current.resume();
            }
            
            video.addEventListener('playing', onPlaying);
            
            try {
                await video.play();
            } catch (e) {
                console.error("Export playback error", e);
                if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
            }
        };

        video.addEventListener('seeked', onSeeked);
        // Trigger seek
        video.currentTime = 0;
    };

    const exportLoop = () => {
        if (!video) return;

        if (video.paused || video.ended) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            return;
        }
        
        drawFrame();
        
        if (video.duration > 0) {
             onExportProgressRef.current((video.currentTime / video.duration) * 100);
        }
        
        exportAnimationFrame = requestAnimationFrame(exportLoop);
    };

    startExport();

    return () => {
        cancelAnimationFrame(exportAnimationFrame);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        video.removeEventListener('seeked', startExport as any); 
    };
  }, [isExporting, getBestMimeType, drawFrame]); 


  return (
    <div className="relative w-full max-w-md mx-auto aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
      {/* 
         Use absolute positioning + opacity 0 to hide video but keep it active in DOM 
      */}
      <video 
        key={videoSrc}
        ref={videoRef} 
        className="absolute inset-0 opacity-0 pointer-events-none -z-10"
        playsInline
        crossOrigin="anonymous"
        muted={false} 
      />
      
      <canvas 
        ref={canvasRef}
        className="w-full h-full object-contain"
      />
    </div>
  );
});

VideoProcessor.displayName = 'VideoProcessor';

export default VideoProcessor;
