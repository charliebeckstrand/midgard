import { type FormEvent, useState } from 'react'
import { Button } from 'ui/button'
import { Field, Label } from 'ui/fieldset'
import { Flex } from 'ui/flex'
import { Input } from 'ui/input'
import { Popover, PopoverContent, PopoverTrigger } from 'ui/popover'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

export default function WithAForm() {
	const [open, setOpen] = useState(false)

	const [name, setName] = useState('Quarterly report')

	function save(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()

		setName(String(new FormData(event.currentTarget).get('name')))

		setOpen(false)
	}

	return (
		<>
			<Popover placement="bottom-start" open={open} onOpenChange={setOpen}>
				<PopoverTrigger>
					<Button variant="outline">Rename</Button>
				</PopoverTrigger>
				<PopoverContent aria-label="Rename the file" autoFocus>
					<form onSubmit={save}>
						<Stack gap="md">
							<Field>
								<Label>Name</Label>
								<Input name="name" defaultValue={name} required />
							</Field>
							<Flex justify="end">
								<Button type="submit">Save</Button>
							</Flex>
						</Stack>
					</form>
				</PopoverContent>
			</Popover>
			<Text>Name: {name}</Text>
		</>
	)
}
