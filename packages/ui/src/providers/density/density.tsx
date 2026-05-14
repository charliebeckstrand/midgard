import type { ReactNode } from 'react'
import { ConcentricProvider } from '../../primitives'
import type { Step } from '../../recipes/ryu/sun'
import { DensityProvider, type DensityTier } from './context'

const DENSITY_TO_SIZE: Record<DensityTier, Step> = {
	comfortable: 'lg',
	snug: 'md',
	compact: 'sm',
}

export type DensityProps = {
	density: DensityTier
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
