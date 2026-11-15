const WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]

export function normaliseAbn(input: string): string {
  return input.replace(/\s+/g, '')
}

/** Australian Business Number checksum (11 digits, weighted sum divisible by 89). */
export function isValidAbn(input: string): boolean {
  const abn = normaliseAbn(input)
  if (!/^\d{11}$/.test(abn)) return false
  const digits = abn.split('').map(Number)
  digits[0] -= 1
  const sum = digits.reduce((total, digit, i) => total + digit * WEIGHTS[i], 0)
  return sum % 89 === 0
}

export function formatAbn(input: string): string {
  const abn = normaliseAbn(input)
  if (abn.length !== 11) return input
  return `${abn.slice(0, 2)} ${abn.slice(2, 5)} ${abn.slice(5, 8)} ${abn.slice(8)}`
}
