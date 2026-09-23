import type { ReactNode } from 'react'
import { Density as DensityPrimitive } from '../../primitives/density'
import { type DensityLevel, densityToSize } from './context'

/** Props for {@link DensityProvider}: the friendly `density` level to broadcast, and `children`. */
export type DensityProviderProps = {
	density: DensityLevel
	children: ReactNode
}

/**
 * Friendly t-shirt-named density wrapper (`compact` / `snug` / `loose`) and the
 * app-wide entry point for ambient density. Wrap a region or the app root to
 * set its baseline. It broadcasts the matching `Step` through the universal
 * Density primitive, and every size-aware client component (Input, Button,
 * Tabs, …) inherits it. Static components (Card, Badge, Text, …) ignore it;
 * size them with explicit props.
 *
 * Reference consumer: `<Input>`. Form fields resolve their size through
 * `useDensity()`; an `<Input>` (or any `<Field>`-wrapped field) inside
 * `<DensityProvider density="compact">` shrinks to `'sm'` without touching
 * its props.
 */
export function DensityProvider({ density, children }: DensityProviderProps) {
	const step = densityToSize[density]

	return (
		<DensityPrimitive scale={step}>
			<span data-slot="density" data-density={density} className="contents">
				{children}
			</span>
		</DensityPrimitive>
	)
}
