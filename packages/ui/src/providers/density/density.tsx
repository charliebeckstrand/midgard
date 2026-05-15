import type { ReactNode } from 'react'
import { ConcentricProvider } from '../../primitives/concentric'
import { DENSITY_TO_SIZE, type DensityLevel, DensityProvider } from './context'

export type DensityProps = {
	density: DensityLevel
	className?: string
	children: ReactNode
}

/**
 * Sets ambient density for descendants and broadcasts the matching
 * Concentric size so every size-aware component (Input, Button, Card, …)
 * inherits automatically — no further wiring per consumer.
 *
 * Reference consumer: `<Input>`. Form fields resolve their size through
 * `Control → Concentric`, so dropping an `<Input>` (or any
 * `<Field>`-wrapped field) inside `<Density density="compact">` shrinks the
 * field to `sm` without touching its props.
 */
export function Density({ density, className, children }: DensityProps) {
	return (
		<DensityProvider value={density}>
			<ConcentricProvider value={{ size: DENSITY_TO_SIZE[density] }}>
				<span data-slot="density" data-density={density} className={className ?? 'contents'}>
					{children}
				</span>
			</ConcentricProvider>
		</DensityProvider>
	)
}
