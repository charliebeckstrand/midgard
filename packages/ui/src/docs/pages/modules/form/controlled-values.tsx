import { useState } from 'react'
import { Button } from 'ui/button'
import { Field, Label } from 'ui/fieldset'
import { Flex } from 'ui/flex'
import { Form } from 'ui/form'
import { Input } from 'ui/input'
import { Stack } from 'ui/stack'

type Profile = { name: string; email: string }

export default function ControlledValues() {
	const [profile, setProfile] = useState<Profile>()

	const [loading, setLoading] = useState(false)

	async function load() {
		setLoading(true)

		await new Promise((resolve) => setTimeout(resolve, 1000))

		setProfile({ name: 'Ada Lovelace', email: 'ada@example.com' })

		setLoading(false)
	}

	return (
		<Stack gap="lg">
			<Form defaultValues={{ name: '', email: '' }} values={profile} disabled={loading}>
				<Stack gap="lg">
					<Field autoComplete="name">
						<Label>Name</Label>
						<Input name="name" />
					</Field>
					<Field autoComplete="email">
						<Label>Email</Label>
						<Input name="email" type="email" />
					</Field>
				</Stack>
			</Form>
			<Flex gap="sm">
				<Button loading={loading} onClick={load}>
					Load profile
				</Button>
				<Button variant="plain" onClick={() => setProfile(undefined)}>
					Clear
				</Button>
			</Flex>
		</Stack>
	)
}
