import { useState } from 'react';
import { Check } from 'lucide-react';
import { IconPicker } from './IconPicker';
import { ColorPicker } from './ColorPicker';
import { ProfileIcon } from './ProfileIcon';
import {
  MAX_PROFILE_NAME_LENGTH,
  type Profile,
  type ProfileColor,
  type ProfileIcon as ProfileIconName,
} from '../../types/api';

export interface ProfileEditValues {
  name: string;
  icon: ProfileIconName;
  color: ProfileColor;
}

interface ProfileEditFormProps {
  /** The server's values — the baseline for "has anything actually changed". */
  profile: Profile;
  /** What the fields open with: the child's held edits after a bounced save,
   *  and the icon they just proved rather than the possibly-stale cached one. */
  initial: ProfileEditValues;
  error: string | null;
  isSaving: boolean;
  /** Any field edit, so an error stops contradicting what is on screen. */
  onDirty: () => void;
  onSave: (name: string, icon: ProfileIconName, color: ProfileColor) => void;
  onCancel: () => void;
}

export function ProfileEditForm({
  profile,
  initial,
  error,
  isSaving,
  onDirty,
  onSave,
  onCancel,
}: ProfileEditFormProps) {
  const [name, setName] = useState(initial.name);
  const [icon, setIcon] = useState(initial.icon);
  const [color, setColor] = useState(initial.color);

  const trimmed = name.trim();
  const hasChanges =
    trimmed !== profile.name || icon !== profile.icon || color !== profile.color;
  const canSave = trimmed.length > 0 && hasChanges && !isSaving;

  return (
    <div className="space-y-6">
      {/* The icon is the password, so whatever the pickers show when this panel
          closes is what the child will try to log in with. Freezing the whole
          set while a save is in flight keeps them from trusting a value the
          server never received — the same guard IconVerify uses. */}
      <fieldset disabled={isSaving} className="space-y-6 disabled:opacity-50">
        <div className="flex justify-center">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center bg-${color}`}
          >
            <ProfileIcon icon={icon} className="w-12 h-12 text-white" />
          </div>
        </div>

        <div>
          <label htmlFor="profile-name" className="block text-sm text-gray-600 mb-2">
            Your name
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              onDirty();
            }}
            maxLength={MAX_PROFILE_NAME_LENGTH}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 text-center text-lg"
          />
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-1">Your secret icon</p>
          <p className="text-xs text-gray-400 mb-3">
            This is how you log in. Pick a new one to change it.
          </p>
          <IconPicker
            selected={icon}
            onSelect={(next) => {
              setIcon(next);
              onDirty();
            }}
          />
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-3">Your color</p>
          <ColorPicker
            selected={color}
            onSelect={(next) => {
              setColor(next);
              onDirty();
            }}
          />
        </div>
      </fieldset>

      {error && <p className="text-red-500 text-center text-sm">{error}</p>}

      <div className="space-y-3">
        <button
          onClick={() => onSave(trimmed, icon, color)}
          disabled={!canSave}
          className="w-full py-3 rounded-lg bg-garden-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSaving ? 'Saving...' : (<>Save changes <Check className="w-4 h-4" /></>)}
        </button>
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="w-full py-3 text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
