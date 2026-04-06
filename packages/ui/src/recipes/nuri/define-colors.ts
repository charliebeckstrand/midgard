/**
 * Helpers for colocating light/dark mode values per color token.
 *
 * Instead of separate hiru/yoru blocks, each token declares
 * `{ light, dark? }` so both modes live side-by-side.
 */

type ModeValue = string | readonly (string | readonly string[])[]

function flatten(v: ModeValue): string[] {
	if (typeof v === 'string') return [v]
	return v.flatMap((item) => (typeof item === 'string' ? [item] : [...item]))
}

/**
 * Merges `{ light, dark? }` entries for a color map into flat string arrays.
 *
 * @example
 * ```ts
 * const button = defineColors({
 *   zinc: {
 *     light: 'text-white [--btn-bg:var(--color-zinc-900)]',
 *     dark: 'dark:[--btn-bg:var(--color-zinc-600)]',
 *   },
 *   red: { light: 'text-white [--btn-bg:var(--color-red-600)]' },
 * })
 * ```
 */
export function defineColors<K extends string>(
	map: Record<K, { light: ModeValue; dark?: ModeValue }>,
): Record<K, string[]> {
	return Object.fromEntries(
		Object.entries<{ light: ModeValue; dark?: ModeValue }>(map).map(([key, { light, dark }]) => [
			key,
			dark ? [...flatten(light), ...flatten(dark)] : flatten(light),
		]),
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
