/**
 * Mode helpers — colocate light ("hiru", 昼) and dark ("yoru", 夜) values for a token.
 *
 * Used by Tier 1 recipes whose shape splits motoi (基) / hiru / yoru. Replaces the
 * manual three-object split with a single call that fuses both modes into the
 * flat `string[]` shape tailwind-variants expects.
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

/** Defines a colour map. Each entry is a plain string or `{ light, dark }`. */
export function defineColors<K extends string>(map: Record<K, ColorEntry>): Record<K, string[]> {
	return Object.fromEntries(
		Object.entries<ColorEntry>(map).map(([key, entry]) => [key, resolveEntry(entry)]),
	) as Record<K, string[]>
}

/** Merges a single light / dark pair for scalar tokens. */
export function mode(light: ModeValue, dark?: ModeValue): string[] {
	return dark ? [...flatten(light), ...flatten(dark)] : flatten(light)
}
