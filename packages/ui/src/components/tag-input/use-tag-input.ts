'use client'

import { useCallback } from 'react'
import { announce } from '../../core'
import { useFormValue } from '../form/use-form-value'
import { classifyTokens, describeBatch } from './tag-input-utilities'

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
	onValueChange?: (value: string[]) => void
	/** Maximum number of tags. */
	max?: number
	/** Gates a trimmed, novel, within-limit tag before commit. Return `false` to reject. */
	validate?: (tag: string) => boolean
}

/**
 * Owns {@link TagInput}'s tag-list state, add/remove transactions, and live-region
 * announcements.
 *
 * @returns The tag list `tags`, the `atMax` flag, `addTags`/`removeTag` mutators,
 * a `setTouched` form-touch signal, and the field `invalid` flag.
 *
 * @remarks
 * Layers over {@link useFormValue}: a bound `name` wins, else controlled `value`,
 * else uncontrolled state seeded from `defaultValue`. Mutators announce every
 * outcome — add, duplicate, limit, rejection — to the live region (WCAG 4.1.3,
 * 3.3.1). `addTags` is the ONLY add path, batch-shaped even for one tag: a single-tag
 * variant beside it is what let the keyboard and the paste channels disagree about
 * what a draft commits to.
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
		// A tag list's empty state is `[]`, so a cleared value reports as one.
		onValueChange: onValueChange && ((v) => onValueChange(v ?? [])),
	})

	const tags = current ?? []

	const atMax = max !== undefined && tags.length >= max

	/**
	 * Commits several candidates in ONE transaction and hands back the ones `validate` refused.
	 *
	 * Not `addTag` in a loop, which would silently drop all but one: every call closes over the same
	 * `tags`, so each candidate would be appended to the pre-loop list and the last write would win —
	 * forty pasted codes committing as one. Batching is also what lets candidates be checked against
	 * each other, since a pasted column can repeat a code.
	 *
	 * The sorting and the wording are pure functions ({@link classifyTokens}, {@link describeBatch}),
	 * so what counts as a duplicate and what the live region says are testable without a DOM.
	 */
	const addTags = useCallback(
		(raw: readonly string[]): string[] => {
			const batch = classifyTokens(
				raw,
				tags,
				max === undefined ? Number.POSITIVE_INFINITY : max - tags.length,
				validate,
			)

			if (batch.accepted.length > 0) setTags([...tags, ...batch.accepted])

			const said = describeBatch(batch)

			if (said !== '') announce(said)

			return batch.rejected
		},
		[tags, setTags, max, validate],
	)

	const removeTag = useCallback(
		(index: number) => {
			const removed = tags[index]

			setTags(tags.filter((_, i) => i !== index))

			if (removed) announce(`Removed ${removed}`)
		},
		[tags, setTags],
	)

	return { tags, atMax, addTags, removeTag, setTouched, invalid }
}
