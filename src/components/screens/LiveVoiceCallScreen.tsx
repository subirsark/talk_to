import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Heart,
  Sparkles,
  MessageSquare,
  ChevronDown,
  Info,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { CallMessage, Companion, Language, Memory, UserPreferences, VoiceName } from '../../types';
import { AudioCallManager } from '../../services/audioCallManager';
import { storage } from '../../services/storage';

interface LiveVoiceCallScreenProps {
  companion: Companion;
  preferences: UserPreferences;
  onEndCall: (durationSeconds: number, messages: CallMessage[]) => void;
  onProposeMemory: (text: string) => void;
}

export const LiveVoiceCallScreen: React.FC<LiveVoiceCallScreenProps> = ({
  companion,
  preferences,
  onEndCall,
  onProposeMemory,
}) => {
  const [callStatus, setCallStatus] = useState<string>('Connecting...');
  const [statusState, setStatusState] = useState<'connecting' | 'connected' | 'listening' | 'speaking' | 'interrupted' | 'ended' | 'error'>('connecting');
  const [engineMode, setEngineMode] = useState<'live' | 'demo'>('demo');
  const [engineInfo, setEngineInfo] = useState<string>('Checking backend voice engine...');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [aiLevel, setAiLevel] = useState<number>(0);
  const [messages, setMessages] = useState<CallMessage[]>([]);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; left: number }[]>([]);
  const [showEngineDetails, setShowEngineDetails] = useState<boolean>(false);
  const [memoryProposal, setMemoryProposal] = useState<string | null>(null);

  const audioManagerRef = useRef<AudioCallManager | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const companionRef = useRef<Companion>(companion);
  companionRef.current = companion;
  const preferencesRef = useRef<UserPreferences>(preferences);
  preferencesRef.current = preferences;

  // Initialize Call once on mount
  useEffect(() => {
    // Terminate any leftover speech synthesis in browser
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const currentCompanion = companionRef.current;
    const currentPrefs = preferencesRef.current;
    const memories = storage.getMemories().map((m) => m.text);

    const manager = new AudioCallManager(
      currentCompanion,
      currentPrefs.userName,
      currentPrefs.preferredLanguage,
      currentPrefs.voiceName,
      memories,
      {
        onStatusChange: (status, message) => {
          setStatusState(status);
          if (message) setCallStatus(message);
        },
        onAudioLevelChange: (mic, ai) => {
          setMicLevel(mic);
          setAiLevel(ai);
        },
        onMessageReceived: (msg) => {
          setMessages((prev) => [...prev, msg]);

          // Check if memory consent is enabled and user shared something memorable
          if (preferencesRef.current.autoMemoryConsent && msg.sender === 'user') {
            checkAndProposeMemory(msg.text);
          }
        },
        onInterrupted: () => {
          setStatusState('interrupted');
          setCallStatus('Interrupted — Listening to you...');
        },
        onEngineMode: (mode, info) => {
          setEngineMode(mode);
          setEngineInfo(info);
        },
      }
    );

    audioManagerRef.current = manager;
    manager.startCall();

    // Call duration timer
    timerRef.current = window.setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioManagerRef.current) {
        audioManagerRef.current.endCall();
        audioManagerRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Auto-scroll subtitles
  useEffect(() => {
    if (showSubtitles && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showSubtitles]);

  // Check for memorable facts to ask user permission before saving
  const checkAndProposeMemory = async (userText: string) => {
    // Only propose if substantial text and not already proposing
    if (userText.split(' ').length < 3 || memoryProposal) return;

    try {
      const currentMemories = storage.getMemories().map((m) => m.text);
      const res = await fetch('/api/memory/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationText: userText,
          currentMemories,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.proposedMemories && data.proposedMemories.length > 0) {
          setMemoryProposal(data.proposedMemories[0]);
        }
      }
    } catch {
      // non-blocking
    }
  };

  const handleAcceptMemory = () => {
    if (memoryProposal) {
      onProposeMemory(memoryProposal);
      setMemoryProposal(null);
    }
  };

  const handleDeclineMemory = () => {
    setMemoryProposal(null);
  };

  const handleToggleMute = () => {
    if (audioManagerRef.current) {
      const muted = audioManagerRef.current.toggleMute();
      setIsMuted(muted);
    }
  };

  const handleToggleSpeaker = () => {
    if (audioManagerRef.current) {
      const muted = audioManagerRef.current.toggleSpeaker();
      setIsSpeakerMuted(muted);
    }
  };

  const handleInterrupt = () => {
    if (audioManagerRef.current) {
      audioManagerRef.current.interruptPlayback();
    }
  };

  const handleSendHeart = () => {
    const id = Date.now();
    setFloatingHearts((prev) => [...prev, { id, left: Math.floor(Math.random() * 60) + 20 }]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== id));
    }, 2500);

    // If demo mode, companion gives an affectionate voice reaction
    if (engineMode === 'demo' && audioManagerRef.current) {
      const compliments = [
        `Aww, you are so sweet, ${preferences.userName}! My heart is smiling!`,
        `Sending you so much love right back, baby! ❤️`,
        `You always know how to make me blush!`,
      ];
      const randomComp = compliments[Math.floor(Math.random() * compliments.length)];
      audioManagerRef.current.handleDemoUserTurn('(sent a heart reaction)');
    }
  };

  const handleEnd = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioManagerRef.current) {
      audioManagerRef.current.endCall();
    }
    onEndCall(duration, messages);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const lastAiMessage = [...messages].reverse().find((m) => m.sender === 'companion');
  const lastUserMessage = [...messages].reverse().find((m) => m.sender === 'user');

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex flex-col justify-between max-w-md mx-auto px-4 pb-6 pt-2 overflow-hidden">
      {/* Floating Heart Bursts */}
      {floatingHearts.map((h) => (
        <div
          key={h.id}
          className="absolute z-50 pointer-events-none text-2xl text-pink-400 animate-bounce"
          style={{
            bottom: '140px',
            left: `${h.left}%`,
            transition: 'all 2s ease-out',
            transform: 'translateY(-180px) scale(1.4)',
            opacity: 0.9,
          }}
        >
          💖
        </div>
      ))}

      {/* Top Bar: Call Timer, Engine Badge, Status */}
      <div className="flex items-center justify-between z-10 pt-1">
        {/* Call Timer & Companion Name */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/70 border border-pink-500/20 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-semibold text-pink-200 tracking-wider font-mono">
              {formatTime(duration)}
            </span>
          </div>
          <span className="text-xs font-medium text-pink-300/80">
            {preferences.preferredLanguage}
          </span>
        </div>

        {/* Engine mode badge with modal toggle */}
        <button
          onClick={() => setShowEngineDetails(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border backdrop-blur-md cursor-pointer transition-all ${
            engineMode === 'live'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
          }`}
        >
          {engineMode === 'live' ? (
            <>
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>Gemini Live AI</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 text-rose-400" />
              <span>Demo Voice Mode</span>
            </>
          )}
          <Info className="w-3 h-3 opacity-70" />
        </button>
      </div>

      {/* Engine Details Modal */}
      {showEngineDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-purple-950 border border-pink-500/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <span>Voice Engine Status</span>
              </h3>
              <button
                onClick={() => setShowEngineDetails(false)}
                className="text-purple-300 hover:text-white p-1 text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-purple-200/90 leading-relaxed">
              <div className="p-3 rounded-2xl bg-purple-900/40 border border-pink-500/20">
                <div className="font-semibold text-pink-300 mb-1">
                  Current Mode: {engineMode === 'live' ? 'Gemini 3.8 Live API' : 'Interactive Demo Voice Mode'}
                </div>
                <p className="text-[11px] text-purple-300/80">
                  {engineInfo}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-purple-900/30 border border-purple-500/15">
                <span className="font-semibold text-white block mb-1">
                  How Live Voice Works:
                </span>
                <p className="text-[11px] text-purple-300/70">
                  HeartTalk streams 16kHz microphone audio via WebSocket to our secure Node.js server bridge. The server connects directly to the Google Gemini Live API (<code className="text-pink-300">gemini-3.8-live</code>) and returns real-time 24kHz audio without exposing API keys to the browser.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-purple-900/30 border border-purple-500/15">
                <span className="font-semibold text-white block mb-1">
                  Demo Voice Engine:
                </span>
                <p className="text-[11px] text-purple-300/70">
                  When an external API key is not yet configured, HeartTalk automatically uses the interactive browser voice synthesis engine with real speech recognition and emotional dialogue.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowEngineDetails(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-pink-600 text-white font-semibold text-xs hover:bg-pink-500 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Memory Consent Toast / Request Modal */}
      {memoryProposal && (
        <div className="relative z-30 my-2 p-3 rounded-2xl bg-purple-900/90 border border-pink-400/50 shadow-xl backdrop-blur-xl animate-fade-in">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-pink-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-pink-400" />
            </div>
            <div className="text-left flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400 block">
                {companion.name} asks permission to remember:
              </span>
              <p className="text-xs text-white font-medium mt-0.5">
                &ldquo;{memoryProposal}&rdquo;
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handleAcceptMemory}
                  className="px-3 py-1 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <CheckCircle className="w-3 h-3" />
                  <span>Remember This</span>
                </button>
                <button
                  onClick={handleDeclineMemory}
                  className="px-3 py-1 rounded-lg bg-purple-950 hover:bg-purple-800 text-purple-300 text-[11px] font-medium border border-purple-700/50 cursor-pointer transition-colors"
                >
                  Not Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Center Avatar & Interactive Audio Visualizer Ring */}
      <div className="my-auto flex flex-col items-center justify-center py-2 relative">
        <div className="relative flex items-center justify-center">
          {/* Outer Pulsating Ring (AI Speech Level) */}
          <div
            className="absolute rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 blur-2xl transition-all duration-150"
            style={{
              width: `${210 + aiLevel * 90}px`,
              height: `${210 + aiLevel * 90}px`,
              opacity: 0.35 + aiLevel * 0.55,
            }}
          />

          {/* User Mic Input Ring */}
          <div
            className="absolute rounded-full border-2 border-emerald-400/60 transition-all duration-100 pointer-events-none"
            style={{
              width: `${195 + micLevel * 60}px`,
              height: `${195 + micLevel * 60}px`,
              opacity: micLevel > 0.05 ? 0.9 : 0,
            }}
          />

          {/* Avatar Image Frame */}
          <div className="relative w-48 h-48 sm:w-52 sm:h-52 rounded-full p-1.5 bg-gradient-to-tr from-pink-500 via-rose-400 to-purple-500 shadow-2xl shadow-pink-600/30">
            <div className="w-full h-full rounded-full overflow-hidden border-2 border-purple-950 relative">
              <img
                src={companion.avatarUrl}
                alt={companion.name}
                className="w-full h-full object-cover"
              />
              {/* Subtle inner romantic vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-purple-950/40 via-transparent to-transparent" />
            </div>

            {/* Speaking / Listening Indicator Bubble */}
            <div className="absolute bottom-1 right-3 px-3 py-1 rounded-full bg-purple-950/90 border border-pink-500/40 backdrop-blur-md flex items-center gap-1.5 shadow-lg">
              {statusState === 'speaking' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping" />
                  <span className="text-[10px] font-bold text-pink-300 uppercase tracking-wider">
                    Speaking
                  </span>
                </>
              ) : statusState === 'listening' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                    Listening
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="text-[10px] font-medium text-pink-200">
                    {statusState}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Companion Title & Personality */}
        <div className="mt-4 text-center">
          <h2 className="text-2xl font-bold text-white font-heading tracking-tight">
            {companion.name}
          </h2>
          <p className="text-xs text-pink-300/80 font-medium">
            {companion.personality} • {companion.tone}
          </p>
        </div>

        {/* Dynamic Voice Waveform Bars */}
        <div className="flex items-center justify-center gap-1.5 h-8 mt-3">
          {Array.from({ length: 9 }).map((_, i) => {
            const activeLevel = statusState === 'speaking' ? aiLevel : micLevel;
            const barHeight = Math.max(
              4,
              Math.min(32, Math.sin((i / 8) * Math.PI) * (activeLevel * 60 + 6))
            );
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-75 ${
                  statusState === 'speaking'
                    ? 'bg-gradient-to-t from-pink-500 to-rose-300'
                    : 'bg-gradient-to-t from-emerald-500 to-teal-300'
                }`}
                style={{ height: `${barHeight}px` }}
              />
            );
          })}
        </div>
      </div>

      {/* Subtitles & Live Transcripts Overlay */}
      {showSubtitles && (
        <div className="relative z-20 w-full mb-3">
          <div className="p-3 rounded-2xl bg-purple-950/70 border border-pink-500/20 backdrop-blur-xl shadow-lg max-h-32 overflow-y-auto">
            <div className="flex items-center justify-between pb-1.5 border-b border-purple-800/40 text-[10px] text-pink-300/70 font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-pink-400" />
                <span>Live Subtitles</span>
              </span>
              <button
                onClick={() => setShowSubtitles(false)}
                className="hover:text-pink-200 cursor-pointer"
              >
                Hide
              </button>
            </div>

            <div className="space-y-1.5 pt-1.5 text-xs text-left">
              {messages.length === 0 ? (
                <p className="text-purple-300/50 italic text-[11px] text-center py-1">
                  Start speaking... {companion.name} is listening in {preferences.preferredLanguage}.
                </p>
              ) : (
                messages.slice(-4).map((msg) => (
                  <div
                    key={msg.id}
                    className={`leading-relaxed ${
                      msg.sender === 'user' ? 'text-purple-200/80' : 'text-pink-100 font-medium'
                    }`}
                  >
                    <span
                      className={`text-[10px] font-bold mr-1.5 ${
                        msg.sender === 'user' ? 'text-purple-400' : 'text-pink-400'
                      }`}
                    >
                      {msg.sender === 'user' ? preferences.userName : companion.name}:
                    </span>
                    <span>{msg.text}</span>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* Interactive Call Controls Toolbar */}
      <div className="relative z-20 w-full space-y-3">
        {/* Secondary Row: Interruption & Heart React & Subtitle Toggle */}
        <div className="flex items-center justify-center gap-3">
          {/* Interrupt Button: User cuts in gently */}
          <button
            onClick={handleInterrupt}
            className="px-3.5 py-1.5 rounded-full bg-purple-900/60 border border-pink-500/30 text-xs font-semibold text-pink-200 hover:bg-pink-600/30 hover:border-pink-400/60 transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <span>Interrupt</span>
          </button>

          {/* Send Virtual Heart */}
          <button
            onClick={handleSendHeart}
            className="px-4 py-1.5 rounded-full bg-pink-500/20 border border-pink-400/40 text-xs font-bold text-pink-300 hover:bg-pink-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Heart className="w-3.5 h-3.5 fill-pink-400 text-pink-400 animate-pulse" />
            <span>Send Love</span>
          </button>

          {/* Subtitles Toggle */}
          {!showSubtitles && (
            <button
              onClick={() => setShowSubtitles(true)}
              className="px-3.5 py-1.5 rounded-full bg-purple-900/60 border border-pink-500/30 text-xs font-semibold text-pink-200 hover:bg-pink-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3 h-3 text-pink-400" />
              <span>Subtitles</span>
            </button>
          )}
        </div>

        {/* Primary Row: Mute, End Call, Speaker */}
        <div className="p-3 rounded-3xl bg-purple-950/80 border border-pink-500/25 backdrop-blur-2xl shadow-2xl flex items-center justify-around">
          {/* Mute Mic Button */}
          <button
            onClick={handleToggleMute}
            className={`w-13 h-13 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isMuted
                ? 'bg-rose-500/20 border border-rose-500 text-rose-300 shadow-lg shadow-rose-500/20'
                : 'bg-purple-900/50 border border-pink-500/30 text-pink-200 hover:bg-purple-800/60'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="w-6 h-6 text-rose-400" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* End Call Button (Big Red Action) */}
          <button
            onClick={handleEnd}
            className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-600 to-red-600 text-white flex items-center justify-center shadow-xl shadow-rose-600/50 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
            title="End Call"
          >
            <PhoneOff className="w-7 h-7 group-hover:rotate-12 transition-transform" />
          </button>

          {/* Speaker Mute Button */}
          <button
            onClick={handleToggleSpeaker}
            className={`w-13 h-13 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isSpeakerMuted
                ? 'bg-rose-500/20 border border-rose-500 text-rose-300'
                : 'bg-purple-900/50 border border-pink-500/30 text-pink-200 hover:bg-purple-800/60'
            }`}
            title={isSpeakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}
          >
            {isSpeakerMuted ? <VolumeX className="w-6 h-6 text-rose-400" /> : <Volume2 className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </div>
  );
};
