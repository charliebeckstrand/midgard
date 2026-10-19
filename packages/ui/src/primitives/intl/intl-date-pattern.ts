import { defineMessages } from './intl-messages'
import type { IntlShape } from './types'

// The letter of each field of a date pattern, which a translation can change.
const letterMessages = defineMessages({
	year: {
		id: 'ui.common.yearLetter',
		defaultMessage: 'Y',
		description:
			'The letter that stands for one digit of the year in a date pattern, such as each Y of DD/MM/YYYY. One letter.',
	},
	month: {
		id: 'ui.common.monthLetter',
		defaultMessage: 'M',
		description:
			'The letter that stands for one digit of the month in a date pattern, such as each M of DD/MM/YYYY. One letter.',
	},
	day: {
		id: 'ui.common.dayLetter',
		defaultMessage: 'D',
		description:
			'The letter that stands for one digit of the day in a date pattern, such as each D of DD/MM/YYYY. One letter.',
	},
})

/**
 * A date pattern with the letters of the language of `intl`, such as
 * "DD/MM/AAAA" for "DD/MM/YYYY" in Spanish. Each `Y`, `M`, and `D` of the
 * pattern stands for one digit of the year, the month, and the day. Each other
 * character stays.
 *
 * @internal
 */
export function formatDatePattern(intl: IntlShape, pattern: string): string {
	const letters: Record<string, string> = {
		Y: intl.formatMessage(letterMessages.year),
		M: intl.formatMessage(letterMessages.month),
		D: intl.formatMessage(letterMessages.day),
	}

	return pattern.replace(/[YMD]/g, (letter) => letters[letter] ?? letter)
}
