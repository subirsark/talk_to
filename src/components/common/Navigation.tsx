import React from 'react';
import { PhoneCall, Users, Clock, Brain, SlidersHorizontal } from 'lucide-react';
import { ScreenType } from '../../types';

interface NavigationProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  isInCall: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentScreen,
  onNavigate,
  isInCall,
}) => {
  // During an active full-screen voice call, the bottom navigation hides so the user has the immersive calling UI
  if (isInCall && currentScreen === 'call') {
    return null;
  }

  const navItems: { id: ScreenType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'call', label: 'Call', icon: PhoneCall },
    { id: 'avatars', label: 'Avatars', icon: Users },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'memories', label: 'Memories', icon: Brain },
    { id: 'setup', label: 'Settings', icon: SlidersHorizontal },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 pointer-events-auto">
      <div className="max-w-md mx-auto px-4 pb-4 pt-2">
        <div className="bg-purple-950/80 backdrop-blur-2xl border border-pink-500/20 rounded-3xl p-1.5 shadow-2xl shadow-pink-950/60 flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            const isCallTab = item.id === 'call';

            if (isCallTab) {
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate('call')}
                  className="relative -top-3 flex flex-col items-center group cursor-pointer focus:outline-none"
                >
                  <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-pink-600 via-rose-500 to-fuchsia-500 p-0.5 shadow-lg shadow-pink-600/40 group-hover:scale-105 active:scale-95 transition-all flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-gradient-to-b from-pink-500 to-rose-600 flex items-center justify-center text-white">
                      <PhoneCall className="w-6 h-6 animate-pulse" />
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-pink-300 mt-1 tracking-wide">
                    Live Call
                  </span>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all cursor-pointer focus:outline-none ${
                  isActive
                    ? 'text-pink-300 bg-pink-500/15 font-medium'
                    : 'text-purple-300/60 hover:text-pink-200/90 hover:bg-purple-900/20'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-pink-400' : ''}`} />
                <span className="text-[10px] mt-1 font-medium">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
