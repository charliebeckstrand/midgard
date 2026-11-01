'use client'

import { createContext } from '../../core'
import type { ConfirmProps } from './confirm'

/**
 * The question that {@link useConfirm} asks: the words of the dialog, the two
 * actions, and an optional `action` that runs before the dialog closes.
 */
export type ConfirmOptions = Pick<ConfirmProps, 'title' | 'description'> & {
	/** The text and the color of the confirm (primary) action. */
	confirm?: Pick<NonNullable<ConfirmProps['confirm']>, 'label' | 'color'>
	/** The text and the color of the cancel (plain) action. */
	cancel?: Pick<NonNullable<ConfirmProps['cancel']>, 'label' | 'color'>
	/**
	 * Work that runs when the user confirms. The dialog stays open, with the
	 * confirm button in its loading state, until the work is done.
	 *
	 * @remarks
	 * While the work runs, the cancel button is disabled, and Escape and the
	 * backdrop do not close the dialog. When the work is done, the dialog closes
	 * and the promise of the question resolves `true`. When the work fails, the
	 * dialog closes and the promise rejects with the error.
	 */
	action?: () => unknown
}

/**
 * Asks the user a yes-or-no question in a {@link Confirm} dialog.
 *
 * @returns A promise that resolves `true` when the user confirms. It resolves
 * `false` when the user cancels or dismisses the dialog, or when a new
 * question replaces it.
 */
export type ConfirmFunction = (options: ConfirmOptions) => Promise<boolean>

/** @internal */
export const [ConfirmContext, useConfirmContext] = createContext<ConfirmFunction>('ConfirmHost', {
	error: 'useConfirm must be used within a UIProvider',
})
