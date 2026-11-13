import type { Metadata } from 'next'

// The `metadata` of each auth page. Each app re-exports it from the
// `page.tsx` of the route, beside the page. A static `metadata` cannot read the
// locale of the reader, so each title stays in English, as the apps render.

/** The `metadata` of `LoginPage`. */
export const loginMetadata: Metadata = { title: 'Sign in' }

/** The `metadata` of `RegisterPage`. */
export const registerMetadata: Metadata = { title: 'Create account' }

/** The `metadata` of `ForgotPasswordPage`. */
export const forgotPasswordMetadata: Metadata = { title: 'Reset password' }

/** The `metadata` of `ResetPasswordPage`. */
export const resetPasswordMetadata: Metadata = { title: 'Set a new password' }

/** The `metadata` of `VerifyEmailPage`. */
export const verifyEmailMetadata: Metadata = { title: 'Verify email' }
