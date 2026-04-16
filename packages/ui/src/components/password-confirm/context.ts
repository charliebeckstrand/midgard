'use client'

import { createContext } from '../../core'

type PasswordConfirmContext = {
	status: 'idle' | 'warning'
	setConfirm: (value: string) => void
	setConfirmName: (name: string | undefined) => void
	confirmHasFormError: boolean
}

export const [PasswordConfirmProvider, usePasswordConfirm] =
	createContext<PasswordConfirmContext>('PasswordConfirm')
