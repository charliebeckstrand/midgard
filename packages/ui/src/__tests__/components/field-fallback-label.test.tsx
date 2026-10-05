import type { ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AddressInput } from '../../components/address-input'
import { CreditCardInputCvv, CreditCardInputExpiry } from '../../components/credit-card-input'
import { DateInput } from '../../components/date-input'
import { Field, Label } from '../../components/fieldset'
import { FileUploadButton } from '../../components/file-upload'
import { TagInput } from '../../components/tag-input'
import { renderUI } from '../helpers'

/** The selector of a field's own input: the text input, or the file input of an upload. */
const TEXT = 'input:not([type="hidden"])'

/**
 * The fields that default an `aria-label` when nothing else names them, with
 * that default name and the selector of the named input.
 */
const fields: [string, () => ReactElement, string, string][] = [
	['TagInput', () => <TagInput />, 'Add tags', TEXT],
	['CreditCardInputExpiry', () => <CreditCardInputExpiry />, 'Expiration date', TEXT],
	['CreditCardInputCvv', () => <CreditCardInputCvv />, 'Security code', TEXT],
	['DateInput', () => <DateInput />, 'Date', TEXT],
	['AddressInput', () => <AddressInput placeholder="Find an address" />, 'Find an address', TEXT],
	['FileUploadButton', () => <FileUploadButton />, 'Upload', 'input[type="file"]'],
]

describe.each(fields)('%s default name', (_name, field, fallback, selector) => {
	it('takes its name from a Field Label in the server render', () => {
		const container = document.createElement('div')

		container.innerHTML = renderToString(
			<Field>
				<Label>Field name</Label>
				{field()}
			</Field>,
		)

		const input = container.querySelector(selector)

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

		const input = document.querySelector(selector)

		expect(input).toHaveAccessibleName('Field name')

		expect(input).not.toHaveAttribute('aria-label')
	})

	it('keeps the default name in a Field with no Label', () => {
		renderUI(<Field>{field()}</Field>)

		expect(document.querySelector(selector)).toHaveAttribute('aria-label', fallback)
	})

	it('has the default name outside a Field in the server render', () => {
		const container = document.createElement('div')

		container.innerHTML = renderToString(field())

		expect(container.querySelector(selector)).toHaveAttribute('aria-label', fallback)
	})
})
