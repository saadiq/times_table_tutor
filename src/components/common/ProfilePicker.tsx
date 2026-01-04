import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';
import { useProfileStore } from '../../stores/profileStore';
import { useProgressStore } from '../../stores/progressStore';
import { useGardenStore } from '../../stores/gardenStore';
import { ProfileCard } from './ProfileCard';
import { ProfileCreator } from './ProfileCreator';
import type { ProfileIcon, ProfileColor } from '../../types/api';

const MAX_VISIBLE_PROFILES = 12;

export function ProfilePicker() {
  const [showCreator, setShowCreator] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const {
    profiles,
    isLoading,
    error,
    fetchProfiles,
    selectProfile,
    createProfile,
  } = useProfileStore();

  const loadProgressFromServer = useProgressStore((s) => s.loadFromServer);
  const loadGardenFromServer = useGardenStore((s) => s.loadFromServer);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleSelectProfile = async (id: string) => {
    try {
      const data = await selectProfile(id);
      loadProgressFromServer(data.facts);
      loadGardenFromServer(data.gardenItems, data.stats);
    } catch {
      // Error handled in store
    }
  };

  const handleCreateProfile = async (
    name: string,
    icon: ProfileIcon,
    color: ProfileColor
  ) => {
    try {
      await createProfile({ name, icon, color });
      // New profile starts fresh, initialize empty stores
      loadProgressFromServer([]);
      loadGardenFromServer([], {
        coins: 0,
        unlockedThemes: ['flower'],
        currentTheme: 'flower',
      });
    } catch {
      // Error handled in store
    }
  };

  const visibleProfiles = showAll
    ? profiles
    : profiles.slice(0, MAX_VISIBLE_PROFILES);
  const hasMore = profiles.length > MAX_VISIBLE_PROFILES;

  if (isLoading && profiles.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-garden-50 to-white">
        <Loader2 className="w-8 h-8 animate-spin text-garden-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-garden-50 to-white p-4">
      <AnimatePresence mode="wait">
        {showCreator ? (
          <ProfileCreator
            key="creator"
            onSubmit={handleCreateProfile}
            onCancel={() => setShowCreator(false)}
            isLoading={isLoading}
          />
        ) : (
          <motion.div
            key="picker"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Who's learning?
            </h1>
            <p className="text-gray-500 mb-8">
              Pick your profile to continue
            </p>

            {error && (
              <p className="text-red-500 mb-4 text-sm">{error}</p>
            )}

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
              {visibleProfiles.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  onClick={() => handleSelectProfile(profile.id)}
                />
              ))}

              {/* Add New Profile Button */}
              <motion.button
                onClick={() => setShowCreator(true)}
                className="flex flex-col items-center gap-2 p-4"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="w-20 h-20 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300">
                  <Plus className="w-8 h-8 text-gray-400" />
                </div>
                <span className="text-sm text-gray-500">Add</span>
              </motion.button>
            </div>

            {hasMore && !showAll && (
              <button
                onClick={() => setShowAll(true)}
                className="text-sm text-garden-600 hover:underline"
              >
                Show all ({profiles.length})
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
