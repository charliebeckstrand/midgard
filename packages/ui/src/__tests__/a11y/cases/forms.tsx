import { Button } from '../../../components/button'
import { Control } from '../../../components/control'
import { Field, Label } from '../../../components/fieldset'
import { Form } from '../../../components/form'
import { Input } from '../../../components/input'
import type { Case } from './types'

const noop = () => {}

/** Form structure: the form element, its fields, and the bound submit control. */
export const formCases: readonly Case[] = [
	[
		// A form with one labelled field; a typeless Button defaults to
		// type="submit" (native semantics) and submits the surrounding Form.
		'form',
		<Form key="fm" defaultValues={{ email: '' }} onSubmit={noop}>
			<Field>
				<Label>Email</Label>
				<Input name="email" type="email" placeholder="you@example.com" />
			</Field>
			<Button type="submit" color="blue">
				Submit
			</Button>
		</Form>,
	],
	[
		// The control primitive Field is built on: it provides the id/label context
		// that names the input.
		'control',
		<Control key="co">
			<Label>Full name</Label>
			<Input placeholder="Jane Smith" />
		</Control>,
	],
]
