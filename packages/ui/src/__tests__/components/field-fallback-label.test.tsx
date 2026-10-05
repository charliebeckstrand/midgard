import type { ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CreditCardInputCvv, CreditCardInputExpiry } from '../../components/credit-card-input'
import { Field, Label } from '../../components/fieldset'
import { TagInput } from '../../components/tag-input'
import { renderUI, screen } from '../helpers'

/**
 * The fields that default an `aria-label` when nothing else names them, with
 * that default name.
 */
const fields: [string, () => ReactElement, string][] = [
	['TagInput', () => <TagInput />, 'Add tags'],
	['CreditCardInputExpiry', () => <CreditCardInputExpiry />, 'Expiration date'],
	['CreditCardInputCvv', () => <CreditCardInputCvv />, 'Security code'],
]

describe.each(fields)('%s default name', (_name, field, fallback) => {
	it('takes its name from a Field Label in the server render', () => {
		const container = document.createElement('div')

		container.innerHTML = renderToString(
			<Field>
				<Label>Field name</Label>
				{field()}
			</Field>,
		)

		const input = container.querySelector('input:not([type="hidden"])')

		const label = container.querySelector('label')

		// An aria-label outranks the native label, so the server markup has none.
		expect(input).not.toHaveAttribute('aria-label')

		expect(input?.id).toBeTruthy()

		expect(label).toHaveAttribute('for', input?.id)
	})

	it('takes its name from a Field Label after mount', () => {
		renderUI(
			<Field>
				<Label>Field name</Label>
				{field()}
			</Field>,
		)

		expect(screen.getByRole('textbox', { name: 'Field name' })).not.toHaveAttribute('aria-label')
	})

	it('keeps the default name in a Field with no Label', () => {
		renderUI(<Field>{field()}</Field>)

		expect(screen.getByRole('textbox', { name: fallback })).toHaveAttribute('aria-label', fallback)
	})

	it('has the default name outside a Field in the server render', () => {
		const container = document.createElement('div')

		container.innerHTML = renderToString(field())

		expect(container.querySelector('input:not([type="hidden"])')).toHaveAttribute(
			'aria-label',
			fallback,
		)
	})
})
