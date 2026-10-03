import { type DensityStep, type InnerStep, toInnerStep, valuesByStep } from './steps'

/**
 * A ramp: one stepped `density-*` utility with a value for each step, such as
 * `density-p-[2,3,4]` or `density-size-[3,4,5,6,6]`. A ramp is a literal class,
 * so Tailwind finds it in the source.
 */
export type Ramp = `density-${string}-[${string}]`

/** The items of a list such as `2,3,4`. */
type Split<List extends string> = List extends `${infer Head},${infer Tail}`
	? [Head, ...Split<Tail>]
	: [List]

/** The values of a ramp, in step order. */
type ValuesOf<R extends string> = R extends `density-${string}-[${infer List}]`
	? Split<List>
	: never

/** The outer steps of five values that differ from their inner neighbor. */
type OuterSteps<Values> = Values extends [infer XS, infer SM, unknown, infer LG, infer XL]
	? (XS extends SM ? never : 'xs') | (XL extends LG ? never : 'xl')
	: never

/**
 * The steps that a ramp renders with a value of its own. Three values give
 * `sm`, `md`, and `lg`. Five values also give `xs` when its value differs from
 * the `sm` value, and `xl` when its value differs from the `lg` value.
 */
export type RampSteps<R extends string> = InnerStep | OuterSteps<ValuesOf<R>>

/**
 * A size scale: the steps that a component renders with a look of its own.
 * Make one with {@link defineScale}.
 */
export type Scale<S extends DensityStep = DensityStep> = readonly S[] & {
	readonly __scale: true
}

/** A step of a scale: the type of a `size` prop that the scale drives. */
export type ScaleStep<T> = T extends Scale<infer S> ? S : never

/** The steps in the order of `densitySteps`. */
const order: readonly DensityStep[] = ['xs', 'sm', 'md', 'lg', 'xl']

/**
 * The steps that `ramp` renders with a value of its own. It throws for a list
 * that does not have three or five values, because the utility writes no rule
 * for that list.
 *
 * @internal
 */
export function stepsOfRamp(ramp: string): DensityStep[] {
	const list = /^density-[a-z-]+-\[(.+)\]$/.exec(ramp)?.[1]

	const values = list ? valuesByStep(list) : null

	if (!values) throw new Error(`Not a ramp with three or five values: ${ramp}`)

	return order.filter(
		(step) => step === toInnerStep(step) || values[step] !== values[toInnerStep(step)],
	)
}

/**
 * Makes the size scale of a component from the ramps that its `size` drives.
 * The scale holds each step at which one ramp at least has a value of its own,
 * so each step of the scale renders with a look of its own. Type the `size`
 * prop with {@link ScaleStep}, so the prop offers only those steps.
 *
 * @example
 * const scale = defineScale('density-text-[sm,base,lg]', 'density-size-[3,4,5,6,6]')
 * type Size = ScaleStep<typeof scale> // 'xs' | 'sm' | 'md' | 'lg'
 */
export function defineScale<const R extends readonly Ramp[]>(
	...ramps: R
): Scale<RampSteps<R[number]>> {
	const steps = new Set(ramps.flatMap(stepsOfRamp))

	return order.filter((step) => steps.has(step)) as unknown as Scale<RampSteps<R[number]>>
}

/**
 * Snaps `step` to the nearest step of `scale`. A step of the scale stays. An
 * outer step that the scale does not hold becomes its inner neighbor: `xs`
 * becomes `sm`, and `xl` becomes `lg`.
 */
export function snapToScale<S extends DensityStep>(step: DensityStep, scale: Scale<S>): S {
	return (scale as readonly DensityStep[]).includes(step) ? (step as S) : (toInnerStep(step) as S)
}
