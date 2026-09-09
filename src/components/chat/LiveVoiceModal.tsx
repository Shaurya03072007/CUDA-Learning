import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  X, 
  Radio, 
  Sparkles, 
  AlertCircle, 
  Square,
  MessageSquare,
  Activity
} from 'lucide-react';
import { floatTo16BitPCMBase64, GaplessAudioQueuePlayer } from '../../utils/audioUtils';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToTextChat?: () => void;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({
  isOpen,
  onClose,
  onSwitchToTextChat,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modelName, setModelName] = useState('gemini-3.5-flash-live');

  // Refs for audio handling
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const queuePlayerRef = useRef<GaplessAudioQueuePlayer | null>(null);
  const isMutedRef = useRef(false);

  useEffect(() => {
    isMutedRef.current = isMicMuted;
  }, [isMicMuted]);

  useEffect(() => {
    if (isOpen) {
      startLiveSession();
    } else {
      cleanupSession();
    }

    return () => {
      cleanupSession();
    };
  }, [isOpen]);

  const cleanupSession = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (queuePlayerRef.current) {
      queuePlayerRef.current.close();
      queuePlayerRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setIsAiSpeaking(false);
    setMicVolume(0);
  };

  const startLiveSession = async () => {
    try {
      setIsConnecting(true);
      setErrorMessage(null);

      // 1. Initialize queue player for 24kHz audio playback
      queuePlayerRef.current = new GaplessAudioQueuePlayer((playing) => {
        setIsAiSpeaking(playing);
      });

      // 2. Request mic audio stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // 3. Setup WebSocket to backend live gateway
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/chat/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Live Audio WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'ready') {
            setIsConnected(true);
            setIsConnecting(false);
            if (msg.model) setModelName(msg.model);
          } else if (msg.type === 'audio') {
            if (queuePlayerRef.current && msg.data) {
              queuePlayerRef.current.queueAudioChunk(msg.data);
            }
          } else if (msg.type === 'interrupted') {
            queuePlayerRef.current?.stopAndClear();
            setIsAiSpeaking(false);
          } else if (msg.type === 'error') {
            setErrorMessage(msg.message || 'Error occurred in Gemini Live');
            setIsConnecting(false);
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setErrorMessage('Failed to connect to Live Voice gateway.');
        setIsConnecting(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
      };

      // 4. Capture audio using AudioContext and ScriptProcessorNode
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioCtx;

      const sourceNode = audioCtx.createMediaStreamSource(stream);
      const scriptProcessor = audioCtx.createScriptProcessor(2048, 1, 1);
      processorRef.current = scriptProcessor;

      scriptProcessor.onaudioprocess = (e) => {
        if (isMutedRef.current) {
          setMicVolume(0);
          return;
        }

        const inputBuffer = e.inputBuffer.getChannelData(0);

        // Calculate simple volume level for visualizer
        let sum = 0;
        for (let i = 0; i < inputBuffer.length; i++) {
          sum += inputBuffer[i] * inputBuffer[i];
        }
        const rms = Math.sqrt(sum / inputBuffer.length);
        setMicVolume(Math.min(100, rms * 400));

        // Stream PCM16 Base64 chunk to Gemini Live WebSocket
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const base64Audio = floatTo16BitPCMBase64(inputBuffer);
          wsRef.current.send(
            JSON.stringify({
              type: 'audio',
              data: base64Audio,
            })
          );
        }
      };

      sourceNode.connect(scriptProcessor);
      scriptProcessor.connect(audioCtx.destination);
    } catch (err: any) {
      console.error('Failed to start live session:', err);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Microphone access was denied. Please allow microphone access to talk.'
          : err.message || 'Could not initialize Live Voice.'
      );
      setIsConnecting(false);
    }
  };

  const handleInterrupt = () => {
    queuePlayerRef.current?.stopAndClear();
    setIsAiSpeaking(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col relative max-h-[94vh]"
        id="gemini-live-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800/80 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 shrink-0">
              <Radio className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-semibold text-white tracking-wide truncate">
                  Gemini Live Voice
                </h3>
                <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30 flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  {modelName}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                Real-time bidirectional audio &amp; speaking
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-slate-800 transition-colors shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-rose-300 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Connection Alert</p>
              <p className="text-[11px] opacity-90">{errorMessage}</p>
            </div>
            <button
              onClick={() => startLiveSession()}
              className="min-h-[32px] px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-medium text-[11px] transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Central Orb & Visualizer */}
        <div className="py-8 sm:py-12 px-4 sm:px-6 flex flex-col items-center justify-center relative overflow-hidden flex-1">
          {/* Subtle radar waves */}
          <div className="relative flex items-center justify-center">
            {/* Outer animated rings */}
            <div 
              className={`absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full border border-emerald-500/20 transition-all duration-700 ${
                isAiSpeaking ? 'scale-125 opacity-80 animate-ping' : isConnected ? 'scale-110 opacity-30 animate-pulse' : 'scale-90 opacity-10'
              }`} 
            />
            <div 
              className={`absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-teal-500/30 transition-all duration-500 ${
                isAiSpeaking ? 'scale-110 opacity-90' : 'scale-100 opacity-20'
              }`} 
            />

            {/* Main Interactive Orb */}
            <div 
              className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl relative z-10 ${
                isAiSpeaking 
                  ? 'bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 shadow-emerald-500/50 scale-105' 
                  : isConnected 
                    ? micVolume > 15
                      ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/30 scale-100'
                      : 'bg-gradient-to-tr from-slate-800 to-slate-700 shadow-slate-900 border border-slate-700 scale-95'
                    : 'bg-slate-800 border border-slate-700'
              }`}
            >
              {isConnecting ? (
                <Activity className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400 animate-spin" />
              ) : isAiSpeaking ? (
                <Volume2 className="w-10 h-10 sm:w-12 sm:h-12 text-slate-950 animate-bounce" />
              ) : isMicMuted ? (
                <MicOff className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
              ) : (
                <Mic className={`w-8 h-8 sm:w-10 sm:h-10 transition-transform ${micVolume > 20 ? 'text-emerald-300 scale-110' : 'text-slate-300'}`} />
              )}
            </div>
          </div>

          {/* Status Text */}
          <div className="mt-5 sm:mt-6 text-center px-4">
            <h4 className="text-sm sm:text-base font-semibold text-white">
              {isConnecting 
                ? 'Connecting to Gemini 3.5 Flash Live...'
                : isAiSpeaking 
                  ? 'Gemini Live is speaking...'
                  : isMicMuted 
                    ? 'Microphone is Muted'
                    : isConnected 
                      ? 'Listening... Speak naturally'
                      : 'Session disconnected'}
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-1 max-w-sm">
              {isAiSpeaking 
                ? 'Speaking with low latency. Tap Interrupt or speak to pause.' 
                : 'Real-time conversational mentor for CUDA kernels, memory coalescing, and tensor cores.'}
            </p>
          </div>

          {/* Live Mic Level Bar */}
          {isConnected && !isMicMuted && (
            <div className="w-36 sm:w-48 h-1.5 bg-slate-800 rounded-full mt-3 sm:mt-4 overflow-hidden">
              <div 
                className="h-full bg-emerald-400 transition-all duration-75 rounded-full"
                style={{ width: `${Math.min(100, micVolume)}%` }}
              />
            </div>
          )}
        </div>

        {/* Action Controls Toolbar */}
        <div className="p-3.5 sm:p-6 bg-slate-900/95 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-2 sm:gap-3 shrink-0">
          {/* Mute / Unmute */}
          <button
            onClick={() => setIsMicMuted(!isMicMuted)}
            disabled={!isConnected}
            className={`flex items-center gap-1.5 min-h-[44px] px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
              isMicMuted
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
            <span>{isMicMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          {/* Interrupt AI Speaking */}
          {isAiSpeaking && (
            <button
              onClick={handleInterrupt}
              className="flex items-center gap-1.5 min-h-[44px] px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Interrupt</span>
            </button>
          )}

          {/* Switch to Text Chat */}
          {onSwitchToTextChat && (
            <button
              onClick={() => {
                cleanupSession();
                onSwitchToTextChat();
              }}
              className="flex items-center gap-1.5 min-h-[44px] px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-all"
            >
              <MessageSquare className="w-4 h-4 text-teal-400" />
              <span className="hidden xs:inline">Switch to</span> Text
            </button>
          )}

          {/* End Call */}
          <button
            onClick={() => {
              cleanupSession();
              onClose();
            }}
            className="flex items-center gap-1.5 min-h-[44px] px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 transition-all"
          >
            <VolumeX className="w-4 h-4" />
            <span>End Call</span>
          </button>
        </div>

        {/* Suggested Prompts Hint */}
        <div className="px-4 sm:px-6 pb-3 sm:pb-4 text-center shrink-0">
          <p className="text-[10px] sm:text-[11px] text-slate-500 flex items-center justify-center gap-1.5 truncate">
            <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="truncate">Try asking about bank conflicts or warp shuffles</span>
          </p>
        </div>
      </div>
    </div>
  );
};
