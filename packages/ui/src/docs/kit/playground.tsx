import { type ComponentType, useState } from 'react'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import type { BarrelApi, Literal, PropApi } from '../plugin/api.ts'
import type { ExampleCode } from '../plugin/examples.ts'
import { ExampleFrame, metaOf } from './example.tsx'
import { humanize } from './humanize.ts'
import { Rail } from './rail.tsx'

type Field = { name: string; values: readonly Literal[]; default?: Literal; required?: true }

type Values = { readonly [prop: string]: Literal | undefined }

// The key of the option of a field with no default. The key of a value is its
// JSON, which never is a bare word.
const UNSET = 'unset'

const SIZES: Readonly<Record<string, string>> = {
	xs: 'Extra small',
	sm: 'Small',
	md: 'Medium',
	lg: 'Large',
	xl: 'Extra large',
}

function labelOf(value: Literal): string {
	if (typeof value === 'boolean') return value ? 'On' : 'Off'

	return typeof value === 'string' ? (SIZES[value] ?? humanize(value)) : String(value)
}

/**
 * A field for each prop whose type is a union of literals, and for each prop
 * that `given` gives values.
 */
function fieldsOf(
	props: readonly PropApi[],
	omit: readonly string[],
	given: { readonly [prop: string]: readonly Literal[] | undefined },
): Field[] {
	return props.flatMap(({ name, default: text, deprecated, required, ...prop }) => {
		const values = given[name] ?? prop.values

		if (!values || deprecated !== undefined || omit.includes(name)) return []

		// The tag writes the default as code, such as `'md'` or `true`.
		const fallback = values.find((value) => text === JSON.stringify(value) || text === `'${value}'`)

		return [
			{
				name,
				values,
				...(fallback !== undefined && { default: fallback }),
				...(required && { required }),
			},
		]
	})
}

/**
 * The first value of a field: its default, or the first value of a required
 * prop with no default. Any other field starts unset.
 */
function startOf({ default: fallback, values, required }: Field): Literal | undefined {
	return fallback ?? (required ? values[0] : undefined)
}

/** A prop as a JSX attribute. */
function attribute(name: string, value: Literal): string {
	if (value === true) return name

	return typeof value === 'string' ? `${name}="${value}"` : `${name}={${value}}`
}

/**
 * The code of a playground: its file, with an attribute for each value that
 * is not the default in the place of the spread.
 */
function printCode({ code, spread }: ExampleCode, fields: readonly Field[], values: Values) {
	if (!spread) return code

	const attributes = fields.flatMap(({ name, default: fallback }) => {
		const value = values[name]

		return value === undefined || value === fallback
			? []
			: [spread.separator + attribute(name, value)]
	})

	return code.slice(0, spread.index) + attributes.join('') + code.slice(spread.index)
}

function FieldPicker({
	field,
	value,
	onValueChange,
}: {
	field: Field
	value: Literal | undefined
	onValueChange: (value: Literal | undefined) => void
}) {
	const label = humanize(field.name)

	// A field with no default can be unset, so the component takes its own
	// fallback, such as the step of the nearest density scope. A required prop
	// cannot be unset.
	const options = [
		...(field.default === undefined && !field.required ? [{ key: UNSET, label: 'Default' }] : []),
		...field.values.map((option) => ({ key: JSON.stringify(option), label: labelOf(option) })),
	]

	return (
		<Listbox<string>
			aria-label={label}
			value={value === undefined ? UNSET : JSON.stringify(value)}
			displayValue={(key) => options.find((option) => option.key === key)?.label ?? key}
			prefix={<span className="text-zinc-500 dark:text-zinc-400">{label}</span>}
			placement="bottom-auto"
			onValueChange={(key) => {
				if (key) onValueChange(field.values.find((option) => JSON.stringify(option) === key))
			}}
		>
			{options.map((option) => (
				<ListboxOption key={option.key} value={option.key}>
					<ListboxLabel>{option.label}</ListboxLabel>
				</ListboxOption>
			))}
		</Listbox>
	)
}

/**
 * The playground of a page: the default export of its `playground.tsx`, with
 * a field for each prop of its component whose type is a union of literals.
 * The fields drive this one instance. "Show code" shows the file with the
 * values that are not the defaults as attributes.
 *
 * @example
 * import api from 'virtual:docs/api/components/button'
 * import ButtonPlayground from './playground.tsx'
 *
 * <Playground of={ButtonPlayground} api={api} />
 */
export function Playground<P extends object>({
	of,
	api,
	omit = [],
	values: given = {},
	surface,
}: {
	/**
	 * The default export of the playground module. It types its props as the
	 * props of its component, and the fields give them from the API data.
	 */
	of: ComponentType<P>
	/** The API data of the barrel of the component. */
	api: BarrelApi
	/** The props that get no field. */
	omit?: readonly (keyof P & string)[]
	/**
	 * The values of the field of a prop, in order, in the place of the values
	 * from the API data. A prop whose type is not a union of literals, such as
	 * a preset or a number, gets a field from them.
	 */
	values?: { readonly [K in keyof P & string]?: readonly Literal[] }
	/** Makes the instance box fill the frame, for a surface of a page. */
	surface?: boolean
}) {
	const meta = metaOf(of)

	// The fields give each prop from the API data of the component, so the
	// values are props of it.
	const Instance = of as ComponentType<Values>

	const component = meta.component === undefined ? undefined : api[meta.component]

	if (!component) {
		throw new Error(`docs: the barrel exports no component ${meta.component} for the playground`)
	}

	const fields = fieldsOf(component.props, omit, given)

	const [values, setValues] = useState<Values>(() =>
		Object.fromEntries(fields.map((field) => [field.name, startOf(field)])),
	)

	return (
		<ExampleFrame
			meta={meta}
			print={(code) => printCode(code, fields, values)}
			surface={surface}
			actions={
				<Rail label="Props">
					{fields.map((field) => (
						<FieldPicker
							key={field.name}
							field={field}
							value={values[field.name]}
							onValueChange={(value) => setValues({ ...values, [field.name]: value })}
						/>
					))}
				</Rail>
			}
		>
			<Instance {...values} />
		</ExampleFrame>
	)
}
