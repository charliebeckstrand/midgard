'use client'

import type { DensityStep } from '../../core/density'
import { useDensityScope } from './context'
import { useDensityRoot } from './use-density-root'

/**
 * Resolves the density step of a client component. It is the explicit step,
 * else the step of the nearest density scope, else the step on the root
 * element.
 * The root step is `md` on the server and in the hydration render (see
 * `useDensityRoot`).
 *
 * Use the result only to compare or to key, or to give a scope to a
 * descendant. For a value at the step, read the ramp with `rampValue`, or
 * `geometry.ts`. Each gives a value for each step. Do not choose a scope from
 * the result. The CSS chooses it.
 *
 * In a control slot (`data-density="slot"`), the result is the step of the
 * host. The CSS paints the slot one step lower. A slot
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
