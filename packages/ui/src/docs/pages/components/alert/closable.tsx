import { useState } from 'react'
import { Alert } from 'ui/alert'
import { ResetButton } from '../../../kit/reset-button.tsx'

export default function Closable() {
	const [open, setOpen] = useState(true)

	if (!open) {
		return <ResetButton onClick={() => setOpen(true)} />
	}

	return (
		<Alert
			severity="success"
			title="Changes saved"
			description="Your changes have been saved successfully."
			closable
			open={open}
			onOpenChange={setOpen}
		/>
	)
}
