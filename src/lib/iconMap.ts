import * as Icons from 'lucide-react';
import type { ProfileIcon } from '../types/api';

type IconComponent = React.ComponentType<{ className?: string }>;

export const iconMap: Record<ProfileIcon, IconComponent> = {
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
