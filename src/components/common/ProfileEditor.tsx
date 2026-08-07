import { useState } from 'react';
import { IconPicker } from './IconPicker';
import { ProfileEditForm } from './ProfileEditForm';
import { SlideOverPanel } from './SlideOverPanel';
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
    <SlideOverPanel title="Your profile" onClose={onClose} backDisabled={isSaving}>
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
    </SlideOverPanel>
  );
}
