// Simple audio context for sound effects
// Using Web Audio API for low-latency playback

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  } catch (e) {
    // Ignore audio errors (user hasn't interacted yet, etc.)
  }
}

export const sounds = {
  correct: () => {
    playTone(523.25, 0.1) // C5
    setTimeout(() => playTone(659.25, 0.15), 100) // E5
  },

  wrong: () => {
    playTone(311.13, 0.2, 'triangle') // Eb4 - gentle
  },

  streak: () => {
    playTone(523.25, 0.08)
    setTimeout(() => playTone(659.25, 0.08), 80)
    setTimeout(() => playTone(783.99, 0.12), 160) // G5
  },

  goalComplete: () => {
    playTone(523.25, 0.1)
    setTimeout(() => playTone(659.25, 0.1), 100)
    setTimeout(() => playTone(783.99, 0.1), 200)
    setTimeout(() => playTone(1046.50, 0.2), 300) // C6
  },

  click: () => {
    playTone(800, 0.05, 'square')
  },
}

export type SoundName = keyof typeof sounds
