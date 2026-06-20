/**
 * Iro projection: turn a colour-major ramp — one row per colour, each naming
 * the `[light, dark]` shades it plays per foreground role — into the
 * role-major `[light, dark]` map the recipe engine consumes. Shared by the
 * standard `ramp` and the extended `spectrum`, which differ only in their
 * colour key set.
 *
 * Layer: kiso · Concern: colour projection
 */

export type Pair = readonly [light: string, dark: string]

/** Project one `role` across every colour of `ramp` into the engine's `[light, dark]` map. */
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
