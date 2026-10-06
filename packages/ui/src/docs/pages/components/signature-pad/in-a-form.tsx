import { Button } from 'ui/button'
import { Description, Field, Label, Message } from 'ui/fieldset'
import { Flex } from 'ui/flex'
import { Form } from 'ui/form'
import { SignaturePad } from 'ui/signature-pad'
import { Stack } from 'ui/stack'

type Agreement = { signature: string | null }

const defaultValues: Agreement = { signature: null }

export default function InAForm() {
	return (
		<Form
			defaultValues={defaultValues}
			validate={{ signature: (value) => (value ? undefined : 'Sign to accept the agreement.') }}
			onSubmit={() => new Promise((resolve) => setTimeout(resolve, 1000))}
		>
			<Stack gap="lg">
				<Field>
					<Label as="span">Signature</Label>
					<Description>Sign with a mouse, a finger, or a stylus.</Description>
					<SignaturePad name="signature" />
					<Message name="signature" />
				</Field>
				<Flex>
					<Button type="submit">Accept agreement</Button>
				</Flex>
			</Stack>
		</Form>
	)
}
