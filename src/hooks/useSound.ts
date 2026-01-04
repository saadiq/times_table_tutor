import { useCallback } from 'react'
import { sounds, type SoundName } from '../lib/sounds'

export function useSound() {
  const play = useCallback((sound: SoundName) => {
    sounds[sound]()
  }, [])

  return { play }
}
