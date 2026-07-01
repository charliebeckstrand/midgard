import type { ReactNode } from 'react'
import { Density as DensityPrimitive, useDensityNullable } from '../../primitives/density'
import { type DensityLevel, densityToSize, sizeToDensityLevel } from './context'

type DensityProviderProps = {
	density: DensityLevel
	className?: string
	children: ReactNode
}

/**
 * Friendly t-shirt-named density wrapper (`compact` / `snug` / `loose`) and the
 * app-wide entry point for ambient density. Wrap a region or the app root to
 * set its baseline; it broadcasts the matching `Step` through the universal
 * Density primitive, and every size-aware client component (Input, Button,
 * Tabs, …) inherits it. Static components (Card, Badge, Text, …) ignore it;
 * size them with explicit props.
 *
 * Reference consumer: `<Input>`. Form fields resolve their size through
 * `useDensity()`; an `<Input>` (or any `<Field>`-wrapped field) inside
 * `<DensityProvider density="compact">` shrinks to `'sm'` without touching
 * its props.
 */
export function DensityProvider({ density, className, children }: DensityProviderProps) {
	const step = densityToSize[density]

	return (
		<DensityPrimitive scale={step}>
			<span data-slot="density" data-density={density} className={className ?? 'contents'}>
				{children}
			</span>
		</DensityPrimitive>
	)
}

/**
 * Resolves a friendly `DensityLevel`: `explicit ?? ambient ?? 'snug'`. For a
 * client component whose prop surface speaks `DensityLevel` rather than the
 * primitive `Step` (e.g. {@link Grid}, which projects density onto a `Table`
 * that itself reads no context — REFERENCE.md §2) but that should still
 * inherit an enclosing `<DensityProvider>` when the prop is omitted.
 *
 * Reads the ambient token's `space` axis (the padding/gap dimension density
 * here controls), not `size`; the two only diverge under a split
 * `<Density space size>`; `DensityProvider` always sets both together.
 */
export function useDensityLevel(explicit?: DensityLevel): DensityLevel {
	const ambient = useDensityNullable()

	if (explicit) return explicit

	return ambient ? sizeToDensityLevel[ambient.space] : 'snug'
}
