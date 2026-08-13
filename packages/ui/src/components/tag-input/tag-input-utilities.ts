/**
 * Any run of whitespace, comma or semicolon between tokens.
 *
 * Comma is already the field's declared commit key, so splitting on it is the existing contract
 * applied to a second input channel rather than new behaviour. Whitespace joins it because the
 * commonest thing anyone pastes into a token field is a spreadsheet column, and semicolon because
 * that is what a locale using comma as a decimal separator exports instead. A single-line token
 * field has no legitimate whitespace-bearing token, so there is nothing to lose by splitting on it.
 *
 * @internal
 */
const TOKEN_SEPARATOR = /[\s,;]+/

/**
 * The tokens a raw string carries — what a paste or a multi-word draft commits as.
 *
 * @returns One trimmed, non-empty token per delimited run; `[]` for a string of only delimiters.
 *
 * @remarks
 * Reading a paste through this is not optional cleverness. `Input` renders a native `<input>`, and
 * HTML's value-sanitization algorithm strips U+000A and U+000D from one, so a pasted spreadsheet
 * column reaches `onChange` as a single undelimited digit run with every boundary already destroyed.
 * Only a `paste` handler reading `clipboardData` before the default insertion still has the
 * newlines to split on.
 *
 * Public, unlike the rest of this module: a control that is not a `TagInput` but takes the same
 * pasted list — a `multiple` `Combobox` whose values are typed in rather than picked, say — needs
 * this exact split, and the alternative to exporting it is every such caller restating the
 * separator set and drifting from it.
 */
export function splitTokens(raw: string): string[] {
	return raw
		.split(TOKEN_SEPARATOR)
		.map((token) => token.trim())
		.filter((token) => token !== '')
}

/**
 * Whether a raw string carries a delimiter at all — the test for "this paste is a list", as against
 * one value dropped into a draft mid-edit.
 *
 * Strictly wider than `splitTokens(raw).length > 1`, and the only test a caller needs: two tokens can
 * only come from a split that matched, so a token count can never say "list" where this says
 * "typing", while a trailing delimiter (a spreadsheet column's last newline, `"84045\n"`) splits to
 * ONE token and is a pasted list all the same. Here rather than in the component so the delimiter set
 * is stated once — the caller was carrying its own `/[\s,;]/`, which is exactly the drift
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
 * Only `rejected` goes back into the draft — a duplicate is already in the list and a candidate past
 * the cap is refused by a limit the field itself shows, so neither is something the user has to
 * retype. `duplicates` is still a list rather than a count so a batch of exactly one can be announced
 * by name, which is what keeps a single paste sounding the same as a single keystroke.
 *
 * @internal
 */
export type TokenBatch = {
	/** Novel, within-limit, valid tokens, in the order given. */
	accepted: string[]
	/** Tokens `validate` refused — the ones the caller puts back in the draft. */
	rejected: string[]
	/** Tokens already held, or repeated within the batch. */
	duplicates: string[]
	/** How many were refused for want of room. */
	overLimit: number
}

/**
 * Partitions candidate tokens against the tags already held.
 *
 * Pure, so the commit path is a two-liner and the sorting rules are testable without a DOM. Checks
 * each candidate against the accepted set as well as the held one, since a pasted column can repeat
 * a code. The order — duplicate, then limit, then `validate` — is {@link useTagInput}'s own, so
 * `validate` sees only novel, within-limit candidates however tokens arrive.
 *
 * @param room How many more tags fit; `Number.POSITIVE_INFINITY` when uncapped.
 *
 * @internal
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
 * ONE message per batch, not one per tag: forty separate announcements for one paste is worse for a
 * screen-reader user than the silence it replaces (WCAG 4.1.3). A batch of exactly one still reads as
 * that token's own name — added, duplicate or invalid — so entering one code by paste sounds the same
 * as entering it by keystroke, and the wording does not shift under the user with the channel.
 *
 * @internal
 */
export function describeBatch({ accepted, rejected, duplicates, overLimit }: TokenBatch): string {
	const said: string[] = []

	if (accepted.length === 1) said.push(`Added ${accepted[0]}`)
	else if (accepted.length > 1) said.push(`Added ${accepted.length} tags`)

	if (duplicates.length === 1) said.push(`${duplicates[0]} is already in the list`)
	else if (duplicates.length > 1) said.push(`${duplicates.length} already in the list`)

	if (overLimit > 0) said.push('Tag limit reached')

	if (rejected.length === 1) said.push(`${rejected[0]} is not a valid tag`)
	else if (rejected.length > 1) said.push(`${rejected.length} not valid`)

	return said.length === 0 ? '' : `${said.join('. ')}.`
}
