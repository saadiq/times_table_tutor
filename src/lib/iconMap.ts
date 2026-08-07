import * as Icons from 'lucide-react';
import type { ProfileIcon } from '../types/api';

type IconComponent = React.ComponentType<{ className?: string }>;

/**
 * Null-prototype, because the stored icon is user data and is looked up here
 * directly: on a plain object literal an icon of 'constructor' or 'toString'
 * would resolve up the prototype chain to something truthy that is not a
 * component, defeating every caller's `|| fallback` and throwing mid-render.
 */
export const iconMap: Record<ProfileIcon, IconComponent> = Object.assign(
  Object.create(null) as Record<ProfileIcon, IconComponent>,
  {
  // Animals
  cat: Icons.Cat,
  dog: Icons.Dog,
  rabbit: Icons.Rabbit,
  fish: Icons.Fish,
  owl: Icons.Bird,
  turtle: Icons.Turtle,
  butterfly: Icons.Bug,
  // Nature
  sun: Icons.Sun,
  moon: Icons.Moon,
  flower: Icons.Flower2,
  tree: Icons.TreeDeciduous,
  // Objects
  rocket: Icons.Rocket,
  star: Icons.Star,
  heart: Icons.Heart,
  crown: Icons.Crown,
  diamond: Icons.Diamond,
  // Fun
  rainbow: Icons.Rainbow,
  cloud: Icons.Cloud,
  lightning: Icons.Zap,
  snowflake: Icons.Snowflake,
  }
);
