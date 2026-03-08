import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type CallStatus = "idle" | "ringing" | "connecting" | "connected" | "ended" | "rejected" | "missed";
export type CallType = "audio" | "video";

interface CallState {
  callId: string | null;
  status: CallStatus;
  type: CallType;
  isCaller: boolean;
  remoteUserId: string | null;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
};

const RING_TIMEOUT = 30000;

export function useWebRTC() {
  const { user } = useAuth();
  const [callState, setCallState] = useState<CallState>({
    callId: null,
    status: "idle",
    type: "audio",
    isCaller: false,
    remoteUserId: null,
  });
  const [duration, setDuration] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout>();
  const ringTimeoutRef = useRef<NodeJS.Timeout>();
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const callStateRef = useRef(callState);

  // Keep ref in sync
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;

    pcRef.current?.close();
    pcRef.current = null;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    clearInterval(durationTimerRef.current);
    clearTimeout(ringTimeoutRef.current);

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    iceCandidateQueue.current = [];
    setDuration(0);
    setMicMuted(false);
    setVideoOff(false);
  }, []);

  const createPeerConnection = useCallback((callId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: { candidate: event.candidate.toJSON(), sender: user?.id },
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] ICE state:", pc.iceConnectionState);
      if (pc.iceConnectionState === "failed") {
        // Attempt ICE restart
        pc.restartIce();
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] Connection state:", pc.connectionState);
      if (pc.connectionState === "connected") {
        setCallState((s) => ({ ...s, status: "connected" }));
        clearTimeout(ringTimeoutRef.current);
        durationTimerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      }
      if (pc.connectionState === "disconnected") {
        // Give it a moment to reconnect before ending
        setTimeout(() => {
          if (pcRef.current?.connectionState === "disconnected" || pcRef.current?.connectionState === "failed") {
            endCall();
          }
        }, 5000);
      }
      if (pc.connectionState === "failed") {
        endCall();
      }
    };

    return pc;
  }, [user]);

  const setupChannel = useCallback((callId: string) => {
    const channel = supabase.channel(`call:${callId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on("broadcast", { event: "offer" }, async ({ payload }) => {
      if (payload.sender === user?.id) return;
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        for (const c of iceCandidateQueue.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        iceCandidateQueue.current = [];
      } catch (err) {
        console.error("[WebRTC] Error setting offer:", err);
      }
    });

    channel.on("broadcast", { event: "answer" }, async ({ payload }) => {
      if (payload.sender === user?.id) return;
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        setCallState((s) => ({ ...s, status: "connecting" }));
        for (const c of iceCandidateQueue.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        iceCandidateQueue.current = [];
      } catch (err) {
        console.error("[WebRTC] Error setting answer:", err);
      }
    });

    channel.on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
      if (payload.sender === user?.id) return;
      const pc = pcRef.current;
      if (!pc) return;
      try {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } else {
          iceCandidateQueue.current.push(payload.candidate);
        }
      } catch (err) {
        console.error("[WebRTC] Error adding ICE candidate:", err);
      }
    });

    channel.on("broadcast", { event: "hangup" }, () => {
      setCallState((s) => ({ ...s, status: "ended" }));
      cleanup();
    });

    channelRef.current = channel;

    return new Promise<typeof channel>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Channel subscribe timeout")), 10000);
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timeout);
          resolve(channel);
        }
        if (status === "CHANNEL_ERROR") {
          clearTimeout(timeout);
          reject(new Error("Channel subscription failed"));
        }
      });
    });
  }, [user, cleanup]);

  const startCall = useCallback(async (receiverId: string, type: CallType) => {
    if (!user) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: type === "video" ? { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } : false,
      });
      localStreamRef.current = stream;

      const { data: call, error } = await supabase
        .from("calls")
        .insert({ caller_id: user.id, receiver_id: receiverId, type, status: "ringing" })
        .select()
        .single();

      if (error || !call) throw new Error("Failed to create call");

      setCallState({
        callId: call.id,
        status: "ringing",
        type,
        isCaller: true,
        remoteUserId: receiverId,
      });

      const channel = await setupChannel(call.id);

      const pc = createPeerConnection(call.id);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === "video",
      });
      await pc.setLocalDescription(offer);

      await supabase.from("calls").update({ offer: offer as any }).eq("id", call.id);

      channel.send({
        type: "broadcast",
        event: "offer",
        payload: { sdp: offer, sender: user.id },
      });

      ringTimeoutRef.current = setTimeout(async () => {
        const currentState = callStateRef.current;
        if (currentState.status === "ringing" || (pcRef.current && pcRef.current.connectionState !== "connected")) {
          await supabase.from("calls").update({ status: "missed", ended_at: new Date().toISOString() }).eq("id", call.id);
          setCallState((s) => ({ ...s, status: "missed" }));
          cleanup();
        }
      }, RING_TIMEOUT);

    } catch (err: any) {
      console.error("startCall error:", err);
      cleanup();
      setCallState((s) => ({ ...s, status: "idle" }));
      throw err;
    }
  }, [user, setupChannel, createPeerConnection, cleanup]);

  const acceptCall = useCallback(async (callId: string, type: CallType) => {
    if (!user) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: type === "video" ? { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } : false,
      });
      localStreamRef.current = stream;

      setCallState((s) => ({ ...s, status: "connecting" }));

      await setupChannel(callId);

      const pc = createPeerConnection(callId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const { data: call } = await supabase.from("calls").select("offer").eq("id", callId).single();
      if (call?.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(call.offer as any));
        for (const c of iceCandidateQueue.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        iceCandidateQueue.current = [];
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await supabase.from("calls").update({ answer: answer as any, status: "accepted" }).eq("id", callId);

      channelRef.current?.send({
        type: "broadcast",
        event: "answer",
        payload: { sdp: answer, sender: user.id },
      });

    } catch (err: any) {
      console.error("acceptCall error:", err);
      cleanup();
      throw err;
    }
  }, [user, setupChannel, createPeerConnection, cleanup]);

  const rejectCall = useCallback(async (callId: string) => {
    await supabase.from("calls").update({ status: "rejected", ended_at: new Date().toISOString() }).eq("id", callId);
    channelRef.current?.send({ type: "broadcast", event: "hangup", payload: {} });
    cleanup();
    setCallState({ callId: null, status: "idle", type: "audio", isCaller: false, remoteUserId: null });
  }, [cleanup]);

  const endCall = useCallback(async () => {
    const id = callStateRef.current.callId;
    if (id) {
      await supabase.from("calls").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", id);
    }
    channelRef.current?.send({ type: "broadcast", event: "hangup", payload: {} });
    cleanup();
    setCallState({ callId: null, status: "idle", type: "audio", isCaller: false, remoteUserId: null });
  }, [cleanup]);

  const toggleMic = useCallback(() => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicMuted(!audioTrack.enabled);
    }
  }, []);

  const toggleVideo = useCallback(() => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setVideoOff(!videoTrack.enabled);
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    callState,
    setCallState,
    duration,
    micMuted,
    videoOff,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMic,
    toggleVideo,
  };
}
