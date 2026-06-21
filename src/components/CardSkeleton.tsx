import React, { useEffect, useState } from 'react';

export default function CardSkeleton() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const intervals = [
      setTimeout(() => setStep(1), 600),
      setTimeout(() => setStep(2), 1500),
      setTimeout(() => setStep(3), 2600),
    ];
    return () => intervals.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-6 w-full max-w-full overflow-hidden">
      {/* 800x460 Skeleton Container */}
      <div 
        id="devcard-skeleton"
        className="relative w-[800px] h-[460px] rounded-3xl overflow-hidden border border-white/5 bg-gradient-to-br from-[#0c0c14]/90 to-[#06060c]/90 p-8 flex flex-col justify-between shadow-2xl backdrop-blur-md"
      >
        {/* Shimmer overlay animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -inset-y-20 -inset-x-40 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent w-[300px] skew-x-12 animate-[shimmer_2s_infinite]" 
            style={{
              animationName: 'shimmer',
              animationDuration: '2s',
              animationIterationCount: 'infinite',
              animationTimingFunction: 'linear'
            }}
          />
        </div>

        {/* Style tag inject for skeleton specific animation */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes shimmer {
            0% { transform: translateX(-150%) skewX(-15deg); }
            100% { transform: translateX(250%) skewX(-15deg); }
          }
        `}} />

        {/* Header section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            {/* Avatar circle skeleton */}
            <div className="relative">
              <div className="w-[80px] h-[80px] rounded-full bg-white/5 border border-white/10 animate-pulse" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white/10 border border-black animate-pulse" />
            </div>

            {/* User name/handle skeletons */}
            <div className="space-y-2.5">
              <div className="h-6 w-44 bg-white/10 rounded-md animate-pulse" />
              <div className="h-4 w-28 bg-white/5 rounded-md animate-pulse" />
              <div className="h-3 w-56 bg-white/5 rounded-md opacity-70 animate-pulse" />
            </div>
          </div>

          <div className="h-4 w-20 bg-white/10 rounded-md animate-pulse" />
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-white/5" />

        {/* Archetype segment */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-white/10 animate-pulse" />
            <div className="h-5 w-48 bg-white/15 rounded-md animate-pulse" />
          </div>
          <div className="h-4 w-96 bg-white/5 rounded-md animate-pulse" />
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-white/5" />

        {/* Stat Blocks */}
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-1.5 h-16 animate-pulse">
              <div className="h-5 w-12 bg-white/10 rounded-md" />
              <div className="h-3 w-16 bg-white/5 rounded" />
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-2 gap-8 items-center pt-2">
          {/* Left: Languages */}
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <div className="h-3 w-16 bg-white/5 rounded" />
                  <div className="h-3 w-8 bg-white/5 rounded" />
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-white/10 rounded-full animate-pulse" style={{ width: `${80 - i * 20}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Right: Peak chart */}
          <div className="flex justify-between items-end h-16 px-4">
            {[40, 60, 30, 80, 50, 90, 45, 70].map((h, i) => (
              <div 
                key={i} 
                className="w-5.5 bg-white/5 rounded-t-sm animate-pulse" 
                style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Progress logs below card */}
      <div className="mt-8 flex flex-col items-center space-y-2 text-sm text-gray-400 font-mono">
        <div className="flex items-center gap-2 transition-all duration-300">
          <span className={`inline-block w-2 h-2 rounded-full ${step >= 0 ? 'bg-indigo-500 animate-ping' : 'bg-white/10'}`} />
          <span className={step >= 0 ? 'text-white/90 font-medium' : 'text-white/40'}>
            ⚡ Fetching developer profile data...
          </span>
        </div>
        <div className={`flex items-center gap-2 transition-all duration-300 ${step >= 1 ? 'opacity-100' : 'opacity-20'}`}>
          <span className={`inline-block w-2 h-2 rounded-full ${step >= 1 ? 'bg-purple-500 animate-ping' : 'bg-white/10'}`} />
          <span className={step >= 1 ? 'text-white/90 font-medium' : 'text-white/40'}>
            🔮 Scanning commits & analyzing archetype...
          </span>
        </div>
        <div className={`flex items-center gap-2 transition-all duration-300 ${step >= 2 ? 'opacity-100' : 'opacity-20'}`}>
          <span className={`inline-block w-2 h-2 rounded-full ${step >= 2 ? 'bg-cyan-500 animate-ping' : 'bg-white/10'}`} />
          <span className={step >= 2 ? 'text-white/90 font-medium' : 'text-white/40'}>
            🎨 Injecting design theme coefficients...
          </span>
        </div>
        <div className={`flex items-center gap-2 transition-all duration-300 ${step >= 3 ? 'opacity-100' : 'opacity-20'}`}>
          <span className="text-emerald-400 font-medium animate-pulse">
            ✓ Rendering devcard vector space
          </span>
        </div>
      </div>
    </div>
  );
}
