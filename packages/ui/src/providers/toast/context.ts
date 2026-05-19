'use client'

import { createContext } from '../../core'
import type { ToastData, ToastInput } from './types'

export type ToastContextValue = {
	toast: (data: ToastInput) => string
	dismiss: (id: string) => void
}

export type ToastViewportContextValue = {
	toasts: ToastData[]
	dismiss: (id: string) => void
	pause: () => void
	resume: () => void
	reset: (id: string) => void
	handleExitComplete: () => void
}

/** Public — caller-facing API for emitting and dismissing toasts. */
export const [ToastValueProvider, useToast] = createContext<ToastContextValue>('Toast')

/** Internal — viewport state consumed by the `<Toast>` viewport. */
export const [ToastViewportProvider, useToastViewport] =
	createContext<ToastViewportContextValue>('ToastViewport')
