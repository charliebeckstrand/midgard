/**
 * Iro projection: turn a color-major ramp into the role-major
 * `[light, dark]` map the recipe engine consumes. The color-major ramp holds
 * one row per color, each naming the `[light, dark]` shades it plays per
 * foreground role. Shared by the
 * standard `ramp` and the extended ramp in `extended-palette.ts`, which differ
 * only in their color key set.
 *
 * Layer: kiso · Concern: color projection
 */

export type Pair = readonly [light: string, dark: string]

/** Project one `role` across every color of `ramp` into the engine's `[light, dark]` map. */
export function project<K extends string, R extends Record<string, Pair>>(
	ramp: Record<K, R>,
	role: keyof R,
): Record<K, [light: string, dark: string]> {
	return Object.fromEntries(
		(Object.entries(ramp) as [K, R][]).map(([color, rung]): [K, [string, string]] => {
			// `role` is always a key of the ramp; the index-signature constraint
			// widens it to `Pair | undefined`, so assert the present pair.
			const [light, dark] = rung[role] as Pair

			return [color, [light, dark]]
		}),
	) as Record<K, [light: string, dark: string]>
}
