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
 * Any run of whitespace, comma or semicolon between tokens.
 *
 * Comma is already the field's declared commit key. A split on it is therefore the existing
 * contract applied to a second input channel, rather than new behavior. Whitespace joins it
 * because the commonest thing anyone pastes into a token field is a spreadsheet column.
 * Semicolon joins it because that is what a locale using comma as a decimal separator exports
 * instead. A single-line token
 * field has no legitimate whitespace-bearing token, so there is nothing to lose by splitting on it.
 *
 * @internal
 */
const TOKEN_SEPARATOR = /[\s,;]+/

/**
 * The tokens a raw string carries: what a paste or a multi-word draft commits as.
 *
 * @returns One trimmed, non-empty token per delimited run; `[]` for a string of only delimiters.
 *
 * @remarks
 * Reading a paste through this is not optional cleverness. `Input` renders a native `<input>`, and
 * HTML's value-sanitization algorithm strips U+000A and U+000D from one. A pasted spreadsheet
 * column therefore reaches `onChange` as a single undelimited digit run, with every boundary
 * already destroyed. Only a `paste` handler reading `clipboardData` before the default insertion
 * still has the newlines to split on.
 *
 * Public, unlike the rest of this module. A control that is not a `TagInput` but takes the same
 * pasted list needs this exact split. A `multiple` `Combobox` whose values are typed in rather
 * than picked is one. The alternative to exporting it is every such caller restating the
 * separator set and drifting from it.
 */
export function splitTokens(raw: string): string[] {
	return raw
		.split(TOKEN_SEPARATOR)
		.map((token) => token.trim())
		.filter((token) => token !== '')
}

/**
 * Whether a raw string carries a delimiter at all. It is the test for "this paste is a list", as
 * against one value dropped into a draft mid-edit.
 *
 * Strictly wider than `splitTokens(raw).length > 1`, and the only test a caller needs. Two tokens
 * can only come from a split that matched, so a token count can never say "list" where this says
 * "typing". A trailing delimiter (a spreadsheet column's last newline, `"84045\n"`) splits to ONE
 * token and is a pasted list all the same. Here rather than in the component, so the delimiter set
 * is stated once. The caller was carrying its own `/[\s,;]/`, which is exactly the drift
 * {@link splitTokens} is exported to prevent.
 *
 * @internal
 */
export function hasSeparator(raw: string): boolean {
	return TOKEN_SEPARATOR.test(raw)
}

/**
 * How a batch of candidate tokens was received.
 *
 * Only `rejected` goes back into the draft. A duplicate is already in the list, and a candidate
 * past the cap is refused by a limit the field itself shows. Neither is something the user has to
 * retype. `duplicates` is still a list rather than a count, so a batch of exactly one can be
 * announced by name. That is what keeps a single paste sounding the same as a single keystroke.
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
 * The refused part of a {@link TokenBatch}: what a commit turned away, and why.
 *
 * Derived from `TokenBatch` rather than spelled again, so the two cannot drift. It carries no
 * `accepted` set, because `onValueChange` already delivers that half.
 */
export type TokenRejection = Omit<TokenBatch, 'accepted'>

/**
 * Partitions candidate tokens against the tags already held.
 *
 * Pure, so the commit path is a two-liner and the sorting rules are testable without a DOM. Checks
 * each candidate against the accepted set as well as the held one, since a pasted column can repeat
 * a code. The order (duplicate, then limit, then `validate`) is {@link useTagInput}'s own, so
 * `validate` sees only novel, within-limit candidates however tokens arrive.
 *
 * @param room How many more tags fit; `Number.POSITIVE_INFINITY` when uncapped.
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
 * The live-region sentence for a committed batch, or `''` when nothing happened.
 *
 * ONE message per batch, not one per tag. Forty separate announcements for one paste is worse for
 * a screen-reader user than the silence it replaces (WCAG 4.1.3). A batch of exactly one still
 * reads as that token's own name: added, duplicate or invalid. One code entered by paste therefore
 * sounds the same as one entered by keystroke. The wording does not shift under the user with the
 * channel.
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
