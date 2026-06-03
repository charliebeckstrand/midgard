import { Field, Label } from '../../components/fieldset'
import { Flex } from '../../components/flex'
import { Form } from '../../components/form'
import { Input } from '../../components/input'
import { Stack } from '../../components/stack'
import { SubmitButton } from '../../components/submit-button'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

async function simulateAsyncSubmission() {
	return new Promise<void>((r) => setTimeout(r, 1000))
}

export function Demo() {
	return (
		<>
			<Example title="Bound to form">
				<Form defaultValues={{ email: '' }} onSubmit={simulateAsyncSubmission}>
					<Stack gap="lg">
						<Field autoComplete="email">
							<Label>Email</Label>
							<Input name="email" type="email" placeholder="you@example.com" />
						</Field>
						<SubmitButton color="blue">Submit</SubmitButton>
					</Stack>
				</Form>
			</Example>

			<Example title="Inherits Button styling">
				<Form defaultValues={{}} onSubmit={simulateAsyncSubmission}>
					<Flex wrap gap="sm">
						<SubmitButton variant="solid" color="blue">
							Solid
						</SubmitButton>
						<SubmitButton variant="soft" color="green">
							Soft
						</SubmitButton>
						<SubmitButton variant="outline">Outline</SubmitButton>
						<SubmitButton size="sm">Small</SubmitButton>
						<SubmitButton size="lg">Large</SubmitButton>
					</Flex>
				</Form>
			</Example>

			<Example title="Manually disabled">
				<Form defaultValues={{}} onSubmit={simulateAsyncSubmission}>
					<SubmitButton disabled>Submit</SubmitButton>
				</Form>
			</Example>

			<Example title="Outside a form">
				<SubmitButton>Submits the nearest native form</SubmitButton>
			</Example>
		</>
	)
}
