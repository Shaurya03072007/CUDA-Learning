import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Radio, 
  Mic, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Sliders, 
  Cpu, 
  Terminal, 
  Check, 
  Copy, 
  Trash2, 
  RefreshCw, 
  Zap, 
  BookOpen, 
  Code,
  Database,
  Plus,
  History,
  MessageSquare,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { ChatMessage } from './ChatbotDrawer';
import { decodePCMToAudioBuffer } from '../../utils/audioUtils';
import { SupabaseConfigModal } from './SupabaseConfigModal';

interface ChatSessionItem {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  context_summary?: string;
}

interface ChatbotFullViewProps {
  onOpenLiveVoice: () => void;
}

export const ChatbotFullView: React.FC<ChatbotFullViewProps> = ({ onOpenLiveVoice }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('default-cuda-session');
  const [showSupabaseModal, setShowSupabaseModal] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [activeSpeakingId, setActiveSpeakingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCounterSettings, setShowCounterSettings] = useState(false);
  const [customCounter, setCustomCounter] = useState('');

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

  useEffect(() => {
    fetchStatus();
    loadSessions();
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      loadSessionMessages(currentSessionId);
    }
  }, [currentSessionId]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/chat/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.warn('Status fetch error:', e);
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
      console.warn('Could not load sessions:', e);
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
      console.warn('Failed to load session messages:', e);
    }

    setMessages([
      {
        id: 'welcome-full',
        role: 'assistant',
        content:
          `Welcome to the **CUDA C++ Deep Learning Infrastructure AI Workspace** with **Supabase Context Maintenance**!

Here is how my query policies and context maintenance operate:

• **Supabase Chat History**: Multi-turn questions, kernel designs, and optimization advice are persisted in Supabase to provide continuous context memory across requests.
• **Tier 1 (Requests 1 to 499)**: Powered by \`Gemini 3.5 Flash Lite\` for fast, silicon-tuned reasoning.
• **Tier 2 (Requests 500 to 998)**: Automatically switches to \`Gemini 3.1 Flash Lite\` for continued high throughput.
• **Speaking Ability**: Every message features a **Speak** button powered by \`gemini-3.1-flash-tts-preview\` (24kHz studio voice).
• **Live Audio**: Launch **Gemini 3.5 Flash Live** for real-time low-latency spoken conversations with two-way audio.

Ask me anything about warp shuffles, shared memory bank padding, FlashAttention-1/2, PagedAttention vLLM kernels, or PyTorch C++ bindings!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'gemini-3.5-flash-lite',
        tier: 1,
        tierDescription: 'Tier 1: Gemini 3.5 Flash Lite (Requests 1-499)',
      },
    ]);
  };

  const handleCreateNewSession = async () => {
    const newId = `session_${Date.now()}`;
    const newTitle = `CUDA Thread #${sessions.length + 1}`;
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
        setMobileSidebarOpen(false);
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
      console.error('Failed to delete session:', err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputQuery).trim();
    if (!text || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMsgId,
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
            app: 'CUDA Full View Workspace',
            activeSessionId: currentSessionId,
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Server error generating response');
      }

      const data = await res.json();
      const assistantMsgId = data.messageId || `assistant-${Date.now()}`;

      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
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

      if (autoSpeak) {
        handleSpeakMessage(assistantMsgId, data.reply);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Error: ${err.message || 'Failed to connect to Gemini API.'}`,
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
      console.error('Counter update failed:', e);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeSession = sessions.find((s) => s.id === currentSessionId);

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[500px] bg-slate-950 text-slate-100 rounded-3xl border border-slate-800 overflow-hidden font-sans relative shadow-2xl">
      {/* Mobile Sidebar Backdrop Overlay */}
      {mobileSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sessions Left Sidebar (Desktop & Mobile Drawer) */}
      <div 
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 transition-transform duration-200 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Supabase Threads</h2>
              <p className="text-[10px] text-slate-400">Continuous context</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleCreateNewSession}
              className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Create New Thread"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Mobile close sidebar button */}
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Supabase Status Card */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${status.isSupabaseConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              <span>{status.isSupabaseConfigured ? 'Supabase Sync Active' : 'Supabase Setup'}</span>
            </span>
            <button
              onClick={() => setShowSupabaseModal(true)}
              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium underline"
            >
              Config &amp; SQL
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {status.isSupabaseConfigured 
              ? 'Multi-turn memory synced to PostgreSQL.' 
              : 'Add SUPABASE_URL and SUPABASE_ANON_KEY to persist across devices.'}
          </p>
        </div>

        {/* Saved Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
            Active Threads ({sessions.length})
          </div>

          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => {
                setCurrentSessionId(s.id);
                setMobileSidebarOpen(false);
              }}
              className={`group flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all min-h-[44px] ${
                s.id === currentSessionId
                  ? 'bg-emerald-950/40 border border-emerald-500/40 text-white shadow-sm'
                  : 'hover:bg-slate-800/70 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="truncate flex-1 pr-2">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-emerald-400" />
                  <span className="text-xs font-medium truncate">{s.title}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 pl-5">
                  {s.message_count ?? 0} msgs • {new Date(s.updated_at).toLocaleDateString()}
                </div>
              </div>

              <button
                onClick={(e) => handleDeleteSession(s.id, e)}
                className="opacity-60 md:opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-all min-w-[32px] min-h-[32px] flex items-center justify-center"
                title="Delete thread"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Conversation Canvas */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 min-w-0">
        {/* Workspace Top Header */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            {/* Mobile Sidebar Toggle Button */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
              title="Open threads sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20 shrink-0">
              <Bot className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-3 truncate">
                <h1 className="text-xs sm:text-base font-bold text-white tracking-wide truncate">
                  {activeSession?.title || 'CUDA DL Copilot'}
                </h1>
                <span className={`text-[9px] sm:text-[11px] px-2 py-0.5 rounded-full font-mono border shrink-0 ${
                  status.nextTier === 1
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>
                  {status.nextModel}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
                <span>Req #{status.totalChatRequests + 1}</span>
                <span>•</span>
                <span className="truncate">{status.tierDescription}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Live Audio Button */}
            <button
              onClick={onOpenLiveVoice}
              className="flex items-center gap-1.5 min-h-[40px] px-2.5 sm:px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-95"
            >
              <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse shrink-0" />
              <span className="hidden xs:inline">Live Audio</span>
            </button>

            {/* Counter Settings */}
            <button
              onClick={() => setShowCounterSettings(!showCounterSettings)}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title="Test request counter transitions"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Counter Testing Strip */}
        {showCounterSettings && (
          <div className="px-4 sm:px-6 py-3 bg-slate-900 border-b border-slate-800 text-xs text-slate-200 animate-in fade-in flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-emerald-400">Simulator:</span>
              <button
                onClick={() => handleSetCounter(0)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] border border-slate-700 min-h-[32px]"
              >
                Req 1 (3.5 Flash Lite)
              </button>
              <button
                onClick={() => handleSetCounter(498)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-emerald-300 border border-slate-700 min-h-[32px]"
              >
                Set 498
              </button>
              <button
                onClick={() => handleSetCounter(499)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-amber-300 border border-slate-700 min-h-[32px]"
              >
                Set 499 (Tier 2)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Custom #"
                value={customCounter}
                onChange={(e) => setCustomCounter(e.target.value)}
                className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white w-24 min-h-[32px]"
              />
              <button
                onClick={() => {
                  const val = parseInt(customCounter, 10);
                  if (!isNaN(val) && val >= 0) {
                    handleSetCounter(val);
                    setCustomCounter('');
                  }
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-semibold text-white min-h-[32px]"
              >
                Set
              </button>
            </div>
          </div>
        )}

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-5 scrollbar-thin">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 sm:gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-emerald-400 mt-1 shadow-md">
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              )}

              <div
                className={`rounded-3xl p-3.5 sm:p-5 ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-tr-sm max-w-[88%] sm:max-w-[80%] shadow-lg shadow-emerald-600/10'
                    : 'bg-slate-900/80 border border-slate-800 text-slate-200 rounded-tl-sm w-full shadow-lg'
                }`}
              >
                {/* Assistant Metadata */}
                {msg.role === 'assistant' && (
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800 text-xs text-slate-400 gap-2">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${msg.tier === 1 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <span className="font-semibold text-slate-300 truncate">{msg.modelUsed || status.nextModel}</span>
                      {msg.requestNumber && <span className="hidden xs:inline">• Req #{msg.requestNumber}</span>}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* TTS Speaking Ability */}
                      <button
                        onClick={() => handleSpeakMessage(msg.id, msg.content)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs transition-colors min-h-[30px] ${
                          activeSpeakingId === msg.id
                            ? 'bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/40'
                            : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title="Speak response aloud via Gemini TTS"
                      >
                        {activeSpeakingId === msg.id ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5 text-teal-400" />
                            <span className="text-[11px]">Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Speak</span>
                          </>
                        )}
                      </button>

                      {/* Copy message */}
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors min-h-[30px] min-w-[30px] flex items-center justify-center"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="whitespace-pre-wrap leading-relaxed text-xs sm:text-sm select-text font-sans break-words">
                  {msg.content}
                </div>

                <div className="text-[10px] text-slate-400/80 text-right mt-2 sm:mt-3">
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 max-w-4xl mx-auto justify-start">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-emerald-400 mt-1">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl rounded-tl-sm p-3.5 flex items-center gap-2.5 text-slate-400 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span>
                  Querying {status.nextModel}...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-5 bg-slate-900 border-t border-slate-800 shrink-0">
          <div className="max-w-4xl mx-auto flex items-center gap-2 sm:gap-3">
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
              placeholder={`Ask CUDA AI Mentor (${status.nextModel})...`}
              disabled={isLoading}
              className="flex-1 min-h-[46px] bg-slate-950 border border-slate-700 rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors shadow-inner"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputQuery.trim()}
              className="min-h-[46px] px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden xs:inline">Send</span>
            </button>
          </div>
        </div>
      </div>

      {/* Supabase Schema Modal */}
      <SupabaseConfigModal
        isOpen={showSupabaseModal}
        onClose={() => setShowSupabaseModal(false)}
        isConfigured={!!status.isSupabaseConfigured}
        onRefreshStatus={fetchStatus}
      />
    </div>
  );
};
