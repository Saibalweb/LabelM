// Shared .env reader for the E2E fixtures.
//
// Playwright does not load .env automatically. The auth suite needs secrets
// (staging service-role key, owner credentials) that must never be committed,
// so read them from the shell env first and fall back to the gitignored .env.

import fs from 'node:fs'
import path from 'node:path'

export function readDotEnv(): Record<string, string> {
  const file = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(file)) return {}
  const out: Record<string, string> = {}
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    out[key] = value
  }
  return out
}

export const fileEnv = readDotEnv()

/** Shell env wins; falls back to the gitignored .env. */
export function envValue(key: string): string {
  return process.env[key] ?? fileEnv[key] ?? ''
}
