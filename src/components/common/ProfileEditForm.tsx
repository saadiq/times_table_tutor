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

interface ProfileEditFormProps {
  profile: Profile;
  error: string | null;
  isSaving: boolean;
  onSave: (name: string, icon: ProfileIconName, color: ProfileColor) => void;
  onCancel: () => void;
}

export function ProfileEditForm({
  profile,
  error,
  isSaving,
  onSave,
  onCancel,
}: ProfileEditFormProps) {
  const [name, setName] = useState(profile.name);
  const [icon, setIcon] = useState(profile.icon as ProfileIconName);
  const [color, setColor] = useState(profile.color as ProfileColor);

  const trimmed = name.trim();
  const hasChanges =
    trimmed !== profile.name || icon !== profile.icon || color !== profile.color;
  const canSave = trimmed.length > 0 && hasChanges && !isSaving;

  return (
    <div className="space-y-6">
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
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_PROFILE_NAME_LENGTH}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 text-center text-lg"
        />
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-1">Your secret icon</p>
        <p className="text-xs text-gray-400 mb-3">
          This is how you log in. Pick a new one to change it.
        </p>
        <IconPicker selected={icon} onSelect={setIcon} />
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-3">Your color</p>
        <ColorPicker selected={color} onSelect={setColor} />
      </div>

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
