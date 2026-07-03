import type { LucideIcon } from 'lucide-react'
import {
  Bug,
  Bird,
  Rabbit,
  Squirrel,
  Cat,
  Feather,
  Fish,
  Flower2,
  Egg,
  Leaf,
  Moon,
  Rat,
  Shell,
  Snail,
  Sparkles,
  Turtle,
  Waves,
} from 'lucide-react'
import type { CurriculumId } from '../../lib/operations'
import type { SceneVisuals } from './p5/types'
import { PALETTE, TWILIGHT_PALETTE } from './p5/colors'

export type SceneCharacter = {
  table: number
  name: string
  icon: LucideIcon
}

export type SceneTheme = {
  visuals: SceneVisuals
  characters: SceneCharacter[]
  /** One message per tier (0-4); tier 0 is never shown. */
  tierMessages: string[]
  /** "<Name> joins your <landmarkJoinText>!" in the reveal modal. */
  landmarkJoinText: string
  emptyState: { title: string; subtitle: string }
}

const MULTIPLY_THEME: SceneTheme = {
  visuals: {
    palette: PALETTE,
    animals: [
      { type: 'ladybug', scale: 1 },
      { type: 'butterfly', scale: 1.2 },
      { type: 'robin', scale: 1 },
      { type: 'squirrel', scale: 1.1 },
      { type: 'rabbit', scale: 1.2 },
      { type: 'fox', scale: 1.3 },
      { type: 'owl', scale: 1.2 },
      { type: 'deer', scale: 1.5 },
      { type: 'hedgehog', scale: 1 },
      { type: 'bluebird', scale: 0.9 },
      { type: 'badger', scale: 1.1 },
      { type: 'cat', scale: 1.2 },
    ],
  },
  characters: [
    { table: 1, name: 'Ladybug', icon: Bug },
    { table: 2, name: 'Butterfly', icon: Flower2 },
    { table: 3, name: 'Robin', icon: Bird },
    { table: 4, name: 'Squirrel', icon: Squirrel },
    { table: 5, name: 'Rabbit', icon: Rabbit },
    { table: 6, name: 'Fox', icon: Leaf },
    { table: 7, name: 'Owl', icon: Egg },
    { table: 8, name: 'Deer', icon: Fish },
    { table: 9, name: 'Hedgehog', icon: Snail },
    { table: 10, name: 'Bluebird', icon: Shell },
    { table: 11, name: 'Badger', icon: Cat },
    { table: 12, name: 'Cat', icon: Cat },
  ],
  tierMessages: [
    '',
    'Dawn breaks over your meadow!',
    'The morning sun warms your tree!',
    'Afternoon light fills the clearing!',
    'Golden hour arrives - your tree is complete!',
  ],
  landmarkJoinText: 'tree',
  emptyState: {
    title: 'Your tree is waiting to grow!',
    subtitle: 'Practice your times tables to bring it to life.',
  },
}

const DIVIDE_THEME: SceneTheme = {
  visuals: {
    palette: TWILIGHT_PALETTE,
    animals: [
      { type: 'frog', scale: 1 },
      { type: 'dragonfly', scale: 1.1 },
      { type: 'turtle', scale: 1.2 },
      { type: 'duck', scale: 1.1 },
      { type: 'mouse', scale: 0.9 },
      { type: 'raccoon', scale: 1.3 },
      { type: 'heron', scale: 1.4 },
      { type: 'otter', scale: 1.3 },
      { type: 'snail', scale: 0.9 },
      { type: 'moth', scale: 1 },
      { type: 'beaver', scale: 1.2 },
      { type: 'bat', scale: 1 },
    ],
  },
  characters: [
    { table: 1, name: 'Frog', icon: Leaf },
    { table: 2, name: 'Dragonfly', icon: Bug },
    { table: 3, name: 'Turtle', icon: Turtle },
    { table: 4, name: 'Duck', icon: Feather },
    { table: 5, name: 'Mouse', icon: Rat },
    { table: 6, name: 'Raccoon', icon: Cat },
    { table: 7, name: 'Heron', icon: Bird },
    { table: 8, name: 'Otter', icon: Fish },
    { table: 9, name: 'Snail', icon: Snail },
    { table: 10, name: 'Moth', icon: Sparkles },
    { table: 11, name: 'Beaver', icon: Waves },
    { table: 12, name: 'Bat', icon: Moon },
  ],
  tierMessages: [
    '',
    'Dusk settles over your pond!',
    'Twilight deepens - the pond glimmers!',
    'Moonlight spills across the water!',
    'Starlight! Your twilight pond is complete!',
  ],
  landmarkJoinText: 'pond',
  emptyState: {
    title: 'Your pond is waiting for dusk!',
    subtitle: 'Practice division to bring the twilight to life.',
  },
}

const THEMES: Record<CurriculumId, SceneTheme> = {
  multiply: MULTIPLY_THEME,
  divide: DIVIDE_THEME,
}

export function getSceneTheme(id: CurriculumId): SceneTheme {
  return THEMES[id]
}
