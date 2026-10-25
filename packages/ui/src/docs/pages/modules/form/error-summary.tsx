import { Checkbox, CheckboxField } from 'ui/checkbox'
import { Field, Label, Message } from 'ui/fieldset'
import { Form, FormErrorSummary, FormSubmit } from 'ui/form'
import { Input } from 'ui/input'
import { Select, SelectLabel, SelectOption } from 'ui/select'
import { Stack } from 'ui/stack'

const plans = [
	{ id: 'starter', label: 'Starter' },
	{ id: 'team', label: 'Team' },
	{ id: 'enterprise', label: 'Enterprise' },
]

type Signup = { name: string; email: string; plan: string | undefined; terms: boolean }

export default function ErrorSummary() {
	return (
		<Form<Signup>
			defaultValues={{ name: '', email: '', plan: undefined, terms: false }}
			validateOn="submit"
			validate={{
				name: (value) => (value.trim() ? undefined : 'Enter your name.'),
				email: (value) => (value.includes('@') ? undefined : 'Enter a valid email address.'),
				plan: (value) => (value ? undefined : 'Select a plan.'),
				terms: (value) => (value ? undefined : 'Accept the terms to continue.'),
			}}
			onSubmit={() => new Promise((resolve) => setTimeout(resolve, 1000))}
		>
			<Stack gap="lg">
				<FormErrorSummary />
				<Field autoComplete="name">
					<Label>Name</Label>
					<Input name="name" />
					<Message name="name" />
				</Field>
				<Field autoComplete="email">
					<Label>Email</Label>
					<Input name="email" type="email" />
					<Message name="email" />
				</Field>
				<Field>
					<Label>Plan</Label>
					<Select
						name="plan"
						placeholder="Select a plan"
						displayValue={(id: string) => plans.find((plan) => plan.id === id)?.label ?? id}
					>
						{plans.map((plan) => (
							<SelectOption key={plan.id} value={plan.id}>
								<SelectLabel>{plan.label}</SelectLabel>
							</SelectOption>
						))}
					</Select>
					<Message name="plan" />
				</Field>
				<CheckboxField>
					<Checkbox name="terms" />
					<Label>I accept the terms of service</Label>
					<Message name="terms" />
				</CheckboxField>
				<FormSubmit>Start trial</FormSubmit>
			</Stack>
		</Form>
	)
}
