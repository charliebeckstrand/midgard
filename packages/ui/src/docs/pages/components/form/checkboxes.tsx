import { Button } from 'ui/button'
import { Checkbox, CheckboxField } from 'ui/checkbox'
import { Label, Message } from 'ui/fieldset'
import { Form } from 'ui/form'
import { Stack } from 'ui/stack'

export default function Checkboxes() {
	return (
		<Form
			defaultValues={{ terms: false, newsletter: false }}
			validate={{ terms: (value) => (value ? undefined : 'Accept the terms to continue.') }}
			onSubmit={() => new Promise((resolve) => setTimeout(resolve, 1000))}
		>
			<Stack gap="lg">
				<CheckboxField>
					<Checkbox name="terms" />
					<Label>I accept the terms of service</Label>
					<Message name="terms" />
				</CheckboxField>
				<CheckboxField>
					<Checkbox name="newsletter" />
					<Label>Send me product news</Label>
				</CheckboxField>
				<Button type="submit">Continue</Button>
			</Stack>
		</Form>
	)
}
