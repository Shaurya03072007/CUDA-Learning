import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Mic, 
  Volume2, 
  VolumeX, 
  Radio, 
  RotateCcw, 
  Sparkles, 
  Bot, 
  User, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Maximize2, 
  Minimize2,
  Cpu,
  Layers,
  Check,
  Copy,
  Sliders,
  Database,
  Plus,
  History,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { decodePCMToAudioBuffer } from '../../utils/audioUtils';
import { SupabaseConfigModal } from './SupabaseConfigModal';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  requestNumber?: number;
  modelUsed?: string;
  tier?: 1 | 2;
  tierDescription?: string;
  isSpeaking?: boolean;
}

interface ChatSessionItem {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

interface ChatbotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLiveVoice: () => void;
  onExpandToFullTab?: () => void;
}

export const ChatbotDrawer: React.FC<ChatbotDrawerProps> = ({
  isOpen,
  onClose,
  onOpenLiveVoice,
  onExpandToFullTab,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('default-cuda-session');
  const [showSessionsPanel, setShowSessionsPanel] = useState<boolean>(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState<boolean>(false);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [activeSpeakingId, setActiveSpeakingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCounterSettings, setShowCounterSettings] = useState(false);
  const [customCounterInput, setCustomCounterInput] = useState('');

  // Status metrics from server
  const [status, setStatus] = useState<{
    totalChatRequests: number;
    nextRequest: number;
    nextModel: string;
    nextTier: number;
    tierDescription: string;
    isSupabaseConfigured?: boolean;
    supabaseUrlConfigured?: boolean;
  }>({
    totalChatRequests: 0,
    nextRequest: 1,
    nextModel: 'gemini-3.5-flash-lite',
    nextTier: 1,
    tierDescription: 'Tier 1: Gemini 3.5 Flash Lite (Requests 1-499)',
    isSupabaseConfigured: false,
  });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const currentAudioCtxRef = useRef<AudioContext | null>(null);

  // Fetch status & load sessions on open
  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      loadSessions();
    }
  }, [isOpen]);

  // When active session changes, load its message history from Supabase
  useEffect(() => {
    if (isOpen && currentSessionId) {
      loadSessionMessages(currentSessionId);
    }
  }, [currentSessionId, isOpen]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/chat/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.warn('Could not fetch chat status:', e);
    }
  };

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.sessions)) {
          setSessions(data.sessions);
          if (data.sessions.length > 0 && (!currentSessionId || currentSessionId === 'default-cuda-session')) {
            setCurrentSessionId(data.sessions[0].id);
          }
        }
      }
    } catch (e) {
      console.warn('Could not load Supabase sessions:', e);
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          const mapped: ChatMessage[] = data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            requestNumber: m.request_number,
            modelUsed: m.model_used,
            tier: m.tier,
            tierDescription: m.tier === 1 ? 'Tier 1: Gemini 3.5 Flash Lite' : 'Tier 2: Gemini 3.1 Flash Lite',
          }));
          setMessages(mapped);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch session messages from Supabase:', e);
    }

    // Default message if empty
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content:
          'Hello! I am your CUDA C++ & Deep Learning Infrastructure AI Mentor powered by Gemini with Supabase Context Maintenance.\n\n• **Supabase Chat History**: Multi-turn conversation context is recorded and maintained continuously.\n• **First 499 Requests**: `Gemini 3.5 Flash Lite`\n• **Next 499 Requests**: `Gemini 3.1 Flash Lite`\n• **Speaking Ability**: Click 🔊 on any message to hear it spoken.\n• **Live Audio**: Launch **Live Voice** to talk in real-time with `Gemini 3.5 Flash Live`.\n\nHow can I help you optimize your GPU kernels today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'gemini-3.5-flash-lite',
        tier: 1,
        tierDescription: 'Tier 1: Gemini 3.5 Flash Lite (Requests 1-499)',
      },
    ]);
  };

  const handleCreateNewSession = async () => {
    const newId = `session_${Date.now()}`;
    const newTitle = `CUDA Session #${sessions.length + 1}`;
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newId, title: newTitle }),
      });
      if (res.ok) {
        const data = await res.json();
        const createdId = data.session?.id || newId;
        setCurrentSessionId(createdId);
        await loadSessions();
        setShowSessionsPanel(false);
      }
    } catch (e) {
      console.error('Failed to create new session:', e);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' });
      const updated = sessions.filter((s) => s.id !== sessionId);
      setSessions(updated);
      if (currentSessionId === sessionId) {
        if (updated.length > 0) {
          setCurrentSessionId(updated[0].id);
        } else {
          handleCreateNewSession();
        }
      }
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputQuery).trim();
    if (!text || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMessageId,
        role: 'user',
        content: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];

    setMessages(newMessages);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          message: text,
          contextInfo: {
            app: 'CUDA DL Infrastructure Mentor',
            activeSession: currentSessionId,
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Server error generating response');
      }

      const data = await res.json();
      const assistantMessageId = data.messageId || `assistant-${Date.now()}`;

      const assistantMsg: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        requestNumber: data.requestNumber,
        modelUsed: data.modelUsed,
        tier: data.tier,
        tierDescription: data.tierDescription,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      fetchStatus();
      loadSessions();

      // Auto-speak if enabled
      if (autoSpeak) {
        handleSpeakMessage(assistantMessageId, data.reply);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **Error**: ${err.message || 'Unable to connect to AI server.'}\n\nPlease check your GEMINI_API_KEY in Settings > Secrets or inspect the server logs.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeakMessage = async (msgId: string, text: string) => {
    if (activeSpeakingId === msgId) {
      stopSpeaking();
      return;
    }

    try {
      stopSpeaking();
      setActiveSpeakingId(msgId);

      const res = await fetch('/api/chat/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceName: 'Zephyr' }),
      });

      if (!res.ok) {
        throw new Error('TTS synthesis failed');
      }

      const data = await res.json();
      if (!data.audioBase64) {
        throw new Error('No audio returned');
      }

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
      currentAudioCtxRef.current = audioCtx;

      const audioBuffer = decodePCMToAudioBuffer(data.audioBase64, audioCtx, 24000);
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);

      source.onended = () => {
        setActiveSpeakingId(null);
      };

      currentAudioSourceRef.current = source;
      source.start();
    } catch (err) {
      console.error('TTS error:', err);
      setActiveSpeakingId(null);
    }
  };

  const stopSpeaking = () => {
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop();
        currentAudioSourceRef.current.disconnect();
      } catch (e) {
        // Ignored
      }
      currentAudioSourceRef.current = null;
    }
    if (currentAudioCtxRef.current) {
      try {
        currentAudioCtxRef.current.close();
      } catch (e) {
        // Ignored
      }
      currentAudioCtxRef.current = null;
    }
    setActiveSpeakingId(null);
  };

  const handleSetCounter = async (count: number) => {
    try {
      const res = await fetch('/api/chat/set-counter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      });
      if (res.ok) {
        const data = await res.json();
        setStatus((prev) => ({
          ...prev,
          totalChatRequests: data.totalChatRequests,
          nextRequest: data.totalChatRequests + 1,
          nextModel: data.nextModel,
          nextTier: data.nextTier,
          tierDescription: data.tierDescription,
        }));
        setShowCounterSettings(false);
      }
    } catch (e) {
      console.error('Failed to set counter:', e);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const samplePrompts = [
    'How do I eliminate bank conflicts in a 2D shared memory tile?',
    'Show me how to implement warp-level sum reduction using __shfl_down_sync.',
    'Explain the online softmax numerical rescaling in FlashAttention.',
    'Write a PyTorch C++ custom CUDA extension for GELU forward pass.',
  ];

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile background dim overlay */}
      <div 
        className="sm:hidden fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 transition-opacity" 
        onClick={onClose} 
      />

      <div 
        className="fixed inset-x-0 bottom-0 top-12 sm:top-auto sm:bottom-6 sm:right-6 sm:left-auto sm:w-[500px] sm:h-[660px] sm:max-h-[88vh] bg-slate-900 border border-slate-700/80 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200"
        id="gemini-chatbot-drawer"
      >
        {/* Mobile Swipe / Drag Handle */}
        <div className="sm:hidden w-full flex items-center justify-center pt-2.5 pb-1 bg-slate-950/90 shrink-0">
          <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20 shrink-0">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-semibold text-white tracking-wide truncate">CUDA AI Mentor</span>
                <span className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-mono border truncate ${
                  status.nextTier === 1 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>
                  {status.nextModel}
                </span>
              </div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>Req #{status.totalChatRequests + 1}</span>
                <span>•</span>
                <span className="truncate max-w-[130px] sm:max-w-[170px]">{status.tierDescription}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Live Voice Button */}
            <button
              onClick={onOpenLiveVoice}
              className="flex items-center gap-1 min-h-[38px] px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-colors active:scale-95"
              title="Open Gemini 3.5 Flash Live Voice"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              <span className="text-[11px]">Live</span>
            </button>

            {/* Expand to full tab (hidden on small mobile) */}
            {onExpandToFullTab && (
              <button
                onClick={onExpandToFullTab}
                className="hidden sm:flex min-w-[36px] min-h-[36px] items-center justify-center p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Expand to Full Tab"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}

            {/* Quota & Counter Settings */}
            <button
              onClick={() => setShowCounterSettings(!showCounterSettings)}
              className="min-w-[38px] min-h-[38px] flex items-center justify-center p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              title="Inspect Request Counter & Tier Switching"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="min-w-[38px] min-h-[38px] flex items-center justify-center p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              title="Close Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Supabase Context & Sessions Bar */}
        <div className="px-3 sm:px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs shrink-0 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Sessions Selector Toggle */}
            <button
              onClick={() => setShowSessionsPanel(!showSessionsPanel)}
              className="flex items-center gap-1.5 min-h-[36px] px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors border border-slate-700 truncate"
              title="View saved Supabase chat sessions"
            >
              <History className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span className="truncate max-w-[120px] sm:max-w-[150px] font-medium">
                {currentSession?.title || 'Active Session'}
              </span>
              <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${showSessionsPanel ? 'rotate-180' : ''}`} />
            </button>

            {/* New Chat Button */}
            <button
              onClick={handleCreateNewSession}
              className="flex items-center gap-1 min-h-[36px] px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition-colors border border-slate-700 shrink-0"
              title="Start a fresh conversation thread"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xs:inline">New</span>
            </button>
          </div>

          {/* Supabase Status Pill */}
          <button
            onClick={() => setShowSupabaseModal(true)}
            className={`flex items-center gap-1 min-h-[36px] px-2.5 py-1 rounded-xl text-[10px] font-mono border transition-all shrink-0 ${
              status.isSupabaseConfigured
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
            }`}
            title="Configure Supabase Chat History & View Schema"
          >
            <Database className="w-3 h-3 shrink-0" />
            <span>{status.isSupabaseConfigured ? 'Supabase' : 'Setup'}</span>
          </button>
        </div>

        {/* Sessions Dropdown Panel */}
        {showSessionsPanel && (
          <div className="bg-slate-950 border-b border-slate-800 px-3 sm:px-4 py-3 text-xs max-h-56 overflow-y-auto space-y-1.5 scrollbar-thin animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase px-1 pb-1">
              <span>Saved Supabase Threads</span>
              <button
                onClick={handleCreateNewSession}
                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[11px]"
              >
                <Plus className="w-3 h-3" />
                <span>Create New</span>
              </button>
            </div>

            {sessions.length === 0 ? (
              <p className="text-slate-500 text-[11px] p-2 text-center">No previous sessions found</p>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    setCurrentSessionId(s.id);
                    setShowSessionsPanel(false);
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-colors min-h-[44px] ${
                    s.id === currentSessionId
                      ? 'bg-emerald-950/40 border border-emerald-500/40 text-white'
                      : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="truncate pr-2">
                    <p className="font-medium text-xs truncate">{s.title}</p>
                    <p className="text-[10px] text-slate-400">
                      {s.message_count ?? 0} messages • {new Date(s.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                    title="Delete session from Supabase"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Model Tier Tracker Bar */}
        <div className="px-3 sm:px-5 py-1.5 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between text-[10px] sm:text-[11px] shrink-0">
          <div className="flex items-center gap-1 sm:gap-2 truncate">
            <span className="text-slate-400">Policy:</span>
            <span className="text-emerald-400 font-mono">1-499: 3.5</span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-400 font-mono">500-998: 3.1</span>
          </div>

          {/* Auto-speak toggle */}
          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors min-h-[28px] ${
              autoSpeak 
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Automatically speak AI responses using Gemini TTS"
          >
            {autoSpeak ? <Volume2 className="w-3 h-3 text-teal-400" /> : <VolumeX className="w-3 h-3" />}
            <span>TTS {autoSpeak ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Counter Simulation Popover */}
        {showCounterSettings && (
          <div className="px-4 sm:px-5 py-3 bg-slate-800/95 border-b border-slate-700 text-xs text-slate-200 animate-in fade-in shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-white">Test Request Transition:</span>
              <span className="font-mono text-emerald-400">Req #{status.totalChatRequests + 1}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleSetCounter(0)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-[11px] min-h-[32px]"
              >
                Reset to #0 (Req 1)
              </button>
              <button
                onClick={() => handleSetCounter(498)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-[11px] text-emerald-300 min-h-[32px]"
              >
                Set to #498 (Boundary)
              </button>
              <button
                onClick={() => handleSetCounter(499)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-[11px] text-amber-300 min-h-[32px]"
              >
                Set to #499 (Tier 2)
              </button>
            </div>
          </div>
        )}

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 text-xs scrollbar-thin">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 sm:gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-emerald-400 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-3 sm:p-3.5 ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-tr-sm shadow-md'
                    : 'bg-slate-800/80 border border-slate-700/60 text-slate-200 rounded-tl-sm shadow'
                }`}
              >
                {/* Assistant Metadata Header */}
                {msg.role === 'assistant' && (
                  <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-700/50 text-[10px] text-slate-400">
                    <div className="flex items-center gap-1.5 font-mono truncate">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${msg.tier === 1 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <span className="truncate">{msg.modelUsed || status.nextModel}</span>
                      {msg.requestNumber && <span className="hidden xs:inline">(Req #{msg.requestNumber})</span>}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* TTS Speaking Ability Button */}
                      <button
                        onClick={() => handleSpeakMessage(msg.id, msg.content)}
                        className={`min-h-[28px] px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                          activeSpeakingId === msg.id
                            ? 'bg-teal-500/20 text-teal-300 font-semibold'
                            : 'hover:bg-slate-700 text-slate-400 hover:text-white'
                        }`}
                        title="Speak response aloud (Gemini TTS)"
                      >
                        {activeSpeakingId === msg.id ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5 text-teal-400" />
                            <span className="text-[10px]">Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span className="text-[10px]">Speak</span>
                          </>
                        )}
                      </button>

                      {/* Copy message button */}
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="min-w-[28px] min-h-[28px] flex items-center justify-center rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Message Body */}
                <div className="whitespace-pre-wrap leading-relaxed select-text font-sans break-words text-xs sm:text-[13px]">
                  {msg.content}
                </div>

                <div className="text-[9px] text-slate-400/80 text-right mt-1.5">
                  {msg.timestamp}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-300 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 sm:gap-3 justify-start">
              <div className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-emerald-400 mt-1">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-tl-sm p-3 flex items-center gap-2 text-slate-400 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>
                  Querying {status.nextModel}...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Sample Prompt Chips */}
        {messages.length <= 2 && (
          <div className="px-3 sm:px-4 py-2 border-t border-slate-800/60 bg-slate-950/40 flex gap-2 overflow-x-auto scrollbar-none shrink-0">
            {samplePrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] whitespace-nowrap border border-slate-700 transition-colors min-h-[32px] flex items-center"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="p-2.5 sm:p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2 shrink-0 pb-safe">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={`Ask CUDA AI (${status.nextModel})...`}
            disabled={isLoading}
            className="flex-1 min-h-[44px] bg-slate-900 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputQuery.trim()}
            className="min-w-[44px] min-h-[44px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white transition-colors flex items-center justify-center shadow-lg shadow-emerald-600/20 active:scale-95 shrink-0"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Supabase Schema and Configuration Modal */}
      <SupabaseConfigModal
        isOpen={showSupabaseModal}
        onClose={() => setShowSupabaseModal(false)}
        isConfigured={!!status.isSupabaseConfigured}
        onRefreshStatus={fetchStatus}
      />
    </>
  );
};
