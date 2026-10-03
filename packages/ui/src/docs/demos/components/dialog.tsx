import { useState } from 'react'
import { Button } from '../../../components/button'
import {
	Dialog,
	DialogBody,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../../../components/dialog'
import { Field, Label } from '../../../components/fieldset'
import { Input } from '../../../components/input'
import { Text } from '../../../components/text'
import { Textarea } from '../../../components/textarea'
import { Stack } from '../../../structure/stack'
import { Axes, Example, Opener } from '../../engine'

export function Demo() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Axes
				of="Dialog"
				captions={false}
				omit={['open', 'defaultOpen']}
				render={(props, label) => (
					<Opener>
						<DialogTrigger>
							<Button variant="outline">{label}</Button>
						</DialogTrigger>

						<Dialog {...props}>
							<DialogTitle>{label}</DialogTitle>

							<DialogBody>
								<Text>
									Press the backdrop, press Escape, or use the button to close the dialog.
								</Text>
							</DialogBody>

							{/* With no footer of its own, the dialog shows the standard Close button. */}
						</Dialog>
					</Opener>
				)}
			/>

			<Example title="With a form">
				<Button color="green" onClick={() => setOpen(true)}>
					Create project
				</Button>
				<Dialog open={open} onOpenChange={setOpen}>
					<DialogHeader>
						<DialogTitle>Create project</DialogTitle>
						<DialogDescription>Enter the details for your new project.</DialogDescription>
					</DialogHeader>
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
					<DialogFooter>
						<Button variant="plain" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button color="green" onClick={() => setOpen(false)}>
							Create project
						</Button>
					</DialogFooter>
				</Dialog>
			</Example>
		</>
	)
}
