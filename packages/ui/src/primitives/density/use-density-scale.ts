'use client'

import { type Scale, snapStep } from '../../core/density/scale'
import type { DensityStep, InnerStep } from '../../core/density/steps'
import { useDensityScope } from './context'

/**
 * The density scope of a component whose scale does not hold each step: the
 * `size` prop, or the inner neighbor of the step of the `size` or of the
 * nearest scope when the scale does not hold that step. Give the result to
 * the `density` prop of the root of the component.
 *
 * @remarks
 * A component that reads a shared ramp, such as a button or a text ramp,
 * renders each step of that ramp in a scope at that step. A component whose
 * scale holds only `sm`, `md`, and `lg` thus opens its own scope at its inner
 * step in an `xs` or `xl` scope, so each ramp in it takes a step of its scale.
 *
 * With no `size`, in a scope that the scale holds or at the root, the result
 * is `undefined`, and the component opens no scope. The root step is always an inner step,
 * and only a scope gives an outer step. The context of a scope is the same on
 * the server and in the hydration render, so the result does not change at
 * hydration.
 *
 * @param scale - The size scale of the component.
 * @param explicit - The `size` prop of the component, if it has one.
 * @returns The step of the scope of the component, or `undefined` for no scope.
 */
export function useDensityScale<S extends DensityStep>(
	scale: Scale<S>,
	explicit: DensityStep | undefined,
): S | InnerStep | undefined {
	const scope = useDensityScope()

	const step = explicit ?? scope

	if (step === null) return undefined

	const snapped = snapStep(scale, step)

	// A step of the scale keeps the scope that it comes from: the `size` of
	// the component, or the scope above it.
	return explicit === undefined && snapped === step ? undefined : snapped
}
