'use client'

import { createContext } from '../../core'
import type { ToastData, ToastInput } from './types'

export type ToastContextValue = {
	toast: (data: ToastInput) => string
	dismiss: (target: { id: string }) => void
}

export type ToastViewportContextValue = {
	toasts: ToastData[]
	dismiss: (id: string) => void
	pause: () => void
	resume: () => void
	reset: (id: string) => void
	handleExitComplete: () => void
}

/**
 * Caller-facing toast API from the nearest `<ToastProvider>`: `toast(data)`
 * enqueues a toast and returns its id, `dismiss({ id })` removes it. Throws
 * outside a provider.
 */
export const [ToastContext, useToast] = createContext<ToastContextValue>('Toast')

/**
 * Viewport state the `<Toast>` viewport consumes: the live toast list plus the
 * dismiss / pause / resume / reset / exit-complete handlers.
 *
 * @internal
 */
export const [ToastViewportContext, useToastViewport] =
	createContext<ToastViewportContextValue>('ToastViewport')
