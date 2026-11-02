import { subscribeDocumentEvent } from '../../utilities/document-listener'
import { createListenerRegistry } from '../../utilities/listener-registry'

/**
 * One interval timer for each cadence, which each mounted `TimeAgo` of that
 * cadence shares. One timer calls all of its subscribers in one synchronous
 * pass, so React batches their updates into one render. The key is the
 * cadence in milliseconds.
 *
 * The timer stops while the document is hidden. When the document shows
 * again, the subscribers get one tick at once, because the relative text can
 * be far out of date, and the timer starts again.
 */
const registry = createListenerRegistry<number, void>({
	source: Number,
	attach: (intervalMs, _key, tick) => {
		let timer: number | null = null

		const start = () => {
			if (timer === null && !document.hidden) timer = window.setInterval(tick, intervalMs)
		}

		const stop = () => {
			if (timer !== null) window.clearInterval(timer)

			timer = null
		}

		const unsubscribe = subscribeDocumentEvent('visibilitychange', () => {
			if (document.hidden) return stop()

			tick()

			start()
		})

		start()

		return () => {
			stop()

			unsubscribe()
		}
	},
})

/**
 * Calls `subscriber` every `intervalMs`. Each subscriber of one cadence shares
 * one timer, which stops while the document is hidden and ticks once when it
 * shows again. Returns the call that removes the subscriber. The timer stops
 * when its last subscriber leaves. Call it only on the client, because it
 * reads `window` and `document`.
 */
export function subscribeTick(intervalMs: number, subscriber: () => void): () => void {
	return registry.subscribe(String(intervalMs), subscriber)
}
