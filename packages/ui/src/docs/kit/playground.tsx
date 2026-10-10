import { type ComponentType, type ReactNode, useState } from 'react'
import { Badge } from 'ui/badge'
import { cn } from 'ui/core'
import { Flex } from 'ui/flex'
import { useScrollRegion } from 'ui/hooks'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { useDensityStep } from 'ui/primitives/density'
import { type DensityStep, isDensityStep, stepDown } from '../../core/density/steps.ts'
import { omote } from '../../recipes/kiso/index.ts'
import type { BarrelApi, Literal, PropApi } from '../plugin/api.ts'
import type { ExampleCode } from '../plugin/examples.ts'
import { ExampleFrame, metaOf } from './example.tsx'
import { humanize } from './humanize.ts'

type Field = { name: string; values: readonly Literal[]; default?: Literal; required?: true }

type Values = { readonly [prop: string]: Literal | undefined }

// The key of the option of a field whose omitted state is no value. The key of
// a value is its JSON, which never is a bare word.
const UNSET = 'unset'

const SIZES: Readonly<Record<string, string>> = {
	xs: 'Extra small',
	sm: 'Small',
	md: 'Medium',
	lg: 'Large',
	xl: 'Extra large',
}

/**
 * A row of controls that stays on one line, and scrolls when the controls do
 * not fit. While it overflows, the edge with more controls behind it fades,
 * and the row is a tab stop with the name `label`.
 */
function Rail({ label, children }: { label: string; children: ReactNode }) {
	const regionRef = useScrollRegion({ label })

	return (
		<Flex ref={regionRef} gap="sm" className={cn('max-w-full whitespace-nowrap', omote.rail)}>
			{children}
		</Flex>
	)
}

function labelOf(value: Literal): string {
	if (typeof value === 'boolean') return value ? 'On' : 'Off'

	return typeof value === 'string' ? (SIZES[value] ?? humanize(value)) : String(value)
}

/**
 * A field for each prop whose type is a union of literals, and for each prop
 * that `given` gives values. The default of a field is the value that the
 * component renders when the prop is omitted. A density step with no tag
 * takes the step of the scope, which is `step`.
 */
function fieldsOf(
	props: readonly PropApi[],
	omit: readonly string[],
	given: { readonly [prop: string]: readonly Literal[] | undefined },
	step: DensityStep,
): Field[] {
	return props.flatMap(({ name, default: text, deprecated, required, ...prop }) => {
		const values = given[name] ?? prop.values

		if (!values || deprecated !== undefined || omit.includes(name)) return []

		// The tag writes the default as code, such as `'md'` or `true`.
		const tagged = values.find((value) => text === JSON.stringify(value) || text === `'${value}'`)

		const fallback =
			tagged ?? (text === undefined && values.every(isDensityStep) ? step : undefined)

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
 * prop with no default. Any other field starts unset, as the component does
 * when the omitted prop is no value.
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

/**
 * The props of the instance: each value that is not the default, so the
 * instance renders the code that "Show code" shows.
 */
function propsOf(fields: readonly Field[], values: Values): Values {
	return Object.fromEntries(
		fields.flatMap(({ name, default: fallback }) =>
			values[name] === undefined || values[name] === fallback ? [] : [[name, values[name]]],
		),
	)
}

function FieldPicker({
	field,
	step,
	value,
	onValueChange,
}: {
	field: Field
	/** The step of the page. The badge is one step below it. */
	step: DensityStep
	value: Literal | undefined
	onValueChange: (value: Literal | undefined) => void
}) {
	const label = humanize(field.name)

	// The option of the omitted prop has a "Default" badge. When the omitted
	// prop is no value, such as an Alert with no severity, that option is
	// "None". A required prop cannot be omitted.
	const unset = field.default === undefined && !field.required

	const options = [
		...(unset ? [{ key: UNSET, label: 'None', fallback: true }] : []),
		...field.values.map((option) => ({
			key: JSON.stringify(option),
			label: labelOf(option),
			fallback: option === field.default,
		})),
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
					<Flex gap="sm">
						<ListboxLabel>{option.label}</ListboxLabel>
						{option.fallback && (
							<Badge size={stepDown(step)} variant="soft" color="blue">
								Default
							</Badge>
						)}
					</Flex>
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

	const step = useDensityStep()

	const fields = fieldsOf(component.props, omit, given, step)

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
							step={step}
							value={values[field.name]}
							onValueChange={(value) => setValues({ ...values, [field.name]: value })}
						/>
					))}
				</Rail>
			}
		>
			<Instance {...propsOf(fields, values)} />
		</ExampleFrame>
	)
}
