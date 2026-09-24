/**
 * VITE_TRIAL_MODE=true ships the app with email-dependent auth flows disabled
 * (magic link, forgot password, team/invite management). No SMTP is required.
 * Flip it off at final delivery after Supabase SMTP is configured.
 */
export const TRIAL_MODE = import.meta.env.VITE_TRIAL_MODE === 'true'