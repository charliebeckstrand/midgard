'use client'

import { useCallback } from 'react'
import { useControllable } from '../../hooks'
import { useAnnounce } from '../../providers/announcer'

type TagInputOptions = {
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
}: TagInputOptions) {
	const [tags = [], setTags] = useControllable<string[]>({
		value,
		defaultValue: defaultValue ?? [],
		onValueChange,
	})

	const atMax = max !== undefined && tags.length >= max

	const announce = useAnnounce()

	// Adding/removing a tag and rejected additions are pure DOM churn with no
	// focus change, so a screen reader is told nothing. Voice each outcome
	// through the live region (WCAG 4.1.3); rejections also name the reason so a
	// silently-dropped entry isn't mistaken for success (3.3.1).
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
		[tags, setTags, max, validate, announce],
	)

	const removeTag = useCallback(
		(index: number) => {
			const removed = tags[index]

			setTags(tags.filter((_, i) => i !== index))

			if (removed) announce(`Removed ${removed}`)

			if (atMax) onMaxReleased?.()
		},
		[tags, setTags, atMax, onMaxReleased, announce],
	)

	return { tags, atMax, addTag, removeTag }
}
