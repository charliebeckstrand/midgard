import { Field, Label } from 'ui/fieldset'
import { Select, SelectDescription, SelectLabel, SelectOption, SelectText } from 'ui/select'

const plans = [
	{ id: 'starter', name: 'Starter', description: 'One board and a week of history' },
	{ id: 'team', name: 'Team', description: 'Shared boards for up to ten people' },
	{ id: 'business', name: 'Business', description: 'Single sign-on and audit logs' },
]

export default function OptionDescriptions() {
	return (
		<Field>
			<Label>Plan</Label>
			<Select
				defaultValue="team"
				displayValue={(id) => plans.find((plan) => plan.id === id)?.name ?? id}
			>
				{plans.map((plan) => (
					<SelectOption key={plan.id} value={plan.id}>
						<SelectText>
							<SelectLabel>{plan.name}</SelectLabel>
							<SelectDescription>{plan.description}</SelectDescription>
						</SelectText>
					</SelectOption>
				))}
			</Select>
		</Field>
	)
}
