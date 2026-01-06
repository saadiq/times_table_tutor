import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { IconPicker } from './IconPicker';
import { iconMap } from '../../lib/iconMap';
import { PROFILE_COLORS, type ProfileIcon, type ProfileColor } from '../../types/api';

interface ProfileCreatorProps {
  onSubmit: (name: string, icon: ProfileIcon, color: ProfileColor) => void;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
}

type Step = 'name' | 'icon' | 'color';

export function ProfileCreator({ onSubmit, onCancel, isLoading, error }: ProfileCreatorProps) {
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<ProfileIcon | null>(null);
  const [color, setColor] = useState<ProfileColor>('garden-500');

  const handleNext = () => {
    if (step === 'name' && name.trim()) {
      setStep('icon');
    } else if (step === 'icon' && icon) {
      setStep('color');
    }
  };

  const handleBack = () => {
    if (step === 'icon') setStep('name');
    else if (step === 'color') setStep('icon');
    else onCancel();
  };

  const handleSubmit = () => {
    if (name.trim() && icon) {
      onSubmit(name.trim(), icon, color);
    }
  };

  const IconComponent = icon ? iconMap[icon] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 shadow-lg max-w-md w-full mx-4"
    >
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full"
          disabled={isLoading}
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <h2 className="text-xl font-bold text-gray-800">New Profile</h2>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-6">
        {(['name', 'icon', 'color'] as Step[]).map((s) => (
          <div
            key={s}
            className={`w-2 h-2 rounded-full ${
              s === step ? 'bg-garden-500' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Name */}
        {step === 'name' && (
          <motion.div
            key="name"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <p className="text-gray-600 text-center mb-4">What's your name?</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 mb-4 text-center text-lg"
              maxLength={20}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleNext()}
            />
            {error && (
              <p className="text-red-500 text-center text-sm mb-4">{error}</p>
            )}
            <button
              onClick={handleNext}
              disabled={!name.trim()}
              className="w-full py-3 rounded-lg bg-garden-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Step 2: Icon */}
        {step === 'icon' && (
          <motion.div
            key="icon"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <p className="text-gray-600 text-center mb-2">Pick your secret icon</p>
            <p className="text-gray-400 text-sm text-center mb-4">
              This is how you'll log in - remember it!
            </p>
            <IconPicker selected={icon ?? undefined} onSelect={setIcon} />
            <button
              onClick={handleNext}
              disabled={!icon}
              className="w-full mt-6 py-3 rounded-lg bg-garden-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Step 3: Color */}
        {step === 'color' && (
          <motion.div
            key="color"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <p className="text-gray-600 text-center mb-4">Pick your color</p>

            {/* Preview */}
            <div className="flex justify-center mb-6">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center bg-${color}`}>
                {IconComponent && <IconComponent className="w-12 h-12 text-white" />}
              </div>
            </div>

            <div className="flex justify-center gap-3 mb-6">
              {PROFILE_COLORS.map((colorKey) => (
                <button
                  key={colorKey}
                  type="button"
                  onClick={() => setColor(colorKey)}
                  className={`w-10 h-10 rounded-full bg-${colorKey} ${
                    color === colorKey ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full py-3 rounded-lg bg-garden-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? 'Creating...' : (
                <>Start Learning <Check className="w-4 h-4" /></>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
