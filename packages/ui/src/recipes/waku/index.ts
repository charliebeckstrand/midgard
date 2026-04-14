/**
 * Waku (枠) — Form frames.
 *
 * Borders, focus rings, disabled states, and control surfaces that frame user input.
 *
 * Tier: 2 · Concern: form
 */

import { check, checkSurface, hidden } from './check'
import { control } from './control'
import { date } from './date'
import { input, inputBase } from './input'
import { number } from './number'

export const waku = {
	control,
	hidden,
	check,
	checkSurface,
	inputBase,
	input,
	date,
	number,
} as const
