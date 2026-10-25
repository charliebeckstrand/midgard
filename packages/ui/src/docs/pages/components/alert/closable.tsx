import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Alert } from 'ui/alert'
import { ResetButton } from '../../../kit/reset-button.tsx'

export default function Closable() {
	const [open, setOpen] = useState(true)

	const alertRef = useRef<HTMLDivElement>(null)

	const resetRef = useRef<HTMLButtonElement>(null)

	// The Reset button leaves when the alert opens, so it gives the focus to the
	// close button of the alert.
	const reset = () => {
		flushSync(() => setOpen(true))

		alertRef.current?.querySelector<HTMLElement>('[data-slot="alert-close"]')?.focus()
	}

	// The alert stays mounted, so that its close gives the focus to the Reset
	// button. The Reset button comes first, so that its ref is set when the alert
	// closes.
	return (
		<>
			{open ? null : <ResetButton ref={resetRef} onClick={reset} />}
			<Alert
				ref={alertRef}
				severity="success"
				title="Changes saved"
				description="Your profile is up to date."
				closable
				open={open}
				onOpenChange={setOpen}
				returnFocusTo={resetRef}
			/>
		</>
	)
}
