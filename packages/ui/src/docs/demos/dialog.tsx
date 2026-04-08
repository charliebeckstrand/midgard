import { useState } from 'react'
import { Button } from '../../components/button'
import {
	ConfirmDialog,
	Dialog,
	DialogActions,
	DialogBody,
	DialogDescription,
	DialogTitle,
} from '../../components/dialog'
import { Field, Label } from '../../components/fieldset'
import { Input } from '../../components/input'
import { Text } from '../../components/text'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Overlay' }

export default function DialogDemo() {
	const [open, setOpen] = useState(false)
	const [confirmOpen, setConfirmOpen] = useState(false)
	const [discardOpen, setDiscardOpen] = useState(false)

	return (
		<div className="space-y-8">
			<Example
				title="Dialog"
				code={code`
					import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from 'ui/dialog'
					import { Button } from 'ui/button'
					import { Field, Label } from 'ui/fieldset'
					import { Input } from 'ui/input'

					<Dialog open={open} onClose={setOpen}>
						<DialogTitle>Create project</DialogTitle>
						<DialogDescription>Enter the details for your new project.</DialogDescription>
						<DialogBody>
							<Field>
								<Label>Project name</Label>
								<Input placeholder="My Project" />
							</Field>
						</DialogBody>
						<DialogActions>
							<Button variant="plain" onClick={() => setOpen(false)}>Cancel</Button>
							<Button onClick={() => setOpen(false)}>Create</Button>
						</DialogActions>
					</Dialog>
				`}
			>
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
			</Example>
			<Example
				title="Confirm dialog"
				code={code`
					import { ConfirmDialog } from 'ui/dialog'
					import { Button } from 'ui/button'

					<ConfirmDialog
						open={open}
						onClose={() => setOpen(false)}
						onConfirm={() => { /* handle delete */ setOpen(false) }}
						title="Delete item"
						description="This action cannot be undone."
						confirmLabel="Delete"
					/>
				`}
			>
				<Button color="red" onClick={() => setConfirmOpen(true)}>
					Delete item
				</Button>
				<ConfirmDialog
					open={confirmOpen}
					onClose={() => setConfirmOpen(false)}
					onConfirm={() => setConfirmOpen(false)}
					title="Delete item"
					description="This action cannot be undone."
					confirmLabel="Delete"
				/>
			</Example>
			<Example
				title="Confirm with body content"
				code={code`
					import { ConfirmDialog } from 'ui/dialog'

					<ConfirmDialog
						open={open}
						onClose={() => setOpen(false)}
						onConfirm={() => setOpen(false)}
						title="Discard changes?"
						confirmLabel="Discard"
						cancelLabel="Keep editing"
						color="amber"
					>
						<Text>You have unsaved changes that will be lost.</Text>
					</ConfirmDialog>
				`}
			>
				<Button variant="outline" onClick={() => setDiscardOpen(true)}>
					Discard changes
				</Button>
				<ConfirmDialog
					open={discardOpen}
					onClose={() => setDiscardOpen(false)}
					onConfirm={() => setDiscardOpen(false)}
					title="Discard changes?"
					confirmLabel="Discard"
					cancelLabel="Keep editing"
					color="amber"
				>
					<Text>You have unsaved changes that will be lost.</Text>
				</ConfirmDialog>
			</Example>
		</div>
	)
}
