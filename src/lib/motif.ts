// Themed icons for icon-motif units. A small curated whitelist of lucide icons
// that read as a baseball/roster theme, keyed by the name used in units-2026.
// The curriculum validator checks every icon motif names one of these.
import {
  CircleDot,
  Diamond,
  Shirt,
  Shield,
  Users,
  Zap,
  Flame,
  Star,
  Target,
  Repeat,
  Sparkles,
  Crown,
  Rabbit,
  type LucideIcon,
} from 'lucide-react';

export const MOTIF_ICONS: Record<string, LucideIcon> = {
  baseball: CircleDot, // pitchers / the mound
  diamond: Diamond, // the infield diamond
  shirt: Shirt, // jersey-number themes
  shield: Shield, // catchers / the backstop
  users: Users, // a squad / cross-team group
  zap: Zap, // designated runners / speed
  flame: Flame, // the bullpen / hot arms
  star: Star, // all-stars / flagship
  target: Target, // sluggers / hitters
  repeat: Repeat, // repeating-number themes
  sparkles: Sparkles, // two-way players / rarities
  crown: Crown, // legends / veterans
  rabbit: Rabbit, // speedsters
};

export function motifIcon(name: string): LucideIcon {
  return MOTIF_ICONS[name] ?? Star;
}

export const MOTIF_ICON_NAMES = Object.keys(MOTIF_ICONS);
