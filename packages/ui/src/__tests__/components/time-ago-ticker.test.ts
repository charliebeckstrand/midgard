import { describe, expect, onTestFinished, vi } from 'vitest'
import { subscribeTick } from '../../components/time-ago/time-ago-ticker'
import { it, onFakeClock } from '../helpers/fake-clock'

/**
 * Subscribes to the ticker and pushes the name of the subscriber to `log` on
 * each tick. The subscriber leaves when the case finishes, also after a
 * failure. A second unsubscribe does nothing.
 */
function subscribe(intervalMs: number, name: string, log: string[]): () => void {
	const off = subscribeTick(intervalMs, () => log.push(name))

	onTestFinished(off)

	return off
}

/** Sets `document.hidden` and sends `visibilitychange`, as a tab switch does. */
function setHidden(hidden: boolean) {
	vi.spyOn(document, 'hidden', 'get').mockReturnValue(hidden)

	document.dispatchEvent(new Event('visibilitychange'))
}

describe('subscribeTick', () => {
	onFakeClock()

	it('shares one timer for each cadence', async ({ clock }) => {
		const setInterval = vi.spyOn(window, 'setInterval')

		const log: string[] = []

		subscribe(1000, 'a', log)

		subscribe(1000, 'b', log)

		subscribe(3000, 'c', log)

		expect(setInterval).toHaveBeenCalledTimes(2)

		await clock.advance(3000)

		expect(log.filter((name) => name === 'a')).toHaveLength(3)

		expect(log.filter((name) => name === 'b')).toHaveLength(3)

		expect(log.filter((name) => name === 'c')).toHaveLength(1)
	})

	it('stops the timers while the document is hidden, and ticks once when it shows', async ({
		clock,
		signal,
	}) => {
		const log: string[] = []

		subscribe(1000, 'a', log)

		subscribe(5000, 'b', log)

		setHidden(true)

		await clock.advance(10_000)

		expect(log).toEqual([])

		signal.throwIfAborted()

		setHidden(false)

		expect(log).toEqual(['a', 'b'])

		await clock.advance(1000)

		expect(log).toEqual(['a', 'b', 'a'])
	})

	it('starts no timer for a subscriber that comes while the document is hidden', () => {
		vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)

		const setInterval = vi.spyOn(window, 'setInterval')

		subscribe(1000, 'a', [])

		expect(setInterval).not.toHaveBeenCalled()
	})

	it('stops the timer when the last subscriber of a cadence leaves', async ({ clock }) => {
		const clearInterval = vi.spyOn(window, 'clearInterval')

		const log: string[] = []

		const offA = subscribe(1000, 'a', log)

		const offB = subscribe(1000, 'b', log)

		offA()

		expect(clearInterval).not.toHaveBeenCalled()

		offB()

		expect(clearInterval).toHaveBeenCalledTimes(1)

		setHidden(true)

		setHidden(false)

		await clock.advance(1000)

		expect(log).toEqual([])
	})

	it('runs each subscriber when one of them throws, and throws the error again', async ({
		clock,
	}) => {
		const error = new Error('tick')

		const thrown: unknown[] = []

		const queue = globalThis.queueMicrotask

		// The ticker throws the error again in a microtask. The wrapper catches
		// it there, so the case sees it and the run does not fail.
		const microtask = vi.spyOn(globalThis, 'queueMicrotask').mockImplementation((callback) =>
			queue(() => {
				try {
					callback()
				} catch (caught) {
					thrown.push(caught)
				}
			}),
		)

		const log: string[] = []

		onTestFinished(
			subscribeTick(1000, () => {
				throw error
			}),
		)

		subscribe(1000, 'b', log)

		await clock.advance(1000)

		microtask.mockRestore()

		expect(log).toEqual(['b'])

		expect(thrown).toEqual([error])
	})
})
