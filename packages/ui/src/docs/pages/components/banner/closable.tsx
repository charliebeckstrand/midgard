import { useState } from 'react'
import { Banner } from 'ui/banner'
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
		<Banner
			severity="info"
			title="New version available"
			description="Version 2.0 has been released with new features and improvements."
			open={open}
			onOpenChange={setOpen}
		/>
	)
}
