import { type ComponentType, type ReactNode, useState } from 'react'
import { Badge } from 'ui/badge'
import { cn } from 'ui/core'
import { Flex } from 'ui/flex'
import { useScrollRegion } from 'ui/hooks'
import { Input } from 'ui/input'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { NumberInput } from 'ui/number-input'
import { useDensityStep } from 'ui/primitives/density'
import { type DensityStep, isDensityStep, stepDown } from '../../core/density/steps.ts'
import { omote } from '../../recipes/kiso/index.ts'
import type { BarrelApi, Literal, PropApi } from '../plugin/api.ts'
import type { ExampleCode } from '../plugin/examples.ts'
import { ExampleFrame, metaOf } from './example.tsx'
import { humanize } from './humanize.ts'

/** A field that picks one value of a union of literals. */
type ChoiceField = {
	kind: 'choice'
	name: string
	values: readonly Literal[]
	default?: Literal
	required?: true
}

/** A field that takes any text or any number. */
type FreeField = {
	kind: 'text' | 'number'
	name: string
	default?: string | number
	/** The value that the field starts at. A field with none starts empty. */
	start?: string | number
}

/** The props that get a free field, with the value that each field starts at. */
type Free = { readonly [prop: string]: string | number | undefined }

type Field = ChoiceField | FreeField

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

/** The default of a free field: the code of the tag, as a number or as the text in its quotes. */
function freeDefaultOf(
	kind: FreeField['kind'],
	text: string | undefined,
): string | number | undefined {
	if (text === undefined) return undefined

	if (kind === 'number') {
		const value = Number(text)

		return text.trim() !== '' && Number.isFinite(value) ? value : undefined
	}

	return /^(['"`])(.*)\1$/s.exec(text)?.[2]
}

/**
 * The free field of a prop, or `undefined` when it gets none. A number prop
 * with a number as its default is a setting of the component, such as `max`
 * or `duration`, so it gets a number field. A prop that `free` names gets a
 * text field or a number field by its type, and starts at the value that
 * `free` gives. A prop whose name starts with `default` sets the first state
 * of the component, so it gets a field only when `free` names it.
 */
function freeFieldOf(prop: PropApi, free: Free): FreeField | undefined {
	const { name, type, default: text } = prop

	if (Object.hasOwn(free, name)) {
		if (type !== 'string' && type !== 'number' && type !== 'ReactNode') {
			throw new Error(
				`docs: the prop ${name} is a ${type}, and a free field takes a string or a number`,
			)
		}

		const kind = type === 'number' ? 'number' : 'text'

		const fallback = freeDefaultOf(kind, text)

		// An empty string starts the field empty, which omits the prop.
		const start = free[name] === '' ? undefined : free[name]

		return {
			kind,
			name,
			...(fallback !== undefined && { default: fallback }),
			...(start !== undefined && { start }),
		}
	}

	if (type !== 'number' || name.startsWith('default')) return undefined

	const fallback = freeDefaultOf('number', text)

	return fallback === undefined
		? undefined
		: { kind: 'number', name, default: fallback, start: fallback }
}

/**
 * A field for each prop whose type is a union of literals, and for each prop
 * that `given` gives values. The default of a field is the value that the
 * component renders when the prop is omitted. A density step with no tag
 * takes the step of the scope, which is `step`. A prop of another type can
 * get a free field ({@link freeFieldOf}).
 */
function fieldsOf(
	props: readonly PropApi[],
	omit: readonly string[],
	given: { readonly [prop: string]: readonly Literal[] | undefined },
	free: Free,
	step: DensityStep,
): Field[] {
	return props.flatMap((prop): Field[] => {
		const { name, default: text, deprecated, required } = prop

		if (deprecated !== undefined || omit.includes(name)) return []

		const values = given[name] ?? prop.values

		if (!values) {
			const field = freeFieldOf(prop, free)

			return field ? [field] : []
		}

		// The tag writes the default as code, such as `'md'` or `true`.
		const tagged = values.find((value) => text === JSON.stringify(value) || text === `'${value}'`)

		const fallback =
			tagged ?? (text === undefined && values.every(isDensityStep) ? step : undefined)

		return [
			{
				kind: 'choice',
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
 * when the omitted prop is no value. A free field starts at its start.
 */
function startOf(field: Field): Literal | undefined {
	if (field.kind !== 'choice') return field.start

	return field.default ?? (field.required ? field.values[0] : undefined)
}

/** A prop as a JSX attribute. A string with a quote in it goes in braces. */
function attribute(name: string, value: Literal): string {
	if (value === true) return name

	if (typeof value !== 'string') return `${name}={${value}}`

	return value.includes('"') ? `${name}={${JSON.stringify(value)}}` : `${name}="${value}"`
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

/** The prefix of a field: the name of its prop. */
function FieldLabel({ label }: { label: string }) {
	return <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
}

/**
 * A text field or a number field. An empty field omits the prop, and its
 * placeholder shows the default.
 */
function FreePicker({
	field,
	value,
	onValueChange,
}: {
	field: FreeField
	value: Literal | undefined
	onValueChange: (value: Literal | undefined) => void
}) {
	const label = humanize(field.name)

	const placeholder = field.default === undefined ? undefined : String(field.default)

	if (field.kind === 'number') {
		return (
			<NumberInput
				aria-label={label}
				prefix={<FieldLabel label={label} />}
				placeholder={placeholder}
				className="w-44 shrink-0"
				value={typeof value === 'number' ? value : null}
				onValueChange={(next) => onValueChange(next ?? undefined)}
			/>
		)
	}

	return (
		<Input
			aria-label={label}
			prefix={<FieldLabel label={label} />}
			placeholder={placeholder}
			className="w-56 shrink-0"
			value={typeof value === 'string' ? value : ''}
			onChange={(event) =>
				onValueChange(event.target.value === '' ? undefined : event.target.value)
			}
		/>
	)
}

function FieldPicker({
	field,
	step,
	value,
	onValueChange,
}: {
	field: ChoiceField
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
			prefix={<FieldLabel label={label} />}
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
 * A number prop with a number as its default, such as `max`, gets a number
 * field, and `free` names more props that get a text or a number field. The
 * fields drive this one instance. "Show code" shows the file with the values
 * that are not the defaults as attributes.
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
	free = {},
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
	/**
	 * The props that get a text field or a number field, by their type: a
	 * string, a number, or a node, which takes text. Use it for a prop that a
	 * reader changes to see the result, such as a title or a `value`. Each
	 * field starts at the value here, and an empty string starts it empty. Give
	 * the start here and not in the playground file, so "Show code" shows it.
	 */
	free?: { readonly [K in keyof P & string]?: string | number }
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

	const fields = fieldsOf(component.props, omit, given, free, step)

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
					{fields.map((field) => {
						const handleValueChange = (value: Literal | undefined) =>
							setValues({ ...values, [field.name]: value })

						return field.kind === 'choice' ? (
							<FieldPicker
								key={field.name}
								field={field}
								step={step}
								value={values[field.name]}
								onValueChange={handleValueChange}
							/>
						) : (
							<FreePicker
								key={field.name}
								field={field}
								value={values[field.name]}
								onValueChange={handleValueChange}
							/>
						)
					})}
				</Rail>
			}
		>
			<Instance {...propsOf(fields, values)} />
		</ExampleFrame>
	)
}
