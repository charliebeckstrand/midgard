import { defineMessage, defineMessages } from '../../primitives/intl/intl-messages'
import type { TypedMessageDescriptor } from '../../primitives/intl/types'

/**
 * The names that a bare card field takes.
 *
 * @internal
 */
export const creditCardMessages = defineMessages({
	number: {
		id: 'ui.creditCardInput.number',
		defaultMessage: 'Card number',
		description: 'The name of the field of a payment card number, when no label names it.',
	},
	expiry: {
		id: 'ui.creditCardInput.expiry',
		defaultMessage: 'Expiration date',
		description:
			'The name of the field of the expiration date of a payment card, when no label names it.',
	},
	securityCode: {
		id: 'ui.creditCardInput.securityCode',
		defaultMessage: 'Security code',
		description:
			'The name of the field of the 3- or 4-digit security code of a payment card, when no label names it.',
	},
})

/**
 * The error of an expiry that cannot be valid, such as "Enter a valid
 * expiration date (MM/YY)". It takes the `format` of the mask.
 *
 * @internal
 */
export const invalidExpiryMessage: TypedMessageDescriptor<{ format: string }> = defineMessage<{
	format: string
}>({
	id: 'ui.creditCardInput.invalidExpiry',
	defaultMessage: 'Enter a valid expiration date ({format})',
	description:
		'The error of an expiration date that cannot be valid, such as a past month. The format is the letters of the mask, such as MM/YY.',
})
