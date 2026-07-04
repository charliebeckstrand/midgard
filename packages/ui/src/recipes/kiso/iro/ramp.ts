/**
 * Iro ramp: the color-major source of truth for foreground shades, projected
 * into the role-major maps consumers read.
 *
 * One row per palette color naming the shade each *role* plays as a foreground,
 * light value first and the `dark:`-prefixed value second — full class literals
 * (Tailwind's scanner sees only literals; nothing is composed at runtime). Each
 * shade is the least-emphatic rung that clears its contrast floor on its
 * surface, save a few taste bumps (amber / green ride a lighter dark rung).
 *
 * Roles:
 *   - `onSurface`: foreground on the page / card surface (white · zinc-900).
 *     The semantic intent bundle and the muted `bare` text read this; clears
 *     AA (4.5:1) on its own surface.
 *   - `onTint`: foreground for the translucent 15% soft fill, one step stronger
 *     than `onSurface`; `plain` / `soft` / `outline` read this.
 *   - `marker`: chromatic dot / glyph (status, spinner, timeline) on the page
 *     surface. Graphical; the non-text 3:1 floor (1.4.11) lands a rung lighter
 *     than the text ramp for the low-contrast hues.
 *
 * The `__tests__/recipes/contrast.test.ts` guard re-derives every rung's
 * contrast from Tailwind's own theme and asserts it clears its floor in both
 * modes — edit a shade here and the guard proves it still clears.
 *
 * Layer: kiso · Concern: color ramp
 */

import type { Color } from '../../../core/recipe'

import { type Pair, project } from './project'

type ColorRamp = {
	onSurface: Pair
	onTint: Pair
	marker: Pair
}

const RAMP = {
	zinc: {
		onSurface: ['text-zinc-500', 'dark:text-zinc-400'],
		onTint: ['text-zinc-700', 'dark:text-zinc-400'],
		marker: ['text-zinc-500', 'dark:text-zinc-400'],
	},
	red: {
		onSurface: ['text-red-600', 'dark:text-red-500'],
		onTint: ['text-red-700', 'dark:text-red-400'],
		marker: ['text-red-600', 'dark:text-red-500'],
	},
	amber: {
		onSurface: ['text-amber-700', 'dark:text-amber-500'],
		onTint: ['text-amber-800', 'dark:text-amber-400'],
		marker: ['text-amber-600', 'dark:text-amber-500'],
	},
	green: {
		onSurface: ['text-green-700', 'dark:text-green-500'],
		onTint: ['text-green-800', 'dark:text-green-400'],
		marker: ['text-green-600', 'dark:text-green-500'],
	},
	blue: {
		onSurface: ['text-blue-600', 'dark:text-blue-500'],
		onTint: ['text-blue-700', 'dark:text-blue-400'],
		marker: ['text-blue-600', 'dark:text-blue-500'],
	},
} satisfies Record<Color, ColorRamp>

export const onSurface = project(RAMP, 'onSurface')
export const onTint = project(RAMP, 'onTint')
export const marker = project(RAMP, 'marker')

/** Max-emphasis neutral foreground: the `default` intent and the `bare` zinc hover. */
export const strong: [light: string, dark: string] = ['text-zinc-950', 'dark:text-white']
