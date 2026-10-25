import React, { useState } from 'react';
import { Check, Sparkles, Volume2, Edit3, Heart, Tag, ArrowRight } from 'lucide-react';
import { Companion, Language, ScreenType, UserPreferences } from '../../types';

interface AvatarGalleryScreenProps {
  companions: Companion[];
  selectedCompanionId: string;
  preferences: UserPreferences;
  onSelectCompanion: (id: string) => void;
  onCustomizeCompanion: (companionId: string, updates: Partial<Companion>) => void;
  onStartCall: () => void;
}

export const AvatarGalleryScreen: React.FC<AvatarGalleryScreenProps> = ({
  companions,
  selectedCompanionId,
  preferences,
  onSelectCompanion,
  onCustomizeCompanion,
  onStartCall,
}) => {
  const [editingCompanion, setEditingCompanion] = useState<Companion | null>(null);
  const [customName, setCustomName] = useState<string>('');
  const [customTone, setCustomTone] = useState<string>('');
  const [customBio, setCustomBio] = useState<string>('');
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const handleStartEdit = (comp: Companion) => {
    setEditingCompanion(comp);
    setCustomName(comp.name);
    setCustomTone(comp.tone);
    setCustomBio(comp.bio);
  };

  const handleSaveEdit = () => {
    if (editingCompanion) {
      onCustomizeCompanion(editingCompanion.id, {
        name: customName.trim() || editingCompanion.name,
        tone: customTone.trim() || editingCompanion.tone,
        bio: customBio.trim() || editingCompanion.bio,
      });
      setEditingCompanion(null);
    }
  };

  const handlePlaySample = (comp: Companion) => {
    const text = comp.sampleGreetings[preferences.preferredLanguage] || comp.sampleGreetings.Hinglish;
    setPlayingAudioId(comp.id);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = 1.15;
      utterance.rate = 0.95;
      utterance.onend = () => setPlayingAudioId(null);
      utterance.onerror = () => setPlayingAudioId(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setPlayingAudioId(null), 3000);
    }
  };

  React.useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleStartCallWithCleanup = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPlayingAudioId(null);
    onStartCall();
  };

  return (
    <div className="max-w-md mx-auto px-4 pb-28 pt-2">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/25 text-pink-300 text-xs font-medium mb-2">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span>Fictional Adult Virtual Companions</span>
        </div>
        <h2 className="text-2xl font-bold text-white font-heading">
          Choose Your Companion
        </h2>
        <p className="text-xs text-purple-200/70 mt-1 max-w-xs mx-auto">
          Each companion has a distinct emotional personality, voice temperament, and backstory.
        </p>
      </div>

      {/* Companions Grid */}
      <div className="space-y-5">
        {companions.map((comp) => {
          const isSelected = comp.id === selectedCompanionId;
          const isPlaying = playingAudioId === comp.id;

          return (
            <div
              key={comp.id}
              className={`relative rounded-3xl overflow-hidden transition-all duration-300 border ${
                isSelected
                  ? 'bg-purple-950/90 border-pink-500 shadow-2xl shadow-pink-600/30 ring-1 ring-pink-500/50'
                  : 'bg-purple-950/50 border-purple-800/40 hover:border-pink-500/30'
              }`}
            >
              {/* Selected Badge */}
              {isSelected && (
                <div className="absolute top-3 right-3 z-20 px-3 py-1 rounded-full bg-pink-600 text-white text-[11px] font-bold flex items-center gap-1 shadow-md">
                  <Check className="w-3.5 h-3.5" />
                  <span>Active Companion</span>
                </div>
              )}

              {/* Portrait & Info Banner */}
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <img
                  src={comp.avatarUrl}
                  alt={comp.name}
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-purple-950 via-purple-950/40 to-transparent" />

                {/* Name & Title on Image */}
                <div className="absolute bottom-3 left-4 right-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-extrabold text-white font-heading drop-shadow-md">
                        {comp.name}
                      </h3>
                      <p className="text-xs font-medium text-pink-300 drop-shadow">
                        {comp.title} • {comp.age} y/o
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-purple-900/80 backdrop-blur-md border border-pink-500/30 text-xs font-semibold text-pink-200">
                      {comp.personality}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                {/* Personality & Bio */}
                <p className="text-xs text-purple-200/90 leading-relaxed">
                  {comp.bio}
                </p>

                {/* Tone note */}
                <div className="flex items-center gap-1.5 text-[11px] text-pink-300/80 font-medium">
                  <Heart className="w-3 h-3 text-pink-400 fill-pink-400 shrink-0" />
                  <span>Tone: {comp.tone}</span>
                </div>

                {/* Sample Greeting Voice Audio Preview */}
                <div className="p-3 rounded-2xl bg-purple-900/30 border border-pink-500/15 flex items-center justify-between gap-2">
                  <div className="text-left flex-1">
                    <span className="text-[10px] text-pink-400 font-bold uppercase tracking-wider block">
                      Sample Voice Greeting
                    </span>
                    <p className="text-xs text-white/90 italic line-clamp-1 mt-0.5">
                      &ldquo;{comp.sampleGreetings[preferences.preferredLanguage] || comp.sampleGreetings.Hinglish}&rdquo;
                    </p>
                  </div>
                  <button
                    onClick={() => handlePlaySample(comp)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shrink-0 ${
                      isPlaying
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-purple-800/60 hover:bg-pink-600/40 text-pink-200 border border-pink-500/20'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{isPlaying ? 'Playing...' : 'Listen'}</span>
                  </button>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {comp.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 rounded-lg bg-purple-900/40 border border-purple-700/40 text-[10px] font-medium text-pink-200/70"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Actions: Select Companion & Customize */}
                <div className="pt-2 flex items-center gap-2">
                  {isSelected ? (
                    <button
                      onClick={handleStartCallWithCleanup}
                      className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold text-xs shadow-lg shadow-pink-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Start Call with {comp.name}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onSelectCompanion(comp.id)}
                      className="flex-1 py-2.5 rounded-2xl bg-purple-900/70 hover:bg-pink-600/80 border border-pink-500/30 text-white font-semibold text-xs transition-all cursor-pointer"
                    >
                      Choose {comp.name}
                    </button>
                  )}

                  <button
                    onClick={() => handleStartEdit(comp)}
                    className="p-2.5 rounded-2xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700/50 text-purple-200 hover:text-white transition-all cursor-pointer"
                    title="Customize Name or Bio"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Companion Customization Modal */}
      {editingCompanion && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-purple-950 border border-pink-500/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-left">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-pink-400" />
              <span>Customize {editingCompanion.name}</span>
            </h3>
            <p className="text-xs text-purple-300/70 mb-4">
              Personalize her nickname, voice tone, and background story.
            </p>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-pink-200 block mb-1">
                  Companion Name
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Ananya, Jaan, Angel"
                  className="w-full px-3 py-2 rounded-xl bg-purple-900/50 border border-purple-700 focus:border-pink-500 focus:outline-none text-white text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-pink-200 block mb-1">
                  Speaking Tone
                </label>
                <input
                  type="text"
                  value={customTone}
                  onChange={(e) => setCustomTone(e.target.value)}
                  placeholder="e.g. Soft, loving, playful, soothing"
                  className="w-full px-3 py-2 rounded-xl bg-purple-900/50 border border-purple-700 focus:border-pink-500 focus:outline-none text-white text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-pink-200 block mb-1">
                  Backstory &amp; Bio
                </label>
                <textarea
                  rows={3}
                  value={customBio}
                  onChange={(e) => setCustomBio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-purple-900/50 border border-purple-700 focus:border-pink-500 focus:outline-none text-white text-xs resize-none"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingCompanion(null)}
                className="px-4 py-2.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-300 font-medium text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
