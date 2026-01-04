import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import type { ProfileSummary, ProfileIcon } from '../../types/api';

interface ProfileCardProps {
  profile: ProfileSummary;
  onClick: () => void;
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

export function ProfileCard({ profile, onClick }: ProfileCardProps) {
  const IconComponent = iconMap[profile.icon as ProfileIcon] || Icons.User;

  return (
    <motion.button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div
        className={`w-20 h-20 rounded-full flex items-center justify-center bg-${profile.color}`}
      >
        <IconComponent className="w-10 h-10 text-white" />
      </div>
      <span className="text-sm font-medium text-gray-700 truncate max-w-[80px]">
        {profile.name}
      </span>
    </motion.button>
  );
}
