/**
 * Pair-form mode declarations.
 *
 * Build a `Record<Color, string[]>` from per-colour light/dark shade pairs.
 * The `dark:` prefix is prepended automatically — kata write the dark class
 * without a prefix. Pass a single string for tokens that don't change between
 * modes.
 *
 * @example
 *   const text = shades({
 *     zinc:  ['text-zinc-700', 'text-zinc-400'],   // ['text-zinc-700', 'dark:text-zinc-400']
 *     amber: 'text-amber-700',                      // ['text-amber-700']
 *   })
 */

import type { Color } from './colors'

export type ShadeSpec = Record<Color, string | readonly [light: string, dark: string]>

export function shades(spec: ShadeSpec): Record<Color, string[]> {
	const out: Record<string, string[]> = {}

	for (const [color, value] of Object.entries(spec)) {
		if (typeof value === 'string') {
			out[color] = [value]
			continue
		}

		const [light, dark] = value

		out[color] = [light, `dark:${dark}`]
	}

	return out as Record<Color, string[]>
}
