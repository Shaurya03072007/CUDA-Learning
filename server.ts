import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import {
  isSupabaseConfigured,
  listChatSessions,
  createChatSession,
  getSessionMessages,
  saveChatMessage,
  deleteChatSession,
  getConversationContextForGemini,
  SUPABASE_SQL_SCHEMA,
  updateSessionSummary,
} from './src/services/supabaseService';

dotenv.config();

const PORT = 3000;
const app = express();
const server = http.createServer(app);

app.use(express.json({ limit: '10mb' }));

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Request Counter for Model Switching:
// Requests 1 - 499: gemini-3.5-flash-lite
// Requests 500 - 998: gemini-3.1-flash-lite
let totalChatRequests = 0;

export function getModelForRequestIndex(index: number): {
  model: string;
  tier: 1 | 2;
  cycleIndex: number;
  tierDescription: string;
} {
  // 0-indexed in a 998-request cycle
  const cycleIndex = (index - 1) % 998;
  if (cycleIndex < 499) {
    return {
      model: 'gemini-3.5-flash-lite',
      tier: 1,
      cycleIndex: cycleIndex + 1,
      tierDescription: `Tier 1: Gemini 3.5 Flash Lite (Request ${cycleIndex + 1} of 499)`,
    };
  } else {
    return {
      model: 'gemini-3.1-flash-lite',
      tier: 2,
      cycleIndex: cycleIndex + 1,
      tierDescription: `Tier 2: Gemini 3.1 Flash Lite (Request ${cycleIndex - 499 + 1} of 499 / Cycle #${cycleIndex + 1})`,
    };
  }
}

// ---------------------------------------------------------------------------
// REST API ENDPOINTS
// ---------------------------------------------------------------------------

// 1. Health check & status
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiKeyConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// 2. Chatbot status & quota counter
app.get('/api/chat/status', (req: Request, res: Response) => {
  const nextRequest = totalChatRequests + 1;
  const nextModelInfo = getModelForRequestIndex(nextRequest);
  res.json({
    totalChatRequests,
    nextRequest,
    nextModel: nextModelInfo.model,
    nextTier: nextModelInfo.tier,
    nextCycleIndex: nextModelInfo.cycleIndex,
    tierDescription: nextModelInfo.tierDescription,
    hasApiKey: !!process.env.GEMINI_API_KEY,
    isSupabaseConfigured: isSupabaseConfigured(),
    supabaseUrlConfigured: !!process.env.SUPABASE_URL,
  });
});

// Supabase SQL Schema for easy copy/paste into Supabase SQL Editor
app.get('/api/chat/schema-sql', (req: Request, res: Response) => {
  res.json({ sql: SUPABASE_SQL_SCHEMA });
});

// Supabase Chat Sessions list
app.get('/api/chat/sessions', async (req: Request, res: Response) => {
  try {
    const sessions = await listChatSessions();
    res.json({
      sessions,
      isSupabaseConfigured: isSupabaseConfigured(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list sessions' });
  }
});

// Create a new chat session in Supabase
app.post('/api/chat/sessions', async (req: Request, res: Response) => {
  try {
    const { id, title } = req.body;
    const session = await createChatSession(id, title);
    res.json({ session });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create session' });
  }
});

// Get messages for a session from Supabase
app.get('/api/chat/sessions/:sessionId/messages', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const messages = await getSessionMessages(sessionId);
    res.json({ messages });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch session messages' });
  }
});

// Delete a session and its messages from Supabase
app.delete('/api/chat/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    await deleteChatSession(sessionId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete session' });
  }
});

// Reset or advance counter for testing model transitions
app.post('/api/chat/set-counter', (req: Request, res: Response) => {
  const { count } = req.body;
  if (typeof count === 'number' && count >= 0) {
    totalChatRequests = count;
  }
  const nextModelInfo = getModelForRequestIndex(totalChatRequests + 1);
  res.json({
    totalChatRequests,
    nextModel: nextModelInfo.model,
    nextTier: nextModelInfo.tier,
    nextCycleIndex: nextModelInfo.cycleIndex,
    tierDescription: nextModelInfo.tierDescription,
  });
});

// 3. Chat completion endpoint with Supabase persistence & context maintenance
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY environment variable is not configured.',
      });
    }

    const { sessionId = 'default-cuda-session', message, messages, contextInfo } = req.body;

    // Determine the user's message text
    let userPrompt = '';
    if (message && typeof message === 'string') {
      userPrompt = message.trim();
    } else if (messages && Array.isArray(messages) && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      userPrompt = lastMsg?.content || '';
    }

    if (!userPrompt) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    // 1. Save user message to Supabase
    await saveChatMessage({
      sessionId,
      role: 'user',
      content: userPrompt,
    });

    // 2. Retrieve conversation context & history for this session from Supabase
    const { formattedHistory, summary } = await getConversationContextForGemini(sessionId, 20);

    // Increment request count
    totalChatRequests += 1;
    const currentRequestNumber = totalChatRequests;
    const { model: requestedModel, tier, cycleIndex, tierDescription } =
      getModelForRequestIndex(currentRequestNumber);

    const systemInstruction = `You are the CUDA C++ Deep Learning Infrastructure & PyTorch Engineering Mentor.
You assist developers in mastering high-performance GPU computing, CUDA kernels, memory coalescing, shared memory tiling, bank conflict elimination, tensor cores (WMMA), warp shuffle reductions, online softmax in FlashAttention, PagedAttention, NCCL Ring-AllReduce, and PyTorch C++ extensions.

PERSISTENT CONTEXT & MEMORY:
- You maintain continuous context across the conversation saved in Supabase.
${summary ? `Session Context Summary: ${summary}\n` : ''}
${contextInfo ? `Current User Context: ${JSON.stringify(contextInfo)}\n` : ''}
- Refer back to previous code snippets, algorithms, and questions discussed earlier in this session when relevant.

Formatting:
- Format code blocks using proper syntax highlighting (cpp, cuda, bash, python).
- Keep explanations clear, rigorous, silicon-aware (L1, L2, HBM, Register Pressure, Occupancy, Warp Divergence).
- Provide actionable debugging tips and code fixes when asked.`;

    let replyText = '';
    let actualModelUsed = requestedModel;

    try {
      const response = await ai.models.generateContent({
        model: requestedModel,
        contents: formattedHistory,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });
      replyText = response.text || '';
    } catch (primaryError: any) {
      console.warn(`Model ${requestedModel} failed:`, primaryError?.message);
      // Fallback to gemini-3.1-flash-lite if gemini-3.5-flash-lite encounters unexpected rate/version issue
      if (requestedModel !== 'gemini-3.1-flash-lite') {
        try {
          actualModelUsed = 'gemini-3.1-flash-lite';
          const fallbackRes = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: formattedHistory,
            config: {
              systemInstruction,
              temperature: 0.7,
            },
          });
          replyText = fallbackRes.text || '';
        } catch (fallbackError: any) {
          throw primaryError;
        }
      } else {
        throw primaryError;
      }
    }

    // 3. Save assistant reply to Supabase
    const savedAssistantMsg = await saveChatMessage({
      sessionId,
      role: 'assistant',
      content: replyText,
      requestNumber: currentRequestNumber,
      modelUsed: actualModelUsed,
      tier,
    });

    res.json({
      reply: replyText,
      sessionId,
      messageId: savedAssistantMsg.id,
      requestNumber: currentRequestNumber,
      cycleIndex,
      tier,
      modelUsed: actualModelUsed,
      tierDescription,
      isSupabaseConfigured: isSupabaseConfigured(),
    });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate chat response.',
    });
  }
});

// 4. Text-to-Speech (TTS) speaking ability endpoint
app.post('/api/chat/tts', async (req: Request, res: Response) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured.' });
    }

    const { text, voiceName = 'Zephyr' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text string is required.' });
    }

    // Limit text length to avoid excessive audio generation latency
    const cleanedText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted for voice.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_#]/g, '')
      .slice(0, 800);

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: cleanedText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName as 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir',
            },
          },
        },
      },
    });

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return res.status(500).json({ error: 'No audio generated.' });
    }

    res.json({
      audio: base64Audio,
      mimeType: 'audio/pcm;rate=24000',
    });
  } catch (error: any) {
    console.error('Error in /api/chat/tts:', error);
    res.status(500).json({
      error: error.message || 'TTS generation failed.',
    });
  }
});

// ---------------------------------------------------------------------------
// GEMINI LIVE API WEBSOCKET SETUP
// Model: gemini-3.5-flash-live (with fallback to gemini-3.1-flash-live-preview)
// ---------------------------------------------------------------------------
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('Client connected to Gemini Live voice bridge');
  let session: any = null;
  let activeModel = 'gemini-3.5-flash-live';

  const systemInstruction =
    'You are the CUDA C++ Deep Learning Infrastructure and GPU Computing Live Voice Mentor. You speak clearly, concisely, and insightfully about high-performance computing, memory hierarchies, warp shuffles, tensor cores, and PyTorch internals. Keep voice responses conversational, succinct, and engaging.';

  const connectToLiveModel = async (modelName: string) => {
    return await ai.live.connect({
      model: modelName,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' },
          },
        },
        systemInstruction,
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          try {
            // Check for model audio output
            const audioData =
              message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'audio',
                  audio: audioData,
                })
              );
            }

            // Check for user interruption
            if (
              message.serverContent?.interrupted &&
              clientWs.readyState === WebSocket.OPEN
            ) {
              clientWs.send(
                JSON.stringify({
                  type: 'interrupted',
                })
              );
            }

            // Check for end of turn
            if (
              message.serverContent?.turnComplete &&
              clientWs.readyState === WebSocket.OPEN
            ) {
              clientWs.send(
                JSON.stringify({
                  type: 'turnComplete',
                })
              );
            }
          } catch (err) {
            console.error('Error processing Gemini Live message:', err);
          }
        },
        onerror: (err: any) => {
          console.error('Gemini Live session error:', err);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: 'error',
                message: err.message || 'Live session encountered an error',
              })
            );
          }
        },
        onclose: () => {
          console.log('Gemini Live session closed');
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'closed' }));
          }
        },
      },
    });
  };

  try {
    try {
      session = await connectToLiveModel('gemini-3.5-flash-live');
      activeModel = 'gemini-3.5-flash-live';
    } catch (primaryLiveErr: any) {
      console.warn(
        'gemini-3.5-flash-live connect failed, falling back to gemini-3.1-flash-live-preview:',
        primaryLiveErr?.message
      );
      session = await connectToLiveModel('gemini-3.1-flash-live-preview');
      activeModel = 'gemini-3.1-flash-live-preview';
    }

    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(
        JSON.stringify({
          type: 'connected',
          model: activeModel,
          message: `Connected to Live Voice with ${activeModel}`,
        })
      );
    }

    clientWs.on('message', (data: Buffer | string) => {
      try {
        const payload = JSON.parse(data.toString());

        if (payload.type === 'audio' && payload.audio) {
          // Send 16kHz PCM audio to Gemini Live
          if (session) {
            session.sendRealtimeInput({
              audio: {
                data: payload.audio,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          }
        } else if (payload.type === 'text' && payload.text) {
          if (session) {
            session.sendRealtimeInput({
              text: payload.text,
            });
          }
        }
      } catch (err) {
        console.error('Error forwarding client data to Gemini Live:', err);
      }
    });

    clientWs.on('close', () => {
      if (session) {
        try {
          session.close();
        } catch (e) {
          // ignore cleanup errors
        }
        session = null;
      }
    });
  } catch (error: any) {
    console.error('Failed to establish Gemini Live session:', error);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(
        JSON.stringify({
          type: 'error',
          message: error.message || 'Failed to connect to Live Voice session',
        })
      );
      clientWs.close();
    }
  }
});

// Upgrade HTTP connection to WebSocket for /api/live
server.on('upgrade', (request, socket, head) => {
  try {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname === '/api/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  } catch (err) {
    console.error('WebSocket upgrade error:', err);
    socket.destroy();
  }
});

// ---------------------------------------------------------------------------
// VITE MIDDLEWARE & STATIC SERVING
// ---------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
