/**
 * Omote backdrop — modal / sheet overlay fills. Two intensities: `base`
 * is the default modal scrim; `glass` is denser for use behind a glass
 * panel that would otherwise read transparent against the page.
 *
 * Layer: kiso · Concern: backdrop fill
 */

import { bg } from './bg'
import { blur } from './blur'

export const backdrop = {
	base: [bg.backdrop.md, blur.sm],
	glass: bg.backdrop.lg,
} as const
