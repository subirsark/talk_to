import { CallMessage, Companion, Language, VoiceName } from '../types';

export interface AudioCallCallbacks {
  onStatusChange: (status: 'connecting' | 'connected' | 'listening' | 'speaking' | 'interrupted' | 'ended' | 'error', message?: string) => void;
  onAudioLevelChange: (micLevel: number, aiLevel: number) => void;
  onMessageReceived: (message: CallMessage) => void;
  onInterrupted: () => void;
  onEngineMode: (mode: 'live' | 'demo', info: string) => void;
}

export class AudioCallManager {
  // Singleton tracker to guarantee strictly ONE active voice session across the app
  private static activeInstance: AudioCallManager | null = null;

  private isDestroyed: boolean = false;
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  
  private ws: WebSocket | null = null;
  private isMuted: boolean = false;
  private isSpeakerMuted: boolean = false;
  private isConnected: boolean = false;
  private engineMode: 'connecting' | 'live' | 'demo' = 'connecting';
  
  private activeSourceNodes: AudioBufferSourceNode[] = [];
  private nextStartTime: number = 0;
  private levelInterval: number | null = null;
  private speechRecognition: any = null;
  private isRecognizing: boolean = false;
  
  private callbacks: AudioCallCallbacks;
  private companion: Companion;
  private userName: string;
  private language: Language;
  private voiceName: VoiceName;
  private memories: string[];
  private currentTurnAiText: string = '';

  // Concurrency lock to prevent overlapping voice responses
  private currentResponseAbortController: AbortController | null = null;
  private lastProcessedTranscript: string = '';
  private lastProcessedTime: number = 0;
  private hasSpokenInitialGreeting: boolean = false;

  // Real-time voice emotion analysis & low-latency turn completion
  private userRmsSamples: number[] = [];
  private speechStartTime: number = 0;
  private lastActiveVoiceTime: number = 0;
  private currentInterimText: string = '';
  private isUserSpeaking: boolean = false;

  constructor(
    companion: Companion,
    userName: string,
    language: Language,
    voiceName: VoiceName,
    memories: string[],
    callbacks: AudioCallCallbacks
  ) {
    this.companion = companion;
    this.userName = userName;
    this.language = language;
    this.voiceName = voiceName;
    this.memories = memories;
    this.callbacks = callbacks;
  }

  public async startCall(): Promise<void> {
    try {
      // 1. Terminate any previous active session across the app
      if (AudioCallManager.activeInstance && AudioCallManager.activeInstance !== this) {
        AudioCallManager.activeInstance.endCall();
      }
      AudioCallManager.activeInstance = this;

      // Stop any lingering browser speech synthesis immediately
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      this.callbacks.onStatusChange('connecting', 'Requesting microphone access...');
      
      // Request mic permission with low-latency audio constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });

      // Guard: If session was cancelled while awaiting mic permissions
      if (this.isDestroyed) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.mediaStream = stream;

      // Initialize Audio Contexts
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.inputAudioCtx = new AudioCtx({ sampleRate: 16000 });
      this.outputAudioCtx = new AudioCtx({ sampleRate: 24000 });

      if (this.inputAudioCtx.state === 'suspended') {
        await this.inputAudioCtx.resume();
      }
      if (this.outputAudioCtx.state === 'suspended') {
        await this.outputAudioCtx.resume();
      }

      // Guard: If session was cancelled while resuming audio contexts
      if (this.isDestroyed) {
        this.endCall();
        return;
      }

      // Input Analyser for audio level visualization
      this.inputAnalyser = this.inputAudioCtx.createAnalyser();
      this.inputAnalyser.fftSize = 256;
      this.micSource = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);
      this.micSource.connect(this.inputAnalyser);

      // Output Analyser for companion voice level visualization
      this.outputAnalyser = this.outputAudioCtx.createAnalyser();
      this.outputAnalyser.fftSize = 256;
      this.outputAnalyser.connect(this.outputAudioCtx.destination);

      // Start level monitoring loop
      this.startLevelMonitoring();

      // Setup WebSocket connection to server Live API bridge
      this.callbacks.onStatusChange('connecting', 'Establishing secure audio session...');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/live-call`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        if (this.isDestroyed) {
          this.ws?.close();
          return;
        }
        console.log('[HeartTalk] Connected to live audio call server');
        // Send initial handshake
        this.ws?.send(JSON.stringify({
          type: 'start',
          companion: {
            id: this.companion.id,
            name: this.companion.name,
            personality: this.companion.personality,
            personalityDescription: this.companion.personalityDescription,
            tone: this.companion.tone,
          },
          userName: this.userName,
          language: this.language,
          voiceName: this.voiceName,
          memories: this.memories,
        }));
      };

      this.ws.onmessage = (event) => {
        if (this.isDestroyed) return;
        this.handleServerMessage(event.data);
      };

      this.ws.onerror = (err) => {
        if (this.isDestroyed) return;
        console.warn('[HeartTalk] WebSocket error, fallback to interactive demo mode', err);
        this.switchToDemoMode('WebSocket connection failed, switched to interactive demo mode.');
      };

      this.ws.onclose = () => {
        if (this.isDestroyed) return;
        console.log('[HeartTalk] WebSocket connection closed');
        if (this.isConnected && this.engineMode === 'live') {
          this.switchToDemoMode('Connection to live voice bridge ended.');
        }
      };

      // Setup mic capture pipeline with voice activity and turn detection
      this.setupMicProcessor();

      // Setup SpeechRecognition for real-time live captions & demo voice interaction
      this.setupSpeechRecognition();

      this.isConnected = true;
      this.callbacks.onStatusChange('connected', 'Call active');
      this.callbacks.onStatusChange('listening', `${this.companion.name} is listening...`);

    } catch (err: any) {
      console.error('[HeartTalk] Call start failed:', err);
      this.callbacks.onStatusChange('error', err.message || 'Microphone access denied or audio initialization failed');
      this.endCall();
    }
  }

  private setupMicProcessor(): void {
    if (!this.inputAudioCtx || !this.micSource) return;

    // Buffer size 2048 gives low-latency ~128ms chunks at 16kHz
    this.scriptProcessor = this.inputAudioCtx.createScriptProcessor(2048, 1, 1);
    this.micSource.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioCtx.destination);

    this.scriptProcessor.onaudioprocess = (e) => {
      if (this.isDestroyed || this.isMuted || !this.isConnected) return;

      const inputBuffer = e.inputBuffer.getChannelData(0);

      // Calculate instantaneous RMS volume
      let sum = 0;
      for (let i = 0; i < inputBuffer.length; i++) {
        sum += inputBuffer[i] * inputBuffer[i];
      }
      const rms = Math.sqrt(sum / inputBuffer.length);

      const now = Date.now();

      // Voice activity detection
      if (rms > 0.04) {
        // User is currently speaking
        if (!this.isUserSpeaking) {
          this.isUserSpeaking = true;
          this.speechStartTime = now;
          this.userRmsSamples = [];
        }
        this.lastActiveVoiceTime = now;
        this.userRmsSamples.push(rms);

        // Immediate interruption of AI if AI is currently playing audio
        if (this.activeSourceNodes.length > 0 || ('speechSynthesis' in window && window.speechSynthesis.speaking)) {
          this.interruptPlayback();
        }
      } else {
        // Silence detected
        if (this.isUserSpeaking && (now - this.lastActiveVoiceTime) >= 550) {
          // User paused for >550ms after speaking: trigger end of turn promptly without waiting for slow browser isFinal!
          if (this.engineMode === 'demo' && this.currentInterimText.trim().length > 0) {
            const promptText = this.currentInterimText.trim();
            this.isUserSpeaking = false;
            this.currentInterimText = '';
            this.completeUserTurn(promptText);
          }
        }
      }

      // If connected to live Gemini bridge, send 16-bit PCM base64
      if (this.ws && this.ws.readyState === WebSocket.OPEN && this.engineMode === 'live') {
        const base64Audio = this.floatTo16BitPCMBase64(inputBuffer);
        this.ws.send(JSON.stringify({
          type: 'audio',
          audio: base64Audio,
        }));
      }
    };
  }

  private setupSpeechRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      this.speechRecognition = new SpeechRecognition();
      this.speechRecognition.continuous = true;
      this.speechRecognition.interimResults = true;

      // Set recognition language based on user preference
      if (this.language === 'Hindi') {
        this.speechRecognition.lang = 'hi-IN';
      } else if (this.language === 'Hinglish') {
        this.speechRecognition.lang = 'en-IN';
      } else {
        this.speechRecognition.lang = 'en-US';
      }

      this.speechRecognition.onresult = (event: any) => {
        if (this.isDestroyed || !this.isConnected) return;

        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const spokenText = (finalTranscript || interimTranscript).trim();

        if (spokenText) {
          this.currentInterimText = spokenText;

          // Interrupt AI if currently speaking
          if (this.activeSourceNodes.length > 0 || ('speechSynthesis' in window && window.speechSynthesis.speaking)) {
            this.interruptPlayback();
          }

          // If browser finalized transcript, complete turn
          if (finalTranscript.trim()) {
            this.completeUserTurn(finalTranscript.trim());
            this.currentInterimText = '';
          }
        }
      };

      this.speechRecognition.onerror = (e: any) => {
        console.warn('[HeartTalk] SpeechRecognition event:', e.error);
      };

      this.speechRecognition.onend = () => {
        if (!this.isDestroyed && this.isConnected && this.isRecognizing) {
          try {
            this.speechRecognition?.start();
          } catch {
            // ignore restart collision
          }
        }
      };

      this.speechRecognition.start();
      this.isRecognizing = true;
    } catch (e) {
      console.warn('[HeartTalk] SpeechRecognition could not start', e);
    }
  }

  // Completes a user turn with deduplication and vocal acoustic signals
  private completeUserTurn(text: string): void {
    if (this.isDestroyed || !this.isConnected) return;
    const cleanText = text.trim();
    if (!cleanText) return;

    const now = Date.now();
    if (cleanText.toLowerCase() === this.lastProcessedTranscript && (now - this.lastProcessedTime) < 1400) {
      return;
    }

    const userMsg: CallMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sender: 'user',
      text: cleanText,
      timestamp: Date.now(),
    };
    this.callbacks.onMessageReceived(userMsg);

    // In demo mode ONLY, trigger conversational turn
    if (this.engineMode === 'demo') {
      const vocalEmotion = this.getVocalEmotionHint(cleanText);
      this.handleDemoUserTurn(cleanText, vocalEmotion);
    }
  }

  // Analyze vocal energy, tempo, and intonation cues from audio samples
  private getVocalEmotionHint(text: string): { energy: string; pace: string; toneHint: string } {
    if (this.userRmsSamples.length === 0) {
      return { energy: 'moderate', pace: 'normal', toneHint: 'natural' };
    }

    const avgRms = this.userRmsSamples.reduce((a, b) => a + b, 0) / this.userRmsSamples.length;
    const durationSec = Math.max(0.6, (Date.now() - (this.speechStartTime || Date.now() - 1000)) / 1000);
    const wordCount = Math.max(1, text.split(/\s+/).length);
    const wordsPerSec = wordCount / durationSec;

    let energy: 'low' | 'moderate' | 'high' = 'moderate';
    if (avgRms < 0.038) energy = 'low';
    else if (avgRms > 0.085) energy = 'high';

    let pace: 'slow' | 'normal' | 'fast' = 'normal';
    if (wordsPerSec > 3.0) pace = 'fast';
    else if (wordsPerSec < 1.4) pace = 'slow';

    let toneHint = 'calm, natural tone';
    if (energy === 'low' && pace === 'slow') {
      toneHint = 'soft, weary, vulnerable, or tired';
    } else if (energy === 'high' && pace === 'fast') {
      toneHint = 'excited, animated, or playfully teasing';
    } else if (energy === 'high') {
      toneHint = 'energetic and expressive';
    } else if (energy === 'low') {
      toneHint = 'gentle and quiet';
    }

    return { energy, pace, toneHint };
  }

  private handleServerMessage(dataStr: string): void {
    if (this.isDestroyed) return;

    try {
      const data = JSON.parse(dataStr);

      if (data.type === 'ready') {
        this.engineMode = data.mode;
        this.callbacks.onEngineMode(data.mode, data.message || '');
        this.callbacks.onStatusChange(data.mode === 'live' ? 'connected' : 'listening', data.message);

        if (data.mode === 'live') {
          // Ensure zero browser speech synthesis can interfere with live audio
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
        } else if (data.mode === 'demo' && !this.hasSpokenInitialGreeting) {
          // Play initial greeting once demo mode is actively confirmed
          this.hasSpokenInitialGreeting = true;
          this.playInitialDemoGreeting();
        }
      }

      if (data.type === 'audio' && data.audio) {
        if (!this.isSpeakerMuted && !this.isDestroyed) {
          // Kill any browser synthesis immediately so only the live voice plays
          if ('speechSynthesis' in window && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
            window.speechSynthesis.cancel();
          }
          this.playPCMChunk(data.audio);
          this.callbacks.onStatusChange('speaking', `${this.companion.name} is speaking...`);
        }
      }

      if (data.type === 'transcript') {
        this.currentTurnAiText += data.text;
      }

      if (data.type === 'turn_complete') {
        if (this.currentTurnAiText.trim()) {
          const aiMsg: CallMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            sender: 'companion',
            text: this.currentTurnAiText.trim(),
            timestamp: Date.now(),
          };
          this.callbacks.onMessageReceived(aiMsg);
          this.currentTurnAiText = '';
        }
        this.callbacks.onStatusChange('listening', `${this.companion.name} is listening...`);
      }

      if (data.type === 'interrupted') {
        this.interruptPlayback();
      }
    } catch (e) {
      console.error('[HeartTalk] Failed to parse server message', e);
    }
  }

  private switchToDemoMode(reason: string): void {
    if (this.isDestroyed) return;
    this.engineMode = 'demo';
    this.callbacks.onEngineMode('demo', reason);
    this.callbacks.onStatusChange('listening', 'Interactive Demo Mode Active');

    if (!this.hasSpokenInitialGreeting) {
      this.hasSpokenInitialGreeting = true;
      this.playInitialDemoGreeting();
    }
  }

  private async playInitialDemoGreeting(): Promise<void> {
    if (this.isDestroyed || !this.isConnected || this.engineMode !== 'demo') return;

    const greeting = this.companion.sampleGreetings[this.language] || this.companion.sampleGreetings.Hinglish;
    const aiMsg: CallMessage = {
      id: `msg-${Date.now()}`,
      sender: 'companion',
      text: greeting,
      timestamp: Date.now(),
    };
    this.callbacks.onMessageReceived(aiMsg);
    await this.speakTextDemo(greeting);
  }

  public async handleDemoUserTurn(userText: string, vocalEmotion?: any): Promise<void> {
    if (this.isDestroyed || !this.isConnected || this.engineMode !== 'demo') return;

    // Deduplicate rapid triggers
    const now = Date.now();
    const cleanText = userText.trim();
    if (!cleanText) return;

    if (cleanText.toLowerCase() === this.lastProcessedTranscript && (now - this.lastProcessedTime) < 1400) {
      return;
    }
    this.lastProcessedTranscript = cleanText.toLowerCase();
    this.lastProcessedTime = now;

    // Abort previous in-flight request to prevent overlapping responses
    if (this.currentResponseAbortController) {
      this.currentResponseAbortController.abort();
      this.currentResponseAbortController = null;
    }
    const abortCtrl = new AbortController();
    this.currentResponseAbortController = abortCtrl;

    // Cancel any current playback before starting new turn
    this.interruptPlayback();

    try {
      this.callbacks.onStatusChange('speaking', `${this.companion.name} is responding...`);
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortCtrl.signal,
        body: JSON.stringify({
          messages: [{ sender: 'user', text: cleanText }],
          companion: this.companion,
          userName: this.userName,
          language: this.language,
          memories: this.memories,
          vocalEmotion: vocalEmotion || { energy: 'moderate', pace: 'normal', toneHint: 'natural' },
        }),
      });

      if (this.isDestroyed || abortCtrl.signal.aborted) return;

      const json = await res.json();
      const replyText = json.text || `I hear you, ${this.userName}. You are so special to me!`;

      if (this.isDestroyed || abortCtrl.signal.aborted) return;

      const aiMsg: CallMessage = {
        id: `msg-${Date.now()}`,
        sender: 'companion',
        text: replyText,
        timestamp: Date.now(),
      };
      this.callbacks.onMessageReceived(aiMsg);

      await this.speakTextDemo(replyText);
      if (!this.isDestroyed && !abortCtrl.signal.aborted) {
        this.callbacks.onStatusChange('listening', `${this.companion.name} is listening...`);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Request was cancelled by a newer user turn
        return;
      }
      console.error('Demo response turn error:', err);
      if (!this.isDestroyed) {
        this.callbacks.onStatusChange('listening', `${this.companion.name} is listening...`);
      }
    } finally {
      if (this.currentResponseAbortController === abortCtrl) {
        this.currentResponseAbortController = null;
      }
      this.userRmsSamples = [];
      this.speechStartTime = 0;
    }
  }

  private async speakTextDemo(text: string): Promise<void> {
    if (this.isDestroyed || this.isSpeakerMuted) return;

    // Cancel any playing audio or speech before starting this one
    this.interruptPlayback();

    // Fast-path: attempt server TTS with a 380ms race timeout
    let gotServerAudio = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 380);

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          text,
          voiceName: this.voiceName,
        }),
      });
      clearTimeout(timeoutId);

      if (!this.isDestroyed && res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          const binary = atob(data.audioBase64);
          const len = binary.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          if (this.outputAudioCtx && !this.isDestroyed) {
            const buffer = await this.outputAudioCtx.decodeAudioData(bytes.buffer);
            if (!this.isDestroyed) {
              gotServerAudio = true;
              this.playDecodedAudioBuffer(buffer);
              return;
            }
          }
        }
      }
    } catch (e) {
      // Server TTS timed out or fallback
    }

    if (gotServerAudio || this.isDestroyed || this.isSpeakerMuted) return;

    // Instant client speech synthesis (EXACTLY ONE voice instance with natural, warm rate)
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0; // natural human tempo without sluggish pauses
      utterance.pitch = 1.12; // warm, sweet feminine pitch

      // Pick a pleasing female voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((v) =>
        (this.language === 'Hindi' && v.lang.startsWith('hi')) ||
        (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('google'))
      );
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => {
        if (!this.isDestroyed) {
          this.callbacks.onStatusChange('speaking', `${this.companion.name} is speaking...`);
        }
      };
      utterance.onend = () => {
        if (!this.isDestroyed) {
          this.callbacks.onStatusChange('listening', `${this.companion.name} is listening...`);
        }
      };
      utterance.onerror = () => {
        if (!this.isDestroyed) {
          this.callbacks.onStatusChange('listening', `${this.companion.name} is listening...`);
        }
      };

      window.speechSynthesis.speak(utterance);
    }
  }

  private playDecodedAudioBuffer(buffer: AudioBuffer): void {
    if (this.isDestroyed || !this.outputAudioCtx || !this.outputAnalyser) return;

    // Cancel speech synthesis so only decoded audio plays
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const source = this.outputAudioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.outputAnalyser);

    this.activeSourceNodes.push(source);
    source.onended = () => {
      this.activeSourceNodes = this.activeSourceNodes.filter((n) => n !== source);
      if (!this.isDestroyed && this.activeSourceNodes.length === 0) {
        this.callbacks.onStatusChange('listening', `${this.companion.name} is listening...`);
      }
    };

    source.start(0);
  }

  // Play 24kHz raw PCM chunk from Gemini Live
  private playPCMChunk(base64PCM: string): void {
    if (this.isDestroyed || !this.outputAudioCtx || !this.outputAnalyser) return;

    try {
      // Ensure zero browser speech synthesis can overlap with Gemini Live PCM audio
      if ('speechSynthesis' in window && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
        window.speechSynthesis.cancel();
      }

      const binaryString = atob(base64PCM);
      const len = binaryString.length;
      const int16Array = new Int16Array(len / 2);
      for (let i = 0; i < len; i += 2) {
        const byte1 = binaryString.charCodeAt(i);
        const byte2 = binaryString.charCodeAt(i + 1);
        int16Array[i / 2] = (byte2 << 8) | byte1;
      }

      // Convert Int16 to Float32
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = this.outputAudioCtx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.copyToChannel(float32Array, 0);

      const source = this.outputAudioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputAnalyser);

      // Precise gapless scheduling
      const currentTime = this.outputAudioCtx.currentTime;
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime;
      }

      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.activeSourceNodes.push(source);

      source.onended = () => {
        this.activeSourceNodes = this.activeSourceNodes.filter((s) => s !== source);
        if (!this.isDestroyed && this.activeSourceNodes.length === 0) {
          this.callbacks.onStatusChange('listening', `${this.companion.name} is listening...`);
        }
      };
    } catch (e) {
      console.error('[HeartTalk] Error decoding PCM audio chunk', e);
    }
  }

  public interruptPlayback(): void {
    // 1. Stop and disconnect all active audio buffer nodes
    this.activeSourceNodes.forEach((source) => {
      try {
        source.onended = null;
        source.stop(0);
        source.disconnect();
      } catch {
        // ignore
      }
    });
    this.activeSourceNodes = [];

    // 2. Reset scheduling clock
    if (this.outputAudioCtx) {
      this.nextStartTime = this.outputAudioCtx.currentTime;
    }

    // 3. Cancel browser speech synthesis if active or queued
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // 4. Send interrupt signal to server
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'interrupt' }));
    }

    this.callbacks.onInterrupted();
    this.callbacks.onStatusChange('listening', `${this.companion.name} paused to hear you...`);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public toggleSpeaker(): boolean {
    this.isSpeakerMuted = !this.isSpeakerMuted;
    if (this.isSpeakerMuted) {
      this.interruptPlayback();
    }
    return this.isSpeakerMuted;
  }

  private startLevelMonitoring(): void {
    const inputData = new Uint8Array(256);
    const outputData = new Uint8Array(256);

    this.levelInterval = window.setInterval(() => {
      if (this.isDestroyed) {
        if (this.levelInterval) clearInterval(this.levelInterval);
        return;
      }

      let micLevel = 0;
      let aiLevel = 0;

      if (this.inputAnalyser && !this.isMuted) {
        this.inputAnalyser.getByteFrequencyData(inputData);
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i];
        }
        micLevel = Math.min(1, (sum / inputData.length) / 100);
      }

      if (this.outputAnalyser && !this.isSpeakerMuted && this.activeSourceNodes.length > 0) {
        this.outputAnalyser.getByteFrequencyData(outputData);
        let sum = 0;
        for (let i = 0; i < outputData.length; i++) {
          sum += outputData[i];
        }
        aiLevel = Math.min(1, (sum / outputData.length) / 80);
      }

      this.callbacks.onAudioLevelChange(micLevel, aiLevel);
    }, 60);
  }

  private floatTo16BitPCMBase64(input: Float32Array): string {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    // Convert ArrayBuffer to binary string
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  public endCall(): void {
    this.isDestroyed = true;
    this.isConnected = false;

    if (AudioCallManager.activeInstance === this) {
      AudioCallManager.activeInstance = null;
    }

    if (this.currentResponseAbortController) {
      this.currentResponseAbortController.abort();
      this.currentResponseAbortController = null;
    }

    if (this.levelInterval) {
      clearInterval(this.levelInterval);
      this.levelInterval = null;
    }

    if (this.speechRecognition) {
      try {
        this.isRecognizing = false;
        this.speechRecognition.onresult = null;
        this.speechRecognition.onerror = null;
        this.speechRecognition.onend = null;
        this.speechRecognition.abort();
      } catch {
        // ignore
      }
      this.speechRecognition = null;
    }

    this.interruptPlayback();

    if (this.scriptProcessor) {
      this.scriptProcessor.onaudioprocess = null;
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      this.mediaStream = null;
    }

    if (this.inputAudioCtx) {
      this.inputAudioCtx.close().catch(() => {});
      this.inputAudioCtx = null;
    }
    if (this.outputAudioCtx) {
      this.outputAudioCtx.close().catch(() => {});
      this.outputAudioCtx = null;
    }

    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    this.callbacks.onStatusChange('ended', 'Call ended');
  }
}
