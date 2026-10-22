import { type DensityStep, densitySteps, type InnerStep, toInnerStep, valuesByStep } from './steps'

/**
 * A ramp: one stepped `density-*` utility with a value for each step, such as
 * `density-p-[2,3,4]` or `density-size-[3,4,5,6,6]`. A ramp is a literal class,
 * so Tailwind finds it in the source.
 */
export type Ramp = `density-${string}-[${string}]`

/** The items of a list such as `2,3,4`. */
type Items<List extends string> = List extends `${infer Head},${infer Tail}`
	? [Head, ...Items<Tail>]
	: [List]

/** The values of a ramp, in step order. */
type RampValues<R extends string> = R extends `density-${string}-[${infer List}]`
	? Items<List>
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
export type RampSteps<R extends string> = InnerStep | OuterSteps<RampValues<R>>

/**
 * A size scale: the steps that a component renders with a look of its own.
 * Make one with {@link defineScale}.
 */
export type Scale<S extends DensityStep = DensityStep> = readonly S[] & {
	readonly __scale: true
}

/**
 * A step of a scale: the type of a `size` prop that the scale drives. The type
 * is a plain union of step literals, such as `'sm' | 'md' | 'lg'`, so an editor
 * and the API reference show the steps.
 */
export type ScaleStep<T> = T extends Scale<infer S> ? StepIn<S> : never

/** Each step of `S`, in a fresh union with no alias. */
type StepIn<S> = DensityStep extends infer Step ? (Step extends S ? Step : never) : never

/** The value of each step in `ramp`. It throws for a list that is not a ramp. */
function rampValues(ramp: string): Record<DensityStep, string> {
	const list = /^density-[a-z-]+-\[(.+)\]$/.exec(ramp)?.[1]

	const values = list ? valuesByStep(list) : null

	if (!values) throw new Error(`Not a ramp with three or five values: ${ramp}`)

	return values
}

/**
 * Reads the value of `ramp` at `step`, as the ramp writes it, for example
 * `'4'` for `md` in `density-p-[2,3,4,5,6]`. A ramp gives a value for each
 * step, and it holds the clamp of an outer step. Thus a JS reader needs no
 * clamp of its own. A ramp of three values gives the value of `sm` at `xs`
 * and the value of `lg` at `xl`, as the CSS does. It throws for a list of
 * another length.
 *
 * @example
 * rampValue('density-size-[3,4,5,6,6]', 'xl') // '6'
 */
export function rampValue(ramp: Ramp, step: DensityStep): string {
	return rampValues(ramp)[step]
}

/**
 * The steps that `ramp` renders with a value of its own. It throws for a list
 * that does not have three or five values, because the utility writes no rule
 * for that list.
 *
 * @internal
 */
export function stepsOfRamp(ramp: string): DensityStep[] {
	const values = rampValues(ramp)

	return densitySteps.filter(
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

	return densitySteps.filter((step) => steps.has(step)) as unknown as Scale<RampSteps<R[number]>>
}
