'use client'

import {
	type ComponentProps,
	type ReactNode,
	type Ref,
	Suspense,
	use,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { createContext, dataAttr } from '../../../core'
import { Flex } from '../../../structure/flex'
import type { ComponentApi } from '../api-reference'
import {
	type AxesRead,
	type Axis,
	type AxisValue,
	axesOf,
	instanceKey,
	isStepAxis,
	readAxes,
	shownValues,
	signaturesIn,
} from '../axes'
import { useAxesPrerender } from '../axes-prerender'
import { noAutofill } from '../no-autofill'
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
	/**
	 * The size of each frame, as on {@link Example}. Give it when the custom
	 * examples of the page share a sized frame, so that the generated examples
	 * show the component at the same width.
	 */
	frame?: Pick<ComponentProps<typeof Example>, 'width' | 'minWidth' | 'resize'>
}

/**
 * Generate the examples of each styling axis of a component from its extracted
 * API. An axis is a prop whose type is a finite set of literals.
 *
 * @remarks
 * The first example is a playground with one picker for each axis. Each next
 * example shows every value of one axis, one to a line, and takes the other
 * axes from the playground. A new value in the source of the component thus shows on the
 * page with no change to the demo.
 *
 * An axis of density steps shows only the steps that render distinctly. A
 * value that renders as its neighbor drops from the example and from the
 * picker ({@link distinctValues}).
 *
 * The other axes can make an axis inert, such as an `orientation` that a
 * variant ignores. When the instances of an axis differ at the defaults and
 * render alike at the current values, its example hides
 * ({@link rendersAlike}). Its picker keeps each value. An axis whose
 * instances render alike at the defaults stays, because its effect shows only
 * in a later state, such as the panel of a closed dialog. An example with one
 * value also hides.
 *
 * An axis that changes only the accessibility tree has nothing to show, such
 * as the heading level of a title or an unstyled `aria-*` attribute. When its
 * instances differ in form and look the same at the defaults
 * ({@link lookSignature}), its example and its picker hide. The API reference
 * still lists the prop.
 *
 * Without API data, for example in a test run, it renders nothing.
 */
export function Axes(props: AxesProps) {
	const pending = useDemoApi()

	if (!pending) return null

	// The page waits for the API data (`DemoPage`), so the data is ready here,
	// except after a failure and a retry.
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
	frame,
}: AxesProps & { component: ComponentApi }) {
	const all = axesOf(component, omit)

	const id = useId()

	const prerender = useAxesPrerender()

	// The first pass of the build takes the axes (`AxesPrerender`).
	prerender?.collect?.set(id, all)

	// The first read, from the build or from the first layout effect. Its unseen
	// axes hide, and its live axes can become inert.
	const [read, setRead] = useState<AxesRead | null>(() => prerender?.reads?.[id] ?? null)

	const axes = read ? all.filter((axis) => !read.unseen.includes(axis.name)) : all

	const [state, setState] = useState<Record<string, AxisValue | undefined>>(() =>
		Object.fromEntries(all.map((axis) => [axis.name, axis.default])),
	)

	// The wrapper of each instance, keyed by `instanceKey`.
	const instances = useRef(new Map<string, Element>())

	// The values that the example of each axis shows. An axis with no entry
	// shows each value until the next read.
	const [shown, setShown] = useState<Record<string, AxisValue[]>>(() => read?.shown ?? {})

	// Read each axis with no entry after the commit, before the paint.
	useLayoutEffect(() => {
		const unread = axes.filter((axis) => !shown[axis.name])

		if (unread.length === 0) return

		const signatures = signaturesIn(instances.current)

		const current = read ?? readAxes(unread, signatures)

		if (!read) setRead(current)

		const next = unread.map((axis) => [axis.name, shownValues(axis, signatures, current.live)])

		setShown((prev) => ({ ...prev, ...Object.fromEntries(next) }))
	})

	const valuesOf = (axis: Axis) => shown[axis.name] ?? axis.values

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
				title={title ?? 'Playground'}
				actions={
					<Flex wrap gap="sm">
						{axes.map((axis) => (
							<AxisPicker
								key={axis.name}
								axis={axis}
								values={isStepAxis(axis) ? valuesOf(axis) : axis.values}
								value={state[axis.name]}
								onValueChange={(value) => {
									setState((prev) => ({ ...prev, [axis.name]: value }))

									// The example of each other axis takes the new value, so its read is
									// stale. The example of this axis does not read its own value.
									setShown(({ [axis.name]: own }) => (own ? { [axis.name]: own } : {}))
								}}
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
					valuesOf(axis).length > 1 && (
						<Example key={axis.name} {...frame} title={axisTitle(axis.name, title)}>
							{/* Each instance is a child of the frame, so it takes the instance box of the frame, one to a line. */}
							{valuesOf(axis).map((value) => (
								<AxisInstance
									key={String(value)}
									axes={id}
									axis={axis.name}
									value={value}
									label={valueLabel(value)}
									caption={captions}
									ref={(element) => {
										if (element) instances.current.set(instanceKey(axis.name, value), element)
									}}
								>
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
 * so the page gate can ask that each instance shows it. The wrapper is a block
 * in the instance box of the frame, so the instance takes the width that the
 * same child takes in a custom example, with or without a caption.
 */
function AxisInstance({
	axes,
	axis,
	value,
	label,
	caption,
	ref,
	children,
}: {
	/** The `useId` of the `Axes`. With `axis` and `value`, it is for the read of the build (`readPrerenderedAxes`). */
	axes: string
	axis: string
	value: AxisValue
	label: string
	caption: boolean
	ref?: Ref<HTMLDivElement> | undefined
	children: ReactNode
}) {
	return (
		<div
			ref={ref}
			data-slot="axis-value"
			data-axes={axes}
			data-axis={axis}
			data-value={String(value)}
			data-label={label}
			data-caption={dataAttr(caption)}
		>
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
	values,
	value,
	onValueChange,
}: {
	axis: Axis
	/** The values to offer: the values of the axis that render distinctly. */
	values: readonly AxisValue[]
	value: AxisValue | undefined
	onValueChange: (value: AxisValue | undefined) => void
}) {
	// The picker keeps its current value as an option. Another axis can make that
	// value render the same as a neighbor after the reader picks it.
	const offered = axis.values.filter((v) => values.includes(v) || v === value)

	// An axis with no documented default offers an unset option, so the component
	// takes its own fallback, such as the step of the nearest density scope.
	const options = [
		...(axis.default === undefined ? [{ value: UNSET, label: 'Default' }] : []),
		...offered.map((v) => ({ value: JSON.stringify(v), label: valueLabel(v) })),
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
