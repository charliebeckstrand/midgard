import { useState } from 'react'
import { Button } from '../../components/button'
import {
	Dialog,
	DialogActions,
	DialogBody,
	DialogDescription,
	DialogTitle,
} from '../../components/dialog'
import { Field, Label } from '../../components/fieldset'
import { Input } from '../../components/input'

export const meta = { category: 'Overlay' }

export default function DialogDemo() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button onClick={() => setOpen(true)}>Open Dialog</Button>
			<Dialog open={open} onClose={() => setOpen(false)}>
				<DialogTitle>Create project</DialogTitle>
				<DialogDescription>Enter the details for your new project.</DialogDescription>
				<DialogBody>
					<Field>
						<Label>Project name</Label>
						<Input placeholder="My Project" />
					</Field>
				</DialogBody>
				<DialogActions>
					<Button variant="plain" onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button onClick={() => setOpen(false)}>Create</Button>
				</DialogActions>
			</Dialog>
		</>
	)
}
