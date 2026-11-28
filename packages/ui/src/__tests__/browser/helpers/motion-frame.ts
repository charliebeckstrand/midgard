import { cancelFrame, frame } from 'motion'
import { inject } from 'vitest'
import { describeValue } from '../../helpers/describe-value'
import { describeAnimation } from './signals'

/**
 * Reads a value in each frame of the Motion frame loop, after Motion writes its
 * styles, until `done` accepts the value.
 *
 * Use it to read each frame of a Motion tween. The frame loop comes from
 * `motion`, and each project gives the real frame loop of `motion`. Thus the
 * helper also works in a project that mocks `motion/react`. A `requestAnimationFrame` sampler that starts before
 * the tween runs before Motion in each frame, so it reads the styles of the
 * frame before. A tween runs on wall-clock time. Thus after one long frame,
 * Motion can write the last value and land in the same frame. A landing that
 * hides the element then removes it before the next read of that sampler, and
 * the sampler reads no frame of the travel. This sampler reads in the
 * `postRender` step of each frame, so it reads each value that Motion writes,
 * also the last one. Motion reports the landing after that step.
 *
 * A wait for a tween that an event starts must read the first frame of the
 * tween, so the sampler starts before the event. Give the event as `during`.
 * The sampler then starts, the helper sends the event, and the deadline starts
 * when the event resolves. Thus the round trip of the event, which can take
 * seconds under the load of the full suite, does not count in the deadline.
 * The helper gives the value only after the event resolves. Thus an action
 * that must occur in the frame of the accepted value, such as a pause of a
 * tween, goes in `done`.
 *
 * @param read - Reads the value.
 * @param done - Accepts the value that ends the wait.
 * @param options - `deadline` is the time that `done` has to accept a value.
 * `during` sends the event that starts the tween, after the sampler starts.
 * @returns The value that `done` accepted.
 * @throws When the deadline passes before `done` accepts a value, or when
 * `read` or `during` throws. The default deadline is the suite budget of
 * `asyncUtilTimeout`. The error of the deadline gives the last read, as
 * {@link describeValue} writes it.
 */
export async function sampleMotionFrames<T>(
	read: () => T,
	done: (value: T) => boolean,
	{
		deadline = inject('asyncUtilTimeout'),
		during,
	}: { deadline?: number; during?: () => Promise<unknown> } = {},
): Promise<T> {
	let end = during ? Number.POSITIVE_INFINITY : performance.now() + deadline

	const sampling = new Promise<T>((resolve, reject) => {
		const step = () => {
			try {
				const value = read()

				if (done(value)) {
					cancelFrame(step)

					resolve(value)
				} else if (performance.now() >= end) {
					cancelFrame(step)

					reject(
						new Error(
							`sampleMotionFrames: no accepted value in ${deadline}ms; the last read was ${describeValue(value)}`,
						),
					)
				}
			} catch (error) {
				cancelFrame(step)

				reject(error)
			}
		}

		frame.postRender(step, true)
	})

	if (!during) return sampling

	// A rejection of the sampler while the event is in flight is not unhandled:
	// the return below gives it to the caller.
	sampling.catch(() => {})

	try {
		await during()
	} finally {
		end = performance.now() + deadline
	}

	return sampling
}

/**
 * Waits until `animations` gives no tween, in a frame of the Motion frame loop.
 *
 * Motion starts a tween in the frame after the call to `animate`. Before that
 * frame, the element shows no tween, also when a tween is about to start. A
 * poll can read in that time and accept the state before the tween. This wait
 * reads first in the `postRender` step of the next frame, after Motion starts
 * the tweens of that frame. Start the wait in the task of the action that
 * starts the tweens, or later.
 *
 * @param animations - Gives the tweens to wait for, such as
 * `element.getAnimations({ subtree: true })`.
 * @throws When a tween still runs at the deadline of {@link sampleMotionFrames}.
 * The error names each tween that still runs, as {@link describeAnimation}
 * names it.
 */
export async function waitForNoTween(animations: () => readonly Animation[]): Promise<void> {
	// The read names each tween, so the error of a deadline tells which tween
	// still runs, on which element, and how far it is.
	await sampleMotionFrames(
		() => ({ tweens: animations().map(describeAnimation) }),
		(read) => read.tweens.length === 0,
	)
}

/**
 * Waits until the overlay that holds `element` is at rest: no tween runs in its
 * panel or in its backdrop.
 *
 * A panel slides in, and each control in it moves until the slide ends. A
 * pointer click sends the press and the release in two steps. Playwright makes
 * sure that the press hits the control, but it does not check the release. If
 * the panel moves between the two steps, the release lands off the control.
 * The browser then sends the click to an ancestor, the control gets no click,
 * and Playwright reports no error. Thus call this wait before a pointer action
 * on a control in an overlay that enters.
 *
 * @param element - An element in the overlay.
 * @throws When `element` is not in an overlay, or when a tween still runs at the
 * deadline of {@link sampleMotionFrames}.
 */
export async function waitForOverlayRest(element: Element): Promise<void> {
	const overlay = element.closest('[data-slot="overlay"]')

	if (!overlay) throw new Error('waitForOverlayRest: the element is not in an overlay')

	await waitForNoTween(() => overlay.getAnimations({ subtree: true }))
}

/**
 * Holds the tweens that `read` gives at `progress` of their length, in the
 * frame that starts them, and gives them. A tween runs on wall-clock time, so
 * a long frame moves it on before a measure. A held tween stays at its frame.
 * `play()` on each tween lets it go on.
 *
 * `during` sends the event that starts the tweens. The sampler starts before
 * it, and the hold occurs in the frame that finds the tweens. Thus a slow
 * round trip of the event cannot let a tween run on, or land, before the hold.
 * The sampler gives the tweens only after the event resolves (see
 * {@link sampleMotionFrames}), so a hold after the sampler is too late.
 *
 * @param read - Gives the tweens to hold.
 * @param progress - The part of the length at which each tween holds, from 0 to 1.
 * @param options - `during` sends the event that starts the tweens. `exclude`
 * lists tweens from before the event, such as a held tween, that are not the
 * new tweens.
 * @returns The held tweens.
 */
export function holdTweens(
	read: () => readonly Animation[],
	progress: number,
	{
		during,
		exclude = [],
	}: { during?: () => Promise<unknown>; exclude?: readonly Animation[] } = {},
): Promise<Animation[]> {
	return sampleMotionFrames(
		() => read().filter((tween) => !exclude.includes(tween)),
		(found) => {
			if (found.length === 0) return false

			for (const tween of found) {
				tween.pause()

				tween.currentTime = progress * Number(tween.effect?.getComputedTiming().duration)
			}

			return true
		},
		{ during },
	)
}
