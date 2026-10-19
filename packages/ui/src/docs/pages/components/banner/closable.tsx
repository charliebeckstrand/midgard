import { useState } from 'react'
import { Banner } from 'ui/banner'
import { ResetButton } from '../../../kit/reset-button.tsx'

export default function Closable() {
	const [open, setOpen] = useState(true)

	if (!open) {
		return <ResetButton onClick={() => setOpen(true)} />
	}

	return (
		<Banner
			severity="info"
			title="New version available"
			description="Version 2.4 is ready to install."
			open={open}
			onOpenChange={setOpen}
		/>
	)
}
