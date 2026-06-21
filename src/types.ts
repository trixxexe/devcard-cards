export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  bio: string | null;
  twitter_username: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  stargazers_count: number;
  language: string | null;
  forks_count: number;
}

export interface LanguageStat {
  language: string;
  count: number;
  percentage: number;
}

export interface Archetype {
  id: string;
  title: string;
  emoji: string;
  desc: string;
}

export interface DevData {
  username: string;
  name: string;
  avatarUrl: string;
  bio: string;
  location: string;
  company: string;
  createdAt: string;
  followers: number;
  following: number;
  publicRepos: number;
  totalStars: number;
  topLanguages: LanguageStat[];
  peakCommitHour: number;
  longestStreak: number;
  currentStreak: number;
  hourHistogram: number[];
  archetype: Archetype;
}

export type ThemeId = 'obsidian' | 'void' | 'glacier';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  background: string;
  border: string;
  accent: string;
  textAccent: string;
  accentGlow: string;
  bgGlow: string;
  cardBg: string;
}
