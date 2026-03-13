import { useEffect, useRef } from 'react';
import { Avatar } from '../ui/avatar';
import { cn } from '../../utils/cn';

interface VideoTileProps {
  stream?: MediaStream;
  username: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isCameraOff?: boolean;
  /** Voice-only call — never show video even if tracks exist */
  voiceOnly?: boolean;
}

export function VideoTile({ stream, username, isLocal, isMuted, isCameraOff, voiceOnly }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = stream ?? null;
    // Some browsers need an explicit play() after srcObject is set
    if (stream) el.play().catch(() => {});
  }, [stream]);

  // Show actual video frames when: not voice-only, camera not off, stream has an enabled video track
  const hasVideo =
    !voiceOnly &&
    !isCameraOff &&
    !!stream &&
    stream.getVideoTracks().some((t) => t.enabled);

  return (
    <div className="relative flex flex-col items-center justify-center bg-gray-900 border border-gray-700 rounded-xl overflow-hidden w-32 h-24 flex-shrink-0">
      {/*
        Always render <video> for both voice and video streams.
        It plays audio even when visually hidden, avoiding the need for
        a separate <audio> element (and the srcObject ref-cast hack).
      */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // prevent echo on the local preview
        className={cn(
          'w-full h-full object-cover',
          isLocal && 'scale-x-[-1]', // mirror local video
          !hasVideo && 'hidden'       // hide visually when no video, but keep playing audio
        )}
      />

      {/* Avatar shown when there is no video to display */}
      {!hasVideo && <Avatar username={username} size="md" />}

      {/* Name badge */}
      <div className="absolute bottom-0 left-0 right-0 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm">
        <span className="text-[10px] text-white/90 truncate block text-center">
          {isLocal ? 'You' : username}
        </span>
      </div>

      {/* Muted microphone indicator */}
      {isMuted && (
        <div className="absolute top-1.5 right-1.5 bg-red-600 rounded-full p-0.5">
          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            <line x1="3" y1="3" x2="21" y2="21" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
}
