import { useState } from 'react'
import { Button } from 'ui/button'
import { Confirm } from 'ui/confirm'
import { GlassProvider } from 'ui/providers/glass'

export default function Glass() {
	const [open, setOpen] = useState(false)

	return (
		<GlassProvider>
			<Button onClick={() => setOpen(true)}>Sign out everywhere</Button>
			<Confirm
				open={open}
				onOpenChange={setOpen}
				onConfirm={() => setOpen(false)}
				title="Sign out everywhere?"
				description="You must sign in again on each of your devices."
				confirm={{ label: 'Sign out' }}
			/>
		</GlassProvider>
	)
}
