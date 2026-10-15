'use client'

import type { KeyboardEvent } from 'react'
import { isComposing } from '../../utilities'
import { splitTokens } from './tag-input-utilities'

/**
 * Options for {@link useTagInputKeyboard}.
 *
 * @internal
 */
type KeyboardOptions = {
	/** Current draft text in the input. */
	inputValue: string
	/**
	 * Commits the draft and owns what is left behind.
	 *
	 * One callback rather than an `addTag`/`clearInput` pair, so Enter, blur, the
	 * Add button and a paste all reach the same commit. The draft is tokenized
	 * once, in one place, and every entry channel therefore accepts the same input.
	 * Splitting that across handlers is what let a paste commit nothing while Enter
	 * worked.
	 */
	commit: (raw: string) => void
	/** Removes the tag at `index`. */
	removeTag: (index: number) => void
	/** Current tag count, used to target the trailing tag on Backspace. */
	tagCount: number
}

/**
 * Keydown handler for {@link TagInput}: Enter or comma commits the draft, Backspace
 * on an empty draft removes the trailing tag.
 *
 * @returns A `keydown` handler for the inner text input.
 *
 * @remarks
 * Enter commits only a draft that has a token. On an empty or whitespace-only
 * draft, Enter keeps its default, so it submits the form as in every other text
 * field. Comma never submits, so it always cancels the default.
 *
 * Every key is ignored mid-IME-composition (a single early return), so a
 * candidate-selection keystroke never commits a partial tag or deletes one.
 * Backspace removes only when the draft is empty and at least one tag exists, so
 * it never competes with ordinary text deletion.
 *
 * @internal
 */
export function useTagInputKeyboard({ inputValue, commit, removeTag, tagCount }: KeyboardOptions) {
	return (event: KeyboardEvent<HTMLInputElement>) => {
		if (isComposing(event)) return

		const committable = event.key === ',' || (event.key === 'Enter' && hasToken(inputValue))

		if (committable) {
			event.preventDefault()

			commit(inputValue)
		}

		if (event.key === 'Backspace' && inputValue === '' && tagCount > 0) {
			removeTag(tagCount - 1)
		}
	}
}

/** Whether the draft has a token to commit. It uses the same tokenizer as the commit. */
function hasToken(inputValue: string) {
	return splitTokens(inputValue).length > 0
}
