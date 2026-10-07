'use client'

import type { ReactNode } from 'react'
import { createContext } from '../../core'
import type { DensityStep } from '../../core/density'
import { useDensityRoot } from './use-density-root'

/**
 * The density context: the step of the nearest density scope under the root,
 * or `null` outside each such scope. It carries the same value as the
 * `data-density` attribute of that scope. The root element is the scope of the
 * app, and the context does not hold it. A client component reads the context
 * only when it needs the step as a JS value. A class reads the attribute
 * through the `density-*` variants.
 */
const [DensityContext, useDensityScope] = createContext<DensityStep | null>('Density', {
	default: null,
})

/**
 * Resolves the density step of a client component: the explicit step, else
 * the step of the nearest density scope, else the step on the root element.
 * The root step is `md` on the server and in the hydration render (see
 * `useDensityRoot`).
 *
 * A component with a size scale snaps the result to its scale with
 * `snapToScale`.
 *
 * @param explicit - The `size` prop of the component, if it has one.
 * @returns The resolved step.
 */
export function useDensityStep(explicit?: DensityStep): DensityStep {
	const inherited = useDensityScope()

	const root = useDensityRoot()

	return explicit ?? inherited ?? root
}

/**
 * Reads the step of the nearest density scope under the root, or `null`
 * outside each such scope. Use it when "no scope" must differ from a step: a
 * `Portal` writes the step of its scope, and writes nothing at the root, so
 * its panel follows the root element. Each other reader uses
 * {@link useDensityStep}.
 */
export { useDensityScope }

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
