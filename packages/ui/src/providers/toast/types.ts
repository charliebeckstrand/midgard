import type { ReactNode } from 'react'

/** Severity of a toast, mapped to the underlying `Alert` tone. */
export type ToastSeverity = 'default' | 'secondary' | 'success' | 'warning' | 'error'

/** Viewport corner the toast stack anchors to. */
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

/**
 * Why a toast left the queue, handed to {@link ToastData.onDismiss}.
 *
 * `timeout` is the toast's own lifetime running out; `close` is the reader pressing its
 * close button; `evicted` is the `maxToasts` cap pushing out the oldest to make room for
 * a newer one; `dismissed` is a `dismiss(id)` call from the application.
 */
export type ToastDismissReason = 'timeout' | 'close' | 'evicted' | 'dismissed'

export type ToastData = {
	id: string
	duration: number
	title: string
	description?: string
	severity?: ToastSeverity
	actions?: ReactNode
	closable?: boolean
	persist?: boolean
	dismissed?: boolean
	/**
	 * Fires once when this toast leaves the queue, with the reason it left.
	 *
	 * `toast()` hands back an id and nothing else, so the caller who raised a toast cannot
	 * otherwise learn that it is gone — the four exits are all internal. Rides the one
	 * toast it was enqueued with, rather than the provider, so a caller hears about its
	 * own toast and not the whole stack.
	 *
	 * Fires exactly once per toast, before the leave animation rather than after it.
	 */
	onDismiss?: (reason: ToastDismissReason) => void
}

/** Argument to the toast provider's `toast()` call: {@link ToastData} without the fields the provider derives. */
export type ToastInput = Omit<ToastData, 'id' | 'duration'> & {
	duration?: number
	/**
	 * Optional caller-supplied id. When omitted, the provider generates one.
	 * Callers are responsible for uniqueness; `dismiss(id)` removes every
	 * toast matching the id.
	 */
	id?: string
}
