import type { ReactNode } from 'react'

/** Severity of a toast, mapped to the underlying `Alert` tone. */
export type ToastSeverity = 'default' | 'secondary' | 'success' | 'warning' | 'error'

/** Viewport corner the toast stack anchors to. */
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

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
