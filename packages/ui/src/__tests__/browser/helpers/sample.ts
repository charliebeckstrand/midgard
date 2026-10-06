import { inject } from 'vitest'
import { frame } from '../../helpers/frames'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'
import { budget } from './wall-clock'

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

/** Whether at least one height sits strictly between `low` and `high`: a travel, not a snap. */
export function hasIntermediate(samples: number[], low: number, high: number): boolean {
	return samples.some((height) => height > low + 1 && height < high - 1)
}

/**
 * Reads the border-box height of `element` one time in each animation frame,
 * until the height travels from `from` and lands on `to`.
 *
 * Use it for a box that a tween moves, where a snap to `to` is the regression.
 * A height at `to` ends the wait only after a height between the two, so the
 * frames before the tween starts cannot end it early. The wait then ends when
 * the box lands, and not at the end of a fixed window that load can stretch
 * past the travel.
 *
 * @param element - The box that travels.
 * @param from - The height that the box leaves.
 * @param to - The height that the box lands on, within half a pixel.
 * @returns Each height that the sampler read, in order.
 * @throws When the box does not travel and land before the deadline. A snap
 * fails here.
 */
export async function sampleTravel(
	element: Element,
	from: number,
	to: number,
	{ deadline = budget(2000) }: SampleOptions = {},
): Promise<number[]> {
	const samples: number[] = []

	const [low, high] = from < to ? [from, to] : [to, from]

	await sampleUntil(
		() => {
			const height = element.getBoundingClientRect().height

			samples.push(height)

			return height
		},
		(height) => hasIntermediate(samples, low, high) && Math.abs(height - to) <= HALF_PIXEL,
		{ deadline },
	)

	return samples
}
