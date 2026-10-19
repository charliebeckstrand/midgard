// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { localeIntl } from '../../primitives/intl/intl-catalog'
import { reorderMessages } from '../../primitives/intl/intl-reorder'

describe('reorderMessages', () => {
	it('formats the position and the total in the number format of the locale', () => {
		const values = { item: 'A', position: 1200, total: 12000 }

		expect(localeIntl('en-US').formatMessage(reorderMessages.subject, values)).toBe(
			'A, position 1,200 of 12,000',
		)

		// Spanish groups a number of five digits or more, with a period.
		expect(localeIntl('es-ES').formatMessage(reorderMessages.subject, values)).toBe(
			'A, posición 1200 de 12.000',
		)
	})
})
