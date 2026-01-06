import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { PROFILE_ICONS, type ProfileIcon } from '../../types/api';

interface IconPickerProps {
  selected?: ProfileIcon;
  onSelect: (icon: ProfileIcon) => void;
  showLabels?: boolean;
}

const iconMap: Record<ProfileIcon, React.ComponentType<{ className?: string }>> = {
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

export { iconMap };

export function IconPicker({ selected, onSelect, showLabels = false }: IconPickerProps) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {PROFILE_ICONS.map((iconKey) => {
        const Icon = iconMap[iconKey];
        const isSelected = selected === iconKey;
        return (
          <motion.button
            key={iconKey}
            type="button"
            onClick={() => onSelect(iconKey)}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${
              isSelected
                ? 'bg-garden-100 ring-2 ring-garden-500'
                : 'hover:bg-gray-100'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Icon className={`w-8 h-8 ${isSelected ? 'text-garden-600' : 'text-gray-600'}`} />
            {showLabels && (
              <span className="text-xs text-gray-500 capitalize">{iconKey}</span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
