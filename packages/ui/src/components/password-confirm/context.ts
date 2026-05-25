'use client'

import { createContext } from '../../core'

type PasswordConfirmContextValue = {
	status: 'idle' | 'warning'
	setConfirm: (value: string) => void
	setConfirmName: (name: string | undefined) => void
	confirmHasFormError: boolean
}

export const [PasswordConfirmContext, usePasswordConfirm] =
	createContext<PasswordConfirmContextValue>('PasswordConfirm')
