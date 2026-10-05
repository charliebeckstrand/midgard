import { useState } from 'react'
import { Button } from 'ui/button'
import { Confirm, type ConfirmProps } from 'ui/confirm'

export default function ConfirmPlayground(props: ConfirmProps) {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button color="amber" onClick={() => setOpen(true)}>
				Discard changes
			</Button>
			<Confirm
				{...props}
				open={open}
				onOpenChange={setOpen}
				onConfirm={() => setOpen(false)}
				description="You have unsaved changes that will be lost."
				confirm={{ label: 'Discard changes', color: 'amber' }}
				cancel={{ label: 'Keep editing' }}
			/>
		</>
	)
}
