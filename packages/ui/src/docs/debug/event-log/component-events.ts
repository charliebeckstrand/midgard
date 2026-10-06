import type { JsonValue } from 'ui/json-tree'
import { getOrCompute } from '../../../utilities/get-or-compute.ts'

// The component events of the Event log: each call of an `on…` callback that
// the JSX of a page gives to a component, such as the `onValueChange` of
// `Tabs`. The docs plugin sends each such callback through `componentEvent`
// (`plugin/component-events.ts`). While no listener is set, the callback goes
// through with no change, so the log adds no cost while it is off.

type Callback = (...args: unknown[]) => unknown

/** Where a component comes from: a module of `ui`, such as `Grid`, or any other component, such as `Tabs`. */
export type Source = 'component' | 'module'

/** Receives the source, the text, and the arguments of each component event. A call with no arguments has no `detail`. */
type Listener = (source: Source, text: string, detail?: JsonValue) => void

let listener: Listener | undefined

/** Sets the listener of the component events, and returns a function that removes it. */
export function listenComponentEvents(next: Listener): () => void {
	listener = next

	return () => {
		if (listener === next) listener = undefined
	}
}

// The wrapper of each callback, by the source and the label of the call. A callback that
// keeps its identity keeps the identity of its wrapper, so the memos and the
// effects that read it do not run again.
const wrappers = new WeakMap<Callback, Map<string, Callback>>()

/**
 * The callback that a page gives to a component, wrapped while the log
 * listens, so that each call writes a line, such as
 * `Tabs onValueChange("Payment")`. The line cuts a long argument, and the
 * detail of the line holds the arguments in full. A value that is not a
 * function goes through with no change.
 *
 * @param source - Where the component comes from.
 * @param label - The component and the prop, such as `Tabs onValueChange`.
 * @param callback - The value of the prop.
 */
export function componentEvent<T>(source: Source, label: string, callback: T): T {
	if (!listener || typeof callback !== 'function') return callback

	const original = callback as Callback

	return getOrCompute(
		getOrCompute(wrappers, original, () => new Map()),
		label,
		() =>
			function (this: unknown, ...args: unknown[]) {
				const texts = args.map(serialize)

				listener?.(
					source,
					`${label}(${texts.map(cut).join(', ')})`,
					args.length > 0 ? texts.map(parse) : undefined,
				)

				return Reflect.apply(original, this, args)
			},
	) as T
}

/** The most characters of one argument in a line. A longer argument ends in `…`. */
export const ARGUMENT_LENGTH = 200

/**
 * An argument as JSON, with each event as its type, such as `<click>`, a set
 * as an array, and a map as an array of its entries.
 */
function serialize(value: unknown): string {
	try {
		return JSON.stringify(value, replace) ?? String(value)
	} catch {
		return Object.prototype.toString.call(value)
	}
}

/** An argument in a line: its JSON, cut to {@link ARGUMENT_LENGTH} characters. */
function cut(text: string): string {
	return text.length > ARGUMENT_LENGTH ? `${text.slice(0, ARGUMENT_LENGTH)}…` : text
}

/** An argument in the detail: the value of its JSON, or the text where the text is not JSON, such as `undefined`. */
function parse(text: string): JsonValue {
	try {
		return JSON.parse(text)
	} catch {
		return text
	}
}

function replace(_key: string, item: unknown): unknown {
	if (isEvent(item)) return `<${item.type}>`

	if (item instanceof Set || item instanceof Map) return [...item]

	return item
}

/** Whether a value is a DOM event, or the React event that holds one. */
function isEvent(value: unknown): value is { type: string } {
	return (
		value instanceof Event ||
		(typeof value === 'object' &&
			value !== null &&
			(value as { nativeEvent?: unknown }).nativeEvent instanceof Event)
	)
}
