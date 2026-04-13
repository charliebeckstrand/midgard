'use client'

import { type KeyboardEvent, useCallback } from 'react'

export type UseTagKeyboardOptions = {
	/** Current input value. */
	inputValue: string
	/** Attempt to add a tag. Returns `true` if successful. */
	addTag: (raw: string) => boolean
	/** Remove the tag at the given index. */
	removeTag: (index: number) => void
	/** Clear the input value. */
	clearInput: () => void
	/** Number of existing tags. */
	tagCount: number
}

/**
 * Keyboard handler for tag-input fields.
 *
 * Handles Enter/comma to add, Backspace to remove the last tag.
 * Skips events during IME composition.
 */
export function useTagKeyboard({
	inputValue,
	addTag,
	removeTag,
	clearInput,
	tagCount,
}: UseTagKeyboardOptions) {
	return useCallback(
		(e: KeyboardEvent<HTMLInputElement>) => {
			if ((e.key === 'Enter' || e.key === ',') && !e.nativeEvent.isComposing) {
				e.preventDefault()

				if (addTag(inputValue)) {
					clearInput()
				}
			}

			if (e.key === 'Backspace' && inputValue === '' && tagCount > 0) {
				removeTag(tagCount - 1)
			}
		},
		[inputValue, addTag, removeTag, clearInput, tagCount],
	)
}
