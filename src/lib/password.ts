export const STRENGTH_LABELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'] as const

export interface PasswordCheck {
  label: string
  ok: boolean
}

export function scorePassword(password: string): number {
  let score = 0
  if (password.length >= 8) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  return score
}

export function passwordChecks(password: string): PasswordCheck[] {
  return [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Contains a number', ok: /[0-9]/.test(password) },
    { label: 'Contains a symbol', ok: /[^A-Za-z0-9]/.test(password) },
  ]
}
