import React from 'react';
import { Heart, Sparkles, Shield, Wifi, WifiOff } from 'lucide-react';
import { Companion, ScreenType } from '../../types';

interface HeaderProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  activeCompanion: Companion;
  isLiveEngine: boolean;
  isInCall: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  activeCompanion,
  isLiveEngine,
  isInCall,
}) => {
  return (
    <header className="relative z-20 w-full max-w-md mx-auto px-4 py-3 flex items-center justify-between border-b border-pink-900/30 bg-purple-950/40 backdrop-blur-xl">
      {/* Brand logo & tagline */}
      <button
        onClick={() => onNavigate('welcome')}
        className="flex items-center gap-2 group text-left cursor-pointer focus:outline-none"
      >
        <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-pink-600 to-rose-400 p-0.5 flex items-center justify-center shadow-lg shadow-pink-500/20 group-hover:scale-105 transition-transform">
          <div className="w-full h-full rounded-full bg-purple-950 flex items-center justify-center">
            <Heart className="w-4 h-4 text-pink-400 fill-pink-500 animate-pulse" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold tracking-tight text-white font-heading">
              Heart<span className="text-pink-400">Talk</span>
            </span>
          </div>
          <span className="text-[10px] text-pink-300/70 font-medium block -mt-1 tracking-wider uppercase">
            Virtual Companion
          </span>
        </div>
      </button>

      {/* Right controls: Active companion thumb & engine badge */}
      <div className="flex items-center gap-2">
        {/* Engine status indicator */}
        <button
          onClick={() => onNavigate('api')}
          title={isLiveEngine ? 'Connected to Gemini Live Voice Engine' : 'Running in Interactive Demo Mode'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border backdrop-blur-md transition-all cursor-pointer ${
            isLiveEngine
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:border-emerald-400/50'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-300 hover:border-rose-400/50'
          }`}
        >
          {isLiveEngine ? (
            <>
              <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">Live AI</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 text-rose-400" />
              <span>Demo Mode</span>
            </>
          )}
        </button>

        {/* Companion Avatar Quick Switcher */}
        {!isInCall && (
          <button
            onClick={() => onNavigate('avatars')}
            className="flex items-center gap-1.5 p-1 pl-1.5 pr-2.5 rounded-full bg-purple-900/40 border border-pink-500/30 hover:border-pink-400/60 transition-all cursor-pointer"
          >
            <img
              src={activeCompanion.avatarUrl}
              alt={activeCompanion.name}
              className="w-6 h-6 rounded-full object-cover border border-pink-400/50"
            />
            <span className="text-xs font-medium text-pink-200">
              {activeCompanion.name}
            </span>
          </button>
        )}
      </div>
    </header>
  );
};
