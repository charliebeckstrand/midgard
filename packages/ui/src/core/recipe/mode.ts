/**
 * Mode helpers: colocate light ("hiru", 昼) and dark ("yoru", 夜) values
 * for a token.
 *
 * `mode()` fuses a scalar light/dark pair into a flat `string[]` (the shape
 * the recipe engine consumes). A per-color table of pairs is a record of
 * `mode()` calls, such as the CSS-variable bundles of Radio and Switch.
 *
 * Authoring style: the dark string carries its own `dark:` prefix, one per
 * class; a single entry can bundle several variable-setters. Tailwind detects
 * only full class literals.
 */

type ModeValue = string | readonly string[]

function flatten(value: ModeValue): string[] {
	return typeof value === 'string' ? [value] : [...value]
}

/** Fuses a light / dark pair into the flat string array the engine consumes. */
export function mode(light: ModeValue, dark: ModeValue): string[] {
	return [...flatten(light), ...flatten(dark)]
}
