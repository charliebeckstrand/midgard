import { cancelFrame, frame } from 'motion'
import { inject } from 'vitest'

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
 * @param read - Reads the value.
 * @param done - Accepts the value that ends the wait.
 * @returns The value that `done` accepted.
 * @throws When the deadline passes before `done` accepts a value, or when
 * `read` throws. The default deadline is the suite budget of
 * `asyncUtilTimeout`.
 */
export function sampleMotionFrames<T>(
	read: () => T,
	done: (value: T) => boolean,
	{ deadline = inject('asyncUtilTimeout') }: { deadline?: number } = {},
): Promise<T> {
	const end = performance.now() + deadline

	return new Promise((resolve, reject) => {
		const step = () => {
			try {
				const value = read()

				if (done(value)) {
					cancelFrame(step)

					resolve(value)
				} else if (performance.now() >= end) {
					cancelFrame(step)

					reject(new Error(`sampleMotionFrames: no accepted value in ${deadline}ms`))
				}
			} catch (error) {
				cancelFrame(step)

				reject(error)
			}
		}

		frame.postRender(step, true)
	})
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
 */
export async function waitForNoTween(animations: () => readonly Animation[]): Promise<void> {
	await sampleMotionFrames(
		() => animations().length,
		(count) => count === 0,
	)
}
