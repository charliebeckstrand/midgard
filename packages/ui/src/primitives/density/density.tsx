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
 * only when it needs the step as a JS value. A stepped `density-*` class reads
 * the step in CSS.
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
 * Use the result only to compare or to key, or to give a scope to a
 * descendant. For a value at the step, read the ramp or `geometry.ts`, which
 * give a value for each step. Do not choose a scope from the result. The CSS
 * chooses it.
 *
 * In a control slot (`data-density="slot"`), the result is the step of the
 * host, and not the step that the CSS paints, which is one step lower. A slot
 * opens no context, so a panel that it opens keeps the step of the host. A
 * reader that must paint at the step of the slot needs its own scope.
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
