import { PROFILE_COLORS, type ProfileColor } from '../../types/api';

interface ColorPickerProps {
  selected: ProfileColor;
  onSelect: (color: ProfileColor) => void;
}

export function ColorPicker({ selected, onSelect }: ColorPickerProps) {
  return (
    <div className="flex justify-center gap-3">
      {PROFILE_COLORS.map((colorKey) => (
        <button
          key={colorKey}
          type="button"
          aria-label={colorKey}
          onClick={() => onSelect(colorKey)}
          className={`w-10 h-10 rounded-full bg-${colorKey} ${
            selected === colorKey ? 'ring-2 ring-offset-2 ring-gray-400' : ''
          }`}
        />
      ))}
    </div>
  );
}
