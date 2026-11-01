'use client'

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { useIdlePreload } from '../../hooks/use-idle-preload'
import { useLazyModule } from '../../hooks/use-lazy-module'
import { createLazyModule } from '../../utilities/lazy-module'
import { ConfirmContext, type ConfirmFunction, type ConfirmOptions } from './context'

/**
 * The module of the dialog. The host loads it in idle time after the
 * hydration. Thus the app does not load the dialog before it hydrates, and the
 * first question does not wait for it.
 * @internal
 */
const confirmModule = createLazyModule(() => import('./confirm'))

/** The callbacks of the promise of the open question. @internal */
type Resolvers = { resolve: (confirmed: boolean) => void; reject: (error: unknown) => void }

/** The question that the host shows, and whether its `action` runs. @internal */
type Question = { options: ConfirmOptions; loading: boolean }

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

	useIdlePreload(confirmModule)

	// A question loads the module itself, so it can reject with the error.
	const dialog = useLazyModule(confirmModule, false)

	const settleRef = useRef<Resolvers | null>(null)

	// Closes the dialog, and gives back the callbacks of the open promise one
	// time, so the caller answers it.
	const settle = useCallback((): Resolvers | null => {
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

				setQuestion({ options, loading: false })

				// The module caches, so a question after the first load waits for
				// nothing. A failed load rejects this question while it is open.
				confirmModule.load().catch((error: unknown) => {
					if (settleRef.current === current) settle()?.reject(error)
				})
			}),
		[settle],
	)

	useEffect(() => () => settleRef.current?.resolve(false), [])

	const asked = question !== null

	const loading = question?.loading ?? false

	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (!open && !loading) settle()?.resolve(false)
		},
		[loading, settle],
	)

	const handleConfirm = useCallback(() => {
		const action = question?.options.action

		if (!action) {
			settle()?.resolve(true)

			return
		}

		const current = settleRef.current

		// Answers the question only while it is still open. A new question
		// replaces it while the work runs, and answers it.
		const isCurrent = () => settleRef.current === current

		setQuestion((held) => held && { ...held, loading: true })

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
					onOpenChange={handleOpenChange}
					onConfirm={handleConfirm}
					title={options?.title}
					description={options?.description}
					confirm={{ ...options?.confirm, loading }}
					cancel={{ ...options?.cancel, disabled: loading }}
					dismissOnBackdrop={!loading}
				/>
			)}
		</ConfirmContext>
	)
}
