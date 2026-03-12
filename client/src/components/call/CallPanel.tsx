import { VideoTile } from './VideoTile';
import type { CallParticipant, CallType } from '../../hooks/useWebRTC';

interface CallPanelProps {
  callType: CallType;
  localStream: MediaStream | null;
  remoteParticipants: CallParticipant[];
  currentUsername: string;
  isMuted: boolean;
  isCameraOff: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onLeave: () => void;
}

export function CallPanel({
  callType,
  localStream,
  remoteParticipants,
  currentUsername,
  isMuted,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
  onLeave,
}: CallPanelProps) {
  const voiceOnly = callType === 'voice';

  return (
    <div className="flex-shrink-0 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm px-4 py-3 flex items-center gap-3">
      {/* Call type badge */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">
          {voiceOnly ? 'Voice' : 'Video'}
        </span>
      </div>

      {/* Participant tiles — scrollable row */}
      <div className="flex items-center gap-2 flex-1 overflow-x-auto min-w-0 py-1">
        {/* Local tile */}
        <VideoTile
          stream={localStream ?? undefined}
          username={currentUsername}
          isLocal
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          voiceOnly={voiceOnly}
        />

        {/* Remote tiles */}
        {remoteParticipants.map((p) => (
          <VideoTile
            key={p.userId}
            stream={p.stream}
            username={p.username}
            voiceOnly={voiceOnly}
          />
        ))}

        {remoteParticipants.length === 0 && (
          <span className="text-xs text-gray-600 ml-2">Waiting for others to join…</span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Mute toggle */}
        <button
          onClick={onToggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            isMuted ? 'bg-red-600 hover:bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {isMuted ? (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>

        {/* Camera toggle (video calls only) */}
        {!voiceOnly && (
          <button
            onClick={onToggleCamera}
            title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isCameraOff ? 'bg-red-600 hover:bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isCameraOff ? (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.871v6.258a1 1 0 01-1.447.894L15 14M5 18H3a2 2 0 01-2-2V8a2 2 0 012-2h11.5M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.871v6.258a1 1 0 01-1.447.894L15 14M5 18H3a2 2 0 01-2-2V8a2 2 0 012-2h10a2 2 0 012 2v1" />
              </svg>
            )}
          </button>
        )}

        {/* Leave call */}
        <button
          onClick={onLeave}
          title="Leave call"
          className="w-8 h-8 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors"
        >
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
