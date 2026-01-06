import * as Icons from 'lucide-react';
import type { ProfileIcon } from '../types/api';

export const iconMap: Record<ProfileIcon, React.ComponentType<{ className?: string }>> = {
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
};
