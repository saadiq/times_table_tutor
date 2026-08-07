import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { IconPicker } from './IconPicker';
import { ProfileEditForm } from './ProfileEditForm';
import { useProfileStore } from '../../stores/profileStore';
import { ApiError } from '../../lib/api';
import type { ProfileColor, ProfileIcon } from '../../types/api';

const WRONG_ICON = "That's not your icon. Try again!";

interface ProfileEditorProps {
  onClose: () => void;
}

export function ProfileEditor({ onClose }: ProfileEditorProps) {
  const currentProfile = useProfileStore((s) => s.currentProfile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const [currentIcon, setCurrentIcon] = useState<ProfileIcon | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // False once a save has come back 401: that means currentProfile.icon (from
  // another tab/device) is stale, so gating verify against it would reject the
  // real current icon too. The server's PATCH becomes the sole judge from then on.
  const [trustLocalIcon, setTrustLocalIcon] = useState(true);

  if (!currentProfile) return null;

  // Advancing is checked client-side for instant feedback; the server re-checks
  // currentIcon on the PATCH, so this is convenience, not the security boundary.
  const handleVerify = (icon: ProfileIcon) => {
    if (trustLocalIcon && icon !== currentProfile.icon) {
      setError(WRONG_ICON);
      return;
    }
    setCurrentIcon(icon);
    setError(null);
  };

  const handleSave = async (name: string, icon: ProfileIcon, color: ProfileColor) => {
    if (!currentIcon) return;
    setIsSaving(true);
    setError(null);
    try {
      await updateProfile({ currentIcon, name, icon, color });
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // The icon changed under us — send them back to prove the new one.
        // Our cached currentProfile.icon is now known-stale, so stop
        // arbitrating verify picks against it locally — every pick would be
        // compared to the wrong value, rejecting the one icon that's actually
        // correct. Let the server's PATCH be the judge instead.
        setTrustLocalIcon(false);
        setCurrentIcon(null);
        setError(WRONG_ICON);
      } else if (err instanceof ApiError && err.status === 409) {
        setError('That name is already taken!');
      } else {
        setError("Couldn't save that. Try again!");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-[var(--color-cream)] z-50 flex flex-col"
    >
      <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-white">
        <button
          onClick={onClose}
          disabled={isSaving}
          className="p-2 -ml-2 rounded-xl hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-garden-500 transition-colors disabled:opacity-50"
          aria-label="Go back"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">Your profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-12">
        {currentIcon ? (
          <ProfileEditForm
            profile={currentProfile}
            error={error}
            isSaving={isSaving}
            onSave={handleSave}
            onCancel={onClose}
          />
        ) : (
          <div>
            <p className="text-gray-600 text-center mb-1">Pick your icon to make changes</p>
            <p className="text-gray-400 text-sm text-center mb-4">
              The one you use to log in
            </p>
            {error && <p className="text-red-500 text-center text-sm mb-4">{error}</p>}
            <IconPicker onSelect={handleVerify} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
