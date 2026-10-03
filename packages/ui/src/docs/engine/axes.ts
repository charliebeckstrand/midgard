import { isDensityStep } from '../../core/density/steps'
import { clamp } from '../../utilities/clamp'
import { getOrCompute } from '../../utilities/get-or-compute'
import type { ComponentApi } from './api-reference'
import { valueLabel } from './components/format'
import { formSignature, lookSignature, stepSignature } from './step-signature'

/** One value of a finite prop type: a string, number, or boolean literal. */
export type AxisValue = string | number | boolean

/**
 * One styling axis of a component: a prop whose type is a finite set of
 * literals, such as `variant`, `size`, or `loading`.
 */
export type Axis = {
	name: string
	/** The literals in their source order. A `boolean` member gives `false`, then `true`. */
	values: readonly AxisValue[]
	/** The documented default, when it is one of the `values`. */
	default?: AxisValue
}

const UNSET_MEMBERS = new Set(['undefined', 'null'])

/**
 * Read one member of a type union as literals. It returns `null` for a member
 * that is not a literal, such as `ReactNode` or `number`.
 */
function parseMember(member: string): AxisValue[] | null {
	if (member === 'boolean') return [false, true]

	if (member === 'true') return [true]

	if (member === 'false') return [false]

	if (/^-?\d+(\.\d+)?$/.test(member)) return [Number(member)]

	const quoted = /^'([^']*)'$|^"([^"]*)"$/.exec(member)

	if (quoted) return [quoted[1] ?? quoted[2] ?? '']

	return null
}

/**
 * The text of a default that a `@defaultValue` tag writes as one code span,
 * such as `` `'bottom-start'` ``. Any other text returns trimmed.
 */
function unwrapCode(text: string): string {
	const trimmed = text.trim()

	return /^`[^`]+`$/.test(trimmed) ? trimmed.slice(1, -1).trim() : trimmed
}

/**
 * Read a formatted type expression as a finite list of literals. It returns
 * `null` when a member is not a literal. A union of `true` and `false` gives
 * the same order as `boolean`.
 *
 * @example
 * literalsOf("'sm' | 'md' | undefined") // ['sm', 'md']
 */
export function literalsOf(type: string): AxisValue[] | null {
	const values: AxisValue[] = []

	for (const raw of type.split('|')) {
		const member = raw.trim()

		if (UNSET_MEMBERS.has(member)) continue

		const parsed = parseMember(member)

		if (!parsed) return null

		for (const value of parsed) if (!values.includes(value)) values.push(value)
	}

	if (values.length === 0) return null

	// Show the off state first when the union holds only booleans.
	if (values.every((value) => typeof value === 'boolean')) return [false, true]

	return values
}

/**
 * The rank of the shared styling props. An axis shows in this order: the
 * variant, then the color, then the size, then the shape. A prop on one line
 * shares its rank.
 */
const AXIS_RANK: readonly (readonly string[])[] = [
	['variant'],
	['color', 'tone'],
	['size'],
	['radius', 'rounded', 'shape'],
]

/** The rank of an axis. A prop that is not a shared styling prop comes last. */
function rankOf(name: string): number {
	const rank = AXIS_RANK.findIndex((names) => names.includes(name))

	return rank === -1 ? AXIS_RANK.length : rank
}

/**
 * List the styling axes of a component from its extracted API: each prop whose
 * type is a finite set of literals. A prop in `omit` does not become an axis.
 * A deprecated prop, and a prop with one value, do not become an axis.
 *
 * @remarks
 * The shared styling props come first, in the order of {@link AXIS_RANK}.
 * Each other axis follows in the order of the props. Thus each page shows its
 * axes in the same order, whatever order the source gives its props.
 */
export function axesOf(api: ComponentApi, omit: readonly string[] = []): Axis[] {
	const axes: Axis[] = []

	for (const prop of api.props) {
		if (omit.includes(prop.name) || prop.deprecated) continue

		const values = literalsOf(prop.type)

		// One value is no choice, such as `as?: 'div'`, so it is not an axis.
		if (!values || values.length < 2) continue

		const parsed = prop.default === undefined ? null : parseMember(unwrapCode(prop.default))

		const fallback = parsed?.length === 1 ? parsed[0] : undefined

		axes.push({
			name: prop.name,
			values,
			...(fallback !== undefined && values.includes(fallback) && { default: fallback }),
		})
	}

	return axes.toSorted((a, b) => rankOf(a.name) - rankOf(b.name))
}

/**
 * Whether each value of an axis is a density step, such as the `size` of a
 * component that writes its step as a density scope.
 */
export function isStepAxis(axis: Axis): boolean {
	return axis.values.every(isDensityStep)
}

/**
 * Drop each value that renders the same as its neighbor. A stepped class of
 * three values gives `xs` the value of `sm`, and `xl` the value of `lg`. Thus
 * a component can render fewer steps than its type admits.
 *
 * @remarks
 * Equal neighbors make a run. The run keeps the value nearest the default, or
 * the middle value when the axis has no default. Thus `xs` and `sm` keep `sm`,
 * and `lg` and `xl` keep `lg`. A `null` signature is equal to no other.
 *
 * @param signatureOf - The rendered form of an instance of `value`, or `null` when it is not known.
 */
export function distinctValues(
	axis: Axis,
	signatureOf: (value: AxisValue) => string | null,
): AxisValue[] {
	const { values } = axis

	const anchor = axis.default === undefined ? (values.length - 1) / 2 : values.indexOf(axis.default)

	const signatures = values.map(signatureOf)

	const kept: AxisValue[] = []

	let start = 0

	for (let index = 0; index < values.length; index++) {
		const signature = signatures[index]

		if (signature !== null && signature === signatures[index + 1]) continue

		// The run is `start` through `index`. Keep its value nearest the anchor.
		const nearest = clamp(Math.round(anchor), start, index)

		kept.push(values[nearest] as AxisValue)

		start = index + 1
	}

	return kept
}

/**
 * Whether each instance of an axis renders alike: two or more signatures, each
 * known and each equal. A `null` signature is equal to no other.
 */
export function rendersAlike(signatures: readonly (string | null)[]): boolean {
	const [first] = signatures

	return (
		signatures.length > 1 &&
		first !== null &&
		first !== undefined &&
		signatures.every((signature) => signature === first)
	)
}

/**
 * The first read of the axes of one `Axes`, at the default values. Each field
 * is a list, so that the read can go in the HTML of a page as JSON.
 */
export type AxesRead = {
	/** The axes that change only the accessibility tree. They hide. */
	unseen: string[]
	/** The values that the example of each axis shows. */
	shown: Record<string, AxisValue[]>
	/** The axes that are not density axes and whose instances differ at the defaults. Only such an axis can become inert. */
	live: string[]
}

/**
 * The rendered forms of the instances of each axis. Each function returns
 * `null` when the instance is not known.
 */
export type AxisSignatures = {
	/** The {@link stepSignature} of an instance of a density axis, or the {@link formSignature} of another. */
	form: (axis: Axis, value: AxisValue) => string | null
	/** The {@link lookSignature} of an instance. */
	look: (axis: Axis, value: AxisValue) => string | null
}

/** The key of the wrapper of one instance: `axis:value`. */
export function instanceKey(axis: string, value: AxisValue): string {
	return `${axis}:${value}`
}

/**
 * The signatures of the instances of one `Axes`. Each signature is computed
 * one time.
 *
 * @param instances - The wrapper of each instance, keyed by {@link instanceKey}.
 */
export function signaturesIn(instances: ReadonlyMap<string, Element>): AxisSignatures {
	const signature = (
		read: (instance: Element, label: string) => string | null,
	): AxisSignatures['form'] => {
		const cache = new Map<string, string | null>()

		return (axis, value) => {
			const key = instanceKey(axis.name, value)

			const instance = instances.get(key)

			if (!instance) return null

			return getOrCompute(cache, key, () => read(instance, valueLabel(value)))
		}
	}

	const step = signature(stepSignature)

	const form = signature(formSignature)

	return {
		form: (axis, value) => (isStepAxis(axis) ? step : form)(axis, value),
		look: signature(lookSignature),
	}
}

/** Whether each instance of an axis renders alike in form. */
function formsAlike(axis: Axis, signatures: AxisSignatures): boolean {
	return rendersAlike(axis.values.map((value) => signatures.form(axis, value)))
}

/**
 * The values that the example of an axis shows: the {@link distinctValues} of
 * a density axis, no value of a live axis that renders alike at the current
 * values (inert), and each value of another axis.
 *
 * @param live - The live axes of the first read ({@link AxesRead}).
 */
export function shownValues(
	axis: Axis,
	signatures: AxisSignatures,
	live: readonly string[],
): AxisValue[] {
	if (isStepAxis(axis)) return distinctValues(axis, (value) => signatures.form(axis, value))

	return live.includes(axis.name) && formsAlike(axis, signatures) ? [] : [...axis.values]
}

/**
 * Read the axes of one `Axes` at the default values.
 *
 * @remarks
 * An axis whose instances differ in form and look the same changes only the
 * accessibility tree, so it is unseen.
 */
export function readAxes(axes: readonly Axis[], signatures: AxisSignatures): AxesRead {
	const live = axes
		.filter((axis) => !isStepAxis(axis) && !formsAlike(axis, signatures))
		.map((axis) => axis.name)

	const unseen = axes.filter(
		(axis) =>
			live.includes(axis.name) &&
			rendersAlike(axis.values.map((value) => signatures.look(axis, value))),
	)

	return {
		unseen: unseen.map((axis) => axis.name),
		shown: Object.fromEntries(axes.map((axis) => [axis.name, shownValues(axis, signatures, live)])),
		live,
	}
}
