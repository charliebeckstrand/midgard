import { useState } from 'react'
import { Alert } from 'ui/alert'
import { Button } from 'ui/button'

export default function Closable() {
	const [open, setOpen] = useState(true)

	if (!open) {
		return (
			<Button variant="soft" onClick={() => setOpen(true)}>
				Reset
			</Button>
		)
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
