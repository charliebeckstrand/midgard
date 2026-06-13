/** Ordered breakpoint names, mobile-first; `'initial'` is the unprefixed base, the rest map to Tailwind min-width prefixes. */
export const BREAKPOINTS = ['initial', 'sm', 'md', 'lg', 'xl', '2xl'] as const

/** One breakpoint name from {@link BREAKPOINTS}. */
export type Breakpoint = (typeof BREAKPOINTS)[number]

/** A prop value that is either a single `T` or a per-breakpoint map of `T`, applied mobile-first. */
export type Responsive<T> = T | { initial?: T; sm?: T; md?: T; lg?: T; xl?: T; '2xl'?: T }

/**
 * Resolves a {@link Responsive} value to an ordered list of classes by calling
 * `resolver` once per defined breakpoint, ascending. A bare (non-object) value
 * resolves to a single class with no breakpoint; `'initial'` passes `undefined`
 * as the breakpoint so the resolver emits an unprefixed utility.
 *
 * @param value - The single or per-breakpoint value; `undefined` yields `[]`.
 * @param resolver - Maps a value (and optional breakpoint) to a class string.
 * @returns The resolved classes in breakpoint order.
 */
export function resolveResponsive<T>(
	value: Responsive<T> | undefined,
	resolver: (v: T, bp?: Breakpoint) => string,
): string[] {
	if (value === undefined) return []

	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		const obj: Partial<Record<Breakpoint, T>> = value

		const classes: string[] = []

		for (const bp of BREAKPOINTS) {
			const v = obj[bp]

			if (v === undefined) continue

			classes.push(resolver(v, bp === 'initial' ? undefined : bp))
		}

		return classes
	}

	return [resolver(value)]
}
