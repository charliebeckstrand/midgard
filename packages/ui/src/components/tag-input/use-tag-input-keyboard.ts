'use client'

import type { KeyboardEvent } from 'react'

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
	 * One callback rather than an `addTag`/`clearInput` pair, so Enter, blur, the Add button and a
	 * paste all reach the same commit: the draft is tokenized once, in one place, and every entry
	 * channel therefore accepts the same input. Splitting that across handlers is what let a paste
	 * commit nothing while Enter worked.
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
 * Every key is ignored mid-IME-composition (a single early return), so a
 * candidate-selection keystroke never commits a partial tag or deletes one.
 * Backspace removes only when the draft is empty and at least one tag exists, so
 * it never competes with ordinary text deletion.
 *
 * @internal
 */
export function useTagInputKeyboard({ inputValue, commit, removeTag, tagCount }: KeyboardOptions) {
	return (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.nativeEvent.isComposing) return

		if (event.key === 'Enter' || event.key === ',') {
			event.preventDefault()

			commit(inputValue)
		}

		if (event.key === 'Backspace' && inputValue === '' && tagCount > 0) {
			removeTag(tagCount - 1)
		}
	}
}
