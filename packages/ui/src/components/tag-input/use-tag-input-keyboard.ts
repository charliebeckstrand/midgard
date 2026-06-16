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
	/** Commits a tag; returns `true` on success. */
	addTag: (raw: string) => boolean
	/** Removes the tag at `index`. */
	removeTag: (index: number) => void
	/** Clears the draft input. */
	clearInput: () => void
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
 * Enter/comma are ignored mid-IME-composition so a candidate-selection keystroke
 * never commits a partial tag. Backspace removes only when the draft is empty and
 * at least one tag exists, so it never competes with ordinary text deletion.
 *
 * @internal
 */
export function useTagInputKeyboard({
	inputValue,
	addTag,
	removeTag,
	clearInput,
	tagCount,
}: KeyboardOptions) {
	return (event: KeyboardEvent<HTMLInputElement>) => {
		if ((event.key === 'Enter' || event.key === ',') && !event.nativeEvent.isComposing) {
			event.preventDefault()

			if (addTag(inputValue)) {
				clearInput()
			}
		}

		if (event.key === 'Backspace' && inputValue === '' && tagCount > 0) {
			removeTag(tagCount - 1)
		}
	}
}
