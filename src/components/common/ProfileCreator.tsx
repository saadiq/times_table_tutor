import { useState } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { PROFILE_ICONS, PROFILE_COLORS, type ProfileIcon, type ProfileColor } from '../../types/api';

interface ProfileCreatorProps {
  onSubmit: (name: string, icon: ProfileIcon, color: ProfileColor) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const iconMap: Record<ProfileIcon, React.ComponentType<{ className?: string }>> = {
  cat: Icons.Cat,
  dog: Icons.Dog,
  bird: Icons.Bird,
  star: Icons.Star,
  heart: Icons.Heart,
  flower: Icons.Flower2,
  rocket: Icons.Rocket,
  sun: Icons.Sun,
  moon: Icons.Moon,
  fish: Icons.Fish,
  rabbit: Icons.Rabbit,
  bear: Icons.PawPrint,
};

export function ProfileCreator({ onSubmit, onCancel, isLoading }: ProfileCreatorProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<ProfileIcon>('star');
  const [color, setColor] = useState<ProfileColor>('garden-500');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim(), icon, color);
    }
  };

  const IconComponent = iconMap[icon];

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 shadow-lg max-w-sm w-full mx-4"
      onSubmit={handleSubmit}
    >
      <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
        New Profile
      </h2>

      {/* Preview */}
      <div className="flex justify-center mb-6">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center bg-${color}`}>
          <IconComponent className="w-12 h-12 text-white" />
        </div>
      </div>

      {/* Name Input */}
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="w-full px-4 py-3 rounded-lg border border-gray-200 mb-4 text-center text-lg"
        maxLength={20}
        autoFocus
      />

      {/* Icon Selection */}
      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-2 text-center">Pick an icon</p>
        <div className="grid grid-cols-6 gap-2">
          {PROFILE_ICONS.map((iconKey) => {
            const Icon = iconMap[iconKey];
            return (
              <button
                key={iconKey}
                type="button"
                onClick={() => setIcon(iconKey)}
                className={`p-2 rounded-lg ${
                  icon === iconKey ? 'bg-gray-200' : 'hover:bg-gray-100'
                }`}
              >
                <Icon className="w-6 h-6 text-gray-600" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Selection */}
      <div className="mb-6">
        <p className="text-sm text-gray-500 mb-2 text-center">Pick a color</p>
        <div className="flex justify-center gap-2">
          {PROFILE_COLORS.map((colorKey) => (
            <button
              key={colorKey}
              type="button"
              onClick={() => setColor(colorKey)}
              className={`w-8 h-8 rounded-full bg-${colorKey} ${
                color === colorKey ? 'ring-2 ring-offset-2 ring-gray-400' : ''
              }`}
            />
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-lg border border-gray-200 text-gray-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim() || isLoading}
          className="flex-1 py-3 rounded-lg bg-garden-500 text-white font-medium disabled:opacity-50"
        >
          {isLoading ? 'Creating...' : 'Start Learning'}
        </button>
      </div>
    </motion.form>
  );
}
