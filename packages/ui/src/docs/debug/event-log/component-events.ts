import { getOrCompute } from '../../../utilities/get-or-compute.ts'

// The component events of the Event log: each call of an `on…` callback that
// the JSX of a page gives to a component, such as the `onValueChange` of
// `Tabs`. The docs plugin sends each such callback through `componentEvent`
// (`plugin/component-events.ts`). While no listener is set, the callback goes
// through with no change, so the log adds no cost while it is off.

type Callback = (...args: unknown[]) => unknown

/** Receives the text of each component event. */
type Listener = (text: string) => void

let listener: Listener | undefined

/** Sets the listener of the component events, and returns a function that removes it. */
export function listenComponentEvents(next: Listener): () => void {
	listener = next

	return () => {
		if (listener === next) listener = undefined
	}
}

// The wrapper of each callback, by the label of the call. A callback that
// keeps its identity keeps the identity of its wrapper, so the memos and the
// effects that read it do not run again.
const wrappers = new WeakMap<Callback, Map<string, Callback>>()

/**
 * The callback that a page gives to a component, wrapped while the log
 * listens, so that each call writes a line, such as
 * `Tabs onValueChange("Payment")`. A value that is not a function goes through
 * with no change.
 *
 * @param label - The component and the prop, such as `Tabs onValueChange`.
 * @param callback - The value of the prop.
 */
export function componentEvent<T>(label: string, callback: T): T {
	if (!listener || typeof callback !== 'function') return callback

	const original = callback as Callback

	return getOrCompute(
		getOrCompute(wrappers, original, () => new Map()),
		label,
		() =>
			function (this: unknown, ...args: unknown[]) {
				listener?.(`${label}(${args.map(show).join(', ')})`)

				return Reflect.apply(original, this, args)
			},
	) as T
}

/** An argument as JSON, with each event as its type, such as `<click>`. */
function show(value: unknown): string {
	try {
		return (
			JSON.stringify(value, (_key, item: unknown) => (isEvent(item) ? `<${item.type}>` : item)) ??
			String(value)
		)
	} catch {
		return Object.prototype.toString.call(value)
	}
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
