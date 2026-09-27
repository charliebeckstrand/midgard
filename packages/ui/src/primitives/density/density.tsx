'use client'

import type { ReactNode } from 'react'
import { createContext } from '../../core'
import type { DensityStep } from '../../core/density'

/**
 * The density context: the step of the nearest density scope, or `null`
 * outside each scope. It carries the same value as the `data-density`
 * attribute of that scope. A client component reads it only when it needs
 * the step as a JS value. A class reads the attribute through the `density-*`
 * variants.
 */
const [DensityContext, useDensityNullable] = createContext<DensityStep | null>('Density', {
	default: null,
})

/**
 * Resolves the density step of a client component: the explicit step, else
 * the step of the nearest density scope, else `md`.
 *
 * A component with a three-step size axis clamps the result with
 * `toAmbientStep` from `ui/core`.
 *
 * @param explicit - The `size` prop of the component, if it has one.
 * @returns The resolved step.
 */
export function useDensityStep(explicit?: DensityStep): DensityStep {
	const inherited = useDensityNullable()

	return explicit ?? inherited ?? 'md'
}

/**
 * Reads the step of the nearest density scope, or `null` outside each scope.
 * Use it when "no scope" must differ from `md`. Each other reader uses
 * {@link useDensityStep}.
 */
export { useDensityNullable }

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
