import { cva, type VariantProps } from 'class-variance-authority'
import { kage } from '../../recipes/kage'

// ─── Responsive utility ─────────────────────────────────────────────────────

export type Responsive<T> = T | { initial?: T; sm?: T; md?: T; lg?: T; xl?: T; '2xl'?: T }

export function resolveResponsive<T>(
	value: Responsive<T> | undefined,
	resolver: (v: T, bp?: string) => string,
): string[] {
	if (value === undefined) return []

	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		const obj = value as Record<string, T>
		
		const classes: string[] = []

		for (const [bp, v] of Object.entries(obj)) {
			if (v === undefined) continue

			classes.push(resolver(v, bp === 'initial' ? undefined : bp))
		}

		return classes
	}

	return [resolver(value as T)]
}

/** Factory for breakpoint-aware Tailwind class resolvers */
export function responsiveClass(prefix: string) {
	return (value: number, bp?: string): string => {
		const cls = `${prefix}-${value}`

		return bp ? `${bp}:${cls}` : cls
	}
}

// ─── Lookup maps ─────────────────────────────────────────────────────────────

export const flowMap = {
	row: 'grid-flow-row',
	column: 'grid-flow-col',
	dense: 'grid-flow-dense',
} as const

export const alignMap = {
	start: 'items-start',
	center: 'items-center',
	end: 'items-end',
	stretch: 'items-stretch',
} as const

export const justifyMap = {
	start: 'justify-items-start',
	center: 'justify-items-center',
	end: 'justify-items-end',
	stretch: 'justify-items-stretch',
} as const

// ─── Divider variants ────────────────────────────────────────────────────────

export const gridDividerVariants = cva(['border-0 border-t col-span-full'], {
	variants: {
		soft: {
			true: kage.borderSubtle,
			false: kage.border,
		},
	},
	defaultVariants: {
		soft: false,
	},
})

export type GridDividerVariants = VariantProps<typeof gridDividerVariants>
