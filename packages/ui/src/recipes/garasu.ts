/**
 * @deprecated Split by concern: blur fragments are now `omote.blur.{sm,md,lg}`,
 * and the in-glass item-feedback styles are now `sawari.glassItem`. This shim
 * exists only to keep existing imports working during the recipe-system
 * migration; it will be removed in the cleanup phase.
 */

import { omote } from './omote'
import { sawari } from './sawari'

export const garasu = {
	sm: omote.blur.sm,
	md: omote.blur.md,
	lg: omote.blur.lg,
	item: sawari.glassItem,
} as const
