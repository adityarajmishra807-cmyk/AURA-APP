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
};

const RING_TIMEOUT = 30000; // 30s

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

  const cleanup = useCallback(() => {
    // Stop all tracks
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;

    // Close peer connection
    pcRef.current?.close();
    pcRef.current = null;

    // Unsubscribe realtime
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Clear timers
    clearInterval(durationTimerRef.current);
    clearTimeout(ringTimeoutRef.current);

    // Reset refs
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    iceCandidateQueue.current = [];
    setDuration(0);
  }, []);

  const createPeerConnection = useCallback((callId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Remote stream
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

    // ICE candidates -> send via realtime
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: { candidate: event.candidate.toJSON(), sender: user?.id },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setCallState((s) => ({ ...s, status: "connected" }));
        durationTimerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      }
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
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
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      // Flush queued ICE candidates
      for (const c of iceCandidateQueue.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      }
      iceCandidateQueue.current = [];
    });

    channel.on("broadcast", { event: "answer" }, async ({ payload }) => {
      if (payload.sender === user?.id) return;
      const pc = pcRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      setCallState((s) => ({ ...s, status: "connecting" }));
      // Flush queued ICE candidates
      for (const c of iceCandidateQueue.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      }
      iceCandidateQueue.current = [];
    });

    channel.on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
      if (payload.sender === user?.id) return;
      const pc = pcRef.current;
      if (!pc) return;
      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } else {
        iceCandidateQueue.current.push(payload.candidate);
      }
    });

    channel.on("broadcast", { event: "hangup" }, () => {
      setCallState((s) => ({ ...s, status: "ended" }));
      cleanup();
    });

    channelRef.current = channel;
    
    // Return a promise that resolves when the channel is fully subscribed
    return new Promise<typeof channel>((resolve) => {
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          resolve(channel);
        }
      });
    });
  }, [user, cleanup]);

  // CALLER: initiate call
  const startCall = useCallback(async (receiverId: string, type: CallType) => {
    if (!user) return;

    try {
      // Get media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });
      localStreamRef.current = stream;

      // Create call record
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

      // Setup signaling (wait for subscription)
      const channel = await setupChannel(call.id);

      // Create peer connection
      const pc = createPeerConnection(call.id);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Store offer in DB for late joiners
      await supabase.from("calls").update({ offer: offer as any }).eq("id", call.id);

      // Also broadcast
      channel.send({
        type: "broadcast",
        event: "offer",
        payload: { sdp: offer, sender: user.id },
      });

      // Ring timeout
      ringTimeoutRef.current = setTimeout(async () => {
        if (callState.status === "ringing" || pcRef.current?.connectionState !== "connected") {
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

  // RECEIVER: accept call
  const acceptCall = useCallback(async (callId: string, type: CallType) => {
    if (!user) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });
      localStreamRef.current = stream;

      setCallState((s) => ({ ...s, status: "connecting" }));

      // Setup signaling (wait for subscription)
      await setupChannel(callId);

      // Create peer connection
      const pc = createPeerConnection(callId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // Get offer from DB
      const { data: call } = await supabase.from("calls").select("offer").eq("id", callId).single();
      if (call?.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(call.offer as any));
        // Flush queued ICE candidates
        for (const c of iceCandidateQueue.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        }
        iceCandidateQueue.current = [];
      }

      // Create and send answer
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

  // RECEIVER: reject call
  const rejectCall = useCallback(async (callId: string) => {
    await supabase.from("calls").update({ status: "rejected", ended_at: new Date().toISOString() }).eq("id", callId);
    channelRef.current?.send({ type: "broadcast", event: "hangup", payload: {} });
    cleanup();
    setCallState({ callId: null, status: "idle", type: "audio", isCaller: false, remoteUserId: null });
  }, [cleanup]);

  // End call (either side)
  const endCall = useCallback(async () => {
    const id = callState.callId;
    if (id) {
      await supabase.from("calls").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", id);
    }
    channelRef.current?.send({ type: "broadcast", event: "hangup", payload: {} });
    cleanup();
    setCallState({ callId: null, status: "idle", type: "audio", isCaller: false, remoteUserId: null });
  }, [callState.callId, cleanup]);

  // Toggle mic
  const toggleMic = useCallback(() => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicMuted(!audioTrack.enabled);
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setVideoOff(!videoTrack.enabled);
    }
  }, []);

  // Cleanup on unmount
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
