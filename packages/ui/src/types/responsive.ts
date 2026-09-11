/** Ordered breakpoint names, mobile-first; `'initial'` is the unprefixed base, the rest map to Tailwind min-width prefixes. */
export const BREAKPOINTS = ['initial', 'sm', 'md', 'lg', 'xl', '2xl'] as const

/** One breakpoint name from {@link BREAKPOINTS}. */
export type Breakpoint = (typeof BREAKPOINTS)[number]

/** A breakpoint with a width of its own — every name but the unprefixed base. */
export type MinBreakpoint = Exclude<Breakpoint, 'initial'>

/**
 * Where each breakpoint starts, as Tailwind's own `@theme` declares it.
 *
 * The same scale as the `sm:` / `lg:` prefixes above, in the same unit, so a question asked
 * in JavaScript (`useMinBreakpoint('lg')`) and the same question asked in CSS (`lg:`) cannot
 * give different answers. Consumers used to spell these from memory as pixel literals —
 * `useMinWidth(640)`, `useMinWidth(1024)` — which is one transcription per call site and
 * none of them move if the theme's breakpoints ever do.
 *
 * `rem`, not `px`, because that is what Tailwind emits: at a root font size other than 16px
 * a pixel literal and the matching `lg:` class part company, and the JS answer silently
 * stops describing the layout.
 */
export const BREAKPOINT_WIDTHS = {
	sm: '40rem',
	md: '48rem',
	lg: '64rem',
	xl: '80rem',
	'2xl': '96rem',
} as const satisfies Record<MinBreakpoint, string>

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

		return BREAKPOINTS.flatMap((bp) => {
			const v = obj[bp]

			return v === undefined ? [] : [resolver(v, bp === 'initial' ? undefined : bp)]
		})
	}

	return [resolver(value)]
}
