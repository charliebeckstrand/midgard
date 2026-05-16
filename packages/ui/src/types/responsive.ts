export const BREAKPOINTS = ['initial', 'sm', 'md', 'lg', 'xl', '2xl'] as const

export type Breakpoint = (typeof BREAKPOINTS)[number]

export type Responsive<T> = T | { initial?: T; sm?: T; md?: T; lg?: T; xl?: T; '2xl'?: T }

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
