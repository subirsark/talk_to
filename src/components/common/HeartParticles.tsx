import React, { useMemo } from 'react';

export const HeartParticles: React.FC = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => ({
      id: i,
      left: `${(i * 7 + 4) % 96}%`,
      animationDuration: `${12 + (i % 6) * 4}s`,
      animationDelay: `${(i % 5) * 2}s`,
      size: 10 + (i % 4) * 6,
      opacity: 0.15 + (i % 3) * 0.1,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Deep atmospheric glowing orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-28 w-80 h-80 bg-purple-700/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Floating subtle romantic hearts */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute text-pink-400 select-none animate-float"
          style={{
            left: p.left,
            bottom: '-20px',
            fontSize: `${p.size}px`,
            opacity: p.opacity,
            animationDuration: p.animationDuration,
            animationDelay: p.animationDelay,
          }}
        >
          ♥
        </span>
      ))}
    </div>
  );
};
