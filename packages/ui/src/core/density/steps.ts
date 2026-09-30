/**
 * The steps of density. A density scope, the `density-*` Tailwind variants,
 * and the density context all use these values.
 *
 * `sm`, `md`, and `lg` are the inner steps: a density level, and so the root
 * element and `DensityProvider`, takes one of them. `xs` and `xl` are the
 * outer steps. Only an explicit `size` or a control slot sets one of them.
 */
export const densitySteps = ['xs', 'sm', 'md', 'lg', 'xl'] as const

/**
 * The class that marks each step of the root element, the scope of the app.
 * `md` is the base of each stepped class, so the root has no mark for it. A
 * scope under the root uses `data-density`. A class for each step lets
 * Chromium reject each rung of the root through its ancestor filter, except
 * the rung of the step that the root holds. The filter reads the name of a
 * class, but not the value of an attribute.
 */
export const rootDensityClasses = {
	xs: 'density-root-xs',
	sm: 'density-root-sm',
	lg: 'density-root-lg',
	xl: 'density-root-xl',
} as const satisfies Partial<Record<DensityStep, string>>

/** A step that the root marks with a class: each step but `md`. */
export type MarkedStep = keyof typeof rootDensityClasses

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

/** The steps that the root marks with a class. */
const markedSteps = Object.keys(rootDensityClasses) as MarkedStep[]

/**
 * Reads the step of the root element from its class. It returns `md` when the
 * root has no mark.
 */
export function readRootDensity(root: Element): DensityStep {
	return markedSteps.find((step) => root.classList.contains(rootDensityClasses[step])) ?? 'md'
}

/**
 * Writes `step` on the root element: it removes the class of each other step,
 * and it adds the class of `step`. For `md` the root keeps no mark.
 */
export function writeRootDensity(root: Element, step: DensityStep): void {
	for (const marked of markedSteps) {
		root.classList.toggle(rootDensityClasses[marked], marked === step)
	}
}
