import { Field, Label } from 'ui/fieldset'
import { Select, SelectDescription, SelectLabel, SelectOption, SelectText } from 'ui/select'

const plans = [
	{ id: 'starter', label: 'Starter', description: 'One board and a week of history' },
	{ id: 'team', label: 'Team', description: 'Shared boards for up to ten people' },
	{ id: 'business', label: 'Business', description: 'Single sign-on and audit logs' },
]

export default function WithDescriptions() {
	return (
		<Field>
			<Label>Plan</Label>
			<Select
				defaultValue="team"
				displayValue={(id) => plans.find((plan) => plan.id === id)?.label ?? id}
			>
				{plans.map((plan) => (
					<SelectOption key={plan.id} value={plan.id}>
						<SelectText>
							<SelectLabel>{plan.label}</SelectLabel>
							<SelectDescription>{plan.description}</SelectDescription>
						</SelectText>
					</SelectOption>
				))}
			</Select>
		</Field>
	)
}
