// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { summarizeErrors } from '../../modules/form/engine/form-error-summary'

describe('summarizeErrors', () => {
	it('gives one row for each field with an issue, in the order of the map', () => {
		expect(
			summarizeErrors({
				name: ['Enter a name.'],
				age: undefined,
				email: ['Enter an email address.', 'Use a work address.'],
			}),
		).toEqual([
			{ name: 'name', issue: 'Enter a name.' },
			{ name: 'email', issue: 'Enter an email address.' },
		])
	})

	it('gives no row for a map with no issue', () => {
		expect(summarizeErrors({ name: undefined })).toEqual([])
	})
})
