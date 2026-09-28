'use client'

import type { ReactNode } from 'react'
import { Alert } from 'ui/alert'

type ErrorAlertProps = {
	/** The message. */
	children: ReactNode
	/** Runs when the user dismisses the alert. */
	onDismiss?: () => void
}

/**
 * Error of an auth page that is not about one field, as a soft alert that the
 * user can dismiss.
 *
 * @internal
 * @remarks
 * An error about one field stays in the `Message` of its field. Without
 * `onDismiss`, the alert only hides itself. With `onDismiss`, the page clears
 * its error state, so that the next error shows the alert again.
 */
export function ErrorAlert({ children, onDismiss }: ErrorAlertProps) {
	return (
		<Alert
			severity="error"
			variant="soft"
			closable
			onOpenChange={(open) => open || onDismiss?.()}
			className="w-full"
		>
			{children}
		</Alert>
	)
}
