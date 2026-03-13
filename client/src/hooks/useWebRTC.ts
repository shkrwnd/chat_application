import { useState, useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export interface CallParticipant {
  userId: string;
  username: string;
  stream?: MediaStream;
}

export type CallType = 'voice' | 'video';

interface UseWebRTCReturn {
  callActive: boolean;
  callType: CallType | null;
  localStream: MediaStream | null;
  remoteParticipants: CallParticipant[];
  roomCallParticipants: { userId: string; username: string }[];
  isMuted: boolean;
  isCameraOff: boolean;
  callError: string | null;
  joinCall: (type: CallType) => Promise<void>;
  leaveCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
}

export function useWebRTC(
  socket: Socket | null,
  currentUserId: string,
  activeRoomId: string | null
): UseWebRTCReturn {
  const [callActive, setCallActive] = useState(false);
  const [callType, setCallType] = useState<CallType | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<CallParticipant[]>([]);
  const [roomCallParticipants, setRoomCallParticipants] = useState<{ userId: string; username: string }[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);

  // Refs for stable access in async callbacks
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(socket);
  const callRoomIdRef = useRef<string | null>(null);
  const callActiveRef = useRef(false);

  useEffect(() => { socketRef.current = socket; }, [socket]);
  // NOTE: callActiveRef and callRoomIdRef are set synchronously in joinCall/cleanupCall
  // so signaling callbacks never read stale values between the React render cycles.

  // Create (or retrieve) a RTCPeerConnection for a remote user
  const createPeerConnection = useCallback((userId: string): RTCPeerConnection => {
    const existing = peerConnectionsRef.current.get(userId);
    if (existing && existing.connectionState !== 'closed') return existing;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add our local tracks so the remote side receives them
    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!);
    });

    // Receive remote tracks
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteParticipants((prev) =>
        prev.map((p) => (p.userId === userId ? { ...p, stream } : p))
      );
    };

    // Send ICE candidates to the peer via server
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current && callRoomIdRef.current) {
        socketRef.current.emit('call_ice_candidate', {
          roomId: callRoomIdRef.current,
          targetUserId: userId,
          candidate: event.candidate,
        });
      }
    };

    peerConnectionsRef.current.set(userId, pc);
    return pc;
  }, []);

  // Close and remove a peer connection
  const closePeerConnection = useCallback((userId: string) => {
    const pc = peerConnectionsRef.current.get(userId);
    if (pc) { pc.close(); peerConnectionsRef.current.delete(userId); }
  }, []);

  // Close all peer connections and stop local media
  const cleanupCall = useCallback(() => {
    // Set refs synchronously so any in-flight callbacks see the correct state
    callActiveRef.current = false;
    callRoomIdRef.current = null;
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteParticipants([]);
    setCallActive(false);
    setCallType(null);
    setIsMuted(false);
    setIsCameraOff(false);
  }, []);

  const joinCall = useCallback(async (type: CallType) => {
    if (!socketRef.current || !activeRoomId) return;
    setCallError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video' ? { width: 640, height: 480, facingMode: 'user' } : false,
      });
      localStreamRef.current = stream;
      // Set refs synchronously BEFORE emitting call_join so that the server's
      // call_participants response is handled correctly (callbacks check these refs).
      callRoomIdRef.current = activeRoomId;
      callActiveRef.current = true;
      setLocalStream(stream);
      setCallActive(true);
      setCallType(type);
      socketRef.current.emit('call_join', { roomId: activeRoomId, type });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not access microphone/camera';
      setCallError(msg);
    }
  }, [activeRoomId]);

  const leaveCall = useCallback(() => {
    const roomId = callRoomIdRef.current;
    if (socketRef.current && roomId) {
      socketRef.current.emit('call_leave', { roomId });
    }
    cleanupCall();
  }, [cleanupCall]);

  const toggleMute = useCallback(() => {
    const tracks = localStreamRef.current?.getAudioTracks() ?? [];
    const next = !isMuted;
    tracks.forEach((t) => { t.enabled = !next; });
    setIsMuted(next);
  }, [isMuted]);

  const toggleCamera = useCallback(() => {
    const tracks = localStreamRef.current?.getVideoTracks() ?? [];
    const next = !isCameraOff;
    tracks.forEach((t) => { t.enabled = !next; });
    setIsCameraOff(next);
  }, [isCameraOff]);

  // Socket signaling handlers
  useEffect(() => {
    if (!socket) return;

    // We just joined — server sends us the list of people already in the call
    const handleCallParticipants = async ({
      roomId,
      participants,
    }: {
      roomId: string;
      participants: { userId: string; username: string }[];
    }) => {
      if (!callActiveRef.current || !localStreamRef.current) return;

      setRemoteParticipants(participants.map((p) => ({ userId: p.userId, username: p.username })));

      // Initiate a connection to each existing participant
      for (const p of participants) {
        const pc = createPeerConnection(p.userId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('call_offer', { roomId, targetUserId: p.userId, sdp: offer });
      }
    };

    // Someone new joined the call — they will send us an offer; just update UI
    const handleCallUserJoined = ({
      roomId: incomingRoomId,
      userId,
      username,
    }: {
      roomId: string;
      userId: string;
      username: string;
    }) => {
      if (incomingRoomId !== callRoomIdRef.current) return;
      setRemoteParticipants((prev) => {
        if (prev.some((p) => p.userId === userId)) return prev;
        return [...prev, { userId, username }];
      });
    };

    // Someone left the call
    const handleCallUserLeft = ({ userId }: { roomId: string; userId: string }) => {
      closePeerConnection(userId);
      setRemoteParticipants((prev) => prev.filter((p) => p.userId !== userId));
    };

    // Receive an offer from a peer — create answer
    const handleCallOffer = async ({
      roomId,
      fromUserId,
      fromUsername,
      sdp,
    }: {
      roomId: string;
      fromUserId: string;
      fromUsername: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      if (!callActiveRef.current || !localStreamRef.current) return;

      setRemoteParticipants((prev) => {
        if (prev.some((p) => p.userId === fromUserId)) return prev;
        return [...prev, { userId: fromUserId, username: fromUsername }];
      });

      const pc = createPeerConnection(fromUserId);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('call_answer', { roomId, targetUserId: fromUserId, sdp: answer });
    };

    // Receive an answer to our offer — set remote description
    const handleCallAnswer = async ({
      fromUserId,
      sdp,
    }: {
      roomId: string;
      fromUserId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      const pc = peerConnectionsRef.current.get(fromUserId);
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    };

    // Receive an ICE candidate
    const handleCallIceCandidate = async ({
      fromUserId,
      candidate,
    }: {
      roomId: string;
      fromUserId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      const pc = peerConnectionsRef.current.get(fromUserId);
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (_) {
        // Benign race — ignore
      }
    };

    // Call state for the current room (who's in the call, even if we're not)
    const handleCallState = ({
      participants,
    }: {
      roomId: string;
      participants: { userId: string; username: string }[];
    }) => {
      setRoomCallParticipants(participants);
    };

    socket.on('call_participants', handleCallParticipants);
    socket.on('call_user_joined', handleCallUserJoined);
    socket.on('call_user_left', handleCallUserLeft);
    socket.on('call_offer', handleCallOffer);
    socket.on('call_answer', handleCallAnswer);
    socket.on('call_ice_candidate', handleCallIceCandidate);
    socket.on('call_state', handleCallState);

    return () => {
      socket.off('call_participants', handleCallParticipants);
      socket.off('call_user_joined', handleCallUserJoined);
      socket.off('call_user_left', handleCallUserLeft);
      socket.off('call_offer', handleCallOffer);
      socket.off('call_answer', handleCallAnswer);
      socket.off('call_ice_candidate', handleCallIceCandidate);
      socket.off('call_state', handleCallState);
    };
  }, [socket, createPeerConnection, closePeerConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      peerConnectionsRef.current.forEach((pc) => pc.close());
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    callActive,
    callType,
    localStream,
    remoteParticipants,
    roomCallParticipants,
    isMuted,
    isCameraOff,
    callError,
    joinCall,
    leaveCall,
    toggleMute,
    toggleCamera,
  };
}
