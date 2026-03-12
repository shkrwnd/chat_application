import { useEffect, useRef } from 'react';
import { Avatar } from '../ui/avatar';

interface VideoTileProps {
  stream?: MediaStream;
  username: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isCameraOff?: boolean;
  /** If true, always render as audio-only regardless of stream video tracks */
  voiceOnly?: boolean;
}

export function VideoTile({ stream, username, isLocal, isMuted, isCameraOff, voiceOnly }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream ?? null;
    }
  }, [stream]);

  const hasVideo = !voiceOnly && !isCameraOff && stream && stream.getVideoTracks().length > 0;

  return (
    <div className="relative flex flex-col items-center justify-center bg-gray-900 border border-gray-700 rounded-xl overflow-hidden w-32 h-24 flex-shrink-0">
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <>
          {/* Hidden audio-only element to play remote audio */}
          {stream && !isLocal && (
            <audio ref={videoRef as unknown as React.RefObject<HTMLAudioElement>} autoPlay />
          )}
          <Avatar username={username} size="md" className="mb-1" />
        </>
      )}

      {/* Name badge */}
      <div className="absolute bottom-0 left-0 right-0 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm">
        <span className="text-[10px] text-white/90 truncate block text-center">{isLocal ? 'You' : username}</span>
      </div>

      {/* Mute indicator */}
      {isMuted && (
        <div className="absolute top-1.5 right-1.5 bg-red-600 rounded-full p-0.5">
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        </div>
      )}
    </div>
  );
}
