import React, { useState } from 'react';
import {
  Brain,
  Plus,
  Trash2,
  Edit2,
  Check,
  ShieldCheck,
  Lock,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { Memory, UserPreferences } from '../../types';

interface MemoryPrivacyScreenProps {
  memories: Memory[];
  preferences: UserPreferences;
  onAddMemory: (text: string, category: Memory['category']) => void;
  onUpdateMemory: (id: string, text: string) => void;
  onDeleteMemory: (id: string) => void;
  onClearAllMemories: () => void;
  onUpdatePreferences: (updates: Partial<UserPreferences>) => void;
}

export const MemoryPrivacyScreen: React.FC<MemoryPrivacyScreenProps> = ({
  memories,
  preferences,
  onAddMemory,
  onUpdateMemory,
  onDeleteMemory,
  onClearAllMemories,
  onUpdatePreferences,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newMemoryText, setNewMemoryText] = useState<string>('');
  const [newMemoryCategory, setNewMemoryCategory] = useState<Memory['category']>('preference');
  const [showConfirmClear, setShowConfirmClear] = useState<boolean>(false);

  const startEdit = (m: Memory) => {
    setEditingId(m.id);
    setEditText(m.text);
  };

  const saveEdit = (id: string) => {
    if (editText.trim()) {
      onUpdateMemory(id, editText);
    }
    setEditingId(null);
  };

  const handleCreate = () => {
    if (newMemoryText.trim()) {
      onAddMemory(newMemoryText.trim(), newMemoryCategory);
      setNewMemoryText('');
      setShowAddModal(false);
    }
  };

  const categoryBadges: Record<Memory['category'], { label: string; color: string }> = {
    preference: { label: 'Preference', color: 'bg-pink-900/50 text-pink-300 border-pink-500/30' },
    goal: { label: 'Goal / Dream', color: 'bg-purple-900/50 text-purple-300 border-purple-500/30' },
    emotion: { label: 'Emotion & Stress', color: 'bg-rose-900/50 text-rose-300 border-rose-500/30' },
    relationship: { label: 'Bond', color: 'bg-fuchsia-900/50 text-fuchsia-300 border-fuchsia-500/30' },
  };

  return (
    <div className="max-w-md mx-auto px-4 pb-28 pt-2 text-left">
      {/* Title */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/25 text-pink-300 text-xs font-medium mb-2">
          <Brain className="w-3.5 h-3.5 text-pink-400" />
          <span>Transparent Memory &amp; Privacy</span>
        </div>
        <h2 className="text-2xl font-bold text-white font-heading">
          Memory &amp; Privacy Controls
        </h2>
        <p className="text-xs text-purple-200/70 mt-1 max-w-xs mx-auto">
          You own everything she remembers. View, edit, add, or erase memories at any time.
        </p>
      </div>

      <div className="space-y-5">
        {/* Memory Consent & Privacy Pledge Card */}
        <div className="p-4 rounded-3xl bg-purple-950/70 border border-pink-500/20 backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-pink-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Permission Settings</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-300 font-semibold">
              Client Encrypted
            </span>
          </div>

          <label className="flex items-start gap-3 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={preferences.autoMemoryConsent}
              onChange={(e) => onUpdatePreferences({ autoMemoryConsent: e.target.checked })}
              className="mt-1 accent-pink-500 w-4 h-4 rounded cursor-pointer shrink-0"
            />
            <div className="text-xs">
              <span className="font-semibold text-white block">
                Ask permission before saving personal memories
              </span>
              <p className="text-[11px] text-purple-200/70 mt-0.5 leading-snug">
                When enabled, HeartTalk will proactively seek your explicit approval before adding any personal details to her memory bank.
              </p>
            </div>
          </label>
        </div>

        {/* Memories List Header & Add Button */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide uppercase">
              Saved Memories ({memories.length})
            </h3>
            <span className="text-[11px] text-purple-300/60 block">
              Used to personalize conversations &amp; voice calls
            </span>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Memory</span>
          </button>
        </div>

        {/* Memories Cards */}
        {memories.length === 0 ? (
          <div className="p-8 rounded-3xl bg-purple-950/40 border border-purple-800/30 text-center space-y-2">
            <Sparkles className="w-8 h-8 text-pink-400/50 mx-auto" />
            <h4 className="text-sm font-semibold text-white">No Saved Memories Yet</h4>
            <p className="text-xs text-purple-300/60 max-w-xs mx-auto">
              HeartTalk has a completely blank slate. You can add something manually or she will ask permission during calls.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {memories.map((m) => {
              const isEditing = editingId === m.id;
              const badge = categoryBadges[m.category] || categoryBadges.preference;

              return (
                <div
                  key={m.id}
                  className="p-3.5 rounded-2xl bg-purple-950/70 border border-pink-500/15 backdrop-blur-md flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                    <span className="text-[9px] text-purple-400/70">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-purple-900/60 border border-pink-500 focus:outline-none text-white text-xs"
                      />
                      <button
                        onClick={() => saveEdit(m.id)}
                        className="p-2 rounded-xl bg-pink-600 text-white hover:bg-pink-500 cursor-pointer"
                        title="Save"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-white/95 leading-relaxed font-medium">
                      &ldquo;{m.text}&rdquo;
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-purple-900/40">
                    <button
                      onClick={() => (isEditing ? saveEdit(m.id) : startEdit(m))}
                      className="text-[11px] text-purple-300 hover:text-pink-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>{isEditing ? 'Done' : 'Edit'}</span>
                    </button>
                    <button
                      onClick={() => onDeleteMemory(m.id)}
                      className="text-[11px] text-purple-300 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Forget</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Clear All Memories Button */}
        {memories.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setShowConfirmClear(true)}
              className="w-full py-2.5 rounded-2xl bg-purple-900/30 hover:bg-rose-950/40 border border-rose-500/20 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Forget Everything (Erase All Memories)</span>
            </button>
          </div>
        )}
      </div>

      {/* Add Memory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-purple-950 border border-pink-500/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-left">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Plus className="w-4 h-4 text-pink-400" />
              <span>Add Personal Memory</span>
            </h3>
            <p className="text-xs text-purple-300/70 mb-4">
              Add a preference, goal, or detail you want HeartTalk to remember.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-pink-200 block mb-1">
                  Memory Description
                </label>
                <textarea
                  rows={3}
                  value={newMemoryText}
                  onChange={(e) => setNewMemoryText(e.target.value)}
                  placeholder="e.g. Loves listening to acoustic indie songs on rainy days"
                  className="w-full px-3 py-2 rounded-xl bg-purple-900/50 border border-purple-700 focus:border-pink-500 focus:outline-none text-white text-xs resize-none"
                />
              </div>

              <div>
                <label className="font-semibold text-pink-200 block mb-1">
                  Category
                </label>
                <select
                  value={newMemoryCategory}
                  onChange={(e) => setNewMemoryCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-purple-900/50 border border-purple-700 text-white text-xs focus:outline-none"
                >
                  <option value="preference">Personal Preference</option>
                  <option value="goal">Goal / Career / Studies</option>
                  <option value="emotion">Emotional Support / Stress</option>
                  <option value="relationship">Relationship Bond</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <button
                onClick={handleCreate}
                disabled={!newMemoryText.trim()}
                className="flex-1 py-2.5 rounded-xl bg-pink-600 disabled:opacity-50 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Save Memory
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 rounded-xl bg-purple-900/60 text-purple-300 font-medium text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Erase All Modal */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-purple-950 border border-pink-500/30 rounded-3xl p-6 max-w-xs w-full shadow-2xl text-center">
            <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">
              Erase All Memories?
            </h3>
            <p className="text-xs text-purple-200/70 mb-5 leading-relaxed">
              HeartTalk will forget all personal details, preferences, and goals saved about you.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClearAllMemories();
                  setShowConfirmClear(false);
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Yes, Erase
              </button>
              <button
                onClick={() => setShowConfirmClear(false)}
                className="px-4 py-2 rounded-xl bg-purple-900/60 text-purple-200 font-medium text-xs cursor-pointer"
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
