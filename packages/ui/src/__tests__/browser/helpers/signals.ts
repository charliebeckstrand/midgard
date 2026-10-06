import { inject } from 'vitest'

/**
 * Waits for the next event of `type` on `target`.
 *
 * Call it before the action that sends the event, and await it after. Use it
 * to start a "nothing happened" hold at the event that must come first. A hold
 * that starts before the event can end before the event, and then it checks
 * nothing.
 *
 * @param target - The target that receives the event.
 * @param type - The type of the event.
 * @returns The event.
 * @throws When no event comes before the deadline. The default deadline is the
 * suite budget of `asyncUtilTimeout`.
 */
export function once(
	target: EventTarget,
	type: string,
	{ deadline = inject('asyncUtilTimeout') }: { deadline?: number } = {},
): Promise<Event> {
	return new Promise((resolve, reject) => {
		const listener = (event: Event) => {
			clearTimeout(timer)

			resolve(event)
		}

		const timer = setTimeout(() => {
			target.removeEventListener(type, listener)

			reject(new Error(`once: no ${type} event in ${deadline}ms`))
		}, deadline)

		target.addEventListener(type, listener, { once: true })
	})
}

/**
 * Waits until no animation runs in `root` or in its descendants. It covers CSS
 * transitions, CSS animations, and Web Animations.
 *
 * An animation that ends can start a new one, such as a row that a landed
 * reveal removes. It therefore reads the animations again after each round,
 * until none runs. A canceled animation counts as done.
 *
 * @param root - The element that holds the animations.
 * @param deadline - The wall-clock time, in milliseconds, after which it throws.
 * Give it through `budget()`, because an animation runs slower under load.
 * @throws When an animation still runs at the deadline.
 */
export async function animationsDone(root: Element, deadline: number): Promise<void> {
	const end = performance.now() + deadline

	for (;;) {
		const running = root
			.getAnimations({ subtree: true })
			.filter((animation) => animation.playState !== 'finished')

		if (running.length === 0) return

		const left = end - performance.now()

		if (left <= 0) {
			throw new Error(`animationsDone: ${running.length} animations still run after ${deadline}ms`)
		}

		let timer: ReturnType<typeof setTimeout> | undefined

		const expired = new Promise<void>((resolve) => {
			timer = setTimeout(resolve, left)
		})

		try {
			await Promise.race([
				Promise.all(running.map((animation) => animation.finished.catch(() => undefined))),
				expired,
			])
		} finally {
			clearTimeout(timer)
		}
	}
}
