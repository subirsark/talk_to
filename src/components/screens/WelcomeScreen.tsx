import React from 'react';
import { PhoneCall, Sparkles, Heart, ShieldCheck, MessageCircleHeart, Users, Volume2 } from 'lucide-react';
import { Companion, Language, ScreenType, UserPreferences } from '../../types';

interface WelcomeScreenProps {
  companion: Companion;
  preferences: UserPreferences;
  onStartCall: () => void;
  onNavigate: (screen: ScreenType) => void;
  onUpdatePreferences: (updates: Partial<UserPreferences>) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  companion,
  preferences,
  onStartCall,
  onNavigate,
  onUpdatePreferences,
}) => {
  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-140px)] pb-24 text-center px-4 max-w-md mx-auto">
      {/* Top Tagline */}
      <div className="pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/25 text-pink-300 text-xs font-medium mb-3">
          <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400" />
          <span>Romantic Virtual Companion</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-heading leading-tight">
          Someone who truly <br />
          <span className="bg-gradient-to-r from-pink-400 via-rose-300 to-purple-300 bg-clip-text text-transparent">
            listens with heart.
          </span>
        </h1>
        <p className="text-xs text-purple-200/70 mt-2 max-w-xs mx-auto leading-relaxed">
          Real-time voice calls in Hinglish, Hindi &amp; English. An empathetic ear for your everyday stress, victories, and late-night thoughts.
        </p>
      </div>

      {/* Main Companion Showcase Card */}
      <div className="relative my-6 group w-full max-w-xs">
        {/* Glowing Aura Rings */}
        <div className="absolute -inset-2 bg-gradient-to-tr from-pink-600 via-rose-500 to-purple-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-70 transition duration-1000 animate-pulse-glow" />

        <div className="relative rounded-3xl bg-purple-950/80 border border-pink-500/30 overflow-hidden shadow-2xl backdrop-blur-xl p-4">
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden mb-3 border border-pink-500/20 shadow-inner">
            <img
              src={companion.avatarUrl}
              alt={companion.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-purple-950 via-transparent to-transparent opacity-80" />
            
            {/* Companion Name overlay */}
            <div className="absolute bottom-3 left-3 right-3 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white font-heading">
                    {companion.name}
                  </h3>
                  <p className="text-xs text-pink-300 font-medium">
                    {companion.title} • {companion.personality}
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('avatars')}
                  className="px-2.5 py-1 rounded-full bg-purple-900/80 border border-pink-400/40 text-[11px] text-pink-200 hover:bg-pink-600/30 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Users className="w-3 h-3 text-pink-400" />
                  <span>Gallery</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sample Greeting Quote */}
          <div className="p-2.5 rounded-xl bg-pink-950/30 border border-pink-500/15 text-left mb-3">
            <div className="flex items-center gap-1.5 text-[10px] text-pink-400 font-semibold uppercase tracking-wider mb-1">
              <Volume2 className="w-3 h-3" />
              <span>Voice Greeting ({preferences.preferredLanguage})</span>
            </div>
            <p className="text-xs text-pink-100/90 italic leading-snug">
              &ldquo;{companion.sampleGreetings[preferences.preferredLanguage] || companion.sampleGreetings.Hinglish}&rdquo;
            </p>
          </div>

          {/* Quick Language Toggle */}
          <div className="flex items-center justify-between gap-1.5">
            {(['Hinglish', 'Hindi', 'English'] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => onUpdatePreferences({ preferredLanguage: lang })}
                className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                  preferences.preferredLanguage === lang
                    ? 'bg-pink-600 border-pink-400 text-white shadow-md shadow-pink-600/30'
                    : 'bg-purple-900/40 border-pink-500/20 text-purple-200/80 hover:bg-purple-800/40'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Action Call Button */}
      <div className="w-full space-y-3">
        <button
          onClick={onStartCall}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-500 to-fuchsia-600 text-white font-bold text-base shadow-xl shadow-pink-600/40 hover:shadow-pink-500/60 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-12 transition-transform">
            <PhoneCall className="w-4 h-4 text-white animate-pulse" />
          </div>
          <span>Call {companion.name} Now</span>
        </button>

        {/* Feature Highlights pills */}
        <div className="grid grid-cols-2 gap-2 text-left pt-1">
          <div className="p-2.5 rounded-2xl bg-purple-900/30 border border-pink-500/10 flex items-start gap-2">
            <MessageCircleHeart className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[11px] font-semibold text-pink-200 block">
                Speech-to-Speech
              </span>
              <span className="text-[10px] text-purple-300/60 leading-tight block">
                Natural uninterrupted voice
              </span>
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-purple-900/30 border border-pink-500/10 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[11px] font-semibold text-pink-200 block">
                Privacy First
              </span>
              <span className="text-[10px] text-purple-300/60 leading-tight block">
                Consent-based memory
              </span>
            </div>
          </div>
        </div>

        {/* Ethical AI Disclaimer */}
        <p className="text-[10px] text-purple-300/40 leading-relaxed text-center px-2 pt-1">
          HeartTalk is an AI companion application designed for emotional wellness, friendly companionship, and stress relief. She never pretends to be a biological human.
        </p>
      </div>
    </div>
  );
};
