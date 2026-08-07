import { PROFILE_COLORS, type ProfileColor } from '../../types/api';

interface ColorPickerProps {
  selected: ProfileColor;
  onSelect: (color: ProfileColor) => void;
}

export function ColorPicker({ selected, onSelect }: ColorPickerProps) {
  return (
    // Wrapping, and shrink-0: eight 48px targets do not fit one phone-width
    // row, and a flex row would otherwise squash them below the tap-target
    // floor rather than spill onto a second line.
    <div className="flex flex-wrap justify-center gap-3">
      {PROFILE_COLORS.map((colorKey) => (
        <button
          key={colorKey}
          type="button"
          aria-label={colorKey}
          onClick={() => onSelect(colorKey)}
          className={`w-12 h-12 shrink-0 rounded-full bg-${colorKey} ${
            selected === colorKey ? 'ring-2 ring-offset-2 ring-gray-400' : ''
          }`}
        />
      ))}
    </div>
  );
}
