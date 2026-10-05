import { Button } from 'ui/button'
import { Field, Label, Message } from 'ui/fieldset'
import { Form } from 'ui/form'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { Stack } from 'ui/stack'
import { teamName, teams } from './teams.ts'

type Announcement = { teams: string[] }

export default function InAForm() {
	return (
		<Form<Announcement>
			defaultValues={{ teams: [] }}
			validate={{
				teams: (value) => (value.length > 0 ? undefined : 'Select at least one team.'),
			}}
			onSubmit={() => new Promise((resolve) => setTimeout(resolve, 1000))}
		>
			<Stack gap="lg">
				<Field>
					<Label>Notify teams</Label>
					<Listbox
						name="teams"
						multiple
						required
						placeholder="Select teams"
						displayValue={teamName}
					>
						{teams.map((team) => (
							<ListboxOption key={team.id} value={team.id}>
								<ListboxLabel>{team.name}</ListboxLabel>
							</ListboxOption>
						))}
					</Listbox>
					<Message name="teams" />
				</Field>
				<Button type="submit">Send announcement</Button>
			</Stack>
		</Form>
	)
}
