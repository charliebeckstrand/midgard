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
