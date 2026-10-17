import { Button } from '../../../components/button'
import { Control } from '../../../components/control'
import { Field, Label } from '../../../components/fieldset'
import { Input } from '../../../components/input'
import { Form, FormReset, FormSubmit } from '../../../modules/form'
import { noop } from '../../helpers'
import type { Case } from './types'

/** Form structure: the form element, its fields, and the bound submit control. */
export const formCases: readonly Case[] = [
	{
		// A form with one labeled field; a typeless Button defaults to
		// type="submit" (native semantics) and submits the surrounding Form.
		name: 'form',
		element: (
			<Form key="fm" defaultValues={{ email: '' }} onSubmit={noop}>
				<Field>
					<Label>Email</Label>
					<Input name="email" type="email" placeholder="you@example.com" />
				</Field>
				<Button type="submit" color="blue">
					Submit
				</Button>
			</Form>
		),
		passthrough: [
			{
				render: (props) => (
					<Form defaultValues={{ name: '' }} {...props}>
						<input name="name" />
					</Form>
				),
				slot: 'form',
			},
		],
	},
	{
		// The submit and reset parts of the form module. The reset button is
		// aria-disabled while the form is clean, and it stays in the tab order.
		name: 'form-submit-reset',
		element: (
			<Form key="fsr" defaultValues={{ email: '' }} onSubmit={noop}>
				<Field>
					<Label>Email</Label>
					<Input name="email" type="email" />
				</Field>
				<FormSubmit>Save</FormSubmit>
				<FormReset variant="plain">Discard</FormReset>
			</Form>
		),
		passthrough: [
			{
				render: (props) => (
					<Form defaultValues={{}}>
						<FormSubmit {...props}>Save</FormSubmit>
					</Form>
				),
				slot: 'form-submit',
			},
			{
				render: (props) => (
					<Form defaultValues={{}}>
						<FormReset {...props}>Discard</FormReset>
					</Form>
				),
				slot: 'form-reset',
			},
		],
	},
	{
		// The control primitive Field is built on: it provides the id/label context
		// that names the input.
		name: 'control',
		element: (
			<Control key="co">
				<Label>Full name</Label>
				<Input placeholder="Jane Smith" />
			</Control>
		),
	},
]
