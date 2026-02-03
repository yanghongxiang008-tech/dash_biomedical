import React, { useEffect, useState, useCallback } from 'react';

interface EntryAnimationProps {
  onComplete: () => void;
}

const EntryAnimation: React.FC<EntryAnimationProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'intro' | 'reveal' | 'glow' | 'hold'>('intro');

  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    // Phase 1: Logo appears with scale
    const timer1 = setTimeout(() => {
      setPhase('reveal');
    }, 600);

    // Phase 2: Text reveals
    const timer2 = setTimeout(() => {
      setPhase('glow');
    }, 1400);

    // Phase 3: Hold for a moment, then complete
    const timer3 = setTimeout(() => {
      setPhase('hold');
    }, 2400);

    // Complete - parent handles the fade out
    const timer4 = setTimeout(() => {
      handleComplete();
    }, 2800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [handleComplete]);

  return (
    <div className="absolute inset-0 bg-background overflow-hidden flex items-center justify-center">
      {/* Cinematic background effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Subtle radial gradient */}
        <div
          className="absolute inset-0 transition-opacity duration-1000"
          style={{
            background: 'radial-gradient(circle at center, hsl(var(--primary) / 0.03) 0%, transparent 70%)',
            opacity: phase === 'glow' || phase === 'hold' ? 1 : 0,
          }}
        />
        {/* Animated light rays */}
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, hsl(var(--primary) / 0.02) 60deg, transparent 120deg, hsl(var(--primary) / 0.02) 180deg, transparent 240deg, hsl(var(--primary) / 0.02) 300deg, transparent 360deg)',
            opacity: phase === 'glow' ? 1 : 0,
            animation: phase === 'glow' ? 'slowRotate 8s linear infinite' : 'none',
          }}
        />
      </div>

      {/* Logo and text container - horizontal layout matching onboarding */}
      <div
        className="relative flex items-center gap-3"
        style={{
          opacity: phase === 'intro' ? 0 : 1,
          transform: phase === 'intro' ? 'scale(0.9)' : 'scale(1)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Icon */}
        <div className="relative">
          {/* Glow behind icon */}
          <div
            className="absolute inset-0 rounded-full transition-all duration-700"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
              transform: 'scale(3)',
              opacity: phase === 'glow' ? 0.8 : 0,
              filter: 'blur(20px)',
            }}
          />
          <div
            className="relative w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg"
            style={{
              filter: phase === 'glow' ? 'brightness(1.1)' : 'brightness(1)',
              transition: 'filter 0.5s ease',
            }}
          >
            AI
          </div>
        </div>

        {/* Text - exactly matching onboarding: text-3xl, tracking-tight, font-normal, Georgia */}
        <h1
          className="text-3xl tracking-tight font-normal"

        >
          {'Biomedical'.split('').map((letter, i) => (
            <span
              key={i}
              className="inline-block"
              style={{
                opacity: phase === 'intro' ? 0 : 1,
                transform: phase === 'intro' || (phase === 'reveal' && i > 0)
                  ? 'translateY(15px)'
                  : 'translateY(0)',
                transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${0.3 + i * 0.04}s`,
              }}
            >
              {letter}
            </span>
          ))}
        </h1>
      </div>

      <style>{`
        @keyframes slowRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default EntryAnimation;