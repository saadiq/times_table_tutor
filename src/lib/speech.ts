const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

function numberToWords(n: number): string {
  if (n < 20) return ONES[n]
  if (n < 100) {
    const ones = n % 10
    return ones > 0 ? `${TENS[Math.floor(n / 10)]} ${ONES[ones]}` : TENS[Math.floor(n / 10)]
  }
  const remainder = n % 100
  const hundredPart = `${ONES[Math.floor(n / 100)]} hundred`
  return remainder === 0 ? hundredPart : `${hundredPart} and ${numberToWords(remainder)}`
}

export function speakProblem(a: number, b: number): Promise<void> {
  return speak(`${numberToWords(a)} times ${numberToWords(b)}`)
}

export function speakFact(a: number, b: number, answer: number): Promise<void> {
  return speak(`${numberToWords(a)} times ${numberToWords(b)} equals ${numberToWords(answer)}`)
}

const MAX_SPEECH_MS = 5000

function speak(text: string): Promise<void> {
  if (typeof window === 'undefined' || !window.speechSynthesis) return Promise.resolve()

  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.85
  utterance.pitch = 1.0
  utterance.volume = 0.8

  return new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, MAX_SPEECH_MS)
    utterance.onend = () => { clearTimeout(timeout); resolve() }
    utterance.onerror = () => { clearTimeout(timeout); resolve() }
    window.speechSynthesis.speak(utterance)
  })
}
