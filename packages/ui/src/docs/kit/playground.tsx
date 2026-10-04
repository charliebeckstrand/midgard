import { type ComponentType, type ReactNode, useState } from 'react'
import { cn } from 'ui/core'
import { Flex } from 'ui/flex'
import { useComposedRef, useScrollOverflow, useScrollRegion } from 'ui/hooks'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { omote } from '../../recipes/kiso/index.ts'
import type { BarrelApi, Literal, PropApi } from '../plugin/api.ts'
import type { ExampleCode } from '../plugin/examples.ts'
import { ExampleFrame, metaOf } from './example.tsx'

type Field = { name: string; values: readonly Literal[]; default?: Literal }

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

/** An identifier as words in sentence case: `groupTotalRow` gives `Group total row`. */
function humanize(identifier: string): string {
	const words = identifier
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/[-_]+/g, ' ')
		.toLowerCase()

	return words.charAt(0).toUpperCase() + words.slice(1)
}

function labelOf(value: Literal): string {
	if (typeof value === 'boolean') return value ? 'On' : 'Off'

	return typeof value === 'string' ? (SIZES[value] ?? humanize(value)) : String(value)
}

/** Whether `text`, the text of a `@defaultValue` tag, writes `value`. */
function writes(text: string, value: Literal): boolean {
	return text === JSON.stringify(value) || text === `'${value}'`
}

/** A field for each prop whose type is a union of literals. */
function fieldsOf(props: readonly PropApi[], omit: readonly string[]): Field[] {
	return props.flatMap(({ name, values, default: text, deprecated }) => {
		if (!values || deprecated !== undefined || omit.includes(name)) return []

		const fallback = text === undefined ? undefined : values.find((value) => writes(text, value))

		return [{ name, values, ...(fallback !== undefined && { default: fallback }) }]
	})
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
 * The row of fields. It stays on one line and scrolls when the fields do not
 * fit. While it overflows, the edge with more fields behind it fades, and the
 * row is a tab stop.
 */
function FieldRail({ children }: { children: ReactNode }) {
	const overflowRef = useScrollOverflow({ axis: 'horizontal' })

	const regionRef = useScrollRegion({ label: 'Props' })

	const ref = useComposedRef<HTMLElement>(overflowRef, regionRef)

	return (
		<Flex
			ref={ref ?? undefined}
			gap="sm"
			className={cn('max-w-full whitespace-nowrap', omote.rail)}
		>
			{children}
		</Flex>
	)
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
	// fallback, such as the step of the nearest density scope.
	const options = [
		...(field.default === undefined ? [{ key: UNSET, label: 'Default' }] : []),
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
export function Playground({
	of,
	api,
	omit = [],
}: {
	/**
	 * The default export of the playground module. It types its props as the
	 * props of its component, and the fields give them from the API data.
	 */
	of: ComponentType<never>
	/** The API data of the barrel of the component. */
	api: BarrelApi
	/** The props that get no field. */
	omit?: readonly string[]
}) {
	const meta = metaOf(of)

	// The fields give each prop from the API data of the component, so the
	// values are props of it.
	const Instance = of as ComponentType<Values>

	const component = meta.component === undefined ? undefined : api[meta.component]

	if (!component) {
		throw new Error(`docs: the barrel exports no component ${meta.component} for the playground`)
	}

	const fields = fieldsOf(component.props, omit)

	const [values, setValues] = useState<Values>(() =>
		Object.fromEntries(fields.map((field) => [field.name, field.default])),
	)

	return (
		<ExampleFrame
			meta={meta}
			print={(code) => printCode(code, fields, values)}
			actions={
				<FieldRail>
					{fields.map((field) => (
						<FieldPicker
							key={field.name}
							field={field}
							value={values[field.name]}
							onValueChange={(value) => setValues({ ...values, [field.name]: value })}
						/>
					))}
				</FieldRail>
			}
		>
			<Instance {...values} />
		</ExampleFrame>
	)
}
