import { motion } from 'framer-motion';
import { PROFILE_ICONS, type ProfileIcon } from '../../types/api';
import { iconMap } from '../../lib/iconMap';

interface IconPickerProps {
  selected?: ProfileIcon;
  onSelect: (icon: ProfileIcon) => void;
  showLabels?: boolean;
}

export function IconPicker({ selected, onSelect, showLabels = false }: IconPickerProps) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {PROFILE_ICONS.map((iconKey) => {
        const Icon = iconMap[iconKey];
        const isSelected = selected === iconKey;
        return (
          <motion.button
            key={iconKey}
            type="button"
            onClick={() => onSelect(iconKey)}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${
              isSelected
                ? 'bg-garden-100 ring-2 ring-garden-500'
                : 'hover:bg-gray-100'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Icon className={`w-8 h-8 ${isSelected ? 'text-garden-600' : 'text-gray-600'}`} />
            {showLabels && (
              <span className="text-xs text-gray-500 capitalize">{iconKey}</span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
