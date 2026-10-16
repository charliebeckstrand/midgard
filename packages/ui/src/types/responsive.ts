/** Ordered breakpoint names, mobile-first; `'initial'` is the unprefixed base, the rest map to Tailwind min-width prefixes. */
export const BREAKPOINTS = ['initial', 'sm', 'md', 'lg', 'xl', '2xl'] as const

/** One breakpoint name from {@link BREAKPOINTS}. */
export type Breakpoint = (typeof BREAKPOINTS)[number]

/** A breakpoint with a width of its own — every name but the unprefixed base. */
export type MinBreakpoint = Exclude<Breakpoint, 'initial'>

/**
 * Where each breakpoint starts, as Tailwind's own `@theme` declares it.
 *
 * The same scale as the `sm:` / `lg:` prefixes above, in the same unit. A question asked
 * in JavaScript (`useMinBreakpoint('lg')`) and the same question asked in CSS (`lg:`)
 * therefore cannot give different answers. A pixel literal at each call site copies the
 * scale by hand, and no copy moves if the theme's breakpoints change.
 *
 * `rem`, not `px`, because that is what Tailwind emits. At a root font size other than 16px
 * a pixel literal and the matching `lg:` class part company. The JS answer then silently
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
export type Responsive<T> = T | Partial<Record<Breakpoint, T>>

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
	resolver: (value: T, bp?: Breakpoint) => string,
): string[] {
	if (value === undefined) return []

	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		const byBreakpoint: Partial<Record<Breakpoint, T>> = value

		return BREAKPOINTS.flatMap((bp) => {
			const entry = byBreakpoint[bp]

			return entry === undefined ? [] : [resolver(entry, bp === 'initial' ? undefined : bp)]
		})
	}

	return [resolver(value)]
}

/**
 * Puts each class of `classes` behind the variant of `bp`, so `p-2` at `md`
 * becomes `md:p-2`. `'initial'` and `undefined` give `classes` unchanged.
 *
 * Tailwind's scanner does not see a class that this function makes. Each
 * class that a caller can make must thus be in an `@source inline(...)` line of
 * `ui/tailwind.css`.
 *
 * @param classes - The unprefixed classes, separated by spaces.
 * @param bp - The breakpoint; the resolver of {@link resolveResponsive} gives it.
 * @returns The classes for that breakpoint.
 */
export function atBreakpoint(classes: string, bp?: Breakpoint): string {
	if (bp === undefined || bp === 'initial') return classes

	return classes
		.split(' ')
		.map((name) => `${bp}:${name}`)
		.join(' ')
}

/**
 * The value that a responsive prop holds at `bp`: the value named there, or
 * else the value of the last smaller breakpoint that names one. A bare value
 * holds at each breakpoint.
 *
 * @param value - The single or per-breakpoint value.
 * @param bp - The breakpoint to read.
 * @param fallback - The value below the first breakpoint that the map names.
 * @returns The value in force at `bp`.
 */
export function valueAt<T>(value: Responsive<T>, bp: Breakpoint, fallback: T): T {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return value

	const named: Partial<Record<Breakpoint, T>> = value

	let held = fallback

	for (const step of BREAKPOINTS) {
		held = named[step] ?? held

		if (step === bp) break
	}

	return held
}

/**
 * The classes of a responsive variant axis of a recipe. `table` gives the
 * unprefixed classes of each value, and each breakpoint that `value` names
 * takes the classes of its value behind its prefix.
 *
 * Each value of `table` must write the same CSS properties on the same
 * selectors, in the same layer. A larger breakpoint then replaces each
 * property of a smaller one, and no property of the smaller value stays in
 * force. `responsive-variants.test.ts` holds each table to this rule.
 *
 * Tailwind's scanner does not see a prefixed class, so each one must be in an
 * `@source inline(...)` line of `ui/tailwind.css`, as for {@link atBreakpoint}.
 *
 * @param value - The single or per-breakpoint value of the axis.
 * @param table - The unprefixed classes of each value, separated by spaces.
 * @returns The classes of each named breakpoint, in breakpoint order.
 */
export function resolveVariant<T extends string>(
	value: Responsive<T>,
	table: Record<T, string>,
): string {
	return resolveResponsive(value, (entry, bp) => atBreakpoint(table[entry], bp)).join(' ')
}
