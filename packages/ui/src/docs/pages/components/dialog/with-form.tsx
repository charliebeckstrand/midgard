import { useState } from 'react'
import { Button } from 'ui/button'
import {
	Dialog,
	DialogBody,
	DialogClose,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from 'ui/dialog'
import { Field, Label, Message } from 'ui/fieldset'
import { Form } from 'ui/form'
import { Input } from 'ui/input'
import { Stack } from 'ui/stack'
import { Textarea } from 'ui/textarea'

export default function WithForm() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<DialogTrigger open={open} onClick={() => setOpen(true)}>
				<Button color="green">Create project</Button>
			</DialogTrigger>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogHeader>
					<DialogTitle>Create project</DialogTitle>
					<DialogDescription>Enter the details for your new project.</DialogDescription>
				</DialogHeader>
				<Form
					defaultValues={{ name: '', description: '' }}
					validate={{ name: (value) => (value.trim() ? undefined : 'Enter a project name.') }}
					onSubmit={() => new Promise((resolve) => setTimeout(resolve, 1000))}
					onSettled={(outcome) => {
						if (outcome.ok) setOpen(false)
					}}
				>
					<DialogBody>
						<Stack gap="lg">
							<Field>
								<Label>Project name</Label>
								<Input name="name" placeholder="My project" />
								<Message name="name" />
							</Field>
							<Field>
								<Label>Project description</Label>
								<Textarea name="description" placeholder="A short description of your project" />
							</Field>
						</Stack>
					</DialogBody>
					<DialogFooter>
						<DialogClose>
							<Button type="button" variant="plain">
								Cancel
							</Button>
						</DialogClose>
						<Button type="submit" color="green">
							Create project
						</Button>
					</DialogFooter>
				</Form>
			</Dialog>
		</>
	)
}
