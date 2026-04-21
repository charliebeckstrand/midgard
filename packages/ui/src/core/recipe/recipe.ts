/**
 * Iro (色) — Colour axis helper.
 *
 * Turns a `{ variant → palette }` map into the two pieces `tv()` needs:
 *
 * - `color` — the empty colour-variant scaffold (`{ zinc: '', red: '', ... }`) so
 *   tailwind-variants recognises the `color` prop.
 * - `compoundVariants` — one entry per `(variant × color)` pair applying the
 *   palette classes.
 *
 * Colour keys are inferred from the palette, so variable palettes (e.g. a
 * button palette that adds `inherit`) work without extra wiring.
 *
 * Pass `extra` to attach additional discriminators (e.g. `{ active: true }`) to
 * every generated compound. Call `iro()` twice and concat the results when a
 * recipe needs more than one compound matrix along another axis.
 */
export function iro<V extends string, C extends string>(
	map: Record<V, Record<C, string | string[]>>,
	extra: Record<string, unknown> = {},
) {
	const colorKeys = new Set<C>()
	const compoundVariants: Array<Record<string, unknown>> = []

	for (const [variant, palette] of Object.entries(map) as [V, Record<C, string | string[]>][]) {
		for (const [color, cls] of Object.entries(palette) as [C, string | string[]][]) {
			colorKeys.add(color)
			compoundVariants.push({ variant, color, class: cls, ...extra })
		}
	}

	const color = Object.fromEntries([...colorKeys].map((k) => [k, ''])) as Record<C, ''>

	return { color, compoundVariants }
}
