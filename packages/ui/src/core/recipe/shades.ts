/**
 * Pair-form mode declarations.
 *
 * Build a `Record<Color, string[]>` from per-colour light/dark shade pairs.
 * The dark class must carry its own `dark:` prefix — Tailwind's content
 * scanner only picks up class strings that exist as full literals in source,
 * so we never construct the prefix at runtime. Pass a single string for
 * tokens that don't change between modes.
 *
 * @example
 *   const text = shades({
 *     zinc:  ['text-zinc-700', 'dark:text-zinc-400'],
 *     amber: 'text-amber-700',
 *   })
 */

import type { Color } from './colors'

export type ShadeSpec = Record<Color, string | readonly [light: string, dark: string]>

export function shades(spec: ShadeSpec): Record<Color, string[]> {
	const out: Record<string, string[]> = {}

	for (const [color, value] of Object.entries(spec)) {
		out[color] = typeof value === 'string' ? [value] : [...value]
	}

	return out as Record<Color, string[]>
}
