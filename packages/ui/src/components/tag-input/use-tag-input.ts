'use client'

import { useCallback } from 'react'
import { announce } from '../../core'
import { useFormValue } from '../../primitives/form/use-form-value'
import { useIntl } from '../../primitives/intl/use-intl'
import {
	classifyTokens,
	describeBatch,
	describeRemoval,
	type TokenRejection,
} from './tag-input-utilities'

/**
 * Options for {@link useTagInput}.
 *
 * @internal
 */
type TagInputOptions = {
	/** Form field name; binds the tag list to an enclosing `<Form>`. */
	name?: string
	value?: string[] | null
	defaultValue?: string[]
	onValueChange?: (value: string[]) => void
	/** Maximum number of tags. */
	max?: number
	/** Gates a trimmed, novel, within-limit tag before commit. Return `false` to reject. */
	validate?: (tag: string) => boolean
	/** Reports the refused part of a commit. */
	onReject?: (rejected: TokenRejection) => void
	/** Runs after a native form reset sets the uncontrolled tags back to `defaultValue`. */
	onReset?: () => void
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
 * outcome (add, duplicate, limit, rejection) to the live region (WCAG 4.1.3,
 * 3.3.1). `addTags` is the only add path, and it takes a batch also for one
 * tag, so the keyboard and a paste commit a draft the same way.
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
	onReject,
	onReset,
}: TagInputOptions) {
	const intl = useIntl()

	// Binds the tag list to an enclosing Form field by `name` (the value-typed
	// cascade); falls back to controlled/uncontrolled state. The inner text
	// `<Input>` stays nameless: the array is the bound value, not the draft.
	const {
		value: current,
		resetRef,
		setValue: setTags,
		setTouched,
		invalid,
	} = useFormValue<string[]>(name, {
		value,
		defaultValue: defaultValue ?? [],
		// A tag list's empty state is `[]`, so a cleared value reports as one.
		onValueChange: onValueChange && ((next) => onValueChange(next ?? [])),
		onReset,
	})

	const tags = current ?? []

	const atMax = max !== undefined && tags.length >= max

	/**
	 * Commits the candidates in one write, and gives back the ones that
	 * `validate` refused. One write is necessary: each call reads the same
	 * `tags`, so a loop of single adds keeps only the last. The batch also
	 * checks the candidates against each other ({@link classifyTokens}).
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

			const said = describeBatch(intl, batch)

			if (said !== '') announce(said)

			// A caller cannot read the live region, so `onReject` gives the refused
			// part. `onValueChange` gives the accepted part.
			const { accepted: _accepted, ...rejection } = batch

			if (
				rejection.rejected.length > 0 ||
				rejection.duplicates.length > 0 ||
				rejection.overLimit > 0
			)
				onReject?.(rejection)

			return batch.rejected
		},
		[tags, setTags, max, validate, onReject, intl],
	)

	const removeTag = useCallback(
		(index: number) => {
			const removed = tags[index]

			setTags(tags.filter((_, i) => i !== index))

			if (removed) announce(describeRemoval(intl, removed))
		},
		[tags, setTags, intl],
	)

	return { tags, atMax, addTags, removeTag, setTouched, invalid, resetRef }
}
