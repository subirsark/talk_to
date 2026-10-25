import React, { useState } from 'react';
import {
  Clock,
  Trash2,
  Download,
  Search,
  MessageSquare,
  Calendar,
  ChevronDown,
  ChevronUp,
  Heart,
  Share2,
} from 'lucide-react';
import { CallRecord } from '../../types';

interface ConversationHistoryScreenProps {
  history: CallRecord[];
  onClearHistory: () => void;
}

export const ConversationHistoryScreen: React.FC<ConversationHistoryScreenProps> = ({
  history,
  onClearHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState<boolean>(false);

  const filteredHistory = history.filter((record) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const matchesCompanion = record.companionName.toLowerCase().includes(term);
    const matchesMessages = record.messages.some((m) => m.text.toLowerCase().includes(term));
    return matchesCompanion || matchesMessages;
  });

  const toggleExpand = (id: string) => {
    setExpandedCallId((prev) => (prev === id ? null : id));
  };

  const handleExport = (record: CallRecord) => {
    const textData = `HeartTalk Call Transcript with ${record.companionName}\nDate: ${new Date(
      record.startTime
    ).toLocaleString()}\nDuration: ${Math.floor(record.durationSeconds / 60)}m ${
      record.durationSeconds % 60
    }s\n\n` +
      record.messages
        .map(
          (m) =>
            `[${new Date(m.timestamp).toLocaleTimeString()}] ${
              m.sender === 'user' ? 'You' : record.companionName
            }: ${m.text}`
        )
        .join('\n\n');

    const blob = new Blob([textData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HeartTalk-Transcript-${new Date(record.startTime).toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    if (mins === 0) return `${s}s`;
    return `${mins}m ${s}s`;
  };

  return (
    <div className="max-w-md mx-auto px-4 pb-28 pt-2 text-left">
      {/* Title */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/25 text-pink-300 text-xs font-medium mb-2">
          <Clock className="w-3.5 h-3.5 text-pink-400" />
          <span>Past Intimate Calls</span>
        </div>
        <h2 className="text-2xl font-bold text-white font-heading">
          Conversation History
        </h2>
        <p className="text-xs text-purple-200/70 mt-1 max-w-xs mx-auto">
          Review past audio transcripts, relive heartfelt moments, or export your memories.
        </p>
      </div>

      {/* Search Bar & Actions */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search transcripts or topics..."
            className="w-full pl-9 pr-3.5 py-2 rounded-2xl bg-purple-950/60 border border-purple-800/60 focus:border-pink-500 focus:outline-none text-white text-xs placeholder:text-purple-400/50"
          />
        </div>

        {history.length > 0 && (
          <button
            onClick={() => setShowConfirmClear(true)}
            className="p-2.5 rounded-2xl bg-purple-900/40 hover:bg-rose-900/40 border border-purple-800/60 text-purple-300 hover:text-rose-300 transition-colors cursor-pointer"
            title="Clear All History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-purple-950 border border-pink-500/30 rounded-3xl p-6 max-w-xs w-full shadow-2xl text-center">
            <Trash2 className="w-8 h-8 text-rose-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">
              Delete All History?
            </h3>
            <p className="text-xs text-purple-200/70 mb-5 leading-relaxed">
              This will permanently delete all past call recordings and transcript records on this device.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClearHistory();
                  setShowConfirmClear(false);
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Yes, Clear All
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

      {/* History List */}
      {filteredHistory.length === 0 ? (
        <div className="p-8 rounded-3xl bg-purple-950/40 border border-purple-800/30 text-center space-y-2">
          <MessageSquare className="w-8 h-8 text-pink-400/50 mx-auto" />
          <h4 className="text-sm font-semibold text-white">No Call Transcripts Yet</h4>
          <p className="text-xs text-purple-300/60 max-w-xs mx-auto">
            Once you have a voice call with your companion, the transcripts will be securely saved here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((record) => {
            const isExpanded = expandedCallId === record.id;
            const dateStr = new Date(record.startTime).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            });
            const timeStr = new Date(record.startTime).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={record.id}
                className="rounded-3xl bg-purple-950/70 border border-pink-500/15 overflow-hidden backdrop-blur-xl transition-all"
              >
                {/* Header item */}
                <div
                  onClick={() => toggleExpand(record.id)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-purple-900/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-400 p-0.5 shrink-0 flex items-center justify-center shadow-md">
                      <div className="w-full h-full rounded-2xl bg-purple-950 flex items-center justify-center">
                        <Heart className="w-4 h-4 text-pink-400 fill-pink-500" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Call with {record.companionName}</span>
                      </h4>
                      <p className="text-[11px] text-purple-300/70 mt-0.5">
                        {dateStr} at {timeStr} • {formatDuration(record.durationSeconds)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/60 text-pink-300 border border-pink-500/20">
                      {record.messages.length} turns
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-purple-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-purple-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details / Transcripts */}
                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-purple-800/30 space-y-3">
                    <div className="flex items-center justify-between pt-2 pb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400">
                        Call Transcript
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExport(record);
                        }}
                        className="text-[11px] text-purple-300 hover:text-pink-300 flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export Text</span>
                      </button>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {record.messages.map((m) => (
                        <div
                          key={m.id}
                          className={`p-2.5 rounded-2xl text-xs leading-relaxed ${
                            m.sender === 'user'
                              ? 'bg-purple-900/40 text-purple-100 ml-4 border border-purple-700/30'
                              : 'bg-pink-950/40 text-pink-100 mr-4 border border-pink-500/20'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`text-[10px] font-bold ${
                                m.sender === 'user' ? 'text-purple-400' : 'text-pink-400'
                              }`}
                            >
                              {m.sender === 'user' ? 'You' : record.companionName}
                            </span>
                            <span className="text-[9px] text-purple-400/60">
                              {new Date(m.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p>{m.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
