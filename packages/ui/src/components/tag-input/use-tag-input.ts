'use client'

import { useCallback } from 'react'
import { useControllable } from '../../hooks'

type UseTagInputOptions = {
	value?: string[]
	defaultValue?: string[]
	onValueChange?: (value: string[] | undefined) => void
	max?: number
	validate?: (tag: string) => boolean
	/** Fires when a removal transitions the list out of the at-max state. */
	onMaxReleased?: () => void
}

export function useTagInput({
	value,
	defaultValue,
	onValueChange,
	max,
	validate,
	onMaxReleased,
}: UseTagInputOptions) {
	const [tags = [], setTags] = useControllable<string[]>({
		value,
		defaultValue: defaultValue ?? [],
		onValueChange,
	})

	const atMax = max !== undefined && tags.length >= max

	const addTag = useCallback(
		(raw: string): boolean => {
			const tag = raw.trim()

			if (!tag) return false

			if (tags.includes(tag)) return false

			if (max !== undefined && tags.length >= max) return false

			if (validate && !validate(tag)) return false

			setTags([...tags, tag])

			return true
		},
		[tags, setTags, max, validate],
	)

	const removeTag = useCallback(
		(index: number) => {
			setTags(tags.filter((_, i) => i !== index))

			if (atMax) onMaxReleased?.()
		},
		[tags, setTags, atMax, onMaxReleased],
	)

	return { tags, atMax, addTag, removeTag }
}
