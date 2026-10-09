'use client'

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { createContext } from '../../core'
import { useIdleLoad } from '../../hooks/use-idle-load'
import type { Confirm, ConfirmProps } from './confirm'

/**
 * Loads the module of the dialog. The host loads it in idle time after the
 * hydration. Thus the app does not load the dialog before it hydrates, and the
 * first question does not wait for it.
 * @internal
 */
const loadConfirm = () => import('./confirm')

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
	 * confirm button in its pending state, until the work is done.
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

/** The callbacks of the promise of the open question. @internal */
type Settle = { resolve: (confirmed: boolean) => void; reject: (error: unknown) => void }

/** The question that the host shows, and whether its `action` runs. @internal */
type Question = { options: ConfirmOptions; pending: boolean }

/** @internal */
const [ConfirmContext, useConfirmContext] = createContext<ConfirmFunction>('ConfirmHost', {
	error: 'useConfirm must be used within a UIProvider',
})

/**
 * Gives {@link useConfirm} to its children, and renders the one
 * {@link Confirm} dialog that their questions show in. `UIProvider` mounts it.
 *
 * @remarks
 * The host loads the module of the dialog in idle time after the hydration,
 * and renders the dialog closed when the module is loaded. A question before
 * that loads the module at once. When the module does not load, the question
 * rejects with the error. The dialog is open while a question is set.
 * When it closes, the overlay keeps its last open render for the exit
 * animation, so the words do not change. The function in the context keeps
 * its identity, so a question does not render the children again. When the
 * host unmounts, an open question resolves `false`.
 * @internal
 */
export function ConfirmHost({ children }: { children: ReactNode }) {
	const [question, setQuestion] = useState<Question | null>(null)

	// The module of the dialog, from a question before the idle load on.
	const [asking, setAsking] = useState<{ Confirm: typeof Confirm } | null>(null)

	const dialog = useIdleLoad(loadConfirm) ?? asking

	const settleRef = useRef<Settle | null>(null)

	// Closes the dialog, and gives back the callbacks of the open promise one
	// time, so the caller answers it.
	const settle = useCallback((): Settle | null => {
		const current = settleRef.current

		settleRef.current = null

		setQuestion(null)

		return current
	}, [])

	const ask = useCallback<ConfirmFunction>(
		(options) =>
			new Promise<boolean>((resolve, reject) => {
				settleRef.current?.resolve(false)

				const current = { resolve, reject }

				settleRef.current = current

				setQuestion({ options, pending: false })

				// The module caches, so a question after the first load waits for
				// nothing. A failed load rejects this question while it is open.
				loadConfirm().then(setAsking, (error: unknown) => {
					if (settleRef.current === current) settle()?.reject(error)
				})
			}),
		[settle],
	)

	useEffect(() => () => settleRef.current?.resolve(false), [])

	const asked = question !== null

	const pending = question?.pending ?? false

	const onOpenChange = useCallback(
		(open: boolean) => {
			if (!open && !pending) settle()?.resolve(false)
		},
		[pending, settle],
	)

	const onConfirm = useCallback(() => {
		const action = question?.options.action

		if (!action) {
			settle()?.resolve(true)

			return
		}

		const current = settleRef.current

		// Answers the question only while it is still open. A new question
		// replaces it while the work runs, and answers it.
		const isCurrent = () => settleRef.current === current

		setQuestion((held) => held && { ...held, pending: true })

		// A chain, not `try`, so a throw in the work also rejects, and the
		// compiler can compile the conditions.
		Promise.resolve()
			.then(action)
			.then(
				() => {
					if (isCurrent()) settle()?.resolve(true)
				},
				(error: unknown) => {
					if (isCurrent()) settle()?.reject(error)
				},
			)
	}, [question, settle])

	const options = question?.options

	return (
		<ConfirmContext value={ask}>
			{children}
			{dialog && (
				<dialog.Confirm
					open={asked}
					onOpenChange={onOpenChange}
					onConfirm={onConfirm}
					title={options?.title}
					description={options?.description}
					confirm={{ ...options?.confirm, pending }}
					cancel={{ ...options?.cancel, disabled: pending }}
					dismissOnBackdrop={!pending}
				/>
			)}
		</ConfirmContext>
	)
}

/**
 * Returns a function that asks the user a yes-or-no question in a
 * {@link Confirm} dialog, and waits for the answer.
 *
 * @remarks
 * The dialog is the one that `UIProvider` mounts, and it portals into the
 * container of that provider. The provider loads the module of the dialog in
 * idle time after the hydration. A question before that loads it at once, so
 * the dialog of that question can show some frames later. When the module does
 * not load, the promise rejects with the error.
 * Use it in place of a `Confirm` of your own when the question has no custom
 * children: the caller then keeps no open state and no target state. The function keeps its identity across renders.
 *
 * The dialog renders at the provider, not at the caller. Its content reads the
 * contexts above the provider, such as `LocaleProvider`, and not the contexts
 * between the provider and the caller.
 *
 * Use the controlled {@link Confirm} for a message with custom children.
 * @example
 * ```tsx
 * const confirm = useConfirm()
 *
 * async function remove(id: string) {
 *   if (await confirm({ title: 'Delete the file?', confirm: { label: 'Delete', color: 'red' } })) {
 *     deleteFile.mutate(id)
 *   }
 * }
 * ```
 * @throws When no `UIProvider` is above the caller.
 * @see {@link ConfirmOptions}
 */
export function useConfirm(): ConfirmFunction {
	return useConfirmContext()
}
