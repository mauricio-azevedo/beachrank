import {
  CalendarCheck,
  Crown,
  Flame,
  Medal,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import type { HighlightType } from '@/features/weekly-highlights/types/weekly-highlight.type';

type HighlightStyle = {
  icon: LucideIcon;
  color: string;
  bg: string;
};

// Per-achievement accent palette (the one place we carry a multi-hue accent set —
// the semantic tokens cover green/red, the rest are the highlight palette).
const STYLES: Record<HighlightType, HighlightStyle> = {
  WIN_STREAK_CURRENT: { icon: Flame, color: '#f0a020', bg: 'rgba(240,160,32,0.14)' },
  WIN_STREAK_RECORD: { icon: Flame, color: '#f0a020', bg: 'rgba(240,160,32,0.14)' },
  CLIMB: { icon: TrendingUp, color: '#34c759', bg: 'rgba(52,199,89,0.14)' },
  LEADERSHIP: { icon: Crown, color: '#e0b54a', bg: 'rgba(224,181,74,0.16)' },
  MILESTONE_MATCHES: { icon: CalendarCheck, color: '#3b9dd9', bg: 'rgba(59,157,217,0.16)' },
  MILESTONE_WINS: { icon: Medal, color: '#7aa2f0', bg: 'rgba(122,162,240,0.16)' },
};

export function highlightStyle(type: HighlightType): HighlightStyle {
  return STYLES[type];
}

