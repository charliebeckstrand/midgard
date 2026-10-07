import type { JsonValue } from 'ui/json-tree'
import { getOrCompute } from '../../../utilities/get-or-compute.ts'

// The component events of the Event log: each call of an `on…` callback that
// a page gives to a component, such as the `onValueChange` of `Tabs`. The
// docs plugin sends each value that the JSX of a page gives to a component
// through `componentEvent` (`plugin/component-events.ts`), and the callback
// can be the value, or it can be in the value, such as the `onValueChange` of
// the `sort` of `Grid`. While no listener is set, the value goes through with
// no change, so the log adds no cost while it is off.

type Callback = (...args: unknown[]) => unknown

/** Where a component comes from: a module of `ui`, such as `Grid`, or any other component, such as `Tabs`. */
export type Source = 'component' | 'module'

/**
 * Receives the source, the name of the component, the text, and the arguments
 * of each component event. A call with no arguments has no `detail`.
 */
type Listener = (source: Source, name: string, text: string, detail?: JsonValue) => void

let listener: Listener | undefined

/** Sets the listener of the component events, and returns a function that removes it. */
export function listenComponentEvents(next: Listener): () => void {
	listener = next

	return () => {
		if (listener === next) listener = undefined
	}
}

/** A prop that holds a callback: `on`, then a capital letter. */
const CALLBACK = /^on[A-Z]/

// The wrapper of each callback, by the component and the path. A callback that
// keeps its identity keeps the identity of its wrapper, so the memos and the
// effects that read it do not run again.
const wrappers = new WeakMap<Callback, Map<string, Callback>>()

// The copy of each object or array that holds a callback, by the component and
// the path, with each callback in it wrapped. An object that keeps its
// identity keeps the identity of its copy, for the same reason. An object that
// holds no callback is its own copy.
const copies = new WeakMap<object, Map<string, object>>()

// The objects and the arrays that `label` reads now. A value that holds
// itself is its own copy, so the read stops.
const reading = new WeakSet<object>()

/**
 * The value that a page gives to a component, with each `on…` callback in it
 * wrapped while the log listens, so that each call writes a line of the
 * component, such as `Tabs` with the text `onValueChange("Payment")`. The
 * callback can be the value, or a property at any depth of a plain object or
 * an array in the value, such as `Grid` with the text
 * `sort.onValueChange([…])`. The line cuts a long argument, and the detail of
 * the line holds the arguments in full. Any other value goes through with no
 * change.
 *
 * @param source - Where the component comes from.
 * @param name - The component, such as `Tabs` or `Chat.Prompt`.
 * @param prop - The prop, such as `onValueChange`, or an empty string for a spread.
 * @param value - The value of the prop, or the object of the spread.
 */
export function componentEvent<T>(source: Source, name: string, prop: string, value: T): T {
	if (!listener) return value

	return label(source, name, prop, value) as T
}

function label(source: Source, name: string, path: string, value: unknown): unknown {
	if (typeof value === 'function') {
		return CALLBACK.test(path.slice(path.lastIndexOf('.') + 1))
			? wrap(source, name, path, value as Callback)
			: value
	}

	if (!isPlain(value) || reading.has(value)) return value

	return getOrCompute(
		getOrCompute(copies, value, () => new Map()),
		`${name} ${path}`,
		() => {
			reading.add(value)

			try {
				return copy(value, (key, item) =>
					label(source, name, typeof key === 'number' ? `${path}[${key}]` : join(path, key), item),
				)
			} finally {
				reading.delete(value)
			}
		},
	)
}

/** The path of a property of the value at `path`. */
function join(path: string, key: string): string {
	return path === '' ? key : `${path}.${key}`
}

/**
 * A plain object or an array, which a page builds as a prop, such as the
 * `sort` of `Grid` or the items of a menu. A React element, a class instance,
 * and a `Set` are not plain.
 */
function isPlain(value: unknown): value is object {
	if (typeof value !== 'object' || value === null) return false

	if (Array.isArray(value)) return true

	const prototype = Object.getPrototypeOf(value)

	return (prototype === Object.prototype || prototype === null) && !('$$typeof' in value)
}

/**
 * A shallow copy of an object or an array with each property as `map` gives
 * it, or the value itself when `map` gives each property with no change.
 */
function copy(value: object, map: (key: string | number, item: unknown) => unknown): object {
	if (Array.isArray(value)) {
		const items = value.map((item, index) => map(index, item))

		return items.every((item, index) => item === value[index]) ? value : items
	}

	const changes: Record<string, unknown> = {}

	let changed = false

	for (const [key, item] of Object.entries(value)) {
		const next = map(key, item)

		if (next === item) continue

		changes[key] = next

		changed = true
	}

	return changed ? { ...value, ...changes } : value
}

/** The callback, wrapped to write a line of the component on each call. */
function wrap(source: Source, name: string, path: string, original: Callback): Callback {
	return getOrCompute(
		getOrCompute(wrappers, original, () => new Map()),
		`${name} ${path}`,
		() =>
			function (this: unknown, ...args: unknown[]) {
				const texts = args.map(serialize)

				listener?.(
					source,
					name,
					`${path}(${texts.map(cut).join(', ')})`,
					args.length > 0 ? texts.map(parse) : undefined,
				)

				return Reflect.apply(original, this, args)
			},
	)
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
