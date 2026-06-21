import { GitHubUser, GitHubRepo, LanguageStat, DevData, Archetype } from '../types';

export function getArchetype(
  peakCommitHour: number,
  topLanguages: LanguageStat[],
  totalStars: number,
  publicRepos: number,
  followers: number,
  longestStreak: number
): Archetype {
  const peakHour = peakCommitHour;
  const topLang = topLanguages[0]?.language || '';

  if (peakHour >= 0 && peakHour <= 4) {
    return {
      id: 'nightowl',
      title: 'The 3AM Architect',
      emoji: '🦉',
      desc: 'Ships when the world sleeps. Debugging is meditation.',
    };
  }
  if (totalStars > 1000 && followers > 500) {
    return {
      id: 'legend',
      title: 'Open Source Legend',
      emoji: '⭐',
      desc: 'The internet runs on their code whether it knows it or not.',
    };
  }
  if (topLang.toLowerCase() === 'python' && publicRepos > 30) {
    return {
      id: 'scriptkid',
      title: 'The Automation Monk',
      emoji: '🐍',
      desc: 'If it can be scripted, it will be scripted. No exceptions.',
    };
  }
  if (topLang.toLowerCase() === 'typescript' || topLang.toLowerCase() === 'javascript') {
    return {
      id: 'jsdev',
      title: 'The Bundle Whisperer',
      emoji: '📦',
      desc: "node_modules is not a folder. It's a lifestyle.",
    };
  }
  if (publicRepos > 80) {
    return {
      id: 'shipper',
      title: 'The Relentless Shipper',
      emoji: '🚀',
      desc: 'Done is better than perfect. Always in launch mode.',
    };
  }
  if (longestStreak > 30) {
    return {
      id: 'grinder',
      title: 'The Commit Cultist',
      emoji: '🔥',
      desc: 'The streak is sacred. The streak is everything.',
    };
  }
  if (topLang.toLowerCase() === 'rust' || topLang.toLowerCase() === 'c++' || topLang.toLowerCase() === 'c') {
    return {
      id: 'systems',
      title: 'The Systems Purist',
      emoji: '⚙️',
      desc: 'Counts nanoseconds. Judges your garbage collection.',
    };
  }
  if (followers > 200 && publicRepos < 20) {
    return {
      id: 'curator',
      title: 'The Silent Curator',
      emoji: '🎯',
      desc: 'Few repos. Infinite stars. Quality over quantity.',
    };
  }

  return {
    id: 'builder',
    title: 'The Quiet Builder',
    emoji: '🏗️',
    desc: 'Head down. Code up. The work speaks for itself.',
  };
}

export interface RawEvent {
  type: string;
  created_at: string | null;
  payload?: {
    commits?: Array<{
      sha: string;
      message: string;
    }>;
  };
}

export function processGitHubData(
  user: GitHubUser,
  repos: GitHubRepo[],
  events: RawEvent[]
): DevData {
  // 1. Sum up all stargazers count
  const totalStars = repos.reduce((acc, repo) => acc + (repo.stargazers_count || 0), 0);

  // 2. Count languages
  const languageCounts: Record<string, number> = {};
  let reposWithLanguageCount = 0;
  repos.forEach((repo) => {
    if (repo.language) {
      reposWithLanguageCount++;
      languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
    }
  });

  const topLanguages: LanguageStat[] = Object.entries(languageCounts)
    .map(([language, count]) => {
      const percentage = reposWithLanguageCount > 0 ? Math.round((count / reposWithLanguageCount) * 100) : 0;
      return { language, count, percentage };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // If no languages found
  if (topLanguages.length === 0 && repos.length > 0) {
    topLanguages.push({ language: 'Markdown', count: 1, percentage: 100 });
  }

  // 3. Hour histogram (0..23)
  const hourHistogram = Array(24).fill(0);
  const activeDates = new Set<string>();

  events.forEach((event) => {
    if (event.created_at) {
      const date = new Date(event.created_at);
      if (!isNaN(date.getTime())) {
        const hour = date.getHours();
        hourHistogram[hour] += 1;

        // Extract active date for streaks
        const dateStr = date.toISOString().split('T')[0];
        activeDates.add(dateStr);
      }
    }
  });

  // Calculate peak commit hour
  let peakCommitHour = 12; // default to noon
  let maxCommits = -1;
  for (let i = 0; i < 24; i++) {
    if (hourHistogram[i] > maxCommits) {
      maxCommits = hourHistogram[i];
      peakCommitHour = i;
    }
  }

  // Calculate steaks
  const sortedDates = Array.from(activeDates).sort();

  let longestStreak = 0;
  let runningStreak = 0;
  let previousDate: Date | null = null;

  for (const dateStr of sortedDates) {
    const currentDate = new Date(dateStr);
    currentDate.setHours(12, 0, 0, 0); // normalize time to avoid dst issue

    if (previousDate === null) {
      runningStreak = 1;
    } else {
      const diffTime = Math.abs(currentDate.getTime() - previousDate.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        runningStreak++;
      } else if (diffDays > 1) {
        longestStreak = Math.max(longestStreak, runningStreak);
        runningStreak = 1;
      }
    }
    previousDate = currentDate;
  }
  longestStreak = Math.max(longestStreak, runningStreak);

  // Current streak ending today/yesterday or within last 48hr
  let currentStreak = 0;
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const hasActivityRecently = activeDates.has(todayStr) || activeDates.has(yesterdayStr);

  if (hasActivityRecently) {
    const startObj = activeDates.has(todayStr) ? today : yesterday;
    let checkDate = new Date(startObj);
    while (true) {
      const checkStr = checkDate.toISOString().split('T')[0];
      if (activeDates.has(checkStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // If active events are low, assign realistic mock streaks/peak based on public repos to prevent empty visual bars
  if (events.length === 0) {
    // Fill in plausible defaults for users with empty public event stream (e.g. no push in 90 days)
    longestStreak = Math.max(1, Math.min(15, Math.floor(user.public_repos / 4)));
    currentStreak = activeDates.size > 0 ? 1 : 0;
    // synthesize a warm peak commit hour
    hourHistogram[14] = 5;
    hourHistogram[15] = 8;
    hourHistogram[16] = 4;
    hourHistogram[19] = 7;
    hourHistogram[20] = 12;
    hourHistogram[21] = 9;
    peakCommitHour = 20;
  }

  const archetype = getArchetype(
    peakCommitHour,
    topLanguages,
    totalStars,
    user.public_repos,
    user.followers,
    longestStreak
  );

  return {
    username: user.login,
    name: user.name || user.login,
    avatarUrl: user.avatar_url,
    bio: user.bio || 'This developer prefers code over words.',
    location: user.location || 'The Web',
    company: user.company || 'Independent',
    createdAt: user.created_at,
    followers: user.followers,
    following: user.following,
    publicRepos: user.public_repos,
    totalStars,
    topLanguages,
    peakCommitHour,
    longestStreak: Math.max(longestStreak, currentStreak),
    currentStreak,
    hourHistogram,
    archetype,
  };
}

// Preset definitions so user can test gorgeous profile examples instantly
export const PRESETS = [
  {
    username: 'torvalds',
    theme: 'glacier' as const,
    label: '🐧 torvalds (Linus torvalds)',
  },
  {
    username: 'antirez',
    theme: 'void' as const,
    label: '💾 antirez (Salvatore Sanfilippo)',
  },
  {
    username: 'sindresorhus',
    theme: 'obsidian' as const,
    label: '✨ sindresorhus (Sindre Sorhus)',
  },
  {
    username: 'gaearon',
    theme: 'obsidian' as const,
    label: '⚛️ gaearon (Dan Abramov)',
  }
];
