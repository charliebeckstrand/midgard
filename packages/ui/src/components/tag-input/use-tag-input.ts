'use client'

import { useCallback } from 'react'
import { announce } from '../../core'
import { useFormValue } from '../form/use-form-value'

type TagInputOptions = {
	name?: string
	value?: string[]
	defaultValue?: string[]
	onValueChange?: (value: string[] | undefined) => void
	max?: number
	validate?: (tag: string) => boolean
	/** Fires when a removal transitions the list out of the at-max state. */
	onMaxReleased?: () => void
}

export function useTagInput({
	name,
	value,
	defaultValue,
	onValueChange,
	max,
	validate,
	onMaxReleased,
}: TagInputOptions) {
	// Binds the tag list to an enclosing Form field by `name` (the value-typed
	// cascade); falls back to controlled/uncontrolled state. The inner text
	// `<Input>` stays nameless — the array is the bound value, not the draft.
	const {
		value: current,
		setValue: setTags,
		setTouched,
		invalid,
	} = useFormValue<string[]>(name, {
		value,
		defaultValue: defaultValue ?? [],
		onValueChange,
	})

	const tags = current ?? []

	const atMax = max !== undefined && tags.length >= max

	// Announces each outcome (addition, duplicate, limit, rejection) via the
	// live region (WCAG 4.1.3, 3.3.1). Rejections include the reason.
	const addTag = useCallback(
		(raw: string): boolean => {
			const tag = raw.trim()

			if (!tag) return false

			if (tags.includes(tag)) {
				announce(`${tag} is already in the list`)

				return false
			}

			if (max !== undefined && tags.length >= max) {
				announce('Tag limit reached')

				return false
			}

			if (validate && !validate(tag)) {
				announce(`${tag} is not a valid tag`)

				return false
			}

			setTags([...tags, tag])

			announce(`Added ${tag}`)

			return true
		},
		[tags, setTags, max, validate],
	)

	const removeTag = useCallback(
		(index: number) => {
			const removed = tags[index]

			setTags(tags.filter((_, i) => i !== index))

			if (removed) announce(`Removed ${removed}`)

			if (atMax) onMaxReleased?.()
		},
		[tags, setTags, atMax, onMaxReleased],
	)

	return { tags, atMax, addTag, removeTag, setTouched, invalid }
}
