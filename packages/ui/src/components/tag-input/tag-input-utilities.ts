import { defineMessages } from '../../primitives/intl/intl-messages'
import type { IntlShape } from '../../primitives/intl/types'

// The live-region text of a TagInput. A count of one names the tag itself.
const messages = defineMessages<{
	added: { count: number; tag: string }
	duplicates: { count: number; tag: string }
	limit: Record<never, never>
	rejected: { count: number; tag: string }
	removed: { tag: string }
}>({
	added: {
		id: 'ui.tagInput.added',
		defaultMessage: '{count, plural, one {Added {tag}} other {Added # tags}}',
		description:
			'Spoken when tags are added. With one tag, it names the tag. Else it gives the count.',
	},
	duplicates: {
		id: 'ui.tagInput.duplicates',
		defaultMessage:
			'{count, plural, one {{tag} is already in the list} other {# already in the list}}',
		description:
			'Spoken when typed or pasted tags are already in the list. With one tag, it names the tag.',
	},
	limit: {
		id: 'ui.tagInput.limit',
		defaultMessage: 'Tag limit reached',
		description: 'Spoken when the field holds the most tags that it takes, so a tag is not added.',
	},
	rejected: {
		id: 'ui.tagInput.rejected',
		defaultMessage: '{count, plural, one {{tag} is not a valid tag} other {# not valid}}',
		description:
			'Spoken when typed or pasted tags fail the validation. With one tag, it names the tag.',
	},
	removed: {
		id: 'ui.tagInput.removed',
		defaultMessage: 'Removed {tag}',
		description: 'Spoken when the reader removes a tag.',
	},
})

/**
 * Any run of white space, comma, or semicolon between tokens.
 *
 * Comma is the commit key of the field, so a paste splits on it too. White
 * space is in the set because a pasted spreadsheet column has a newline after
 * each value. Semicolon is in the set because a locale that writes a comma as
 * its decimal separator exports a list with semicolons. A single-line token
 * field has no token that holds white space.
 *
 * @internal
 */
const TOKEN_SEPARATOR = /[\s,;]+/

/**
 * The tokens of a raw string: what a paste or a draft commits.
 *
 * @returns One trimmed, non-empty token for each delimited run, or `[]` for a
 * string of delimiters only.
 *
 * @remarks
 * A paste must go through this before the default insertion. The value
 * sanitization of a native `<input>` removes U+000A and U+000D, so a pasted
 * spreadsheet column reaches `onChange` as one run with no delimiters. Only a
 * `paste` handler that reads `clipboardData` still has the newlines.
 *
 * @internal
 */
export function splitTokens(raw: string): string[] {
	return raw
		.split(TOKEN_SEPARATOR)
		.map((token) => token.trim())
		.filter((token) => token !== '')
}

/**
 * Whether a raw string holds a delimiter. It tells a pasted list from one
 * value that the user pastes into a draft.
 *
 * It is wider than `splitTokens(raw).length > 1`: two tokens come only from a
 * split that matched, and a value with a trailing delimiter, such as the last
 * newline of a spreadsheet column (`"84045\n"`), is one token but still a list.
 * It uses {@link TOKEN_SEPARATOR}, so the delimiter set has one definition.
 *
 * @internal
 */
export function hasSeparator(raw: string): boolean {
	return TOKEN_SEPARATOR.test(raw)
}

/**
 * The result of a batch of candidate tokens.
 *
 * Only `rejected` goes back into the draft. A duplicate is already in the
 * list, and the field shows its cap, so the user does not type either again.
 * `duplicates` is a list and not a count, so the live region can name the tag
 * of a batch of one, as it does for one keystroke.
 */
export type TokenBatch = {
	/** Novel, within-limit, valid tokens, in the order given. */
	accepted: string[]
	/** Tokens `validate` refused: the ones the caller puts back in the draft. */
	rejected: string[]
	/** Tokens already held, or repeated within the batch. */
	duplicates: string[]
	/** How many were refused for want of room. */
	overLimit: number
}

/**
 * The refused part of a {@link TokenBatch}: what a commit refused, and why.
 * It has no `accepted` set, because `onValueChange` gives that part.
 */
export type TokenRejection = Omit<TokenBatch, 'accepted'>

/**
 * Sorts candidate tokens against the tags that the field holds.
 *
 * Each candidate is checked against the accepted tokens too, because a pasted
 * column can repeat a code. The checks go in this order: duplicate, limit,
 * then `validate`. Thus `validate` sees only new candidates that fit, from
 * every channel.
 *
 * @param room - How many more tags fit; `Number.POSITIVE_INFINITY` when uncapped.
 */
export function classifyTokens(
	raw: readonly string[],
	held: readonly string[],
	room: number,
	validate?: (tag: string) => boolean,
): TokenBatch {
	const batch: TokenBatch = { accepted: [], rejected: [], duplicates: [], overLimit: 0 }

	for (const candidate of raw) {
		const tag = candidate.trim()

		if (tag === '') continue

		if (held.includes(tag) || batch.accepted.includes(tag)) {
			batch.duplicates.push(tag)
		} else if (batch.accepted.length >= room) {
			batch.overLimit += 1
		} else if (validate && !validate(tag)) {
			batch.rejected.push(tag)
		} else {
			batch.accepted.push(tag)
		}
	}

	return batch
}

/**
 * The live-region sentence for a committed batch, or `''` when nothing
 * changed.
 *
 * A batch gets one message, not one for each tag, so a long paste does not
 * flood a screen reader (WCAG 4.1.3). A batch of one names its tag, so one
 * code from a paste sounds the same as one code from a keystroke.
 *
 * @internal
 */
export function describeBatch(
	intl: IntlShape,
	{ accepted, rejected, duplicates, overLimit }: TokenBatch,
): string {
	const said: string[] = []

	// One part for each outcome that has tags. A part of one tag names it.
	const part = (message: (typeof messages)['added'], tags: readonly string[]) => {
		if (tags.length > 0) {
			said.push(intl.formatMessage(message, { count: tags.length, tag: tags[0] ?? '' }))
		}
	}

	part(messages.added, accepted)

	part(messages.duplicates, duplicates)

	if (overLimit > 0) said.push(intl.formatMessage(messages.limit))

	part(messages.rejected, rejected)

	return said.length === 0 ? '' : `${said.join('. ')}.`
}

/**
 * The live-region text when the reader removes `tag`.
 *
 * @internal
 */
export function describeRemoval(intl: IntlShape, tag: string): string {
	return intl.formatMessage(messages.removed, { tag })
}
