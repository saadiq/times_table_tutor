import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { IconPicker } from './IconPicker';
import type { ProfileIcon, ProfileListItem } from '../../types/api';

interface IconVerifyProps {
  profile: ProfileListItem;
  onVerify: (icon: ProfileIcon) => void;
  onCancel: () => void;
  error: string | null;
  isLoading: boolean;
}

export function IconVerify({ profile, onVerify, onCancel, error, isLoading }: IconVerifyProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl p-6 shadow-lg max-w-md w-full mx-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onCancel}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full"
          disabled={isLoading}
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            Hi {profile.name}!
          </h2>
          <p className="text-gray-500 text-sm">Pick your icon to log in</p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-red-500 text-center mb-4 font-medium"
        >
          {error}
        </motion.p>
      )}

      {/* Icon grid */}
      <div className={isLoading ? 'opacity-50 pointer-events-none' : ''}>
        <IconPicker onSelect={onVerify} />
      </div>

      {/* Back link */}
      <button
        onClick={onCancel}
        className="mt-6 w-full text-center text-sm text-gray-500 hover:text-gray-700"
        disabled={isLoading}
      >
        Not {profile.name}? Go back
      </button>
    </motion.div>
  );
}
