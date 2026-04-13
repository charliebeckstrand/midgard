import { useState } from 'react'
import { Button } from '../../components/button'
import { Checkbox, CheckboxField } from '../../components/checkbox'
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
import { Textarea } from '../../components/textarea'
import { Example } from '../components/example'

export const meta = { category: 'Overlay' }

export default function DialogDemo() {
	const [open, setOpen] = useState(false)
	const [glassOpen, setGlassOpen] = useState(false)
	const [discardOpen, setDiscardOpen] = useState(false)
	const [termsConditionsOpen, setTermsConditionsOpen] = useState(false)
	const [accepted, setAccepted] = useState(false)

	return (
		<div className="space-y-8">
			<Example title="Dialog">
				<Button color="green" onClick={() => setOpen(true)}>
					Create project
				</Button>
				<Dialog open={open} onClose={() => setOpen(false)}>
					<DialogTitle>Create project</DialogTitle>
					<DialogDescription>Enter the details for your new project.</DialogDescription>
					<DialogBody className="space-y-4">
						<Field>
							<Label>Project name</Label>
							<Input placeholder="My Project" />
						</Field>
						<Field>
							<Label>Project description</Label>
							<Textarea placeholder="A short description of your project" />
						</Field>
					</DialogBody>
					<DialogActions>
						<Button variant="plain" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button color="green" onClick={() => setOpen(false)}>
							Create project
						</Button>
					</DialogActions>
				</Dialog>
			</Example>
			<Example title="Glass">
				<Button onClick={() => setGlassOpen(true)}>Open glass dialog</Button>
				<Dialog glass open={glassOpen} onClose={() => setGlassOpen(false)}>
					<DialogTitle>Glass dialog</DialogTitle>
					<DialogBody className="space-y-4">
						<Text>
							The glass variant applies a backdrop blur with a transparent background, allowing
							content behind the dialog to show through.
						</Text>
					</DialogBody>
					<DialogActions>
						<Button variant="plain" onClick={() => setGlassOpen(false)}>
							Close
						</Button>
					</DialogActions>
				</Dialog>
			</Example>
			<Example title="Confirm dialog">
				<Button color="amber" onClick={() => setDiscardOpen(true)}>
					Discard changes
				</Button>
				<ConfirmDialog
					open={discardOpen}
					onClose={() => setDiscardOpen(false)}
					onConfirm={() => setDiscardOpen(false)}
					description="You have unsaved changes that will be lost."
					confirm={{ label: 'Discard changes', color: 'amber' }}
					cancel={{ label: 'Keep editing' }}
				/>
			</Example>
			<Example title="Confirm with body content">
				<Button color="blue" onClick={() => setTermsConditionsOpen(true)}>
					Accept terms and conditions
				</Button>
				<ConfirmDialog
					open={termsConditionsOpen}
					onClose={() => {
						setTermsConditionsOpen(false)
						setAccepted(false)
					}}
					onConfirm={() => {
						setTermsConditionsOpen(false)
						setAccepted(false)
					}}
					title="Terms and Conditions"
					confirm={{ label: 'Accept', color: 'blue', disabled: !accepted }}
				>
					<DialogBody className="flex flex-col gap-2">
						<Text>
							Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
							incididunt ut labore et dolore magna aliqua.
						</Text>
						<Text>
							Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex
							ea commodo consequat.
						</Text>
						<Text>
							Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat
							nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
							officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur
							adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
						</Text>
						<Text>
							Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
							incididunt ut labore et dolore magna aliqua.
						</Text>
						<Text>
							Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex
							ea commodo consequat.
						</Text>
						<Text>
							Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat
							nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
							officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur
							adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
						</Text>
						<Text>
							Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
							incididunt ut labore et dolore magna aliqua.
						</Text>
						<Text>
							Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex
							ea commodo consequat.
						</Text>
						<Text>
							Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat
							nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
							officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur
							adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
						</Text>
						<CheckboxField className="my-2">
							<Checkbox
								id="terms"
								color="blue"
								checked={accepted}
								onChange={() => setAccepted(!accepted)}
							/>
							<Label htmlFor="terms">Accept terms and conditions</Label>
						</CheckboxField>
					</DialogBody>
				</ConfirmDialog>
			</Example>
		</div>
	)
}
