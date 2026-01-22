'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { RoomSettingsModal } from './RoomSettingsModal';

interface GroupVoiceCallProps {
  callId: string;
  userId: string;
  username?: string;
  creatorId?: string;
  mode: 'PRIVATE' | 'ANONYMOUS';
  onCallEnd?: () => void;
}

interface RemotePeer {
  userId: string;
  socketId: string;
  isMuted: boolean;
  displayName?: string;
  username?: string;
  volume: number;
}

interface RoomData {
  roomName?: string | null;
  hasPassword?: boolean | null;
  maxParticipants?: number | null;
}

export default function GroupVoiceCall({
  callId,
  userId,
  username,
  creatorId,
  mode,
  onCallEnd
}: GroupVoiceCallProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoudspeakerMuted, setIsLoudspeakerMuted] = useState(false);
  const [remotePeers, setRemotePeers] = useState<Map<string, RemotePeer>>(new Map());
  const [participants, setParticipants] = useState<number>(1);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [contextMenu, setContextMenu] = useState<{ userId: string; x: number; y: number } | null>(null);
  const [peerVolumes, setPeerVolumes] = useState<Map<string, number>>(new Map());
  const [peerMutes, setPeerMutes] = useState<Map<string, boolean>>(new Map());
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [micAvailable, setMicAvailable] = useState(true);
  const [micBlocked, setMicBlocked] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenShares, setScreenShares] = useState<Map<string, MediaStream>>(new Map());
  const [isLocalPreviewPaused, setIsLocalPreviewPaused] = useState(false);
  const [expandedShare, setExpandedShare] = useState<{ userId: string; isLocal: boolean } | null>(null);
  
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const localScreenRef = useRef<HTMLVideoElement | null>(null);
  const expandedVideoRef = useRef<HTMLVideoElement | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(undefined, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('[Voice] Socket connected:', newSocket.id);
      setIsConnected(true);
      
      // Join the voice call
      newSocket.emit('user:join', userId);
      newSocket.emit('voice:join', { callId, userId, username });
    });

    newSocket.on('disconnect', () => {
      console.log('[Voice] Socket disconnected');
      setIsConnected(false);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [callId, userId]);

  const requestMicrophone = useCallback(async () => {
    try {
      setMicError(null);
      setMicBlocked(false);

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasMic = devices.some((d) => d.kind === 'audioinput');
        setMicAvailable(hasMic);
        if (!hasMic) {
          setMicBlocked(true);
          setMicError('ไม่พบไมโครโฟนในอุปกรณ์นี้');
          setIsMuted(true);
          return;
        }
      } catch {
        // Ignore enumerate errors and fallback to getUserMedia
        setMicAvailable(true);
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      localStreamRef.current = stream;
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }

      console.log('[Voice] Local audio stream initialized');
    } catch (error) {
      console.error('[Voice] Failed to get local audio:', error);
      setMicBlocked(true);
      setMicError('ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตสิทธิ์หรือเช็คว่าไมค์ถูกใช้งานอยู่');
      setIsMuted(true);
    }
  }, []);

  // Initialize local audio stream
  useEffect(() => {
    requestMicrophone();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [requestMicrophone]);

  // Fetch room data on mount
  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        const res = await fetch(`/api/voice-calls/get?callId=${callId}`, {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          setRoomData(data.call);
        }
      } catch (error) {
        console.error('Error fetching room data:', error);
      }
    };

    fetchRoomData();
  }, [callId]);

  // Handle new peer joining
  useEffect(() => {
    if (!socket || !isConnected) return;

    // When we join, server sends us list of existing participants
    socket.on('voice:existing:users', (data: { users: Array<{ userId: string; socketId: string; username?: string }> }) => {
      console.log('[Voice] Existing users:', data.users);
      
      const peers = new Map<string, RemotePeer>();
      let count = 1; // Start with 1 for self
      
      data.users.forEach((user) => {
        if (user.userId !== userId) {
          peers.set(user.userId, {
            userId: user.userId,
            socketId: user.socketId,
            isMuted: false,
            username: user.username,
            volume: 100
          });
          count++;
        }
      });
      
      setRemotePeers(peers);
      setParticipants(count);
    });

    socket.on('voice:user:joined', (data) => {
      console.log('[Voice] User joined:', data.userId, data.socketId);
      
      setRemotePeers(prev => new Map(prev).set(data.userId, {
        userId: data.userId,
        socketId: data.socketId,
        isMuted: false,
        username: data.username,
        volume: 100
      }));

      setParticipants(prev => prev + 1);

      // Create offer for the new peer
      createPeerConnection(data.userId, data.socketId, true);
    });

    socket.on('voice:offer', async (data) => {
      console.log('[Voice] Received offer from:', data.fromUserId);
      
      if (!peerConnectionsRef.current.has(data.fromUserId)) {
        createPeerConnection(data.fromUserId, '', false);
      }

      const peerConnection = peerConnectionsRef.current.get(data.fromUserId);
      if (peerConnection) {
        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);

          socketRef.current?.emit('voice:answer', {
            targetUserId: data.fromUserId,
            answer: peerConnection.localDescription,
            callId
          });
        } catch (error) {
          console.error('[Voice] Error handling offer:', error);
        }
      }
    });

    socket.on('voice:answer', async (data) => {
      console.log('[Voice] Received answer from:', data.fromUserId);
      
      const peerConnection = peerConnectionsRef.current.get(data.fromUserId);
      if (peerConnection) {
        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (error) {
          console.error('[Voice] Error handling answer:', error);
        }
      }
    });

    socket.on('voice:ice', async (data) => {
      console.log('[Voice] Received ICE candidate from:', data.fromUserId);
      
      const peerConnection = peerConnectionsRef.current.get(data.fromUserId);
      if (peerConnection && data.candidate) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
          console.error('[Voice] Error adding ICE candidate:', error);
        }
      }
    });

    socket.on('voice:user:left', (data) => {
      console.log('[Voice] User left:', data.userId);
      
      const peerConnection = peerConnectionsRef.current.get(data.userId);
      if (peerConnection) {
        peerConnection.close();
        peerConnectionsRef.current.delete(data.userId);
      }

      const audioElement = remoteAudioRefs.current.get(data.userId);
      if (audioElement) {
        audioElement.srcObject = null;
        remoteAudioRefs.current.delete(data.userId);
      }

      setRemotePeers(prev => {
        const updated = new Map(prev);
        updated.delete(data.userId);
        return updated;
      });

      setParticipants(prev => Math.max(1, prev - 1));
    });

    return () => {
      socket.off('voice:user:joined');
      socket.off('voice:offer');
      socket.off('voice:answer');
      socket.off('voice:ice');
      socket.off('voice:user:left');
    };
  }, [socket, isConnected, callId]);

  // Call duration timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const createPeerConnection = useCallback((remoteUserId: string, remoteSocketId: string, initiator: boolean) => {
    try {
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }]
      });

      // Add local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStreamRef.current!);
        });
      }

      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => {
          peerConnection.addTrack(track, screenStreamRef.current!);
        });
      }

      // Handle remote track
      peerConnection.ontrack = (event) => {
        console.log('[Voice] Received remote track from:', remoteUserId);
        if (event.track.kind === 'video') {
          const stream = event.streams[0];
          setScreenShares(prev => {
            const updated = new Map(prev);
            updated.set(remoteUserId, stream);
            return updated;
          });
          event.track.onended = () => {
            setScreenShares(prev => {
              const updated = new Map(prev);
              updated.delete(remoteUserId);
              return updated;
            });
            setExpandedShare(prev => {
              if (prev && !prev.isLocal && prev.userId === remoteUserId) {
                return null;
              }
              return prev;
            });
          };
          return;
        }

        let audioElement = remoteAudioRefs.current.get(remoteUserId);
        if (!audioElement) {
          audioElement = new Audio();
          audioElement.autoplay = true;
          remoteAudioRefs.current.set(remoteUserId, audioElement);
        }
        if (audioElement.srcObject !== event.streams[0]) {
          audioElement.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.emit('voice:ice', {
            targetUserId: remoteUserId,
            candidate: event.candidate,
            callId
          });
        }
      };

      peerConnection.onconnectionstatechange = () => {
        console.log('[Voice] Connection state:', remoteUserId, peerConnection.connectionState);
        if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
          handlePeerDisconnect(remoteUserId);
        }
      };

      peerConnectionsRef.current.set(remoteUserId, peerConnection);

      // If initiator, create and send offer
      if (initiator) {
        peerConnection.createOffer().then(async (offer) => {
          await peerConnection.setLocalDescription(offer);
          socketRef.current?.emit('voice:offer', {
            targetUserId: remoteUserId,
            offer: peerConnection.localDescription,
            callId
          });
        }).catch(error => console.error('[Voice] Error creating offer:', error));
      }
    } catch (error) {
      console.error('[Voice] Error creating peer connection:', error);
    }
  }, [callId]);

  const renegotiatePeer = useCallback(async (remoteUserId: string, peerConnection: RTCPeerConnection) => {
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socketRef.current?.emit('voice:offer', {
        targetUserId: remoteUserId,
        offer: peerConnection.localDescription,
        callId
      });
    } catch (error) {
      console.error('[Voice] Error renegotiating:', error);
    }
  }, [callId]);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      screenStreamRef.current = stream;
      setIsScreenSharing(true);

      if (localScreenRef.current) {
        localScreenRef.current.srcObject = stream;
        localScreenRef.current.onloadedmetadata = () => {
          localScreenRef.current?.play().catch(() => undefined);
        };
      }

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      peerConnectionsRef.current.forEach((pc, remoteUserId) => {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
        renegotiatePeer(remoteUserId, pc);
      });
    } catch (error) {
      console.error('[Voice] Error starting screen share:', error);
    }
  }, [renegotiatePeer]);

  useEffect(() => {
    if (!isScreenSharing || !screenStreamRef.current || !localScreenRef.current) return;
    if (localScreenRef.current.srcObject !== screenStreamRef.current) {
      localScreenRef.current.srcObject = screenStreamRef.current;
      localScreenRef.current.onloadedmetadata = () => {
        localScreenRef.current?.play().catch(() => undefined);
      };
    }
  }, [isScreenSharing]);

  const stopScreenShare = useCallback(() => {
    if (!screenStreamRef.current) return;

    const stream = screenStreamRef.current;
    stream.getTracks().forEach(track => track.stop());

    peerConnectionsRef.current.forEach((pc, remoteUserId) => {
      pc.getSenders().forEach(sender => {
        if (sender.track && sender.track.kind === 'video') {
          try {
            pc.removeTrack(sender);
          } catch {
            // Ignore removeTrack errors
          }
        }
      });
      renegotiatePeer(remoteUserId, pc);
    });

    screenStreamRef.current = null;
    setIsScreenSharing(false);
    setIsLocalPreviewPaused(false);
    if (localScreenRef.current) {
      localScreenRef.current.srcObject = null;
    }
    setExpandedShare(prev => (prev?.isLocal ? null : prev));
  }, [renegotiatePeer]);

  useEffect(() => {
    if (!isScreenSharing) return;

    const handleVisibilityChange = () => {
      if (!localScreenRef.current) return;
      if (document.hidden) {
        localScreenRef.current.pause();
        setIsLocalPreviewPaused(true);
      } else {
        localScreenRef.current.play().catch(() => undefined);
        setIsLocalPreviewPaused(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isScreenSharing]);

  useEffect(() => {
    if (!expandedShare || expandedShare.isLocal) return;
    if (!screenShares.has(expandedShare.userId)) {
      setExpandedShare(null);
    }
  }, [expandedShare, screenShares]);

  useEffect(() => {
    if (expandedShare?.isLocal && !isScreenSharing) {
      setExpandedShare(null);
    }
  }, [expandedShare, isScreenSharing]);

  const openExpandedShare = (userId: string, isLocal: boolean) => {
    setExpandedShare({ userId, isLocal });
  };

  const handlePeerDisconnect = (remoteUserId: string) => {
    const peerConnection = peerConnectionsRef.current.get(remoteUserId);
    if (peerConnection) {
      peerConnection.close();
      peerConnectionsRef.current.delete(remoteUserId);
    }
  };

  const togglePeerMute = (userId: string) => {
    const volume = peerVolumes.get(userId) || 100;
    
    // ถ้า volume = 0 ไม่สามารถเปิด mute ได้
    if (volume === 0) {
      return; // ต้องเพิ่ม volume ก่อน
    }
    
    setPeerMutes(prev => {
      const newMutes = new Map(prev);
      const isMuted = newMutes.get(userId) || false;
      const audioElement = remoteAudioRefs.current.get(userId);
      if (audioElement) {
        audioElement.muted = !isMuted;
      }
      newMutes.set(userId, !isMuted);
      return newMutes;
    });
  };

  const setPeerVolume = (userId: string, volume: number) => {
    setPeerVolumes(prev => {
      const newVolumes = new Map(prev);
      newVolumes.set(userId, volume);
      const audioElement = remoteAudioRefs.current.get(userId);
      if (audioElement) {
        audioElement.volume = volume / 100;
      }
      return newVolumes;
    });
  };

  const toggleLoudspeaker = () => {
    const newLoudspeakerState = !isLoudspeakerMuted;
    setIsLoudspeakerMuted(newLoudspeakerState);
    
    // ถ้าปิดลำโพง ให้ปิดไมค์ด้วย
    if (newLoudspeakerState) {
      setIsMuted(true);
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => {
          track.enabled = false;
        });
      }
    }
    
    // Mute/unmute all remote audio
    remoteAudioRefs.current.forEach(audio => {
      audio.muted = newLoudspeakerState;
    });
  };
  const toggleMute = () => {
    if (micBlocked || !micAvailable) {
      return;
    }
    // ถ้าลำโพงปิดอยู่ และพยายามเปิดไมค์ ให้แสดงเตือน
    if (isLoudspeakerMuted && isMuted) {
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-yellow-500 text-white px-6 py-3 rounded-lg shadow-lg z-[101] animate-bounce';
      toast.textContent = '⚠️ ต้องเปิดลำโพงก่อนถึงจะเปิดไมค์ได้!';
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.transition = 'opacity 0.3s';
        toast.style.opacity = '0';
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 2000);
      return;
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const handleEndCall = async () => {
    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Emit leave event
    socketRef.current?.emit('voice:leave', { callId, userId });

    // Call API to leave
    try {
      await fetch('/api/voice-calls/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId })
      });
    } catch (error) {
      console.error('[Voice] Error leaving call:', error);
    }

    onCallEnd?.();
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50"
    >
      <div className="bg-linear-to-br from-slate-950 to-slate-900 rounded-3xl shadow-2xl max-w-6xl w-full mx-4 relative max-h-screen overflow-hidden flex flex-col border border-slate-800/70">
        {micError && (
          <div className="mx-6 mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-100 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">ไม่สามารถใช้ไมโครโฟน</div>
              <div className="text-xs opacity-90 mt-1">{micError}</div>
            </div>
            <button
              onClick={requestMicrophone}
              className="px-4 py-2 rounded-lg bg-amber-500/90 hover:bg-amber-500 text-gray-900 text-sm font-semibold transition-colors"
            >
              ขอสิทธิ์อีกครั้ง
            </button>
          </div>
        )}
        {/* Header */}
        <div className="border-b border-slate-800/80 px-5 py-5 sm:px-8 sm:py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-white flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-800/70 text-lg">
                {mode === 'PRIVATE' ? '🔒' : '🌐'}
              </span>
              {mode === 'PRIVATE' ? '🔒 ห้องพูดคุยส่วนตัว' : '🌐 ห้องพูดคุยสาธารณะ'}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {participants} {participants === 1 ? 'ผู้เข้าร่วม' : 'ผู้เข้าร่วม'} • {formatDuration(callDuration)}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-slate-500">รหัสห้อง:</span>
              <code className="text-sm font-semibold text-cyan-300 bg-slate-800/60 px-3 py-1 rounded-lg">{callId}</code>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className={`px-4 py-2 rounded-full text-xs font-semibold ${isConnected ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
              {isConnected ? '● เชื่อมต่อแล้ว' : '● กำลังเชื่อมต่อ...'}
            </div>
            {userId === creatorId && (
              <button
                onClick={() => setShowRoomSettings(true)}
                className="px-4 py-2 bg-indigo-600/90 hover:bg-indigo-600 text-white rounded-full text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/10"
              >
                ⚙️ ตั้งค่า
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.9fr] gap-4 min-h-0">
            {/* Screen Shares Panel */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4 sm:p-5 flex flex-col min-h-75">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-200">แชร์หน้าจอ</div>
                <div className="text-xs text-slate-500">คลิก “ขยาย” เพื่อดูใหญ่</div>
              </div>
              {(isScreenSharing || screenShares.size > 0) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4">
                  {isScreenSharing && (
                    <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/70 overflow-hidden shadow-lg shadow-cyan-500/5">
                      <div className="px-3 py-2 text-xs text-cyan-200 bg-slate-900/80 flex items-center justify-between">
                        <span>หน้าจอของคุณ</span>
                        <div className="flex items-center gap-2">
                          {isLocalPreviewPaused && (
                            <span className="text-[11px] text-amber-300">พักการแสดงผล</span>
                          )}
                          <button
                            onClick={() => openExpandedShare(userId, true)}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25"
                          >
                            ขยาย
                          </button>
                        </div>
                      </div>
                      <video
                        ref={localScreenRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-44 sm:h-56 md:h-60 object-contain bg-black"
                      />
                    </div>
                  )}
                  {Array.from(screenShares.entries()).map(([remoteUserId, stream]) => (
                    <div key={remoteUserId} className="rounded-2xl border border-slate-700/80 bg-slate-900/70 overflow-hidden shadow-lg shadow-indigo-500/5">
                      <div className="px-3 py-2 text-xs text-indigo-200 bg-slate-900/80 flex items-center justify-between">
                        <span>แชร์จาก {remoteUserId}</span>
                        <button
                          onClick={() => openExpandedShare(remoteUserId, false)}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/25"
                        >
                          ขยาย
                        </button>
                      </div>
                      <video
                        ref={(el) => {
                          if (!el) return;
                          remoteVideoRefs.current.set(remoteUserId, el);
                          if (el.srcObject !== stream) {
                            el.srcObject = stream;
                          }
                        }}
                        autoPlay
                        playsInline
                        className="w-full h-44 sm:h-56 md:h-60 object-contain bg-black"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 rounded-2xl border border-dashed border-slate-800/80 bg-slate-900/40 flex flex-col items-center justify-center text-center px-6">
                  <div className="text-sm font-semibold text-slate-300">ยังไม่มีการแชร์หน้าจอ</div>
                  <div className="text-xs text-slate-500 mt-1">กดปุ่ม “แชร์หน้าจอ” เพื่อเริ่ม</div>
                </div>
              )}
            </div>

            {/* Participants Panel */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4 sm:p-5 flex flex-col min-h-75">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-200">ผู้เข้าร่วม</div>
                <div className="text-xs text-slate-500">{participants} คน</div>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 xl:grid-cols-5 gap-2.5 overflow-y-auto pr-1">
            {/* You */}
            <div className="bg-slate-900/70 rounded-xl p-2 border border-slate-800/80 flex flex-col items-center justify-center shadow-inner h-28">
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-1.5 relative shadow-lg shadow-blue-500/20">
                <span className="text-white text-base">🎤</span>
                {isMuted && <span className="absolute -top-1 -right-1 text-lg">🔇</span>}
              </div>
              <p className="text-white font-semibold text-[11px] truncate max-w-[85%]">{username || 'คุณ'} {userId === creatorId && '👑'}</p>
              <p className={`text-[10px] mt-0.5 ${isMuted ? 'text-red-400' : 'text-emerald-400'}`}>
                {isMuted ? '🔴 ปิดเสียง' : '🟢 กำลังใช้งาน'}
              </p>
            </div>

            {/* Remote Participants */}
            {Array.from(remotePeers.values()).map((peer) => {
              const peerIsMuted = peerMutes.get(peer.userId) || false;
              return (
              <div 
                key={peer.userId} 
                className="relative bg-slate-900/70 rounded-xl p-2 border border-slate-800/80 flex flex-col items-center justify-center h-28"
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ userId: peer.userId, x: e.clientX, y: e.clientY });
                }}
              >
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-1.5 relative shadow-lg shadow-purple-500/20">
                  <span className="text-white text-base">👤</span>
                  {peerIsMuted && <span className="absolute -top-1 -right-1 text-lg">🔇</span>}
                </div>
                <p className="text-white font-semibold text-[11px] truncate max-w-[85%]">{peer.username || 'User'} {peer.userId === creatorId && '👑'}</p>
                <p className="text-[10px] mt-0.5 text-emerald-400">🟢 Active</p>
              </div>
            );
            })}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="px-4 pb-5 sm:px-6 sm:pb-6">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-3 sm:p-4 flex flex-wrap justify-center gap-3 shadow-lg shadow-black/30">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleMute}
              disabled={micBlocked || !micAvailable}
              className={`px-6 py-3 rounded-full font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto ${
                micBlocked || !micAvailable
                  ? 'bg-gray-600 text-gray-200'
                  : isMuted
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
              title={micBlocked || !micAvailable ? 'ไม่สามารถใช้ไมโครโฟนได้' : 'เปิด-ปิดไมค์ของตัวเอง'}
            >
              <span className="text-xl">{isMuted ? '🔇' : '🎤'}</span>
              {isMuted ? 'เปิดไมค์' : 'ปิดไมค์'}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleLoudspeaker}
              className={`px-6 py-3 rounded-full font-semibold flex items-center gap-2 transition-colors w-full sm:w-auto ${
                isLoudspeakerMuted
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
              title="เปิด-ปิดลำโพง"
            >
              <span className="text-xl">{isLoudspeakerMuted ? '🔇' : '🔊'}</span>
              {isLoudspeakerMuted ? 'เปิดลำโพง' : 'ปิดลำโพง'}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (isScreenSharing) {
                  stopScreenShare();
                } else {
                  startScreenShare();
                }
              }}
              className={`px-6 py-3 rounded-full font-semibold flex items-center gap-2 transition-colors w-full sm:w-auto ${
                isScreenSharing
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
              title="แชร์หน้าจอ"
            >
              <span className="text-xl">{isScreenSharing ? '🛑' : '🖥️'}</span>
              {isScreenSharing ? 'หยุดแชร์' : 'แชร์หน้าจอ'}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleEndCall}
              className="px-6 py-3 rounded-full font-semibold flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white transition-colors w-full sm:w-auto"
            >
              <span className="text-xl">📞</span>
              ปิดการสนทนา
            </motion.button>
          </div>
        </div>

        {/* Context Menu for Peer Volume Control */}
        {contextMenu && (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-60 min-w-62.5"
              style={{
                top: `${contextMenu.y}px`,
                left: `${contextMenu.x}px`
              }}
              onMouseLeave={() => setContextMenu(null)}
            >
              <div className="p-3 space-y-2">
                <div className="px-3 py-2 text-sm text-gray-400 border-b border-gray-700">
                  ปรับเสียง
                </div>
                
                <button
                  onClick={() => {
                    const volume = peerVolumes.get(contextMenu.userId) || 100;
                    if (volume === 0) {
                      // Show warning toast
                      const toast = document.createElement('div');
                      toast.className = 'fixed top-4 right-4 bg-yellow-500 text-white px-6 py-3 rounded-lg shadow-lg z-[101] animate-bounce';
                      toast.textContent = '⚠️ ต้องเพิ่มระดับเสียงก่อน!';
                      document.body.appendChild(toast);
                      setTimeout(() => {
                        toast.style.transition = 'opacity 0.3s';
                        toast.style.opacity = '0';
                        setTimeout(() => document.body.removeChild(toast), 300);
                      }, 2000);
                      return;
                    }
                    togglePeerMute(contextMenu.userId);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-2 text-white hover:bg-gray-700 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {peerMutes.get(contextMenu.userId) ? '🔊 เปิดเสียง' : '🔇 ปิดเสียง'}
                </button>
                
                <div className="px-3 py-2 space-y-2">
                  <div className="text-xs text-gray-400">ระดับเสียง: {peerVolumes.get(contextMenu.userId) || 100}%</div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={peerVolumes.get(contextMenu.userId) || 100}
                    onChange={(e) => setPeerVolume(contextMenu.userId, parseInt(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>
              </div>
            </motion.div>
            <div 
              className="fixed inset-0 z-50"
              onClick={() => setContextMenu(null)}
            />
          </>
        )}

        {/* Hidden audio elements */}
        <audio ref={localAudioRef} muted playsInline />
      </div>

      <AnimatePresence>
        {expandedShare && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              onClick={() => setExpandedShare(null)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-screen-2xl border border-gray-700 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-4 py-3 text-sm text-gray-200 bg-gray-800 flex items-center justify-between">
                  <span>
                    {expandedShare.isLocal ? 'หน้าจอของคุณ' : `แชร์จาก ${expandedShare.userId}`}
                  </span>
                  <button
                    onClick={() => setExpandedShare(null)}
                    className="text-xs px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-100"
                  >
                    ปิด
                  </button>
                </div>
                <video
                  ref={(el) => {
                    if (!el) return;
                    expandedVideoRef.current = el;
                    const stream = expandedShare.isLocal
                      ? screenStreamRef.current
                      : screenShares.get(expandedShare.userId) || null;
                    if (stream && el.srcObject !== stream) {
                      el.srcObject = stream;
                    }
                  }}
                  autoPlay
                  muted={expandedShare.isLocal}
                  playsInline
                  className="w-full h-[70vh] object-contain bg-black"
                />
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Room Settings Modal */}
      <RoomSettingsModal
        isOpen={showRoomSettings}
        callId={callId}
        roomName={roomData?.roomName ?? undefined}
        hasPassword={roomData?.hasPassword ? true : false}
        maxParticipants={roomData?.maxParticipants ?? undefined}
        participantCount={participants}
        isCreator={userId === creatorId}
        onClose={() => setShowRoomSettings(false)}
        onSettingsUpdated={() => {
          setShowRoomSettings(false);
        }}
        onRoomDeleted={() => {
          handleEndCall();
        }}
      />
    </motion.div>
  );
}
