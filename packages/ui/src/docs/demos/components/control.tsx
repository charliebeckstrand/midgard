import { useState } from 'react'
import { Alert } from '../../../components/alert'
import { Button } from '../../../components/button'
import { Control } from '../../../components/control'
import { Label } from '../../../components/fieldset'
import { Form } from '../../../components/form'
import { Input } from '../../../components/input'
import { Stack } from '../../../structure/stack'
import { Axes, Example } from '../../engine'

function RequiredExample() {
	const [submitting, setSubmitting] = useState(false)

	const handleSubmit = () => {
		setSubmitting(true)

		setTimeout(() => setSubmitting(false), 2000)
	}

	return (
		<Form defaultValues={{ name: '' }} disabled={submitting} onSubmit={handleSubmit}>
			<Stack gap="md">
				<Control required>
					<Label>Full name</Label>
					<Input placeholder="Jane Smith" />
				</Control>
				<Button type="submit">Submit</Button>
			</Stack>
		</Form>
	)
}

export function Demo() {
	return (
		<>
			<Alert
				severity="info"
				variant="soft"
				closable
				description="Control propagates a stable ID and state to control-aware children."
			/>

			<Axes
				of="Control"
				captions={false}
				render={(props, label) => (
					<Control {...props}>
						<Label>{label}</Label>
						<Input placeholder="jane@example.com" />
					</Control>
				)}
			/>

			<Example title="Required">
				<RequiredExample />
			</Example>
		</>
	)
}
