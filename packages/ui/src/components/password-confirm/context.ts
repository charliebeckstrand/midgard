'use client'

import { createContext } from '../../core'

type PasswordConfirmContextValue = {
	status: 'idle' | 'warning'
	setConfirm: (value: string) => void
	setConfirmName: (name: string | undefined) => void
	confirmHasFormError: boolean
	/** Id of the rendered mismatch warning — merged into the confirm input's `aria-describedby` while the mismatch holds; undefined when no `warning` is configured. */
	warningId: string | undefined
}

export const [PasswordConfirmContext, usePasswordConfirm] =
	createContext<PasswordConfirmContextValue>('PasswordConfirm')
