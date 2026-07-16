export type LadderShowStep = {
  kind: 'show'
  title: string
  text: string
  array?: { rows: number; cols: number; caption?: string; fadedRows?: number }
}

export type LadderTryStep = { kind: 'try'; a: number; b: number; prompt: string }

export type LadderStep = LadderShowStep | LadderTryStep

export type Ladder = {
  id: string
  title: string
  subtitle: string
  steps: LadderStep[]
}

function ninesFromTens(n: number): LadderStep[] {
  return [
    { kind: 'show', title: `Start with 10 × ${n}`, text: `You know 10 × ${n} = ${10 * n}.`, array: { rows: 10, cols: n, caption: `10 rows of ${n} = ${10 * n}` } },
    { kind: 'show', title: 'Take one group away', text: `9 × ${n} is one group of ${n} less. ${10 * n} − ${n} = ?`, array: { rows: 10, cols: n, fadedRows: 1, caption: `The faded row is the ${n} you take away` } },
    { kind: 'try', a: 9, b: n, prompt: `You try: 9 × ${n}` },
  ]
}

function eightsByDoubling(n: number): LadderStep[] {
  return [
    { kind: 'show', title: `Start with 2 × ${n}`, text: `You know 2 × ${n} = ${2 * n}.`, array: { rows: 2, cols: n, caption: `2 rows of ${n} = ${2 * n}` } },
    { kind: 'show', title: 'Double it', text: `Double ${2 * n} to get 4 × ${n} = ${4 * n}.`, array: { rows: 4, cols: n, fadedRows: 2, caption: 'The faded rows are the new double' } },
    { kind: 'show', title: 'Double it again', text: `Double ${4 * n} one more time to get 8 × ${n}.`, array: { rows: 8, cols: n, fadedRows: 4, caption: `Double ${4 * n} = ?` } },
    { kind: 'try', a: 8, b: n, prompt: `You try: 8 × ${n}` },
  ]
}

function sixesFromFives(n: number): LadderStep[] {
  return [
    { kind: 'show', title: `Start with 5 × ${n}`, text: `You know 5 × ${n} = ${5 * n}.`, array: { rows: 5, cols: n, caption: `5 rows of ${n} = ${5 * n}` } },
    { kind: 'show', title: 'Add one more group', text: `6 × ${n} is one more ${n}. ${5 * n} + ${n} = ?`, array: { rows: 6, cols: n, fadedRows: 1, caption: `The faded row is the ${n} you add` } },
    { kind: 'try', a: 6, b: n, prompt: `You try: 6 × ${n}` },
  ]
}

function foursDoubleDouble(n: number): LadderStep[] {
  return [
    { kind: 'show', title: `Start with 2 × ${n}`, text: `You know 2 × ${n} = ${2 * n}.`, array: { rows: 2, cols: n, caption: `2 rows of ${n} = ${2 * n}` } },
    { kind: 'show', title: 'Double it', text: `4 × ${n} is double 2 × ${n}. ${2 * n} + ${2 * n} = ?`, array: { rows: 4, cols: n, fadedRows: 2, caption: 'The faded rows are the new double' } },
    { kind: 'try', a: 4, b: n, prompt: `You try: 4 × ${n}` },
  ]
}

function twelvesTensPlusTwos(n: number): LadderStep[] {
  return [
    { kind: 'show', title: `Start with 10 × ${n}`, text: `You know 10 × ${n} = ${10 * n}.`, array: { rows: 10, cols: n, caption: `10 rows of ${n} = ${10 * n}` } },
    { kind: 'show', title: `Add 2 × ${n}`, text: `12 × ${n} is 10 groups plus 2 groups. ${10 * n} + ${2 * n} = ?`, array: { rows: 2, cols: n, caption: `2 more rows of ${n} = ${2 * n}` } },
    { kind: 'try', a: 12, b: n, prompt: `You try: 12 × ${n}` },
  ]
}

function threesDoublePlusOne(n: number): LadderStep[] {
  return [
    { kind: 'show', title: `Start with 2 × ${n}`, text: `You know 2 × ${n} = ${2 * n}.`, array: { rows: 2, cols: n, caption: `2 rows of ${n} = ${2 * n}` } },
    { kind: 'show', title: 'Add one more group', text: `3 × ${n} is one more ${n}. ${2 * n} + ${n} = ?`, array: { rows: 3, cols: n, fadedRows: 1, caption: `The faded row is the ${n} you add` } },
    { kind: 'try', a: 3, b: n, prompt: `You try: 3 × ${n}` },
  ]
}

export const LADDERS: Ladder[] = [
  { id: 'nines-from-tens', title: 'Build 9s from 10s', subtitle: 'One group less than 10', steps: [...ninesFromTens(4), ...ninesFromTens(7)] },
  { id: 'eights-by-doubling', title: 'Build 8s by doubling', subtitle: 'Double, double, double', steps: [...eightsByDoubling(3), ...eightsByDoubling(6)] },
  { id: 'sixes-from-fives', title: 'Build 6s from 5s', subtitle: 'One group more than 5', steps: [...sixesFromFives(6), ...sixesFromFives(8)] },
  { id: 'fours-double-double', title: '4s: double the double', subtitle: 'Two doubles in a row', steps: [...foursDoubleDouble(6), ...foursDoubleDouble(7)] },
  { id: 'twelves-tens-plus-twos', title: '12s: 10s plus 2s', subtitle: 'Ten groups and two more', steps: [...twelvesTensPlusTwos(4), ...twelvesTensPlusTwos(6)] },
  { id: 'threes-double-plus-one', title: '3s: double plus one', subtitle: 'One group more than double', steps: [...threesDoublePlusOne(7), ...threesDoublePlusOne(8)] },
]
