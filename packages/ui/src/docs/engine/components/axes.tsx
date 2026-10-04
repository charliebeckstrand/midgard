import { type ComponentProps, type ReactNode, useState } from 'react'
import { createContext, dataAttr } from '../../../core'
import { Flex } from '../../../structure/flex'
import type { ComponentApi } from '../api-reference'
import { type Axis, type AxisValue, axesOf } from '../axes'
import { noAutofill } from '../no-autofill'
import { Example } from './example'
import { humanize, valueLabel } from './format'
import { OptionsListbox } from './options-listbox'

/**
 * The extracted API of the barrel that the current demo page documents. The
 * page supplies it from the data of its route, and {@link Axes} reads it. The
 * value is `null` when the page has no barrel, such as in a test run.
 */
export const [DemoApiContext, useDemoApi] = createContext<ComponentApi[] | null>('DemoApi', {
	default: null,
})

/**
 * The props that {@link Axes} gives to its `render` function. The keys and the
 * values come from the extracted API at run time, so the type accepts a spread
 * onto any component.
 */
export type AxisProps = { readonly [prop: string]: never }

/**
 * Render one instance of the component for a set of axis values.
 *
 * @param props - The axis values. Spread them onto the component.
 * @param label - A short text for the instance: the {@link valueLabel} of the value that the section shows, or the component name.
 */
export type AxisRender = (props: AxisProps, label: string) => ReactNode

type AxesProps = {
	/** The name of the component in its barrel, such as `Button`. */
	of: string
	/** Render one instance. It runs in the render of {@link Axes}, so it must not call a hook. */
	render: AxisRender
	/** The props that do not become an axis. */
	omit?: readonly string[]
	/**
	 * The values to show for an axis, in place of each value of its type. Give
	 * it when a value renders as its neighbor in the composition of `render`,
	 * such as the `xs` of a group of inputs, which take `sm`.
	 */
	values?: { readonly [prop: string]: readonly AxisValue[] }
	/**
	 * The title of the playground, and the prefix of each axis title: `Group`
	 * gives `Group` and `Group size`. On a page with more than one `Axes`,
	 * give it to each `Axes` after the first, so that no two examples share a
	 * title.
	 *
	 * @defaultValue no title, and no prefix
	 */
	title?: string
	/**
	 * Show the label of each value above its instance in the axis examples, so
	 * that a reader sees which value each instance shows. Give `false` when
	 * `render` shows `label` itself, such as the text of a button.
	 *
	 * @defaultValue true
	 */
	captions?: boolean
	/**
	 * The size of each frame, as on {@link Example}. Give it when the custom
	 * examples of the page share a sized frame, so that the generated examples
	 * show the component at the same width.
	 */
	frame?: Pick<ComponentProps<typeof Example>, 'surface' | 'width' | 'minWidth' | 'resize'>
}

/**
 * Generate the examples of each styling axis of a component from its extracted
 * API. An axis is a prop whose type is a finite set of literals.
 *
 * @remarks
 * The first example is a playground with one picker for each axis. Each next
 * example shows every value of one axis, in the flow of {@link Example}, and takes the other
 * axes from the playground. A new value in the source of the component thus shows on the
 * page with no change to the demo.
 *
 * The values come from the type of each prop, in source order, so the page
 * needs no read of the DOM. An axis that changes only the accessibility tree,
 * such as the heading level of a title, has nothing to show: give it in
 * `omit`. The API reference still lists the prop.
 *
 * Without API data, for example in a test run, it renders nothing.
 */
export function Axes(props: AxesProps) {
	const api = useDemoApi()

	if (!api) return null

	const component = api.find((entry) => entry.name === props.of)

	if (!component) throw new Error(`Axes: the barrel exports no documented component "${props.of}"`)

	return <AxesExamples component={component} {...props} />
}

function AxesExamples({
	component,
	of,
	render,
	omit,
	values,
	title,
	captions = true,
	frame,
}: AxesProps & { component: ComponentApi }) {
	const axes = axesOf(component, omit).map((axis) => {
		const only = values?.[axis.name]

		return only ? { ...axis, values: axis.values.filter((value) => only.includes(value)) } : axis
	})

	const [state, setState] = useState<Record<string, AxisValue | undefined>>(() =>
		Object.fromEntries(axes.map((axis) => [axis.name, axis.default])),
	)

	const propsWith = (name?: string, value?: AxisValue) => {
		const merged = name === undefined ? state : { ...state, [name]: value }

		// An unset axis stays out of the props, so the derived code omits it.
		return Object.fromEntries(
			Object.entries(merged).filter(([, v]) => v !== undefined),
		) as AxisProps
	}

	return (
		<>
			<Example
				{...frame}
				title={title}
				actions={
					<Flex wrap gap="sm">
						{axes.map((axis) => (
							<AxisPicker
								key={axis.name}
								axis={axis}
								value={state[axis.name]}
								onValueChange={(value) => setState((prev) => ({ ...prev, [axis.name]: value }))}
							/>
						))}
					</Flex>
				}
			>
				{/* A playground field gets no autofill and no typing suggestions. The
				    wrapper takes no box, and the derived code skips it. */}
				<div ref={noAutofill} className="contents">
					{render(propsWith(), of)}
				</div>
			</Example>

			{/* An example with one value has nothing to compare, so it hides. */}
			{axes.map(
				(axis) =>
					axis.values.length > 1 && (
						<Example key={axis.name} {...frame} title={axisTitle(axis.name, title)}>
							{/* Each instance is a child of the frame, so it takes the instance box and the flow of the frame. */}
							{axis.values.map((value) => (
								<AxisInstance key={String(value)} label={valueLabel(value)} caption={captions}>
									{render(propsWith(axis.name, value), valueLabel(value))}
								</AxisInstance>
							))}
						</Example>
					),
			)}
		</>
	)
}

/** The title of the example of one axis, with the prefix of the `Axes` when it has one. */
function axisTitle(name: string, prefix: string | undefined): string {
	return prefix ? `${prefix} ${humanize(name).toLowerCase()}` : humanize(name)
}

/**
 * One instance of an axis example. The `axis-value` anchor carries the label,
 * so the page gate can ask that each instance shows it. The wrapper is a block
 * in the instance box of the frame, so the instance takes the width that the
 * same child takes in a custom example, with or without a caption.
 */
function AxisInstance({
	label,
	caption,
	children,
}: {
	label: string
	caption: boolean
	children: ReactNode
}) {
	return (
		<div data-slot="axis-value" data-label={label} data-caption={dataAttr(caption)}>
			{caption && (
				<span
					data-slot="axis-caption"
					className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400"
				>
					{label}
				</span>
			)}
			{children}
		</div>
	)
}

// The option key of an unset axis. A literal key is `JSON.stringify` of the
// value, which always starts with a quote, a digit, a minus, `t`, or `f`.
const UNSET = 'unset'

function AxisPicker({
	axis,
	value,
	onValueChange,
}: {
	axis: Axis
	value: AxisValue | undefined
	onValueChange: (value: AxisValue | undefined) => void
}) {
	// An axis with no documented default offers an unset option, so the component
	// takes its own fallback, such as the step of the nearest density scope.
	const options = [
		...(axis.default === undefined ? [{ value: UNSET, label: 'Default' }] : []),
		...axis.values.map((v) => ({ value: JSON.stringify(v), label: valueLabel(v) })),
	]

	return (
		<OptionsListbox
			options={options}
			label={humanize(axis.name)}
			prefix={<span className="text-zinc-500 dark:text-zinc-400">{humanize(axis.name)}</span>}
			value={value === undefined ? UNSET : JSON.stringify(value)}
			onValueChange={(key) => onValueChange(key === UNSET ? undefined : JSON.parse(key))}
		/>
	)
}
