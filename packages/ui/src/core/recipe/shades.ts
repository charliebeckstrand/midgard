/**
 * Pair-form mode declarations.
 *
 * Build a `Record<Color, string[]>` from per-colour light/dark shade pairs.
 * The dark class must carry its own `dark:` prefix; Tailwind's content
 * scanner only picks up class strings that exist as full literals in source.
 * Pass a single string for tokens that don't change between modes.
 *
 * @example
 *   const text = shades({
 *     zinc:  ['text-zinc-700', 'dark:text-zinc-400'],
 *     amber: 'text-amber-700',
 *   })
 */

import type { Color } from './colors'

type ShadeSpec<C extends string> = Record<C, string | readonly [light: string, dark: string]>

/**
 * Generic over the colour set: defaults to {@link Color} (the standard
 * palette) and widens to the extended set when called with an extended-keyed
 * spec, e.g. `shades<ExtendedColor>({ rose: …, sky: … })` in `iro/spectrum`.
 */
export function shades<C extends string = Color>(spec: ShadeSpec<C>): Record<C, string[]> {
	const out: Record<string, string[]> = {}

	for (const [color, value] of Object.entries(spec) as [C, ShadeSpec<C>[C]][]) {
		out[color] = typeof value === 'string' ? [value] : [...value]
	}

	return out as Record<C, string[]>
}
