import { getOrCompute } from '../../utilities'
import { subscribeDocumentEvent } from '../../utilities/document-listener'

type Subscriber = () => void

type Bucket = {
	subscribers: Set<Subscriber>
	timer: number | null
}

// One interval timer per distinct cadence, shared across every mounted
// `TimeAgo`. Without this, N timestamps arm N `setInterval`s that each wake
// React independently; bucketed, one timer per cadence fans out to all its
// subscribers in a single synchronous pass (React batches the resulting state
// updates into one render).
const buckets = new Map<number, Bucket>()

let unsubscribeVisibility: (() => void) | null = null

function tick(bucket: Bucket): void {
	// Dispatch over a snapshot so a mid-tick unsubscribe skips no subscriber.
	for (const subscriber of [...bucket.subscribers]) {
		try {
			subscriber()
		} catch (error) {
			// A throw in one subscriber must not stop the rest; surface it out of band.
			queueMicrotask(() => {
				throw error
			})
		}
	}
}

function startTimer(intervalMs: number, bucket: Bucket): void {
	// Don't burn timers while the tab is hidden; visibilitychange restarts them.
	if (bucket.timer !== null || document.hidden) return

	bucket.timer = window.setInterval(() => tick(bucket), intervalMs)
}

function stopTimer(bucket: Bucket): void {
	if (bucket.timer !== null) {
		window.clearInterval(bucket.timer)

		bucket.timer = null
	}
}

function handleVisibility(): void {
	if (document.hidden) {
		for (const bucket of buckets.values()) stopTimer(bucket)

		return
	}

	// On return to the foreground, catch up once immediately (relative text can
	// be far stale) and resume each cadence.
	for (const [intervalMs, bucket] of buckets) {
		tick(bucket)

		startTimer(intervalMs, bucket)
	}
}

/**
 * Subscribe `subscriber` to a refresh tick every `intervalMs`, sharing one timer per
 * distinct cadence across all subscribers. The timer pauses while the document
 * is hidden and fires an immediate catch-up tick on return. Returns an
 * unsubscribe fn; the timer stops when its last subscriber leaves. Call only on
 * the client: it touches `window`/`document`.
 */
export function subscribeTick(intervalMs: number, subscriber: Subscriber): () => void {
	unsubscribeVisibility ??= subscribeDocumentEvent('visibilitychange', handleVisibility)

	const bucket = getOrCompute(buckets, intervalMs, () => ({
		subscribers: new Set<Subscriber>(),
		timer: null,
	}))

	bucket.subscribers.add(subscriber)

	startTimer(intervalMs, bucket)

	return () => {
		bucket.subscribers.delete(subscriber)

		if (bucket.subscribers.size === 0) {
			stopTimer(bucket)

			buckets.delete(intervalMs)
		}

		if (buckets.size === 0 && unsubscribeVisibility) {
			unsubscribeVisibility()

			unsubscribeVisibility = null
		}
	}
}
