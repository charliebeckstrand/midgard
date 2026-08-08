/**
 * The one rule for what a composer holds to send. `ChatPrompt` and
 * `useChatDraft` each wrote that rule, so the two could disagree about the same
 * draft; the component now adds only its own `disabled` test above it.
 */

/**
 * The content a draft sends: the value without its surrounding whitespace. An
 * empty result states that the draft holds nothing to send.
 *
 * @internal
 */
export function draftContent(value: string): string {
	return value.trim()
}

/**
 * Whether a draft holds something to send: {@link draftContent} as the boolean
 * a send control reads.
 *
 * @internal
 */
export function canSubmitDraft(value: string): boolean {
	return draftContent(value) !== ''
}
