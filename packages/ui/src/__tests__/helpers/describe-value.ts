import { describeNode } from './describe-node'

/** The most characters of a value that a failure message gives. */
const TEXT_LIMIT = 600

/**
 * Gives a value that JSON writes badly in a form that a reader can use:
 *
 * - `NaN` and the infinities stay as text. JSON writes them as `null`, which
 *   reads as an absent value.
 * - A `bigint` is its digits and `n`. JSON throws on it.
 * - An element is named as {@link describeNode} names it. JSON writes `{}`.
 * - A `Map` is a list of its entries, and a `Set` is a list of its values.
 *   JSON writes `{}` for each.
 * - An `Error` is its name and its message. JSON writes `{}`.
 */
function readable(value: unknown): unknown {
	if (typeof value === 'number' && !Number.isFinite(value)) return String(value)

	if (typeof value === 'bigint') return `${value}n`

	if (typeof Element !== 'undefined' && value instanceof Element) return describeNode(value)

	if (value instanceof Map) return { Map: [...value] }

	if (value instanceof Set) return { Set: [...value] }

	if (value instanceof Error) return `${value.name}: ${value.message}`

	return value
}

/** {@link readable} for each value of a JSON walk. */
function readableReplacer(_key: string, value: unknown): unknown {
	return readable(value)
}

/**
 * {@link readable}, and `[Circular]` for each object that the walk saw before.
 * It also marks an object that two fields share, so it is the fallback for a
 * value that holds a cycle, and not the first choice.
 */
function cycleReplacer(): (key: string, value: unknown) => unknown {
	const seen = new WeakSet<object>()

	return (_key, value) => {
		const next = readable(value)

		if (typeof next !== 'object' || next === null) return next

		if (seen.has(next)) return '[Circular]'

		seen.add(next)

		return next
	}
}

/**
 * The text of a value in a failure message.
 *
 * `String` gives `[object Object]` for an object, so a message that held a
 * list of samples told nothing. Thus the error of a sampler hid the cause of
 * a flake for two weeks (#4121). JSON gives each field, and
 * {@link readable} gives the values that JSON writes as `{}` or `null`. A long
 * text keeps its start and its end, because the last samples show the state
 * at the deadline.
 *
 * @param value - The value to give, such as the last read of a sampler.
 * @returns The JSON of the value, or `String(value)` when JSON gives no text,
 * such as for `undefined` or a function.
 */
export function describeValue(value: unknown): string {
	let text: string | undefined

	try {
		text = JSON.stringify(value, readableReplacer)
	} catch {
		try {
			text = JSON.stringify(value, cycleReplacer())
		} catch {
			// A getter that throws. The text of the value is the last choice.
			text = undefined
		}
	}

	text ??= String(value)

	if (text.length <= TEXT_LIMIT) return text

	const half = TEXT_LIMIT / 2

	return `${text.slice(0, half)} … (${text.length - TEXT_LIMIT} characters) … ${text.slice(-half)}`
}
