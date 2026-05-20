/**
 * Mode helpers — colocate light ("hiru", 昼) and dark ("yoru", 夜) values
 * for a token.
 *
 * `mode()` fuses a scalar light/dark pair into a flat `string[]` (the shape
 * the recipe engine consumes). `defineColors()` does the same across a
 * multi-key map — useful for kata-specific colour palettes that aren't part
 * of the iro.palette × iro.colors matrix, e.g. checkbox / radio / switch
 * exposing CSS-variable bundles per colour.
 *
 * Authoring style: the dark string carries its own `dark:` prefix (one per
 * class, since a single entry may bundle several variable-setters). Use
 * `shades()` from `./shades` for the per-`Color` form; both helpers expect
 * the dark class to ship its prefix so Tailwind picks up the full literal.
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

/** Fuses a light / dark pair into the flat string array the engine consumes. */
export function mode(light: ModeValue, dark?: ModeValue): string[] {
	return dark ? [...flatten(light), ...flatten(dark)] : flatten(light)
}

/** Multi-key form of `mode()`. Each entry is a plain string or `{ light, dark }`. */
export function defineColors<K extends string>(map: Record<K, ColorEntry>): Record<K, string[]> {
	return Object.fromEntries(
		Object.entries<ColorEntry>(map).map(([key, entry]) => [key, resolveEntry(entry)]),
	) as Record<K, string[]>
}
