'use client'

import { type KeyboardEvent, useCallback } from 'react'

export type UseInputTagKeyboardOptions = {
	/** Current input value. */
	inputValue: string
	/** Attempt to add a tag. Returns true on success. */
	addTag: (raw: string) => boolean
	/** Remove the tag at `index`. */
	removeTag: (index: number) => void
	/** Clear the input. */
	clearInput: () => void
	/** Number of existing tags. */
	tagCount: number
}

/** Keyboard handler for tag inputs — Enter / comma to add, Backspace to remove. Skips IME composition. */
export function useInputTagKeyboard({
	inputValue,
	addTag,
	removeTag,
	clearInput,
	tagCount,
}: UseInputTagKeyboardOptions) {
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
