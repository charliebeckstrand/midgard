import { useState } from 'react'
import { Button } from 'ui/button'
import { Field, Label } from 'ui/fieldset'
import { Form } from 'ui/form'
import { Input } from 'ui/input'
import {
	Sheet,
	SheetBody,
	SheetClose,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetPanel,
	SheetTitle,
	SheetTrigger,
} from 'ui/sheet'
import { Stack } from 'ui/stack'
import { Textarea } from 'ui/textarea'

export default function WithForm() {
	const [open, setOpen] = useState(false)

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger>
				<Button variant="outline">Edit profile</Button>
			</SheetTrigger>
			<SheetPanel>
				<SheetHeader>
					<SheetTitle>Edit profile</SheetTitle>
					<SheetDescription>Other members of your team see these details.</SheetDescription>
				</SheetHeader>
				<Form
					defaultValues={{ name: 'Jane Smith', email: 'jane@example.com', bio: '' }}
					onSubmit={() => new Promise((resolve) => setTimeout(resolve, 1000))}
					onSettled={(outcome) => {
						if (outcome.ok) setOpen(false)
					}}
				>
					<SheetBody>
						<Stack gap="lg">
							<Field autoComplete="name">
								<Label>Full name</Label>
								<Input name="name" />
							</Field>
							<Field autoComplete="email">
								<Label>Email</Label>
								<Input name="email" type="email" />
							</Field>
							<Field>
								<Label>Bio</Label>
								<Textarea name="bio" placeholder="Tell your team about yourself" rows={4} />
							</Field>
						</Stack>
					</SheetBody>
					<SheetFooter>
						<SheetClose>
							<Button type="button" variant="plain">
								Cancel
							</Button>
						</SheetClose>
						<Button type="submit">Save</Button>
					</SheetFooter>
				</Form>
			</SheetPanel>
		</Sheet>
	)
}
