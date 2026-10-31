'use client'

import type { ReactNode } from 'react'
import type { DensityStep } from '../../core/density'
import { DensityContext } from './context'

/** Props for {@link Density}: the `step` of the scope and its `children`. */
export type DensityProps = {
	/** The step of the scope. Omit it to render the children with no scope. */
	step?: DensityStep
	children: ReactNode
}

/**
 * Opens a density scope in context: client descendants read `step` through
 * {@link useDensityStep}. With no `step`, it renders its children alone.
 *
 * @remarks
 * The context half of a scope. The `density` prop of `PolymorphicStatic`
 * (and so of Box, Card, Badge, and Table) writes `data-density` and opens
 * this context in one place. A static host can open a scope because it reads
 * nothing (REFERENCE §2).
 */
export function Density({ step, children }: DensityProps) {
	return step ? <DensityContext value={step}>{children}</DensityContext> : children
}
