import { Description, Field, Label, Message } from 'ui/fieldset'
import { Flex } from 'ui/flex'
import { Form, FormSubmit } from 'ui/form'
import { Input } from 'ui/input'
import { SignaturePad } from 'ui/signature-pad'
import { Stack } from 'ui/stack'

type Agreement = { signature: string | null; typedName: string }

const defaultValues: Agreement = { signature: null, typedName: '' }

export default function InAForm() {
	return (
		<Form
			defaultValues={defaultValues}
			validate={{
				signature: (value, { typedName }) =>
					value || typedName.trim() ? undefined : 'Draw your signature or type your full name.',
			}}
			onSubmit={() => new Promise((resolve) => setTimeout(resolve, 1000))}
		>
			<Stack gap="lg">
				<Field>
					<Label as="span">Signature</Label>
					<Description>Sign with a mouse, a finger, or a stylus.</Description>
					<SignaturePad name="signature" />
					<Message name="signature" />
				</Field>
				<Field>
					<Label>Typed signature</Label>
					<Description>Or type your full name to sign with the keyboard.</Description>
					<Input name="typedName" autoComplete="name" />
				</Field>
				<Flex>
					<FormSubmit>Accept agreement</FormSubmit>
				</Flex>
			</Stack>
		</Form>
	)
}
