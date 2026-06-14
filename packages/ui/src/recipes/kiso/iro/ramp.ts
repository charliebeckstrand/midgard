/**
 * Iro ramp: the color-major source of truth for foreground shades.
 *
 * One row per palette color, each naming the *role* shades that color plays
 * as a foreground, light value first and the `dark:`-prefixed value second.
 * Tailwind's scanner only sees full class literals; both are written out and
 * nothing is composed at runtime. Authored color-major: every shade decision
 * for a color in one place.
 *
 * Roles:
 *   - `onSurface`: foreground on the page / card surface (white · zinc-900).
 *     The semantic intent bundle and the muted `bare` text read this; it
 *     clears AA (4.5:1) on its own surface.
 *   - `onTint`: foreground for the translucent 15% soft fill, one step
 *     stronger than `onSurface`; `plain` / `soft` / `outline` read this.
 *   - `marker`: chromatic dot / glyph (status, spinner, timeline) painted on
 *     the page surface. Graphical; the floor is the non-text 3:1
 *     (1.4.11). The mid shade darkens for light mode and brightens for dark.
 *
 * The `__tests__/recipes/contrast.test.ts` guard derives the contrast of every
 * rung from Tailwind's own theme and asserts it clears the floor on its
 * declared surface in both modes.
 *
 * Layer: kiso · Concern: color ramp
 */

import type { Color } from '../../../core/recipe'

export type Pair = readonly [light: string, dark: string]

/**
 * The shades one role plays across every colour, lifted from the color-major
 * ramp into the `[light, dark]` map the engine consumes. Generic over the
 * colour set and role keys, so the standard ramp here and the extended ramp in
 * `spectrum.ts` share one projector.
 */
export function roleShades<C extends string, R extends Record<string, Pair>>(
	ramp: Record<C, R>,
	role: keyof R,
): Record<C, [light: string, dark: string]> {
	const out: Record<string, [light: string, dark: string]> = {}

	for (const [color, rung] of Object.entries(ramp) as [C, R][]) {
		const [light, dark] = rung[role] as Pair

		out[color] = [light, dark]
	}

	return out as Record<C, [light: string, dark: string]>
}

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

export const onSurface = roleShades(RAMP, 'onSurface')
export const onTint = roleShades(RAMP, 'onTint')
export const marker = roleShades(RAMP, 'marker')

/** Max-emphasis neutral foreground: the `default` intent and the `bare` zinc hover. */
export const strong: [light: string, dark: string] = ['text-zinc-950', 'dark:text-white']
