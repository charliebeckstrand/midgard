import type { ReactNode } from 'react'
import { Density as DensityPrimitive } from '../../primitives/density'
import { type DensityLevel, DensityProvider, densityToSize } from './context'

export type DensityProps = {
	density: DensityLevel
	className?: string
	children: ReactNode
}

/**
 * Friendly t-shirt-named density wrapper (`compact` / `snug` / `loose`) that
 * sets the ambient density for descendants and broadcasts the matching
 * `Step` value through the universal Density primitive so every size-aware
 * component (Input, Button, Card, …) inherits automatically.
 *
 * Reference consumer: `<Input>`. Form fields resolve their size through
 * `useDensity()`, so dropping an `<Input>` (or any `<Field>`-wrapped field)
 * inside `<Density density="compact">` shrinks the field to `'sm'` without
 * touching its props.
 */
export function Density({ density, className, children }: DensityProps) {
	const step = densityToSize[density]

	return (
		<DensityProvider value={density}>
			<DensityPrimitive density={step} size={step}>
				<span data-slot="density" data-density={density} className={className ?? 'contents'}>
					{children}
				</span>
			</DensityPrimitive>
		</DensityProvider>
	)
}
