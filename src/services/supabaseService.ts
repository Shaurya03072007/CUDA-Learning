import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface ChatSessionRecord {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  context_summary?: string;
  message_count?: number;
}

export interface ChatMessageRecord {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  request_number?: number;
  model_used?: string;
  tier?: number;
  created_at: string;
}

// In-memory fallback if Supabase credentials are not yet set
const inMemorySessions: Map<string, ChatSessionRecord> = new Map();
const inMemoryMessages: Map<string, ChatMessageRecord[]> = new Map();

// Seed initial default session for memory fallback
const DEFAULT_SESSION_ID = 'default-cuda-session';
inMemorySessions.set(DEFAULT_SESSION_ID, {
  id: DEFAULT_SESSION_ID,
  title: 'CUDA Kernel & PyTorch Infra Discussion',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  context_summary: 'General CUDA C++, GPU memory hierarchy, warp shuffles, and FlashAttention discussion.',
  message_count: 0,
});
inMemoryMessages.set(DEFAULT_SESSION_ID, []);

let supabaseInstance: SupabaseClient | null = null;

/**
 * Lazy initialization of Supabase client to prevent module-load crashes if env vars are missing.
 */
export function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key = (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();

  if (!url || !key) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      console.log('✅ Supabase client initialized with URL:', url);
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      return null;
    }
  }

  return supabaseInstance;
}

export function isSupabaseConfigured(): boolean {
  return !!(process.env.SUPABASE_URL?.trim() && (process.env.SUPABASE_ANON_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()));
}

export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- Supabase Schema for CUDA AI Chat History & Context Maintenance
-- Paste this into your Supabase project's SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  context_summary TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  request_number INTEGER,
  model_used TEXT,
  tier INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for rapid conversation context retrieval
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created 
  ON public.chat_messages(session_id, created_at ASC);

-- Enable Row Level Security (RLS) with permissive policy for public anon access
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write to chat_sessions" 
  ON public.chat_sessions FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read/write to chat_messages" 
  ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);
`;

/**
 * List all chat sessions sorted by latest activity
 */
export async function listChatSessions(): Promise<ChatSessionRecord[]> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*, chat_messages(count)')
        .order('updated_at', { ascending: false });

      if (!error && data) {
        return data.map((item: any) => ({
          id: item.id,
          title: item.title,
          created_at: item.created_at,
          updated_at: item.updated_at,
          context_summary: item.context_summary,
          message_count: item.chat_messages?.[0]?.count ?? 0,
        }));
      }
      console.warn('Supabase listChatSessions query issue, falling back to local store:', error?.message);
    } catch (e: any) {
      console.warn('Supabase listChatSessions exception:', e?.message);
    }
  }

  // Fallback to in-memory store
  const sessions = Array.from(inMemorySessions.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
  return sessions.map((s) => ({
    ...s,
    message_count: inMemoryMessages.get(s.id)?.length || 0,
  }));
}

/**
 * Create a new chat session
 */
export async function createChatSession(customId?: string, title?: string): Promise<ChatSessionRecord> {
  const id = customId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const sessionTitle = title || 'New CUDA Optimization Chat';
  const now = new Date().toISOString();

  const session: ChatSessionRecord = {
    id,
    title: sessionTitle,
    created_at: now,
    updated_at: now,
    context_summary: '',
    message_count: 0,
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from('chat_sessions').upsert({
        id: session.id,
        title: session.title,
        created_at: session.created_at,
        updated_at: session.updated_at,
        context_summary: session.context_summary,
      });

      if (!error) {
        return session;
      }
      console.warn('Supabase createChatSession error:', error.message);
    } catch (e: any) {
      console.warn('Supabase createChatSession exception:', e.message);
    }
  }

  // Save to fallback memory store
  inMemorySessions.set(id, session);
  if (!inMemoryMessages.has(id)) {
    inMemoryMessages.set(id, []);
  }
  return session;
}

/**
 * Get all messages for a specific session ordered chronologically
 */
export async function getSessionMessages(sessionId: string): Promise<ChatMessageRecord[]> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        return data as ChatMessageRecord[];
      }
      console.warn('Supabase getSessionMessages error:', error?.message);
    } catch (e: any) {
      console.warn('Supabase getSessionMessages exception:', e.message);
    }
  }

  // Fallback to in-memory store
  return inMemoryMessages.get(sessionId) || [];
}

/**
 * Append a message to a session and update session's updated_at and context
 */
export async function saveChatMessage(message: {
  id?: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  requestNumber?: number;
  modelUsed?: string;
  tier?: number;
}): Promise<ChatMessageRecord> {
  const id = message.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const record: ChatMessageRecord = {
    id,
    session_id: message.sessionId,
    role: message.role,
    content: message.content,
    request_number: message.requestNumber,
    model_used: message.modelUsed,
    tier: message.tier,
    created_at: now,
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      // 1. Ensure session exists in Supabase
      await supabase.from('chat_sessions').upsert({
        id: message.sessionId,
        title: message.role === 'user' ? message.content.slice(0, 48) + '...' : 'CUDA Kernel Chat',
        updated_at: now,
      }, { onConflict: 'id', ignoreDuplicates: false });

      // 2. Insert message
      const { error: msgErr } = await supabase.from('chat_messages').insert({
        id: record.id,
        session_id: record.session_id,
        role: record.role,
        content: record.content,
        request_number: record.request_number,
        model_used: record.model_used,
        tier: record.tier,
        created_at: record.created_at,
      });

      if (msgErr) {
        console.warn('Supabase saveChatMessage error:', msgErr.message);
      } else {
        // Update session's updated_at timestamp
        await supabase
          .from('chat_sessions')
          .update({ updated_at: now })
          .eq('id', message.sessionId);

        return record;
      }
    } catch (e: any) {
      console.warn('Supabase saveChatMessage exception:', e.message);
    }
  }

  // In-memory fallback
  if (!inMemorySessions.has(message.sessionId)) {
    inMemorySessions.set(message.sessionId, {
      id: message.sessionId,
      title: message.content.slice(0, 48) + '...',
      created_at: now,
      updated_at: now,
      context_summary: '',
      message_count: 0,
    });
  } else {
    const s = inMemorySessions.get(message.sessionId)!;
    s.updated_at = now;
    if (s.title === 'New CUDA Optimization Chat' && message.role === 'user') {
      s.title = message.content.slice(0, 48) + '...';
    }
  }

  const list = inMemoryMessages.get(message.sessionId) || [];
  list.push(record);
  inMemoryMessages.set(message.sessionId, list);

  return record;
}

/**
 * Delete a session and its associated messages
 */
export async function deleteChatSession(sessionId: string): Promise<boolean> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (!error) {
        inMemorySessions.delete(sessionId);
        inMemoryMessages.delete(sessionId);
        return true;
      }
      console.warn('Supabase deleteChatSession error:', error.message);
    } catch (e: any) {
      console.warn('Supabase deleteChatSession exception:', e.message);
    }
  }

  inMemorySessions.delete(sessionId);
  inMemoryMessages.delete(sessionId);
  return true;
}

/**
 * Retrieve recent conversational context for Gemini API prompt
 * Ensures full context maintenance across multi-turn sessions.
 */
export async function getConversationContextForGemini(
  sessionId: string,
  limit: number = 20
): Promise<{
  formattedHistory: Array<{ role: string; parts: Array<{ text: string }> }>;
  summary: string;
}> {
  const messages = await getSessionMessages(sessionId);
  const recent = messages.slice(-limit);

  const formattedHistory = recent.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  let summary = '';
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data } = await supabase
        .from('chat_sessions')
        .select('context_summary')
        .eq('id', sessionId)
        .single();
      if (data?.context_summary) {
        summary = data.context_summary;
      }
    } catch (e) {
      // Ignored
    }
  } else {
    summary = inMemorySessions.get(sessionId)?.context_summary || '';
  }

  return {
    formattedHistory,
    summary,
  };
}

/**
 * Update the running context summary for long-term memory maintenance
 */
export async function updateSessionSummary(sessionId: string, summary: string): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase
        .from('chat_sessions')
        .update({ context_summary: summary })
        .eq('id', sessionId);
    } catch (e) {
      // Ignored
    }
  }

  const s = inMemorySessions.get(sessionId);
  if (s) {
    s.context_summary = summary;
  }
}
