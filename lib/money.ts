// Money in the system is whole kobo (1 naira = 100 kobo). These helpers turn it
// into text for people, and what a person types back into kobo, without ever
// doing decimal arithmetic on money.

const formatter = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' })

export function formatNaira(kobo: number): string {
  return formatter.format(kobo / 100)
}

/** "1,250.50" -> 125050. Returns null when the text is not a valid amount. */
export function nairaToKobo(input: string): number | null {
  const clean = input.replace(/[₦,\s]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null
  const [whole, frac = ''] = clean.split('.')
  return parseInt(whole, 10) * 100 + parseInt(frac.padEnd(2, '0') || '0', 10)
}

/** 125050 -> "1250.50", for filling an input box. */
export function koboToInput(kobo: number): string {
  const whole = Math.floor(kobo / 100)
  const frac = String(kobo % 100).padStart(2, '0')
  return `${whole}.${frac}`
}
