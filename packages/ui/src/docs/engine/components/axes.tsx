'use client'

import { type ReactNode, Suspense, use, useState } from 'react'
import { createContext } from '../../../core'
import { Flex } from '../../../structure/flex'
import type { ComponentApi } from '../api-reference'
import { type Axis, type AxisValue, axesOf } from '../axes'
import { Example } from './example'
import { humanize, valueLabel } from './format'
import { OptionsListbox } from './options-listbox'

/**
 * The extracted API of the barrel that the current demo page documents. The
 * page supplies the promise, and {@link Axes} reads it. The value is `null`
 * when the barrel has no API data, such as in a test run.
 */
export const [DemoApiContext, useDemoApi] = createContext<Promise<ComponentApi[]> | null>(
	'DemoApi',
	{ default: null },
)

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
	 * The title of the playground, and the prefix of each axis title: `Group`
	 * gives `Group` and `Group size`. Give it when a page has more than one
	 * `Axes`, so that no two examples share a title.
	 *
	 * @defaultValue `'Playground'`, and no prefix
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
}

/**
 * Generate the examples of each styling axis of a component from its extracted
 * API. An axis is a prop whose type is a finite set of literals.
 *
 * @remarks
 * The first example is a playground with one picker for each axis. Each next
 * example shows every value of one axis, and takes the other axes from the
 * playground. A new value in the source of the component thus shows on the
 * page with no change to the demo.
 *
 * Without API data, for example in a test run, it renders nothing.
 */
export function Axes(props: AxesProps) {
	const pending = useDemoApi()

	if (!pending) return null

	// The demo paints while the chunk of the API data loads.
	return (
		<Suspense fallback={null}>
			<AxesBody pending={pending} {...props} />
		</Suspense>
	)
}

/**
 * Read the API data, and find the component. It calls no other hook. A render
 * that suspends on `use()` replays once the data arrives, and the replay reads
 * the settled value with no `use()`. A hook after that call would then run in a
 * second place, so the state lives in {@link AxesExamples}.
 */
function AxesBody({ pending, ...props }: AxesProps & { pending: Promise<ComponentApi[]> }) {
	const api = settledValue(pending) ?? use(pending)

	const component = api.find((entry) => entry.name === props.of)

	if (!component) throw new Error(`Axes: the barrel exports no documented component "${props.of}"`)

	return <AxesExamples component={component} {...props} />
}

function AxesExamples({
	component,
	of,
	render,
	omit,
	title,
	captions = true,
}: AxesProps & { component: ComponentApi }) {
	const axes = axesOf(component, omit)

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
				title={title ?? 'Playground'}
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
				{render(propsWith(), of)}
			</Example>

			{axes.map((axis) => (
				<Example key={axis.name} title={axisTitle(axis.name, title)}>
					<Flex wrap gap="sm" align={captions ? 'start' : 'center'}>
						{axis.values.map((value) => (
							<AxisInstance key={String(value)} label={valueLabel(value)} caption={captions}>
								{render(propsWith(axis.name, value), valueLabel(value))}
							</AxisInstance>
						))}
					</Flex>
				</Example>
			))}
		</>
	)
}

/** The title of the example of one axis, with the prefix of the `Axes` when it has one. */
function axisTitle(name: string, prefix: string | undefined): string {
	return prefix ? `${prefix} ${humanize(name).toLowerCase()}` : humanize(name)
}

/**
 * The value of a promise that the registry marks as fulfilled, or `undefined`.
 * A read of a settled promise needs no `use()`. In development, `use()` inside
 * a synchronous `act` logs a warning even for a settled promise, and a page
 * that mounts `Axes` in a tab panel does exactly that.
 */
function settledValue<T>(promise: Promise<T>): T | undefined {
	const tracked = promise as Promise<T> & { status?: string; value?: T }

	return tracked.status === 'fulfilled' ? tracked.value : undefined
}

/**
 * One instance of an axis example. The `axis-value` anchor carries the label,
 * so the page gate can ask that each instance shows it. Without a caption the
 * wrapper takes no box of its own.
 *
 * The wrapper can shrink below the width of its content. An instance with a
 * fixed width and `max-w-full` thus fits a row that is narrower than that width.
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
	if (!caption) {
		return (
			<div data-slot="axis-value" data-label={label} className="contents">
				{children}
			</div>
		)
	}

	return (
		<div
			data-slot="axis-value"
			data-label={label}
			data-caption=""
			className="flex min-w-0 flex-col gap-1"
		>
			<span data-slot="axis-caption" className="text-xs text-zinc-500 dark:text-zinc-400">
				{label}
			</span>
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
