'use client'

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
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { Textarea } from '../../components/textarea'
import { Example } from '../components/example'

export const meta = { category: 'Overlay' }

export default function DialogDemo() {
	const [open, setOpen] = useState(false)
	const [glassOpen, setGlassOpen] = useState(false)

	return (
		<Stack gap="xl">
			<Example title="Dialog">
				<Button color="green" onClick={() => setOpen(true)}>
					Create project
				</Button>
				<Dialog open={open} onOpenChange={setOpen}>
					<DialogTitle>Create project</DialogTitle>
					<DialogDescription>Enter the details for your new project.</DialogDescription>
					<DialogBody>
						<Stack gap="lg">
							<Field>
								<Label>Project name</Label>
								<Input placeholder="My Project" />
							</Field>
							<Field>
								<Label>Project description</Label>
								<Textarea placeholder="A short description of your project" />
							</Field>
						</Stack>
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
				<Dialog glass open={glassOpen} onOpenChange={setGlassOpen}>
					<DialogTitle>Glass dialog</DialogTitle>
					<DialogBody>
						<Stack gap="lg">
							<Text>
								The glass variant applies a backdrop blur with a transparent background, allowing
								content behind the dialog to show through.
							</Text>
						</Stack>
					</DialogBody>
					<DialogActions>
						<Button variant="plain" onClick={() => setGlassOpen(false)}>
							Close
						</Button>
					</DialogActions>
				</Dialog>
			</Example>
		</Stack>
	)
}
