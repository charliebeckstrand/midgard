import type { ReactNode } from 'react'

export type ToastType = 'default' | 'secondary' | 'success' | 'warning' | 'error'
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

export type ToastData = {
	id: string
	zIndex: number
	title: string
	description?: string
	type?: ToastType
	actions?: ReactNode
	showCloseButton?: boolean
	persist?: boolean
	dismissed?: boolean
}
