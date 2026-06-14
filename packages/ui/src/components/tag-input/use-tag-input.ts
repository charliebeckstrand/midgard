'use client'

import { useCallback } from 'react'
import { announce } from '../../core'
import { useFormValue } from '../form/use-form-value'

/**
 * Options for {@link useTagInput}.
 *
 * @internal
 */
type TagInputOptions = {
	/** Form field name; binds the tag list to an enclosing `<Form>`. */
	name?: string
	value?: string[]
	defaultValue?: string[]
	onValueChange?: (value: string[] | undefined) => void
	/** Maximum number of tags. */
	max?: number
	/** Gates a trimmed, novel, within-limit tag before commit. Return `false` to reject. */
	validate?: (tag: string) => boolean
	/** Fires when a removal transitions the list out of the at-max state. */
	onMaxReleased?: () => void
}

/**
 * Owns {@link TagInput}'s tag-list state, add/remove transactions, and live-region
 * announcements.
 *
 * @returns The tag list `tags`, the `atMax` flag, `addTag`/`removeTag` mutators,
 * a `setTouched` form-touch signal, and the field `invalid` flag.
 *
 * @remarks
 * Layers over {@link useFormValue}: a bound `name` wins, else controlled `value`,
 * else uncontrolled state seeded from `defaultValue`. Mutators announce every
 * outcome — add, duplicate, limit, rejection — to the live region (WCAG 4.1.3,
 * 3.3.1); `addTag` trims and dedupes before committing and reports success.
 *
 * @internal
 */
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
