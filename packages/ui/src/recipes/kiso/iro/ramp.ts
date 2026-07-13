/**
 * Iro ramp: the color-major source of truth for foreground shades, projected
 * into the role-major maps consumers read.
 *
 * One row per palette role naming the shade each *foreground role* plays,
 * light value first and the `dark:`-prefixed value second — full class literals
 * (Tailwind's scanner sees only literals; nothing is composed at runtime). Each
 * shade is the least-emphatic rung that clears its contrast floor on its
 * surface, save a few taste bumps (warning / success ride a lighter dark rung).
 *
 * Roles:
 *   - `onSurface`: foreground on the page / card surface (white · neutral-900).
 *     The semantic intent bundle and the muted `bare` text read this; clears
 *     AA (4.5:1) on its own surface.
 *   - `onTint`: foreground for the translucent 15% soft fill, one step stronger
 *     than `onSurface`; `plain` / `soft` / `outline` read this.
 *   - `marker`: chromatic dot / glyph (status, spinner, timeline) on the page
 *     surface. Graphical; the non-text 3:1 floor (1.4.11) lands a rung lighter
 *     than the text ramp for the low-contrast hues.
 *
 * The `__tests__/recipes/contrast.test.ts` guard re-derives every rung's
 * contrast from the default token theme (`src/theme.css` aliases resolved
 * against Tailwind's own palette) and asserts it clears its floor in both
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
	neutral: {
		onSurface: ['text-neutral-500', 'dark:text-neutral-400'],
		onTint: ['text-neutral-700', 'dark:text-neutral-400'],
		marker: ['text-neutral-500', 'dark:text-neutral-400'],
	},
	danger: {
		onSurface: ['text-danger-600', 'dark:text-danger-500'],
		onTint: ['text-danger-700', 'dark:text-danger-400'],
		marker: ['text-danger-600', 'dark:text-danger-500'],
	},
	warning: {
		onSurface: ['text-warning-700', 'dark:text-warning-500'],
		onTint: ['text-warning-800', 'dark:text-warning-400'],
		marker: ['text-warning-600', 'dark:text-warning-500'],
	},
	success: {
		onSurface: ['text-success-700', 'dark:text-success-500'],
		onTint: ['text-success-800', 'dark:text-success-400'],
		marker: ['text-success-600', 'dark:text-success-500'],
	},
	primary: {
		onSurface: ['text-primary-600', 'dark:text-primary-500'],
		onTint: ['text-primary-700', 'dark:text-primary-400'],
		marker: ['text-primary-600', 'dark:text-primary-500'],
	},
} satisfies Record<Color, ColorRamp>

export const onSurface = project(RAMP, 'onSurface')
export const onTint = project(RAMP, 'onTint')
export const marker = project(RAMP, 'marker')

/** Max-emphasis neutral foreground: the `default` intent and the `bare` neutral hover. */
export const strong: [light: string, dark: string] = ['text-neutral-950', 'dark:text-white']
