/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CallMessage, CallRecord, Companion, Memory, ScreenType, UserPreferences } from './types';
import { storage } from './services/storage';
import { Header } from './components/common/Header';
import { Navigation } from './components/common/Navigation';
import { HeartParticles } from './components/common/HeartParticles';
import { WelcomeScreen } from './components/screens/WelcomeScreen';
import { LiveVoiceCallScreen } from './components/screens/LiveVoiceCallScreen';
import { AvatarGalleryScreen } from './components/screens/AvatarGalleryScreen';
import { SetupScreen } from './components/screens/SetupScreen';
import { ConversationHistoryScreen } from './components/screens/ConversationHistoryScreen';
import { MemoryPrivacyScreen } from './components/screens/MemoryPrivacyScreen';
import { ApiSetupScreen } from './components/screens/ApiSetupScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('welcome');
  const [preferences, setPreferences] = useState<UserPreferences>(storage.getPreferences());
  const [companions, setCompanions] = useState<Companion[]>(storage.getCompanions());
  const [memories, setMemories] = useState<Memory[]>(storage.getMemories());
  const [callHistory, setCallHistory] = useState<CallRecord[]>(storage.getCallHistory());
  const [isLiveEngine, setIsLiveEngine] = useState<boolean>(false);
  const [callSummaryModal, setCallSummaryModal] = useState<{
    duration: number;
    messages: CallMessage[];
    companionName: string;
  } | null>(null);

  // Check backend engine status on launch
  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        setIsLiveEngine(Boolean(data.hasApiKey && data.features?.liveSpeechToSpeech));
      })
      .catch(() => {
        setIsLiveEngine(false);
      });
  }, []);

  const activeCompanion =
    companions.find((c) => c.id === preferences.selectedCompanionId) || companions[0];

  const handleUpdatePreferences = (updates: Partial<UserPreferences>) => {
    const updated = { ...preferences, ...updates };
    setPreferences(updated);
    storage.savePreferences(updated);
  };

  const handleSelectCompanion = (id: string) => {
    handleUpdatePreferences({ selectedCompanionId: id });
  };

  const handleCustomizeCompanion = (companionId: string, updates: Partial<Companion>) => {
    storage.saveCompanionCustomization(companionId, updates);
    setCompanions(storage.getCompanions());
  };

  const handleStartCall = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setCurrentScreen('call');
  };

  const handleEndCall = (durationSeconds: number, messages: CallMessage[]) => {
    if (messages.length > 0 || durationSeconds > 3) {
      const newRecord: CallRecord = {
        id: `call-${Date.now()}`,
        startTime: Date.now() - durationSeconds * 1000,
        endTime: Date.now(),
        durationSeconds,
        companionId: activeCompanion.id,
        companionName: activeCompanion.name,
        messages,
      };
      storage.saveCallRecord(newRecord);
      setCallHistory(storage.getCallHistory());

      // Show call summary
      setCallSummaryModal({
        duration: durationSeconds,
        messages,
        companionName: activeCompanion.name,
      });
    }

    setCurrentScreen('welcome');
  };

  const handleProposeMemory = (text: string) => {
    const created = storage.addMemory(text, 'preference');
    setMemories(storage.getMemories());
  };

  const handleAddMemory = (text: string, category: Memory['category']) => {
    storage.addMemory(text, category);
    setMemories(storage.getMemories());
  };

  const handleUpdateMemory = (id: string, text: string) => {
    storage.updateMemory(id, text);
    setMemories(storage.getMemories());
  };

  const handleDeleteMemory = (id: string) => {
    storage.deleteMemory(id);
    setMemories(storage.getMemories());
  };

  const handleClearAllMemories = () => {
    storage.clearAllMemories();
    setMemories([]);
  };

  const handleClearHistory = () => {
    storage.clearCallHistory();
    setCallHistory([]);
  };

  return (
    <div className="relative min-h-screen bg-[#0d0614] text-[#fce7f3] flex flex-col font-sans selection:bg-pink-500 selection:text-white">
      {/* Romantic Ambient Particles & Gradients */}
      <HeartParticles />

      {/* Top Header */}
      <Header
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        activeCompanion={activeCompanion}
        isLiveEngine={isLiveEngine}
        isInCall={currentScreen === 'call'}
      />

      {/* Main View Area */}
      <main className="relative z-10 flex-1 flex flex-col">
        {currentScreen === 'welcome' && (
          <WelcomeScreen
            companion={activeCompanion}
            preferences={preferences}
            onStartCall={handleStartCall}
            onNavigate={setCurrentScreen}
            onUpdatePreferences={handleUpdatePreferences}
          />
        )}

        {currentScreen === 'call' && (
          <LiveVoiceCallScreen
            companion={activeCompanion}
            preferences={preferences}
            onEndCall={handleEndCall}
            onProposeMemory={handleProposeMemory}
          />
        )}

        {currentScreen === 'avatars' && (
          <AvatarGalleryScreen
            companions={companions}
            selectedCompanionId={preferences.selectedCompanionId}
            preferences={preferences}
            onSelectCompanion={handleSelectCompanion}
            onCustomizeCompanion={handleCustomizeCompanion}
            onStartCall={handleStartCall}
          />
        )}

        {currentScreen === 'setup' && (
          <SetupScreen
            preferences={preferences}
            activeCompanion={activeCompanion}
            onUpdatePreferences={handleUpdatePreferences}
            onUpdateCompanion={(updates) => handleCustomizeCompanion(activeCompanion.id, updates)}
          />
        )}

        {currentScreen === 'history' && (
          <ConversationHistoryScreen
            history={callHistory}
            onClearHistory={handleClearHistory}
          />
        )}

        {currentScreen === 'memories' && (
          <MemoryPrivacyScreen
            memories={memories}
            preferences={preferences}
            onAddMemory={handleAddMemory}
            onUpdateMemory={handleUpdateMemory}
            onDeleteMemory={handleDeleteMemory}
            onClearAllMemories={handleClearAllMemories}
            onUpdatePreferences={handleUpdatePreferences}
          />
        )}

        {currentScreen === 'api' && <ApiSetupScreen />}
      </main>

      {/* Bottom Mobile Tab Bar */}
      <Navigation
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        isInCall={currentScreen === 'call'}
      />

      {/* Post-Call Summary Modal */}
      {callSummaryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-purple-950 border border-pink-500/30 rounded-3xl p-6 max-w-xs w-full shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-pink-500/20 mx-auto flex items-center justify-center border border-pink-400/40">
              <span className="text-2xl">💖</span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white font-heading">
                Call Completed
              </h3>
              <p className="text-xs text-pink-300 mt-0.5">
                with {callSummaryModal.companionName} • {Math.floor(callSummaryModal.duration / 60)}m {callSummaryModal.duration % 60}s
              </p>
            </div>

            <p className="text-xs text-purple-200/80 leading-relaxed">
              Your conversation was securely logged. You can review the full transcript in your History tab.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  setCallSummaryModal(null);
                  setCurrentScreen('history');
                }}
                className="flex-1 py-2.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-pink-200 text-xs font-semibold border border-purple-700/50 cursor-pointer"
              >
                View History
              </button>
              <button
                onClick={() => setCallSummaryModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold shadow-lg shadow-pink-600/30 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
