/**
 * The steps of density. A density scope, the `density-*` Tailwind variants,
 * and the density context all use these values.
 *
 * `sm`, `md`, and `lg` are the ambient steps: the root element and
 * `DensityProvider` take one of them. `xs` and `xl` are the outer steps. Only an explicit `size` or a
 * stepped-down slot sets one of them.
 */
export const densitySteps = ['xs', 'sm', 'md', 'lg', 'xl'] as const

/** A step of density: a value of `data-density` and of the density context. */
export type DensityStep = (typeof densitySteps)[number]

/** An ambient step: the three steps that a three-step size axis takes. */
export type AmbientStep = Extract<DensityStep, 'sm' | 'md' | 'lg'>

const ambient = { xs: 'sm', sm: 'sm', md: 'md', lg: 'lg', xl: 'lg' } as const satisfies Record<
	DensityStep,
	AmbientStep
>

/**
 * Clamps a step to the ambient steps: `xs` becomes `sm`, and `xl` becomes
 * `lg`. A client reader with three values for each step, such as the chart
 * tick cap, clamps the step that it reads through this function.
 */
export function toAmbientStep(step: DensityStep): AmbientStep {
	return ambient[step]
}

const below = { xs: 'xs', sm: 'xs', md: 'sm', lg: 'md', xl: 'lg' } as const satisfies Record<
	DensityStep,
	DensityStep
>

/**
 * The step below `step`, and `xs` for `xs`. A control slot, such as an Input
 * prefix, is a scope at the step below its host. The rungs give it this step
 * in CSS, and `DensitySlot` gives it in context. Thus a chip or an icon in the
 * slot is one step smaller than the host.
 */
export function stepDown<S extends DensityStep>(step: S): (typeof below)[S] {
	return below[step]
}
