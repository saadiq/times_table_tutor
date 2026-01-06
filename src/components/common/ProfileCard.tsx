import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import type { ProfileListItem } from '../../types/api';

interface ProfileCardProps {
  profile: ProfileListItem;
  onClick: () => void;
}

export function ProfileCard({ profile, onClick }: ProfileCardProps) {
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
        <User className="w-10 h-10 text-white opacity-50" />
      </div>
      <span className="text-sm font-medium text-gray-700 truncate max-w-[80px]">
        {profile.name}
      </span>
    </motion.button>
  );
}
