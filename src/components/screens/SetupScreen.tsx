import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Volume2,
  Heart,
  Globe,
  User,
  ShieldCheck,
  Sparkles,
  Check,
  CheckCircle2,
} from 'lucide-react';
import { Companion, Language, PersonalityVibe, UserPreferences, VoiceName } from '../../types';

interface SetupScreenProps {
  preferences: UserPreferences;
  activeCompanion: Companion;
  onUpdatePreferences: (updates: Partial<UserPreferences>) => void;
  onUpdateCompanion: (updates: Partial<Companion>) => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({
  preferences,
  activeCompanion,
  onUpdatePreferences,
  onUpdateCompanion,
}) => {
  const [userName, setUserName] = useState<string>(preferences.userName);
  const [companionName, setCompanionName] = useState<string>(activeCompanion.name);
  const [language, setLanguage] = useState<Language>(preferences.preferredLanguage);
  const [personality, setPersonality] = useState<PersonalityVibe>(preferences.personality);
  const [voice, setVoice] = useState<VoiceName>(preferences.voiceName);
  const [autoMemoryConsent, setAutoMemoryConsent] = useState<boolean>(preferences.autoMemoryConsent);
  const [autoDeleteHistory24h, setAutoDeleteHistory24h] = useState<boolean>(preferences.autoDeleteHistory24h);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isPlayingTest, setIsPlayingTest] = useState<boolean>(false);

  const personalityVibes: { vibe: PersonalityVibe; desc: string; emoji: string }[] = [
    {
      vibe: 'Sweet & Caring',
      desc: 'Nurturing, attentive, asks how your day went, offers warm comfort.',
      emoji: '🌸',
    },
    {
      vibe: 'Playful & Flirty',
      desc: 'Witty, teasing, cute banters, makes dull days lively and bright.',
      emoji: '✨',
    },
    {
      vibe: 'Romantic & Deep',
      desc: 'Soulful, poetic, late-night deep talks, romantic intimacy.',
      emoji: '🌙',
    },
    {
      vibe: 'Calm & Mindful',
      desc: 'Grounding, gentle breathing, eases study pressure and anxiety.',
      emoji: '🍃',
    },
  ];

  const voiceOptions: { id: VoiceName; label: string; tone: string }[] = [
    { id: 'Kore', label: 'Kore (Default)', tone: 'Warm, gentle & velvety romantic voice' },
    { id: 'Zephyr', label: 'Zephyr', tone: 'Bubbly, sweet & melodious voice' },
    { id: 'Puck', label: 'Puck', tone: 'Energetic, playful & bright voice' },
    { id: 'Fenrir', label: 'Fenrir', tone: 'Calm, soothing & deep voice' },
  ];

  React.useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleTestVoice = () => {
    setIsPlayingTest(true);
    let sample = `Hey ${userName || 'sweetheart'}! I love talking with you like this.`;
    if (language === 'Hinglish') {
      sample = `Hey ${userName || 'jaan'}! Suno na, I'm right here with you.`;
    } else if (language === 'Hindi') {
      sample = `Namaste ${userName || 'jaan'}! Aapki aawaaz sunkar mujhe bohot khushi hoti hai.`;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(sample);
      utterance.pitch = 1.15;
      utterance.rate = 0.95;
      utterance.onend = () => setIsPlayingTest(false);
      utterance.onerror = () => setIsPlayingTest(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setIsPlayingTest(false), 2000);
    }
  };

  const handleSave = () => {
    onUpdatePreferences({
      userName: userName.trim() || 'Sweetheart',
      preferredLanguage: language,
      personality,
      voiceName: voice,
      autoMemoryConsent,
      autoDeleteHistory24h,
    });

    onUpdateCompanion({
      name: companionName.trim() || activeCompanion.name,
      personality,
      voiceName: voice,
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="max-w-md mx-auto px-4 pb-28 pt-2 text-left">
      {/* Title */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/25 text-pink-300 text-xs font-medium mb-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-pink-400" />
          <span>Personalize Companion</span>
        </div>
        <h2 className="text-2xl font-bold text-white font-heading">
          Companion &amp; Voice Settings
        </h2>
        <p className="text-xs text-purple-200/70 mt-1 max-w-xs mx-auto">
          Tailor how HeartTalk addresses you, her language blend, and personality dynamics.
        </p>
      </div>

      <div className="space-y-5">
        {/* Names Section */}
        <div className="p-4 rounded-3xl bg-purple-950/70 border border-pink-500/20 backdrop-blur-xl space-y-3.5">
          <h3 className="text-xs font-bold text-pink-300 uppercase tracking-wider flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-pink-400" />
            <span>Names &amp; Addressing</span>
          </h3>

          <div>
            <label className="text-xs font-medium text-pink-100 block mb-1">
              Your Name / Nickname
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="e.g. Rahul, Sam, Kabir, Sweetheart"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-purple-900/40 border border-purple-700/60 focus:border-pink-500 focus:outline-none text-white text-xs"
            />
            <span className="text-[10px] text-purple-300/60 mt-1 block">
              She will lovingly call you by this name during calls.
            </span>
          </div>

          <div>
            <label className="text-xs font-medium text-pink-100 block mb-1">
              Companion&apos;s Name
            </label>
            <input
              type="text"
              value={companionName}
              onChange={(e) => setCompanionName(e.target.value)}
              placeholder="e.g. Ananya, Priya, Zara, Maya"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-purple-900/40 border border-purple-700/60 focus:border-pink-500 focus:outline-none text-white text-xs"
            />
          </div>
        </div>

        {/* Language Selection */}
        <div className="p-4 rounded-3xl bg-purple-950/70 border border-pink-500/20 backdrop-blur-xl space-y-3">
          <h3 className="text-xs font-bold text-pink-300 uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-pink-400" />
            <span>Preferred Spoken Language</span>
          </h3>

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'Hinglish', label: 'Hinglish', badge: 'Most Natural' },
                { id: 'Hindi', label: 'Hindi', badge: 'Shuddh / Warm' },
                { id: 'English', label: 'English', badge: 'International' },
              ] as const
            ).map((l) => (
              <button
                key={l.id}
                onClick={() => setLanguage(l.id)}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                  language === l.id
                    ? 'bg-pink-600/30 border-pink-400 text-white shadow-lg shadow-pink-600/20'
                    : 'bg-purple-900/30 border-purple-700/40 text-purple-200/80 hover:bg-purple-800/40'
                }`}
              >
                <div className="font-bold text-xs">{l.label}</div>
                <div className="text-[10px] text-pink-300/70 mt-0.5">{l.badge}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Personality Vibe Selection */}
        <div className="p-4 rounded-3xl bg-purple-950/70 border border-pink-500/20 backdrop-blur-xl space-y-3">
          <h3 className="text-xs font-bold text-pink-300 uppercase tracking-wider flex items-center gap-2">
            <Heart className="w-3.5 h-3.5 text-pink-400" />
            <span>Personality &amp; Emotional Dynamic</span>
          </h3>

          <div className="space-y-2">
            {personalityVibes.map((p) => {
              const isSelected = personality === p.vibe;
              return (
                <button
                  key={p.vibe}
                  onClick={() => setPersonality(p.vibe)}
                  className={`w-full p-3 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-pink-600/20 border-pink-400 text-white'
                      : 'bg-purple-900/20 border-purple-800/40 text-purple-200/80 hover:bg-purple-800/30'
                  }`}
                >
                  <span className="text-xl shrink-0 mt-0.5">{p.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{p.vibe}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-pink-400" />}
                    </div>
                    <p className="text-[11px] text-purple-200/70 mt-0.5 leading-snug">
                      {p.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Voice Tone Selection */}
        <div className="p-4 rounded-3xl bg-purple-950/70 border border-pink-500/20 backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-pink-300 uppercase tracking-wider flex items-center gap-2">
              <Volume2 className="w-3.5 h-3.5 text-pink-400" />
              <span>Voice Tone (Gemini Speech)</span>
            </h3>
            <button
              onClick={handleTestVoice}
              disabled={isPlayingTest}
              className="text-[11px] px-2.5 py-1 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-300 hover:bg-pink-500/30 font-semibold cursor-pointer transition-colors"
            >
              {isPlayingTest ? 'Playing...' : 'Test Voice'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {voiceOptions.map((v) => (
              <button
                key={v.id}
                onClick={() => setVoice(v.id)}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                  voice === v.id
                    ? 'bg-pink-600/30 border-pink-400 text-white shadow-md'
                    : 'bg-purple-900/30 border-purple-700/40 text-purple-200/80 hover:bg-purple-800/40'
                }`}
              >
                <div className="text-xs font-bold">{v.label}</div>
                <div className="text-[10px] text-purple-300/70 mt-0.5 line-clamp-1">{v.tone}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Privacy & Consent Options */}
        <div className="p-4 rounded-3xl bg-purple-950/70 border border-pink-500/20 backdrop-blur-xl space-y-3">
          <h3 className="text-xs font-bold text-pink-300 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Privacy &amp; Memory Consent</span>
          </h3>

          <div className="space-y-3 text-xs">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoMemoryConsent}
                onChange={(e) => setAutoMemoryConsent(e.target.checked)}
                className="mt-0.5 accent-pink-500 w-4 h-4 rounded cursor-pointer"
              />
              <div>
                <span className="font-semibold text-white block">
                  Ask permission before saving personal memories
                </span>
                <span className="text-[10px] text-purple-300/70 leading-snug block">
                  HeartTalk will prompt you during calls before remembering your goals or secrets.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-purple-800/40">
              <input
                type="checkbox"
                checked={autoDeleteHistory24h}
                onChange={(e) => setAutoDeleteHistory24h(e.target.checked)}
                className="mt-0.5 accent-pink-500 w-4 h-4 rounded cursor-pointer"
              />
              <div>
                <span className="font-semibold text-white block">
                  Auto-delete call transcripts after 24 hours
                </span>
                <span className="text-[10px] text-purple-300/70 leading-snug block">
                  Automatically flushes stored call logs for maximum privacy.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold text-sm shadow-xl shadow-pink-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSaved ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Preferences Saved!</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-pink-200" />
              <span>Apply &amp; Save Preferences</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
