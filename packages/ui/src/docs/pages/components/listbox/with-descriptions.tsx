import { Field, Label } from 'ui/fieldset'
import { Listbox, ListboxDescription, ListboxLabel, ListboxOption, ListboxText } from 'ui/listbox'

const plans = [
	{ id: 'free', label: 'Free', description: 'One project and community support' },
	{ id: 'team', label: 'Team', description: 'Unlimited projects and email support' },
	{ id: 'enterprise', label: 'Enterprise', description: 'Single sign-on and a support contact' },
]

// `ListboxText` stacks the label over the description.
export default function WithDescriptions() {
	return (
		<Field>
			<Label>Plan</Label>
			<Listbox
				defaultValue="team"
				displayValue={(id) => plans.find((plan) => plan.id === id)?.label ?? id}
			>
				{plans.map((plan) => (
					<ListboxOption key={plan.id} value={plan.id}>
						<ListboxText>
							<ListboxLabel>{plan.label}</ListboxLabel>
							<ListboxDescription>{plan.description}</ListboxDescription>
						</ListboxText>
					</ListboxOption>
				))}
			</Listbox>
		</Field>
	)
}
