import type { ReactNode } from 'react'
import type { AlertSeverity } from '../alert'

/**
 * Severity of a toast: an {@link AlertSeverity}, or `neutral` for a toast that
 * takes no semantic tone.
 */
export type ToastSeverity = AlertSeverity | 'neutral'

/**
 * Viewport corner the toast stack anchors to. A `start` or `end` corner follows
 * the reading direction, so `bottom-end` is the bottom left corner in a
 * right-to-left layout. A `left` or `right` corner stays physical.
 */
export type ToastPosition =
	| 'top-right'
	| 'top-left'
	| 'bottom-right'
	| 'bottom-left'
	| 'top-start'
	| 'top-end'
	| 'bottom-start'
	| 'bottom-end'

/**
 * Why a toast left the queue, handed to {@link ToastData.onDismiss}.
 *
 * - `timeout`: the toast's own lifetime running out
 * - `close`: the reader pressing its close button
 * - `evicted`: the `maxToasts` cap pushing out the oldest to make room for a
 *   newer one
 * - `dismissed`: a `dismiss(id)` call from the application
 */
export type ToastDismissReason = 'timeout' | 'close' | 'evicted' | 'dismissed'

/** One toast in the queue of the provider. {@link ToastInput}, the argument of `toast()`, takes most of its fields. */
export type ToastData = {
	/** The id of the toast. `dismiss(id)` removes the toast. */
	id: string
	/**
	 * The time in milliseconds that the toast stays before it leaves with `timeout`.
	 * Use `persist` to keep a toast. `Infinity` keeps the toast too, and the timer
	 * arms again one time in each 2^31−1 ms.
	 */
	duration: number
	/** The main text of the toast. */
	title: string
	/** Text below the title. */
	description?: string
	/**
	 * The tone of the toast. `warning` and `error` interrupt a screen reader as
	 * `role="alert"`. The other values wait their turn as `role="status"`.
	 * @defaultValue 'info'
	 */
	severity?: ToastSeverity
	/** Controls under the text, such as an Undo button. */
	actions?: ReactNode
	/**
	 * Show a close button on the toast.
	 * @defaultValue true
	 */
	closable?: boolean
	/**
	 * Keep the toast until the reader closes it, `dismiss(id)` removes it, or the
	 * `maxToasts` cap pushes it out. The toast then has no timer, and `duration`
	 * has no effect.
	 * @defaultValue false
	 */
	persist?: boolean
	/** True from the time the toast starts to leave. The provider sets it. */
	dismissed?: boolean
	/**
	 * Fires once when this toast leaves the queue, with the reason it left.
	 *
	 * `toast()` hands back an id and nothing else, so the caller who raised a toast cannot
	 * otherwise learn that it is gone. The four exits are all internal. Rides the one
	 * toast it was enqueued with, rather than the provider, so a caller hears about its
	 * own toast and not the whole stack.
	 *
	 * Fires exactly once per toast, before the leave animation rather than after it.
	 */
	onDismiss?: (reason: ToastDismissReason) => void
}

/**
 * Argument to the toast provider's `toast()` call: {@link ToastData} without the fields the
 * provider derives, and without `dismissed`, which the provider owns. `dismissed` marks a
 * toast as leaving, and doubles as the latch that keeps `onDismiss` to one report.
 */
export type ToastInput = Omit<ToastData, 'id' | 'duration' | 'dismissed'> & {
	/**
	 * The time in milliseconds that the toast stays before it leaves with `timeout`.
	 * Use `persist` to keep a toast. `Infinity` keeps the toast too, and the timer
	 * arms again one time in each 2^31−1 ms.
	 * @defaultValue the `duration` of the `ToastProvider`, 5000 when it sets none.
	 */
	duration?: number
	/**
	 * Optional caller-supplied id. When omitted, the provider generates one.
	 * Callers are responsible for uniqueness; `dismiss(id)` removes every
	 * toast matching the id.
	 */
	id?: string
}
