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
			description="Version 2.0 has been released with new features and improvements."
			open={open}
			onOpenChange={setOpen}
		/>
	)
}
