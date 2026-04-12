'use client'

import { createContext } from '../../core'

type PasswordConfirmContext = {
	status: 'idle' | 'valid' | 'warning'
	setConfirm: (value: string) => void
}

export const [PasswordConfirmProvider, usePasswordConfirm] =
	createContext<PasswordConfirmContext>('PasswordConfirm')
