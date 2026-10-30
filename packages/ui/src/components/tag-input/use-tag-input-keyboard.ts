'use client'

import type { KeyboardEvent } from 'react'
import { isComposing } from '../../utilities'
import { hasBrowserModifier } from '../../utilities/modifier-keys'
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
	 * Commits the draft and sets the text that stays in it. Enter, blur, the Add
	 * button, and a paste all use this one commit.
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
 * candidate-selection keystroke never commits a partial tag or deletes one. A
 * key with Ctrl, Meta, or Alt is for the browser, such as its settings, so it
 * commits nothing, removes nothing, and keeps its default.
 * Backspace removes only when the draft is empty and at least one tag exists, so
 * it never competes with ordinary text deletion.
 *
 * @internal
 */
export function useTagInputKeyboard({ inputValue, commit, removeTag, tagCount }: KeyboardOptions) {
	return (event: KeyboardEvent<HTMLInputElement>) => {
		if (isComposing(event) || hasBrowserModifier(event)) return

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
