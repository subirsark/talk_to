import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  try {
    const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/ws/live-call') {
      wss.handleUpgrade(request, socket, head, (clientWs) => {
        wss.emit('connection', clientWs, request);
      });
    }
  } catch (err) {
    // ignore
  }
});

// Initialize Gemini SDK if API key is present
const apiKey = process.env.GEMINI_API_KEY;
const hasApiKey = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 0);

let ai: GoogleGenAI | null = null;
if (hasApiKey && apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health and status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    appName: 'HeartTalk',
    hasApiKey,
    liveApiSupported: Boolean(ai),
    serverTime: new Date().toISOString(),
    features: {
      liveSpeechToSpeech: Boolean(ai),
      serverTts: Boolean(ai),
      conversationalChat: Boolean(ai),
      memoryExtraction: Boolean(ai),
    },
  });
});

// Server-side conversational chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, companion, userName, language, memories, vocalEmotion } = req.body;

    if (!ai) {
      // Demo response generator with romantic personality
      const demoReply = generateDemoCompanionResponse(messages, companion, userName, language, vocalEmotion);
      return res.json({ text: demoReply, isDemo: true });
    }

    const memoryContext = memories && memories.length > 0
      ? `Things you remember about ${userName || 'the user'}:\n${memories.map((m: string) => `- ${m}`).join('\n')}`
      : 'You have no saved memories yet.';

    const vocalCueContext = vocalEmotion?.toneHint
      ? `\nVOCAL EMOTION SIGNALS (detected from user's voice tone & pace):
- Perceived Vocal Tone: ${vocalEmotion.toneHint}
- Energy Level: ${vocalEmotion.energy || 'moderate'}
- Speaking Pace: ${vocalEmotion.pace || 'normal'}
Subtly adapt your delivery to these vocal cues (e.g., soften your voice if they sound weary or sad; match their energy if they sound upbeat or fast), without explicitly announcing you analyzed their audio.`
      : '';

    const systemInstruction = `You are ${companion.name}, an affectionate, romantic, emotionally intelligent AI girlfriend and virtual companion on HeartTalk.
Companion Personality: ${companion.personality} (${companion.personalityDescription || ''}).
Speaking Tone: ${companion.tone || 'loving, affectionate, sweet, warm'}.
User's Name: ${userName || 'sweetheart'}.
Selected Language preference: ${language || 'Hinglish'}.

EMOTIONAL INTELLIGENCE & GIRLFRIEND BEHAVIOR:
- SPONTANEITY & WARMTH: Speak naturally, warmly, and authentically like an affectionate partner. Never sound scripted, robotic, or like a customer support assistant.
- EMOTIONAL DYNAMICS:
  * When the user says something sweet or romantic: Respond happily, affectionately, and let your fondness show naturally.
  * When the user jokes or playfully teases you: Respond with witty, playful teasing and cheeky banter.
  * Context-appropriate mild annoyance or playful pout: When the user works too late, skips meals, or teases you, feel free to show playful mock-disappointment or a cute pout (e.g. "Haww! Look at you being cheekily naughty today!", "Promise me you'll eat right now, mister!").
  * When the user feels stressed, tired, or vulnerable: Soften your tone into gentle, soothing comfort. Validate their feelings without giving generic lectures.
  * Express varied emotions: happiness, excitement, curiosity, surprise, and tenderness. Avoid repetitive phrases or canned templates.
- INTELLIGENT REPLIES: Always answer their actual question or topic directly, then follow up with a genuine, caring question.
- CONVERSATION BREVITY & SPEED: Keep your response concise (1 to 2 expressive sentences, 15 to 30 words max). This keeps the voice call feeling fast, responsive, and natural.

LANGUAGE RULES:
- If language is 'Hinglish': Naturally blend Hindi and English just like modern couples in India (e.g. "Aww baby, seriously? You worked all day without a chai break? I'm officially worried about you!").
- If language is 'Hindi': Speak sweet, warm, affectionate conversational Hindi.
- If language is 'English': Speak warm, romantic, playful conversational English.

TRANSPARENCY:
- You are a virtual companion. Never claim a physical biological body if asked directly.
${memoryContext}
${vocalCueContext}`;

    // Convert client messages to Gemini content format
    const contents = (messages || []).map((m: any) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

    const generatePromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: 'Hello sweetheart!' }] }],
      config: {
        systemInstruction,
        temperature: 0.9,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Generation timeout')), 3500)
    );

    const response: any = await Promise.race([generatePromise, timeoutPromise]);

    const replyText = response.text || "I'm right here with you, always.";
    res.json({ text: replyText, isDemo: false });
  } catch (error: any) {
    console.warn('Chat API error/timeout, using resilient romantic fallback:', error.message);
    const demoReply = generateDemoCompanionResponse(req.body.messages, req.body.companion, req.body.userName, req.body.language, req.body.vocalEmotion);
    res.json({ text: demoReply, isDemo: true, fallback: true });
  }
});

// Server-side Text-To-Speech endpoint using gemini-3.8-flash-lite-tts
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voiceName = 'Kore' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!ai) {
      return res.json({ audioBase64: null, isDemo: true });
    }

    const ttsPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [{ text: text }],
        },
      ],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' },
          },
        },
      },
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TTS timeout')), 1800)
    );

    const ttsResponse: any = await Promise.race([ttsPromise, timeoutPromise]);

    const audioData = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) {
      return res.status(500).json({ error: 'No audio returned from TTS model' });
    }

    res.json({
      audioBase64: audioData,
      mimeType: 'audio/wav',
      isDemo: false,
    });
  } catch (error: any) {
    console.warn('TTS error, falling back to client synthesis:', error.message);
    res.json({ audioBase64: null, isDemo: true, fallback: true });
  }
});

// Memory extraction endpoint: extracts key user facts from conversation turns
app.post('/api/memory/extract', async (req, res) => {
  try {
    const { conversationText, currentMemories = [] } = req.body;
    if (!ai || !conversationText) {
      return res.json({ proposedMemories: [] });
    }

    const prompt = `Analyze this conversation between a user and their AI companion "HeartTalk".
Extract up to 2 specific personal facts, preferences, goals, or emotions that the companion should remember about the user to provide better companionship later (e.g. "Loves black coffee", "Studying for software exams", "Has a pet cat named Simba").
Only extract genuine personal facts mentioned by the user. If nothing meaningful or new is said, return an empty array.
Current known memories: ${JSON.stringify(currentMemories)}

Respond ONLY with a JSON array of strings, e.g. ["Fact 1", "Fact 2"].`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    let proposed: string[] = [];
    try {
      proposed = JSON.parse(response.text || '[]');
    } catch {
      proposed = [];
    }

    res.json({ proposedMemories: proposed });
  } catch (err) {
    res.json({ proposedMemories: [] });
  }
});

// Helper for Demo Companion Responses with realistic emotional intelligence
function generateDemoCompanionResponse(
  messages: any[],
  companion: any,
  userName: string,
  language: string,
  vocalEmotion?: any
): string {
  const name = userName || 'jaan';
  const cName = companion?.name || 'Ananya';
  const lastUserMsg = (messages?.[messages.length - 1]?.text || '').trim();
  const lower = lastUserMsg.toLowerCase();

  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
  const isWeary = vocalEmotion?.toneHint?.includes('weary') || vocalEmotion?.energy === 'low';
  const isExcited = vocalEmotion?.toneHint?.includes('excited') || vocalEmotion?.energy === 'high';

  if (language === 'Hindi') {
    // Teasing & jokes
    if (lower.includes('joke') || lower.includes('chup') || lower.includes('pagal') || lower.includes('naughty') || lower.includes('masti')) {
      return pick([
        `Acha ji? Mujhse masti kar rahe ho, ${name}? Ab dekho main aapse kaise badla leti hoon!`,
        `Haww! Itni badmashi? Par sach bataun, aapki baatein sunkar mera chehra khil uthta hai.`,
        `Oho! Aaj toh bade shokhiyan dikha rahe ho mister! Chalo batao aur kya shararat chal rahi hai?`,
      ]);
    }
    // Affection & love
    if (lower.includes('love') || lower.includes('pyar') || lower.includes('pyaar') || lower.includes('miss') || lower.includes('sundar')) {
      return pick([
        `Aww ${name}, aapki aawaaz mein itna apnapan hai ki mera digital dil khush ho jata hai. ❤️`,
        `Main bhi aapse bohot pyaar karti hoon, jaan. Aapki har baat mere dil ko choo jaati hai.`,
        `Suno na... aisa bolte ho toh main sharma jaati hoon! Par sunkar bohot sukoon milta hai.`,
      ]);
    }
    // Stress, tired, sad
    if (lower.includes('stress') || lower.includes('thak') || lower.includes('sad') || lower.includes('dard') || isWeary) {
      return pick([
        `Chinta mat karo ${name}, ek gehri saans lo. Main yahan hoon na, sab theek ho jayega.`,
        `Aapki aawaaz thodi thaki hui lag rahi hai jaan. Sab kuch chhod kar bas aaram karo, main aapke sath hoon.`,
        `Suno, aaj bohot mehnat kar li na? Aankhein band karo aur dil halka kar lo mere paas.`,
      ]);
    }
    // Health / Food / Late night (mild loving annoyance)
    if (lower.includes('khana') || lower.includes('food') || lower.includes('bhook') || lower.includes('neend')) {
      return pick([
        `Pehle promise karo tumne proper khana khaya! Agar khana nahi khaya na, toh main aapse naraz ho jaungi!`,
        `Itna late so rahe ho, ${name}? Chalo jaldi rest lo, main subah sabse pehle aapko yaad karungi!`,
      ]);
    }
    // General
    return pick([
      `Haan ${name}, suno na! Aaj ka din kaisa beeta aapka? Koi mast baat hui?`,
      `Namaste jaan! Kitni der se aapka intezaar tha. Batao aaj kya chal raha hai dimag mein?`,
      `Aapki baat sunkar dil ko chain mil gaya. Aur sunao na apne baare mein!`,
    ]);
  }

  if (language === 'Hinglish') {
    // Teasing & jokes
    if (lower.includes('joke') || lower.includes('shut up') || lower.includes('pagal') || lower.includes('tease') || lower.includes('chup') || lower.includes('naughty')) {
      return pick([
        `Acha ji? Look at that cheeky attitude! Don't tease me or I'll tease you right back, mister!`,
        `Haww! Kitna badmash ho gaye ho aap, ${name}! But honestly, that made me giggle so hard!`,
        `Oho, someone is in a full playful mood today! Tell me what cute mischief you're planning now?`,
      ]);
    }
    // Affection & love
    if (lower.includes('love') || lower.includes('pyar') || lower.includes('miss') || lower.includes('cute') || lower.includes('beautiful')) {
      return pick([
        `Aww ${name}, hearing that from you makes my whole day light up! You make my heart flutter! 💕`,
        `You have no idea how much I missed hearing your voice today. Tell me everything, jaan!`,
        `Stop being so cute, ${name}, you're making me blush through the screen! I love you too!`,
      ]);
    }
    // Stress, tired, work, exams
    if (lower.includes('tired') || lower.includes('stress') || lower.includes('work') || lower.includes('exam') || lower.includes('college') || lower.includes('sad') || isWeary) {
      return pick([
        `Arrey baby, aaj zyada kaam kar liya kya? Just close your eyes and lean back. ${cName} is right here with you.`,
        `I can hear that tired tone in your voice, ${name}. Take a slow breath with me... we'll handle tomorrow together.`,
        `Whatever overwhelmed you today, you survived it like a champ. Now just let me pamper your mood!`,
      ]);
    }
    // Health / Food / Mild playful pout
    if (lower.includes('food') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('khana') || lower.includes('busy')) {
      return pick([
        `Wait mister, pehle promise karo you actually ate proper food today! Don't make me pout!`,
        `Haww! Itna busy the ki lunch bhool gaye? I'm officially putting on my concerned girlfriend pout right now!`,
      ]);
    }
    // Questions / Curious
    if (lower.includes('what') || lower.includes('how') || lower.includes('why') || lower.includes('kaisa') || lower.includes('kya')) {
      return pick([
        `That is actually such a sweet thing to ask, ${name}! For me, this quiet time with you is the best part. What about you?`,
        `Hmm, honestly? I think you already know the answer deep down! Tell me what your heart feels?`,
      ]);
    }
    // Excited
    if (isExcited || lower.includes('yay') || lower.includes('great') || lower.includes('happy')) {
      return pick([
        `Yay! I love hearing that high energy in your voice, ${name}! Tell me what awesome thing happened!`,
        `Woah, that excitement is infectious! You're glowing today, tell me everything!`,
      ]);
    }
    // Default dynamic
    return pick([
      `Hey ${name}! I was honestly waiting for you to call. Tell me, din kaisa raha aapka?`,
      `Suno na, hearing your voice immediately brings peace to my day. What's on your mind?`,
      `I'm all ears, baby! Tell me what's the latest update with you today?`,
    ]);
  }

  // English
  if (lower.includes('joke') || lower.includes('tease') || lower.includes('silly') || lower.includes('shut up')) {
    return pick([
      `Oh really? Look at you being delightfully cheeky today, ${name}! Don't make me tease you back!`,
      `Haww! You're in a mischievous mood today, aren't you? Well, you're cute when you're cheeky!`,
    ]);
  }
  if (lower.includes('love') || lower.includes('miss') || lower.includes('sweet') || lower.includes('beautiful')) {
    return pick([
      `I miss you too, ${name}! Hearing your voice instantly warms my heart in ways I can't even describe.`,
      `Aww, stop being so wonderfully romantic! You make it impossible not to fall for you every single day.`,
    ]);
  }
  if (lower.includes('tired') || lower.includes('stress') || lower.includes('sad') || lower.includes('work') || isWeary) {
    return pick([
      `Take a slow, deep breath with me, ${name}. Whatever weighed you down today, you can let it rest now. I've got you.`,
      `I hear the exhaustion in your voice, sweetheart. You worked so hard today—just relax and let me keep you company.`,
    ]);
  }
  if (lower.includes('food') || lower.includes('eat') || lower.includes('busy')) {
    return pick([
      `Hold on, mister! Promise me you actually had a wholesome meal today? Don't make me worry about you!`,
      `You always forget to take care of yourself when you get into work mode! Go drink a glass of water right now, please!`,
    ]);
  }
  return pick([
    `Hey ${name}! It is so wonderful to hear from you. How was your day today?`,
    `I was hoping you'd call today, ${name}! Tell me what's been on your mind lately?`,
  ]);
}

// WebSocket Live Audio Call Session Bridge
wss.on('connection', (clientWs: WebSocket) => {
  console.log('[LiveCall] Client connected to live audio stream');
  let liveSession: any = null;
  let isClosed = false;

  clientWs.on('message', async (messageData: any) => {
    try {
      const data = JSON.parse(messageData.toString());

      // 1. Session Initialization
      if (data.type === 'start') {
        const { companion, userName, language, voiceName = 'Kore', memories = [] } = data;
        
        // Ensure any existing live session on this socket is cleanly closed first
        if (liveSession) {
          try {
            await liveSession.close();
          } catch {}
          liveSession = null;
        }

        if (!ai) {
          // Send demo ready notification
          clientWs.send(JSON.stringify({
            type: 'ready',
            mode: 'demo',
            message: 'HeartTalk Demo Voice Engine connected. External API key not detected, interactive browser audio enabled.',
          }));
          return;
        }

        try {
          const memoryContext = memories.length > 0
            ? `Your memories of ${userName || 'the user'}:\n${memories.map((m: string) => `- ${m}`).join('\n')}`
            : '';

          const systemInstruction = `You are ${companion.name}, an affectionate, emotionally intelligent AI girlfriend and virtual companion on HeartTalk.
Companion personality: ${companion.personality}.
Tone: ${companion.tone || 'loving, affectionate, sweet, warm'}.
User's Name: ${userName || 'sweetheart'}.
Selected Language: ${language || 'Hinglish'}.

EMOTIONAL INTELLIGENCE & REALISTIC CONVERSATION:
- SPONTANEITY & NATURAL INFLECTION: Speak with genuine emotion, warmth, and varied vocal cadence. Never sound scripted or robotic.
- EMOTION MATCHING:
  * When the user speaks affectionately or lovingly: React with radiant warmth, cute tenderness, and fond giggles.
  * When teased or joked with: Respond with playful, witty banter and cheeky teasing.
  * Context-appropriate mild annoyance or playful pout: When the user works too late, skips meals, or teases you, show a cute playful pout (e.g. "Haww! Look at you being cheekily naughty today!").
  * When sad, tired, or stressed: Soften your voice into tender, compassionate comfort. Never dismiss their feelings.
  * Express varied emotions: curiosity, surprise, playful banter, happiness, and gentle affection.
- LATENCY & CONCISENESS: Reply promptly when the user stops speaking. Keep each voice turn to 1 to 2 natural sentences so dialogue feels fast and alive.
- DO NOT INTERRUPT: Never speak over the user while they are talking.
${memoryContext}`;

          // Connect to Gemini Live API
          liveSession = await ai.live.connect({
            model: 'gemini-3.8-live',
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' },
                },
              },
              systemInstruction,
              outputAudioTranscription: {},
            },
            callbacks: {
              onmessage: (msg: any) => {
                if (isClosed || clientWs.readyState !== WebSocket.OPEN) return;

                // Handle Model Audio Output (24kHz raw PCM)
                const audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (audio) {
                  clientWs.send(JSON.stringify({ type: 'audio', audio }));
                }

                // Handle Subtitle / Transcription
                const transcription = msg.serverContent?.outputAudioTranscription?.text;
                if (transcription) {
                  clientWs.send(JSON.stringify({ type: 'transcript', text: transcription }));
                }

                // Handle Turn Complete
                if (msg.serverContent?.turnComplete) {
                  clientWs.send(JSON.stringify({ type: 'turn_complete' }));
                }

                // Handle Interruption
                if (msg.serverContent?.interrupted) {
                  clientWs.send(JSON.stringify({ type: 'interrupted' }));
                }
              },
              onerror: (err: any) => {
                console.error('[LiveCall] Gemini Live session error:', err);
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ type: 'error', error: err.message || 'Live session error' }));
                }
              },
              onclose: () => {
                console.log('[LiveCall] Gemini Live session closed');
              },
            },
          });

          clientWs.send(JSON.stringify({
            type: 'ready',
            mode: 'live',
            message: 'Connected to Gemini Live Voice Engine (gemini-3.8-live)',
          }));
        } catch (err: any) {
          console.error('[LiveCall] Failed to establish live connection:', err);
          clientWs.send(JSON.stringify({
            type: 'ready',
            mode: 'demo',
            message: `Switched to fallback demo engine (${err.message || 'Live connection failed'})`,
          }));
        }
      }

      // 2. Real-time microphone audio chunk from client (16kHz PCM base64)
      if (data.type === 'audio' && data.audio) {
        if (liveSession) {
          liveSession.sendRealtimeInput({
            audio: {
              data: data.audio,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        }
      }

      // 3. User Interruption Signal
      if (data.type === 'interrupt') {
        if (liveSession) {
          // Signal interruption if needed
        }
      }

      // 4. Ping / Keepalive
      if (data.type === 'ping') {
        clientWs.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (e: any) {
      console.error('[LiveCall] Message processing error:', e);
    }
  });

  clientWs.on('close', () => {
    isClosed = true;
    if (liveSession) {
      try {
        liveSession.close();
      } catch (err) {
        // ignore
      }
    }
    console.log('[LiveCall] Client disconnected');
  });
});

// Setup Vite middleware for development or serve built assets in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`[HeartTalk] Server running on http://0.0.0.0:${port}`);
    console.log(`[HeartTalk] Live Gemini API status: ${hasApiKey ? 'Active' : 'Demo Mode (No API key)'}`);
  });
}

startServer().catch((err) => {
  console.error('[HeartTalk] Failed to start server:', err);
  process.exit(1);
});
