import { useState } from 'react'
import { Alert, AlertActions, AlertDescription, AlertTitle } from '../../components/alert'
import { Button } from '../../components/button'

export const meta = { category: 'Overlay' }

export default function AlertDemo() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button onClick={() => setOpen(true)}>Open Alert</Button>
			<Alert open={open} onClose={() => setOpen(false)}>
				<AlertTitle>Delete item</AlertTitle>
				<AlertDescription>
					Are you sure you want to delete this item? This action cannot be undone.
				</AlertDescription>
				<AlertActions>
					<Button variant="plain" onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button color="red" onClick={() => setOpen(false)}>
						Delete
					</Button>
				</AlertActions>
			</Alert>
		</>
	)
}
