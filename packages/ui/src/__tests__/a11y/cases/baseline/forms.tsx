import { Field, Label } from '../../../../components/fieldset'
import { Form } from '../../../../components/form'
import { Input } from '../../../../components/input'
import { SubmitButton } from '../../../../components/submit-button'
import type { Case } from '../types'

const noop = () => {}

/** Form structure — the form element and its bound submit control. */
export const formCases: readonly Case[] = [
	[
		// A form with one labelled field; the bound SubmitButton inherits Button
		// semantics and submits the surrounding Form.
		'form',
		<Form key="fm" defaultValues={{ email: '' }} onSubmit={noop}>
			<Field>
				<Label>Email</Label>
				<Input name="email" type="email" placeholder="you@example.com" />
			</Field>
			<SubmitButton color="blue">Submit</SubmitButton>
		</Form>,
	],
]
