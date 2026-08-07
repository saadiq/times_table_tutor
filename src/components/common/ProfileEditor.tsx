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

/**
 * Edits held across a save that bounced, so re-proving the icon costs the child
 * nothing. `icon` is absent unless they deliberately picked a new one —
 * otherwise it has to come from the icon they re-prove, never from the value
 * the server just rejected.
 */
interface HeldEdits {
  name: string;
  icon?: ProfileIcon;
  color: ProfileColor;
}

export function ProfileEditor({ onClose }: ProfileEditorProps) {
  const currentProfile = useProfileStore((s) => s.currentProfile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const [currentIcon, setCurrentIcon] = useState<ProfileIcon | null>(null);
  const [heldEdits, setHeldEdits] = useState<HeldEdits | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // False once a save has come back 401: that means currentProfile.icon (from
  // another tab/device) is stale, so gating verify against it would reject the
  // real current icon too. The server's PATCH becomes the sole judge from then on.
  const [trustLocalIcon, setTrustLocalIcon] = useState(true);
  // The pick the local gate last turned down. Tapping the same icon again means
  // "I'm sure" and hands the decision to the server.
  const [rejectedIcon, setRejectedIcon] = useState<ProfileIcon | null>(null);

  if (!currentProfile) return null;

  // Advancing is checked client-side for instant feedback; the server re-checks
  // currentIcon on the PATCH, so this is convenience, not the security boundary.
  // The second tap is the escape hatch: a cache that went stale before any save
  // could 401 would otherwise reject the child's own real icon every time, with
  // nothing able to clear trustLocalIcon because that needs a save to get through.
  const handleVerify = (icon: ProfileIcon) => {
    if (trustLocalIcon && icon !== currentProfile.icon && icon !== rejectedIcon) {
      setRejectedIcon(icon);
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
        setRejectedIcon(null);
        // Hold the edits so the detour costs nothing. The icon rides along only
        // if the child chose it; otherwise it was the one just rejected, and
        // re-submitting it would roll their password back to the stale value.
        setHeldEdits({ name, color, ...(icon === currentIcon ? {} : { icon }) });
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
    <SlideOverPanel title="Your profile" onClose={onClose}>
      {currentIcon ? (
        <ProfileEditForm
          profile={currentProfile}
          initial={{
            name: heldEdits?.name ?? currentProfile.name,
            // The icon just proved, never currentProfile.icon: once a 401 has
            // shown that cached value to be stale, re-submitting it would
            // silently reset the child's password to the old one.
            icon: heldEdits?.icon ?? currentIcon,
            color: heldEdits?.color ?? (currentProfile.color as ProfileColor),
          }}
          error={error}
          isSaving={isSaving}
          onDirty={() => setError(null)}
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
