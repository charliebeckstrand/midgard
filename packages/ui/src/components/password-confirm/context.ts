'use client'

import { createContext } from '../../core'
import type { Status } from './password-confirm-utilities'

/** The field a part reports for: the password, or its confirmation. @internal */
export type PasswordConfirmRole = 'password' | 'confirm'

type PasswordConfirmContextValue = {
	status: Status
	/** Records the resolved value of the field in `role`. */
	setValue: (role: PasswordConfirmRole, value: string) => void
	/** Records the form field name of the field in `role`, so the coordinator can read its errors. */
	setName: (role: PasswordConfirmRole, name: string | undefined) => void
	/** Marks the field in `role` as the one the user edited last. */
	setEdited: (role: PasswordConfirmRole) => void
	confirmHasFormError: boolean
	/** Id of the rendered mismatch warning; merged into the confirm input's `aria-describedby` while the mismatch holds. Undefined when no `warning` is configured. */
	warningId: string | undefined
}

export const [PasswordConfirmContext, usePasswordConfirm] =
	createContext<PasswordConfirmContextValue>('PasswordConfirm')
