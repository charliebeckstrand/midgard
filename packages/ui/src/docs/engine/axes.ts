import { densitySteps } from '../../core/density'
import { clamp } from '../../utilities/clamp'
import type { ComponentApi } from './api-reference'

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
 * List the styling axes of a component from its extracted API: each prop whose
 * type is a finite set of literals, in the order of the props. A prop in `omit`
 * does not become an axis. A deprecated prop, and a prop with one value, do not
 * become an axis.
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

	return axes
}

/**
 * Whether each value of an axis is a density step, such as the `size` of a
 * component that writes its step as a density scope.
 */
export function isStepAxis(axis: Axis): boolean {
	return axis.values.every((value) => (densitySteps as readonly AxisValue[]).includes(value))
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
