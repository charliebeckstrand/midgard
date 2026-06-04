/**
 * Control archetype — size axis. Text + icon dimension; padding lives in
 * `density`.
 *
 * Layer: katakana · Archetype: control · Concern: size
 */

import { ji } from '../../kiso/ji'

export const size = {
	sm: ji.size.sm,
	md: ji.size.md,
	lg: ji.size.lg,
} as const
