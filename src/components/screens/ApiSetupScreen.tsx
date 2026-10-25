import React, { useState, useEffect } from 'react';
import {
  Server,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Mic,
  Key,
  RefreshCw,
  Smartphone,
  Terminal,
  Radio,
  Sparkles,
} from 'lucide-react';

export const ApiSetupScreen: React.FC = () => {
  const [serverStatus, setServerStatus] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [testingMic, setTestingMic] = useState<boolean>(false);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [micError, setMicError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setServerStatus(data);
    } catch (err: any) {
      setServerStatus({ status: 'error', error: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleTestMic = async () => {
    if (testingMic) {
      setTestingMic(false);
      return;
    }

    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setTestingMic(true);

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const interval = setInterval(() => {
        if (!testingMic) {
          clearInterval(interval);
          stream.getTracks().forEach((t) => t.stop());
          audioCtx.close().catch(() => {});
          return;
        }
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i];
        setMicVolume(Math.min(100, Math.round((sum / buffer.length) * 1.5)));
      }, 80);
    } catch (e: any) {
      setMicError(e.message || 'Microphone access denied');
      setTestingMic(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 pb-28 pt-2 text-left">
      {/* Title */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/25 text-pink-300 text-xs font-medium mb-2">
          <Server className="w-3.5 h-3.5 text-pink-400" />
          <span>System &amp; Backend Architecture</span>
        </div>
        <h2 className="text-2xl font-bold text-white font-heading">
          API &amp; Engine Setup
        </h2>
        <p className="text-xs text-purple-200/70 mt-1 max-w-xs mx-auto">
          Security status, live real-time voice connection diagnostics, and Android readiness.
        </p>
      </div>

      <div className="space-y-4">
        {/* Backend & API Key Status */}
        <div className="p-4 rounded-3xl bg-purple-950/70 border border-pink-500/20 backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-pink-300 uppercase tracking-wider flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-pink-400" />
              <span>Node.js Backend Status</span>
            </h3>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="text-[11px] text-purple-300 hover:text-pink-300 flex items-center gap-1 cursor-pointer font-medium"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-2xl bg-purple-900/40 border border-purple-800/40 flex items-center justify-between">
              <span className="text-purple-200/80">API Key Configuration</span>
              {serverStatus?.hasApiKey ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-300 font-semibold text-[11px] flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>Configured</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-950 border border-rose-500/30 text-rose-300 font-semibold text-[11px] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-rose-400" />
                  <span>Interactive Demo Mode</span>
                </span>
              )}
            </div>

            <div className="p-3 rounded-2xl bg-purple-900/40 border border-purple-800/40 flex items-center justify-between">
              <span className="text-purple-200/80">Gemini Live Voice Engine (gemini-3.8-live)</span>
              {serverStatus?.features?.liveSpeechToSpeech ? (
                <span className="text-emerald-300 font-semibold text-[11px] flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
                  <span>Active</span>
                </span>
              ) : (
                <span className="text-rose-300 font-semibold text-[11px]">
                  Browser Demo Synthesis
                </span>
              )}
            </div>

            <div className="p-3 rounded-2xl bg-purple-900/40 border border-purple-800/40 flex items-center justify-between">
              <span className="text-purple-200/80">Neural TTS (gemini-3.8-flash-lite-tts)</span>
              <span className={serverStatus?.features?.serverTts ? 'text-emerald-300 font-semibold text-[11px]' : 'text-purple-400 text-[11px]'}>
                {serverStatus?.features?.serverTts ? 'Available' : 'Client Fallback'}
              </span>
            </div>
          </div>
        </div>

        {/* Microphone Hardware & Diagnostic Tool */}
        <div className="p-4 rounded-3xl bg-purple-950/70 border border-pink-500/20 backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-pink-300 uppercase tracking-wider flex items-center gap-2">
              <Mic className="w-3.5 h-3.5 text-pink-400" />
              <span>Microphone Diagnostics</span>
            </h3>
            <button
              onClick={handleTestMic}
              className={`px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                testingMic
                  ? 'bg-rose-600 text-white'
                  : 'bg-pink-600 hover:bg-pink-500 text-white'
              }`}
            >
              {testingMic ? 'Stop Test' : 'Test Microphone'}
            </button>
          </div>

          <p className="text-[11px] text-purple-200/70 leading-relaxed">
            HeartTalk captures your voice at 16,000 Hz with echo cancellation and noise suppression for smooth hands-free speech.
          </p>

          {testingMic && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[10px] text-purple-300">
                <span>Input Level</span>
                <span className="font-mono">{micVolume}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-purple-900/60 overflow-hidden border border-purple-700/50">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-pink-500 transition-all duration-75"
                  style={{ width: `${micVolume}%` }}
                />
              </div>
            </div>
          )}

          {micError && (
            <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{micError}</span>
            </div>
          )}
        </div>

        {/* Security Architecture Guarantee */}
        <div className="p-4 rounded-3xl bg-purple-950/70 border border-pink-500/20 backdrop-blur-xl space-y-2.5">
          <h3 className="text-xs font-bold text-pink-300 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero Secret Exposure Security</span>
          </h3>

          <p className="text-xs text-purple-200/80 leading-relaxed">
            All Google GenAI API communication is strictly mediated by the Node.js Express server (`server.ts`). The frontend bundle contains zero API secrets.
          </p>

          <div className="p-3 rounded-2xl bg-purple-900/40 border border-purple-800/40 text-[11px] font-mono text-pink-200/90 space-y-1">
            <div>Client (Browser) &harr; WebSocket: /ws/live-call</div>
            <div>&darr; (16kHz PCM audio stream)</div>
            <div>Node.js Express Server (server.ts)</div>
            <div>&darr; (Google GenAI Live SDK)</div>
            <div>gemini-3.8-live &amp; gemini-3.8-flash-lite-tts</div>
          </div>
        </div>

        {/* Android Packaging Readiness */}
        <div className="p-4 rounded-3xl bg-purple-950/70 border border-pink-500/20 backdrop-blur-xl space-y-2.5">
          <h3 className="text-xs font-bold text-pink-300 uppercase tracking-wider flex items-center gap-2">
            <Smartphone className="w-3.5 h-3.5 text-pink-400" />
            <span>Android Packaging &amp; PWA Readiness</span>
          </h3>

          <p className="text-xs text-purple-200/80 leading-relaxed">
            HeartTalk is built mobile-first with touch-optimized interfaces, safe-area viewport compliance, and zero popups. It can be wrapped into a native Android APK using Capacitor:
          </p>

          <div className="p-3 rounded-2xl bg-purple-900/40 border border-purple-800/40 text-[10px] font-mono text-purple-300 space-y-1">
            <div>npm install @capacitor/core @capacitor/cli @capacitor/android</div>
            <div>npx cap init &quot;HeartTalk&quot; &quot;com.hearttalk.companion&quot;</div>
            <div>npm run build &amp;&amp; npx cap add android</div>
          </div>
        </div>
      </div>
    </div>
  );
};
