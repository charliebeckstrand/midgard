/**
 * Helpers for colocating light/dark mode values per color token.
 *
 * Each color entry is either a plain string (light-only) or
 * `{ light, dark }` when a dark override is needed.
 */

type ModeValue = string | readonly (string | readonly string[])[]
type ColorEntry = ModeValue | { light: ModeValue; dark: ModeValue }

function flatten(v: ModeValue): string[] {
	if (typeof v === 'string') return [v]

	return v.flatMap((item) => (typeof item === 'string' ? [item] : [...item]))
}

function isModePair(entry: ColorEntry): entry is { light: ModeValue; dark: ModeValue } {
	return typeof entry === 'object' && !Array.isArray(entry) && 'light' in entry
}

function resolveEntry(entry: ColorEntry): string[] {
	if (isModePair(entry)) return [...flatten(entry.light), ...flatten(entry.dark)]

	return flatten(entry)
}

/**
 * Defines a color map. Each entry is either a plain string (light-only)
 * or `{ light, dark }` when a dark mode override is needed.
 *
 * @example
 * ```ts
 * const button = defineColors({
 *   zinc: {
 *     light: 'text-white [--btn-bg:var(--color-zinc-900)]',
 *     dark: 'dark:[--btn-bg:var(--color-zinc-600)]',
 *   },
 *   red: 'text-white [--btn-bg:var(--color-red-600)]',
 * })
 * ```
 */
export function defineColors<K extends string>(map: Record<K, ColorEntry>): Record<K, string[]> {
	return Object.fromEntries(
		Object.entries<ColorEntry>(map).map(([key, entry]) => [key, resolveEntry(entry)]),
	) as Record<K, string[]>
}

/**
 * Merges a single light/dark pair for scalar tokens (no color dimension).
 *
 * @example
 * ```ts
 * const avatar = mode('bg-zinc-600', 'dark:bg-zinc-700')
 * ```
 */
export function mode(light: ModeValue, dark?: ModeValue): string[] {
	return dark ? [...flatten(light), ...flatten(dark)] : flatten(light)
}
