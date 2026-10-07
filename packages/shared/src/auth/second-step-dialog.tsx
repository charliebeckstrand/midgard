'use client'

import { useRouter } from 'next/navigation'
import { type ComponentType, useEffect, useState } from 'react'
import type { SecondStepPending } from './second-step'
import { setSecondStepDialog } from './second-step-request'

// The dialog carries Dialog, Form, Motion, and WebAuthn. It is a chunk of its
// own, so a route does not load it until the gateway asks for the second step.
let panel: Promise<void> | undefined

// The dialog component, when its chunk is loaded.
let SecondStepPanel: ComponentType<{ pending: SecondStepPending | undefined }> | undefined

function loadPanel(): Promise<void> {
	panel ??= import('./second-step').then(
		(module) => {
			SecondStepPanel = module.SecondStepPanel
		},
		(error: unknown) => {
			// The next request for the second step tries the load again.
			panel = undefined

			throw error
		},
	)

	return panel
}

/**
 * Dialog of the second step, for `ensureSecondStep` and
 * `fetchWithSecondStep`. Mount it one time, in the providers of the app.
 *
 * @remarks
 * The dialog module loads when the gateway first asks for the second step.
 * The dialog opens after the load, so it opens with its form in it. After the
 * second step, the dialog refreshes the Server Components, so they read the
 * new session. After the fifth wrong try, the gateway ends the session, and
 * the page goes to `/login?expired=true`.
 */
export function SecondStepDialog() {
	const router = useRouter()

	const [pending, setPending] = useState<SecondStepPending>()

	useEffect(() => {
		setSecondStepDialog(async (methods) => {
			await loadPanel()

			return new Promise<boolean>((resolve) => {
				setPending({
					methods,
					resolve: (verified) => {
						setPending(undefined)

						if (verified) router.refresh()

						resolve(verified)
					},
				})
			})
		})

		return () => setSecondStepDialog(undefined)
	}, [router])

	return SecondStepPanel ? <SecondStepPanel pending={pending} /> : null
}
