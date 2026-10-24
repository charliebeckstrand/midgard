import { type DensityStep, isDensityStep } from '../../core/density/steps.ts'
import type { DefaultValue, Literal, PropApi } from '../plugin/api.ts'

// The fields of a playground, from the API data of its component. The
// playground renders them (`playground.tsx`), and `pnpm intl` reads them for
// the catalog entries of their labels and their options (`plugin/fields.ts`).

/**
 * The value of a field: a literal, or a value for each breakpoint, which only
 * the default of a responsive prop is.
 */
export type Value = DefaultValue

/** A field that picks one value of a union of literals. */
export type ChoiceField = {
	kind: 'choice'
	name: string
	values: readonly Value[]
	default?: Value
	required?: true
}

/** A field that takes any text or any number. */
export type FreeField = {
	kind: 'text' | 'number'
	name: string
	default?: string | number
	/** The value that the field starts at. A field with none starts empty. */
	start?: string | number
	/** The lowest value of a number field, from the `@minimum` tag of the prop. */
	min?: number
	/** The highest value of a number field, from the `@maximum` tag of the prop. */
	max?: number
}

/** The props that get a free field, with the value that each field starts at. */
export type Free = { readonly [prop: string]: string | number | undefined }

export type Field = ChoiceField | FreeField

/** The default of a free field: the default of the prop, when it is a value of the kind of the field. */
function resolveFreeDefault(
	kind: FreeField['kind'],
	value: DefaultValue | undefined,
): string | number | undefined {
	if (kind === 'number') return typeof value === 'number' ? value : undefined

	return typeof value === 'string' ? value : undefined
}

/** The `min` and the `max` of a number field: the `@minimum` and the `@maximum` tags of its prop. */
function getRange({ minimum, maximum }: PropApi): Pick<FreeField, 'min' | 'max'> {
	return {
		...(minimum !== undefined && { min: minimum }),
		...(maximum !== undefined && { max: maximum }),
	}
}

/**
 * The free field of a prop, or `undefined` when it gets none. A number prop
 * with a number as its default is a setting of the component, such as `max`
 * or `duration`, so it gets a number field. A number field holds its value
 * between the `@minimum` and the `@maximum` tags of the prop. A prop that
 * `free` names gets a text field or a number field by its type, and starts at
 * the value that `free` gives. A prop whose name starts with `default` sets the first state
 * of the component, so it gets a field only when `free` names it.
 */
function buildFreeField(prop: PropApi, free: Free): FreeField | undefined {
	const { name, type, defaultValue } = prop

	const range = getRange(prop)

	if (Object.hasOwn(free, name)) {
		if (type !== 'string' && type !== 'number' && type !== 'ReactNode') {
			throw new Error(
				`docs: the prop ${name} is a ${type}, and a free field takes a string or a number`,
			)
		}

		const kind = type === 'number' ? 'number' : 'text'

		const fallback = resolveFreeDefault(kind, defaultValue)

		// An empty string starts the field empty, which omits the prop.
		const start = free[name] === '' ? undefined : free[name]

		return {
			kind,
			name,
			...(fallback !== undefined && { default: fallback }),
			...(start !== undefined && { start }),
			...range,
		}
	}

	if (type !== 'number' || name.startsWith('default')) return undefined

	const fallback = resolveFreeDefault('number', defaultValue)

	return fallback === undefined
		? undefined
		: { kind: 'number', name, default: fallback, start: fallback, ...range }
}

/**
 * A field for each prop whose type is a union of literals, and for each prop
 * that `given` gives values. The default of a field is the value that the
 * component renders when the prop is omitted. A density step with no tag
 * takes the step of the scope, which is `step`. A prop of another type can
 * get a free field ({@link buildFreeField}).
 */
export function buildFields(
	props: readonly PropApi[],
	omit: readonly string[],
	given: { readonly [prop: string]: readonly Literal[] | undefined },
	free: Free,
	step: DensityStep,
): Field[] {
	return props.flatMap((prop): Field[] => {
		const { name, deprecated } = prop

		if (deprecated !== undefined || omit.includes(name)) return []

		const values = given[name] ?? prop.values

		if (!values) {
			const field = buildFreeField(prop, free)

			return field ? [field] : []
		}

		return [buildChoiceField(prop, values, step)]
	})
}

/**
 * The choice field of a prop with `values`. Its default is the default of the
 * prop when it is one of the values. A default for each breakpoint, as a
 * responsive prop can have, is the first option of the field.
 */
function buildChoiceField(
	prop: PropApi,
	values: readonly Literal[],
	step: DensityStep,
): ChoiceField {
	const { name, default: text, defaultValue, required } = prop

	const map = typeof defaultValue === 'object' ? defaultValue : undefined

	const tagged = map ?? values.find((value) => value === defaultValue)

	const fallback = tagged ?? (text === undefined && values.every(isDensityStep) ? step : undefined)

	return {
		kind: 'choice',
		name,
		values: map ? [map, ...values] : values,
		...(fallback !== undefined && { default: fallback }),
		...(required && { required }),
	}
}
