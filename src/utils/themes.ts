import { ThemeConfig, ThemeId } from '../types';

export const THEMES: Record<ThemeId, ThemeConfig> = {
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian',
    background: 'linear-gradient(135deg, #0a0a0f 0%, #111118 50%, #0d0d14 100%)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    accent: '#6366f1',
    textAccent: '#818cf8',
    accentGlow: 'rgba(99, 102, 241, 0.25)',
    bgGlow: 'rgba(99, 102, 241, 0.12)',
    cardBg: 'rgba(255, 255, 255, 0.03)',
  },
  void: {
    id: 'void',
    name: 'Void',
    background: 'linear-gradient(135deg, #000000 0%, #0b010d 50%, #050012 100%)',
    border: '1px solid rgba(139, 92, 246, 0.15)',
    accent: '#a855f7',
    textAccent: '#c084fc',
    accentGlow: 'rgba(168, 85, 247, 0.25)',
    bgGlow: 'rgba(168, 85, 247, 0.09)',
    cardBg: 'rgba(255, 255, 255, 0.02)',
  },
  glacier: {
    id: 'glacier',
    name: 'Glacier',
    background: 'linear-gradient(135deg, #020c14 0%, #041824 50%, #020f1a 100%)',
    border: '1px solid rgba(56, 189, 248, 0.12)',
    accent: '#38bdf8',
    textAccent: '#7dd3fc',
    accentGlow: 'rgba(56, 189, 248, 0.25)',
    bgGlow: 'rgba(56, 189, 248, 0.07)',
    cardBg: 'rgba(255, 255, 255, 0.03)',
  }
};
