import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { 
  Search, 
  Sparkles, 
  Clock, 
  Download, 
  Share2, 
  RefreshCw, 
  Compass, 
  Terminal, 
  ExternalLink,
  Github,
  Award,
  Flame,
  Star,
  Users,
  Folder,
  MapPin,
  Briefcase,
  AlertTriangle
} from 'lucide-react';
import { ThemeId, DevData } from './types';
import { THEMES } from './utils/themes';
import { PRESETS, processGitHubData } from './utils/engine';
import CardSkeleton from './components/CardSkeleton';

// Pre-loaded initial Sindre Sorhus profile to ensure zero empty state.
const DEFAULT_MOCK_DATA: DevData = {
  username: 'sindresorhus',
  name: 'Sindre Sorhus',
  avatarUrl: 'https://avatars.githubusercontent.com/u/170270?v=4',
  bio: 'Full-time open-sourcerer. Creating software that empowers developers around the globe.',
  location: 'Norway',
  company: 'Independent',
  createdAt: '2009-12-25T01:23:45Z',
  followers: 51200,
  following: 58,
  publicRepos: 1250,
  totalStars: 432800,
  topLanguages: [
    { language: 'TypeScript', count: 450, percentage: 56 },
    { language: 'JavaScript', count: 280, percentage: 31 },
    { language: 'Swift', count: 110, percentage: 13 },
  ],
  peakCommitHour: 15,
  longestStreak: 124,
  currentStreak: 14,
  hourHistogram: [
    4, 2, 1, 0, 1, 3, 5, 12, 18, 25, 32, 40, 
    45, 52, 48, 62, 59, 44, 31, 28, 20, 15, 12, 8
  ],
  archetype: {
    id: 'legend',
    title: 'Open Source Legend',
    emoji: '⭐',
    desc: 'The internet runs on their code whether it knows it or not.'
  }
};

const BLOCK_LABELS = [
  '12AM–3AM',
  '3AM–6AM',
  '6AM–9AM',
  '9AM–12PM',
  '12PM–3PM',
  '3PM–6PM',
  '6PM–9PM',
  '9PM–12AM'
];

export default function App() {
  const [usernameInput, setUsernameInput] = useState('');
  const [themeId, setThemeId] = useState<ThemeId>('obsidian');
  const [loading, setLoading] = useState(false);
  const [devData, setDevData] = useState<DevData | null>(DEFAULT_MOCK_DATA);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState('');
  
  const cardRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [cardScale, setCardScale] = useState(1);

  const activeTheme = THEMES[themeId];

  // 1. Live clock update in header
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
      
      const matches = /\(([^)]+)\)$/.exec(now.toString()) || [null, ''];
      let tz = matches[1] || '';
      if (!tz) {
        const offset = -now.getTimezoneOffset();
        const diff = offset >= 0 ? '+' : '-';
        const pad = (num: number) => String(Math.floor(Math.abs(num))).padStart(2, '0');
        tz = `GMT${diff}${pad(offset / 60)}:${pad(offset % 60)}`;
      }
      if (tz.length > 8) tz = tz.split(' ').map(w => w[0]).join('');
      setCurrentTime(`${timeStr} · ${tz}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Responsive scaling calculation for 800x460 card
  useEffect(() => {
    if (!wrapperRef.current || !devData || loading) return;
    
    const calculateScale = () => {
      if (!wrapperRef.current) return;
      const width = wrapperRef.current.offsetWidth;
      if (width < 800) {
        setCardScale(Math.max(0.35, width / 820)); // tiny margin subtraction
      } else {
        setCardScale(1);
      }
    };

    calculateScale();
    const resizeObserver = new ResizeObserver(calculateScale);
    resizeObserver.observe(wrapperRef.current);
    return () => resizeObserver.disconnect();
  }, [devData, loading]);

  // 3. Countdown timer for rate limit
  useEffect(() => {
    if (error && error.startsWith('rate_limit:')) {
      const secs = parseInt(error.split(':')[1], 10);
      setCountdown(secs);
    } else {
      setCountdown(0);
    }
  }, [error]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // 4. Toast fading timer
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(timer);
  }, [toast]);

  // 5. Read shareable link hash on page refresh/mount
  useEffect(() => {
    const parseHash = () => {
      const hash = window.location.hash;
      if (hash) {
        // format: #/username/themeId or #/username or #username
        const normalized = hash.replace(/^#\/?/, '');
        const parts = normalized.split('/');
        const parsedUser = parts[0]?.trim();
        const parsedTheme = parts[1]?.trim() as ThemeId;

        if (parsedUser) {
          setUsernameInput(parsedUser);
          if (parsedTheme && ['obsidian', 'void', 'glacier'].includes(parsedTheme)) {
            setThemeId(parsedTheme);
            triggerFetch(parsedUser, parsedTheme);
          } else {
            triggerFetch(parsedUser, themeId);
          }
        }
      }
    };

    parseHash();
  }, []);

  // Core API calling function
  const triggerFetch = async (targetUsername: string, targetTheme: ThemeId) => {
    if (!targetUsername) return;
    const cleanUser = targetUsername.trim().replace(/@/g, '');
    if (!cleanUser) return;

    setLoading(true);
    setError(null);

    try {
      // Step A: Profile
      const userRes = await fetch(`https://api.github.com/users/${cleanUser}`);
      if (userRes.status === 404) {
        setError(`not_found:${cleanUser}`);
        setLoading(false);
        return;
      }
      if (userRes.status === 403) {
        const resetHeader = userRes.headers.get('x-ratelimit-reset');
        const resetTime = resetHeader ? parseInt(resetHeader, 10) : Math.floor(Date.now() / 1000) + 60;
        const secondsLeft = Math.max(1, Math.round(resetTime - Date.now() / 1000));
        setError(`rate_limit:${secondsLeft}`);
        setLoading(false);
        return;
      }
      if (!userRes.ok) {
        throw new Error();
      }

      const userData = await userRes.json();

      // Step B: Repos
      let reposData = [];
      try {
        const reposRes = await fetch(`https://api.github.com/users/${cleanUser}/repos?per_page=100&sort=pushed`);
        if (reposRes.ok) {
          reposData = await reposRes.json();
        }
      } catch (e) {
        console.warn("Failed fetching repository details, proceeding using profile data.", e);
      }

      // Step C: Public Events
      let eventsData = [];
      try {
        const eventsRes = await fetch(`https://api.github.com/users/${cleanUser}/events/public?per_page=100`);
        if (eventsRes.ok) {
          eventsData = await eventsRes.json();
        }
      } catch (e) {
        console.warn("Failed fetching public event timelines, using baseline defaults.", e);
      }

      const processed = processGitHubData(userData, reposData, eventsData);
      setDevData(processed);
      window.location.hash = `#/${cleanUser}/${targetTheme}`;
    } catch (err) {
      console.error(err);
      setError('network');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!usernameInput.trim()) return;
    triggerFetch(usernameInput.trim(), themeId);
  };

  const selectPreset = (username: string, chosenTheme: ThemeId) => {
    setUsernameInput(username);
    setThemeId(chosenTheme);
    triggerFetch(username, chosenTheme);
  };

  // PNG Capturing
  const downloadPng = async () => {
    if (!cardRef.current || !devData) return;
    setToast('Generating HD Artifact... 🎨');

    try {
      // Create options with CORS parameters
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2.5, // Ultra-sharp retina layout export
        useCORS: true,
        allowTaint: false,
        logging: false,
      });

      canvas.toBlob((blob) => {
        if (!blob) {
          setToast('Rendering failed ❌');
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `devcard-${devData.username}-${themeId}.png`;
        link.click();
        URL.revokeObjectURL(url);
        setToast('Identity Card saved! 💾');
      }, 'image/png');
    } catch (e) {
      console.error("html2canvas export crash:", e);
      setToast('Export blocked by CORS or Network ❌');
    }
  };

  const copyShareLink = () => {
    if (!devData) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}#/${devData.username}/${themeId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setToast('Link copied! 🔗');
    }).catch(() => {
      setToast('Failed to copy ❌');
    });
  };

  const handleReset = () => {
    setUsernameInput('');
    setDevData(DEFAULT_MOCK_DATA);
    setThemeId('obsidian');
    setError(null);
    window.location.hash = '';
  };

  // Peaks block calculations
  const blocks = devData ? (() => {
    const b = Array(8).fill(0);
    for (let i = 0; i < 24; i++) {
      b[Math.floor(i / 3)] += devData.hourHistogram[i] || 0;
    }
    return b;
  })() : Array(8).fill(0);

  const maxBlockValue = Math.max(...blocks, 1);
  const peakBlockIdx = devData ? Math.floor(devData.peakCommitHour / 3) : 4;
  const peakPeriodLabel = BLOCK_LABELS[peakBlockIdx];

  const creationYear = devData ? new Date(devData.createdAt).getFullYear() : 2021;

  return (
    <div className="relative min-h-screen text-gray-100 flex flex-col justify-between overflow-x-hidden selection:bg-indigo-500/30 selection:text-white">
      {/* 3 Drift Animated Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div 
          className="absolute w-[500px] h-[500px] rounded-full filter blur-[120px] top-[-100px] left-[-100px] opacity-[0.2] transition-colors duration-1000 animate-drift-1"
          style={{ backgroundColor: activeTheme.accent }}
        />
        <div 
          className="absolute w-[400px] h-[400px] rounded-full filter blur-[100px] bottom-[-50px] right-[-50px] opacity-[0.15] transition-colors duration-1000 animate-drift-2"
          style={{ backgroundColor: activeTheme.textAccent }}
        />
        <div 
          className="absolute w-[350px] h-[350px] rounded-full filter blur-[90px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.1] transition-colors duration-1000 animate-drift-3"
          style={{ backgroundColor: activeTheme.accent }}
        />
      </div>

      {/* Top Glass Header */}
      <header className="relative z-10 w-full border-b border-white/[0.06] bg-black/30 backdrop-blur-md px-6 py-4 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md">
            <Terminal size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-mono font-bold tracking-[0.18em] text-white text-base md:text-lg flex items-center gap-1.5 uppercase">
              DEVCARD
            </h1>
            <p className="text-[10px] tracking-wider text-gray-400 font-sans hidden sm:block">
              Github identity, beautifully rendered
            </p>
          </div>
        </div>

        {/* Live clock pill */}
        <div className="flex items-center h-8.5 gap-2 px-3.5 py-1 text-xs font-mono border border-white/10 bg-white/5 rounded-full text-white/80 shadow-inner backdrop-blur-lg">
          <Clock size={12} className="text-gray-400 animate-pulse" />
          <span>{currentTime}</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-grow max-w-5xl w-full mx-auto px-4 py-8 md:py-12 flex flex-col items-center justify-center gap-10">
        
        {/* Sleek Input Glass Card */}
        <section className="w-full max-w-2xl bg-white/[0.03] border border-white/10 p-5 md:p-7 rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.5),_inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl">
          <form onSubmit={handleGenerate} className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow">
                <span className="absolute left-4.5 top-1/2 -translate-y-1/2 text-white/30 font-mono text-sm">github.com/</span>
                <input 
                  id="github-username-field"
                  type="text"
                  placeholder="username"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full pl-[105px] pr-4 py-3.5 rounded-xl border border-white/8 bg-black/40 text-sm font-mono text-white placeholder-white/30 focus:outline-none focus:border-indigo-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={handleReset}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 hover:text-white text-white/40 transition-colors text-xs font-mono"
                  title="Clear field"
                >
                  clear
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || !usernameInput.trim()}
                className="relative overflow-hidden group shrink-0 py-3.5 px-7 rounded-xl bg-gradient-to-r from-indigo-500/80 to-purple-600/70 hover:from-indigo-400 hover:to-purple-500 border border-purple-500/30 text-sm font-semibold tracking-wide shadow-[0_0_20px_rgba(99,102,241,0.25)] hover:shadow-[0_0_25px_rgba(99,102,241,0.4)] hover:scale-[1.02] active:scale-98 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-white"
              >
                {loading ? (
                  <RefreshCw size={14} className="animate-spin text-white" />
                ) : (
                  <>
                    <span>Generate</span>
                    <Sparkles size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </div>

            {/* Sub options: Theme select & Quick presets */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t border-white/5">
              
              {/* Theme Pill Buttons */}
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] uppercase tracking-widest text-white/40 font-mono">Theme:</span>
                <div id="theme-pills-row" className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                  {(['obsidian', 'void', 'glacier'] as ThemeId[]).map((id) => {
                    const isSelected = themeId === id;
                    let tAccent = '#6366f1';
                    if (id === 'void') tAccent = '#a855f7';
                    if (id === 'glacier') tAccent = '#38bdf8';

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setThemeId(id)}
                        className={`px-3 py-1 text-xs font-mono rounded-lg transition-all duration-300 capitalize ${
                          isSelected 
                            ? 'text-white font-medium bg-white/10' 
                            : 'text-white/45 hover:text-white/80'
                        }`}
                        style={{
                          borderBottom: isSelected ? `2px solid ${tAccent}` : 'none'
                        }}
                      >
                        {id}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Presets Row */}
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-[11px] uppercase tracking-widest text-white/40 font-mono">Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((p) => (
                    <button
                      key={p.username}
                      type="button"
                      onClick={() => selectPreset(p.username, p.theme)}
                      className="px-2.5 py-1 text-xs font-mono rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/10 hover:border-white/15 text-white/70 hover:text-white transition-colors"
                    >
                      {p.username}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </form>
        </section>

        {/* Dynamic Display Area (Skeleton vs Card vs Error) */}
        <section className="w-full flex justify-center items-center py-2 relative z-20">
          {loading ? (
            <CardSkeleton />
          ) : error ? (
            /* Pristine Glass Error Cards */
            <div className="w-full max-w-xl bg-white/[0.02] border border-red-500/15 p-8 rounded-2xl flex flex-col items-center text-center gap-4 shadow-2xl backdrop-blur-md">
              <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20 text-red-400">
                <AlertTriangle size={24} />
              </div>

              {error.startsWith('not_found:') ? (
                <div>
                  <h3 className="font-mono text-base text-white font-bold">DEVELOPER RETRIEVAL ERROR</h3>
                  <p className="text-gray-400 font-mono max-w-sm mt-1.5 text-xs">
                    ⚰️ <code className="text-red-400 font-bold">@{error.split(':')[1]}</code> does not exist on the GitHub registry plane. Double-check spelling.
                  </p>
                </div>
              ) : error.startsWith('rate_limit:') ? (
                <div>
                  <h3 className="font-mono text-base text-amber-400 font-bold">GITHUB RATE EXCEEDED</h3>
                  <p className="text-gray-400 font-mono max-w-sm mt-1.5 text-xs">
                    GitHub rate restrictions limit unauthenticated clients to 60 queries/hr.
                  </p>
                  <div className="mt-4 inline-block bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-xs px-3 py-1 rounded-full animate-pulse">
                    Reset sequence in <span className="font-bold">{countdown}</span> seconds
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="font-mono text-base text-white font-bold">SIGNAL INTERRUPTED</h3>
                  <p className="text-gray-400 font-mono max-w-sm mt-1.5 text-xs">
                    A network or handshake issue occurred. Please retry to negotiate connection.
                  </p>
                </div>
              )}

              <div className="flex gap-4 mt-2">
                <button
                  type="button"
                  onClick={() => triggerFetch(usernameInput.trim() || 'sindresorhus', themeId)}
                  className="px-4.5 py-2 font-mono text-xs text-white/90 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all"
                >
                  Retry Request
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4.5 py-2 font-mono text-xs text-white/50 hover:text-white/80 rounded-xl transition-all"
                >
                  Return Home
                </button>
              </div>
            </div>
          ) : devData ? (
            /* The Card Section */
            <div className="flex flex-col items-center gap-8 w-full max-w-full">
              
              {/* Outer boundary ensuring scaling on mobile */}
              <div 
                ref={wrapperRef} 
                className="w-full flex justify-center items-center overflow-visible"
                style={{ height: `${460 * cardScale}px` }}
              >
                {/* Fixed-Size Developer Identity Card */}
                <div 
                  ref={cardRef}
                  id="devcard-printable"
                  style={{ 
                    backgroundImage: activeTheme.background,
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    transform: `scale(${cardScale})`, 
                    transformOrigin: 'center center',
                    width: '800px',
                    height: '460px',
                    boxShadow: `0 40px 100px -20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 35px ${activeTheme.bgGlow}`
                  }} 
                  className="relative tracking-normal hidden md:flex flex-col justify-between rounded-[2rem] overflow-hidden shrink-0 select-none cursor-default font-sans text-gray-100 transition-all duration-1000"
                >
                  {/* Glass noise layer on top */}
                  <div 
                    className="absolute inset-0 pointer-events-none rounded-[2rem] mix-blend-overlay opacity-3 bg-repeat z-1" 
                    style={{ 
                      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
                    }}
                  />

                  {/* Corner Accent vector */}
                  <div 
                    className="absolute top-0 right-0 w-24 h-24 transition-colors duration-1000 z-10" 
                    style={{ 
                      clipPath: 'polygon(100% 0, 100% 100%, 0 0)',
                      backgroundColor: `${activeTheme.accent}15` 
                    }} 
                  />

                  {/* CARD HEADER */}
                  <div className="px-10 pt-10 flex gap-6 items-start z-10">
                    {/* Avatar Container with Glow */}
                    <div 
                      className="w-24 h-24 rounded-full p-[2.5px] transition-all duration-700 hover:scale-105 shrink-0"
                      style={{
                        backgroundImage: `linear-gradient(135deg, ${activeTheme.accent}, ${activeTheme.textAccent})`,
                        boxShadow: `0 0 20px ${activeTheme.accent}40`
                      }}
                    >
                      <div className="w-full h-full rounded-full bg-[#111118]/90 overflow-hidden flex items-center justify-center relative">
                        <img 
                          src={devData.avatarUrl} 
                          alt={devData.name} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    {/* Header details block */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h1 className="text-[28px] font-bold tracking-tight text-white leading-none font-display">
                            {devData.name}
                          </h1>
                          <p 
                            className="font-mono text-sm leading-none mt-2 underline underline-offset-4"
                            style={{ textDecorationColor: `${activeTheme.accent}40`, color: activeTheme.textAccent }}
                          >
                            @{devData.username} • {devData.location}
                          </p>
                        </div>
                        <span className="font-mono text-xs text-white/15 tracking-[0.2em] mt-2 select-none">
                          [DEVCARD v2.4]
                        </span>
                      </div>
                      <p className="text-sm text-white/50 italic mt-3 max-w-[420px] line-clamp-2 leading-relaxed">
                        "{devData.bio}"
                      </p>
                    </div>
                  </div>

                  {/* CORE ARCHETYPE ROW */}
                  <div className="mx-10 mt-4 pt-4 border-t border-white/5 flex gap-3 items-center z-10">
                    <span className="text-2xl filter drop-shadow-md select-none">{devData.archetype.emoji}</span>
                    <div>
                      <h2 
                        className="font-semibold tracking-wider text-sm uppercase font-display"
                        style={{ color: activeTheme.textAccent }}
                      >
                        {devData.archetype.title}
                      </h2>
                      <p className="text-xs text-white/40 italic mt-0.5">"{devData.archetype.desc}"</p>
                    </div>
                  </div>

                  {/* FOUR STAT BOXES */}
                  <div className="px-10 mt-6 grid grid-cols-4 gap-4 z-10">
                    {[
                      { num: devData.totalStars.toLocaleString(), label: 'Stars Earned' },
                      { num: devData.publicRepos.toLocaleString(), label: 'Public Repos' },
                      { num: devData.followers.toLocaleString(), label: 'Followers' },
                      { num: `${devData.longestStreak}d`, label: 'Max Streak' }
                    ].map((stat, i) => (
                      <div 
                        key={i} 
                        className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between hover:bg-white/[0.08] transition-colors"
                      >
                        <span 
                          className="text-2xl font-bold font-mono tracking-tight"
                          style={{ color: activeTheme.textAccent }}
                        >
                          {stat.num}
                        </span>
                        <span className="text-[10px] text-white/45 uppercase tracking-[0.15em] font-medium mt-1">
                          {stat.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* BOTTOM REPOS STATS & PEAK HOUR COLUMN CHART */}
                  <div className="px-10 mt-6 mb-8 flex justify-between items-end z-10">
                    
                    {/* Left Language Statistics */}
                    <div className="w-1/2 space-y-3">
                      {devData.topLanguages.map((item, idx) => (
                        <div key={idx} className="flex flex-col gap-1.5">
                          <div className="flex justify-between text-[11px] font-mono text-white/60 uppercase">
                            <span>{item.language}</span>
                            <span>{item.percentage}%</span>
                          </div>
                          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-1000"
                              style={{ 
                                width: `${item.percentage}%`,
                                backgroundColor: activeTheme.accent,
                                boxShadow: `0 0 10px ${activeTheme.accentGlow}`
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Right Peak Hour Chart */}
                    <div className="w-[180px]">
                      <div className="flex justify-between items-end mb-2 h-12">
                        {blocks.map((val, idx) => {
                          const isPeak = idx === peakBlockIdx;
                          const heightPct = Math.max(12, Math.round((val / maxBlockValue) * 100));
                          
                          return (
                            <div 
                              key={idx} 
                              className="w-4 rounded-t-sm transition-all duration-1000"
                              style={{ 
                                height: `${heightPct}%`,
                                backgroundColor: isPeak ? activeTheme.accent : `${activeTheme.accent}20`,
                                boxShadow: isPeak ? `0 0 15px ${activeTheme.accentGlow}` : 'none'
                              }}
                              title={`Period ${idx}`}
                            />
                          );
                        })}
                      </div>

                      <div className="flex justify-between text-[9px] text-white/30 font-mono">
                        <span>12AM</span>
                        <span className="font-bold text-[8px]" style={{ color: activeTheme.textAccent }}>
                          PEAK: {peakPeriodLabel}
                        </span>
                        <span>12PM</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Mobile UI Fallback Representation (Optimized for Portrait Views) */}
                <div 
                  className="block md:hidden w-full max-w-sm rounded-2xl overflow-hidden border p-5 relative select-none"
                  style={{
                    backgroundImage: activeTheme.background,
                    borderColor: `${activeTheme.accent}30`,
                    boxShadow: `0 12px 36px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)`
                  }}
                >
                  <div className="flex items-center gap-3.5">
                    <img 
                      src={devData.avatarUrl} 
                      alt={devData.name} 
                      className="w-[50px] h-[50px] rounded-full object-cover border"
                      style={{ borderColor: activeTheme.accent }}
                    />
                    <div>
                      <h4 className="font-bold text-white leading-normal text-sm">{devData.name}</h4>
                      <p className="text-xs font-mono text-white/40">@{devData.username}</p>
                    </div>
                  </div>

                  <div className="my-3.5 h-px bg-white/5" />
                  
                  <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex items-center gap-3">
                    <span className="text-xl">{devData.archetype.emoji}</span>
                    <div>
                      <h5 className="text-xs font-bold font-mono" style={{ color: activeTheme.textAccent }}>
                        {devData.archetype.title}
                      </h5>
                      <p className="text-[10px] text-white/40 italic mt-0.5">{devData.archetype.desc}</p>
                    </div>
                  </div>

                  <div className="my-3.5 h-px bg-white/5" />

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/[0.02] p-2 rounded-lg">
                      <span className="block text-[8px] text-white/35">STARS</span>
                      <span className="font-mono font-bold text-sm" style={{ color: activeTheme.textAccent }}>
                        ★ {devData.totalStars}
                      </span>
                    </div>
                    <div className="bg-white/[0.02] p-2 rounded-lg">
                      <span className="block text-[8px] text-white/35">REPOS</span>
                      <span className="font-mono font-bold text-sm" style={{ color: activeTheme.textAccent }}>
                        📦 {devData.publicRepos}
                      </span>
                    </div>
                    <div className="bg-white/[0.02] p-2 rounded-lg">
                      <span className="block text-[8px] text-white/35">FOLLOWERS</span>
                      <span className="font-mono font-bold text-sm" style={{ color: activeTheme.textAccent }}>
                        👥 {devData.followers}
                      </span>
                    </div>
                    <div className="bg-white/[0.02] p-2 rounded-lg">
                      <span className="block text-[8px] text-white/35">MAX STREAK</span>
                      <span className="font-mono font-bold text-sm" style={{ color: activeTheme.textAccent }}>
                        🔥 {devData.longestStreak}d
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between items-center text-[9px] font-mono text-white/30">
                    <span>Peak hours: {peakPeriodLabel}</span>
                    <span>{devData.username}.devcard</span>
                  </div>
                </div>

              </div>

              {/* ACTION CONTROL BUTTONS */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-4 relative z-30">
                <button
                  type="button"
                  onClick={downloadPng}
                  className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-medium text-xs md:text-sm shadow-md transition-all flex items-center gap-2"
                >
                  <Download size={14} style={{ color: activeTheme.accent }} />
                  <span>Download PNG Artifact</span>
                </button>

                <button
                  type="button"
                  onClick={copyShareLink}
                  className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-medium text-xs md:text-sm shadow-md transition-all flex items-center gap-2"
                >
                  <Share2 size={13} style={{ color: activeTheme.textAccent }} />
                  <span>Copy Share URL</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="px-5 py-2.5 rounded-xl text-white/50 hover:text-white font-mono text-xs md:text-sm transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw size={11} />
                  <span>Reset Canvas</span>
                </button>

                <a
                  href={`https://github.com/${devData.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl text-white/40 hover:text-white transition-colors text-xs flex items-center gap-1"
                >
                  <span>github profile</span>
                  <ExternalLink size={10} />
                </a>
              </div>

            </div>
          ) : (
            <div className="text-center font-mono opacity-40 text-sm">
              Ready to generate. Enter any public username...
            </div>
          )}
        </section>

      </main>

      {/* Floating Action Glass Toast Notification */}
      <div 
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-6 py-3 rounded-full border border-white/10 bg-black/45 backdrop-blur-xl shadow-[0_12px_44px_rgba(0,0,0,0.6)] transition-all duration-300 ${
          toast ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: activeTheme.accent }} />
        <span className="text-white text-xs font-mono font-medium tracking-wide">
          {toast}
        </span>
      </div>

      {/* Bottom Footer */}
      <footer className="relative z-10 w-full text-center py-6 text-white/20 font-mono text-[9px] border-t border-white/[0.04] bg-black/15">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>DEVCARD IDENTITY PROCESSOR // EST. 2026</span>
          <div className="flex gap-4">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white/40 flex items-center gap-1">
              <Github size={10} /> github public registry
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
