import { inject } from 'vitest'
import { frame } from '../../helpers/frames'

/** The options of a sampler. */
interface SampleOptions {
	/**
	 * The wall-clock time, in milliseconds, after which the sampler throws.
	 *
	 * @defaultValue The suite budget of `asyncUtilTimeout`.
	 */
	deadline?: number
}

/**
 * Reads a value one time in each animation frame, until `done` accepts it.
 *
 * Use it where the case waits for a state that the browser delivers over
 * frames, such as a box that a transition moves. Each read falls in its own
 * frame, so a stalled frame cannot give two reads of one state.
 *
 * @param read - Reads the value.
 * @param done - Accepts the value that ends the wait.
 * @returns The value that `done` accepted.
 * @throws When the deadline passes before `done` accepts a value. The error
 * carries the last value.
 */
export async function sampleUntil<T>(
	read: () => T,
	done: (value: T) => boolean,
	{ deadline = inject('asyncUtilTimeout') }: SampleOptions = {},
): Promise<T> {
	const end = performance.now() + deadline

	let value = read()

	while (!done(value)) {
		if (performance.now() >= end) {
			throw new Error(
				`sampleUntil: no accepted value in ${deadline}ms; the last read was ${String(value).slice(0, 200)}`,
			)
		}

		await frame()

		value = read()
	}

	return value
}

/** The options of {@link settledValue}. */
interface SettleOptions extends SampleOptions {
	/**
	 * The number of frames in a row in which the read must not change.
	 *
	 * @defaultValue 2
	 */
	frames?: number
}

/**
 * Reads a value one time in each animation frame, until it stays the same for
 * `frames` frames in a row. Two reads are the same when `Object.is` says so.
 *
 * @param read - Reads the value. Return a string for a value that is an object.
 * @returns The settled value.
 * @throws When the deadline passes before the value settles.
 */
export function settledValue<T>(
	read: () => T,
	{ frames = 2, ...options }: SettleOptions = {},
): Promise<T> {
	let last: T | undefined

	let still = -1

	return sampleUntil(
		read,
		(value) => {
			still = still >= 0 && Object.is(value, last) ? still + 1 : 0

			last = value

			return still >= frames
		},
		options,
	)
}

/**
 * Waits until the box of `element` stays in the same place for `frames`
 * frames in a row, such as a panel after its entry motion.
 *
 * @param element - The element to watch.
 * @returns The element.
 * @throws When the deadline passes before the box settles.
 */
export async function settledRect<E extends Element>(
	element: E,
	options: SettleOptions = {},
): Promise<E> {
	await settledValue(() => {
		const { top, left, bottom, right } = element.getBoundingClientRect()

		return `${top},${left},${bottom},${right}`
	}, options)

	return element
}
