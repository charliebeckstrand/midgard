import { Field, Label, Message } from 'ui/fieldset'
import { Flex } from 'ui/flex'
import { Form, FormSubmit } from 'ui/form'
import { Rating } from 'ui/rating'
import { Stack } from 'ui/stack'

type Review = { score: number | null }

const defaultValues: Review = { score: null }

export default function InAForm() {
	return (
		<Form
			defaultValues={defaultValues}
			validate={{ score: (value) => (value === null ? 'Select a score from 1 to 5.' : undefined) }}
			onSubmit={() => new Promise((resolve) => setTimeout(resolve, 1000))}
		>
			<Stack gap="lg">
				<Field>
					<Label as="span">How was your order?</Label>
					<Rating name="score" />
					<Message name="score" />
				</Field>
				<Flex>
					<FormSubmit>Send review</FormSubmit>
				</Flex>
			</Stack>
		</Form>
	)
}
