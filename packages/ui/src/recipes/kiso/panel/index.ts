/**
 * Panel archetype: slot bundle shared by dialog, drawer, and sheet.
 * Owns the surface (fill + chrome), the slot layout (title /
 * description / header / body / footer arrangement), and the drag grip
 * a resizable panel is taken by. The katakana applicator wraps these
 * with caller-supplied panel + backdrop recipes.
 */

import { grip } from './grip'
import { layout } from './layout'
import { surface } from './surface'

export const panel = {
	surface,
	layout,
	grip,
} as const
