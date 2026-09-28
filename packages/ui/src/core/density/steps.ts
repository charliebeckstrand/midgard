/**
 * The steps of density. A density scope, the `density-*` Tailwind variants,
 * and the density context all use these values.
 *
 * `sm`, `md`, and `lg` are the inner steps: a density level, and so the root
 * element and `DensityProvider`, takes one of them. `xs` and `xl` are the
 * outer steps. Only an explicit `size` or a control slot sets one of them.
 */
export const densitySteps = ['xs', 'sm', 'md', 'lg', 'xl'] as const

/** A step of density: a value of `data-density` and of the density context. */
export type DensityStep = (typeof densitySteps)[number]

/**
 * An inner step: `sm`, `md`, or `lg`. A density level maps to one, and a JS
 * reader with three values, such as the chart tick cap, clamps to one.
 */
export type InnerStep = Extract<DensityStep, 'sm' | 'md' | 'lg'>

const inner = { xs: 'sm', sm: 'sm', md: 'md', lg: 'lg', xl: 'lg' } as const satisfies Record<
	DensityStep,
	InnerStep
>

/**
 * Clamps a step to the inner steps: `xs` becomes `sm`, and `xl` becomes
 * `lg`. A client reader with three values for each step, such as the chart
 * tick cap, clamps the step that it reads through this function.
 */
export function toInnerStep(step: DensityStep): InnerStep {
	return inner[step]
}

const below = { xs: 'xs', sm: 'xs', md: 'sm', lg: 'md', xl: 'lg' } as const satisfies Record<
	DensityStep,
	DensityStep
>

/**
 * The step below `step`, and `xs` for `xs`. A control slot, such as an Input
 * prefix, is a scope at the step below its host: the rungs give it this step
 * in CSS. Thus a chip or an icon in the slot is one step smaller than the host.
 */
export function stepDown<S extends DensityStep>(step: S): (typeof below)[S] {
	return below[step]
}

/**
 * Reads a list with a value for each step, such as the `2,3,4` of
 * `density-p-[2,3,4]`. Five values give the steps from `xs` to `xl`. Three
 * values give `sm`, `md`, and `lg`, and each outer step takes the value of its
 * neighbor. It returns `null` for a list of another length.
 *
 * @internal
 */
export function valuesByStep(list: string): Record<DensityStep, string> | null {
	const values = list.split(',').map((value) => value.trim())

	if (values.length === densitySteps.length) {
		return Object.fromEntries(densitySteps.map((step, index) => [step, values[index]])) as Record<
			DensityStep,
			string
		>
	}

	if (values.length !== 3) return null

	const [sm, md, lg] = values as [string, string, string]

	return { xs: sm, sm, md, lg, xl: lg }
}
