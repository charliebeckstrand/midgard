/**
 * Panel archetype: slot bundle shared by dialog, drawer, and sheet.
 * Owns the surface (fill + chrome) and the slot layout (title /
 * description / header / body / footer arrangement). The katakana
 * applicator wraps these with caller-supplied panel + backdrop recipes.
 */

import { layout } from './layout'
import { surface } from './surface'

export const panel = {
	surface,
	layout,
} as const
