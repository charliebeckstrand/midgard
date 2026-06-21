'use client'

import { CornerLeftDown } from 'lucide-react'
import { type Ref, useCallback, useRef, useState } from 'react'
import { useComposedRef } from '../../hooks'
import { useControlSize } from '../../primitives/density'
import type { Color } from '../../recipes'
import { k } from '../../recipes/kata/tag-input'
import { keyByOccurrence } from '../../utilities'
import { Button } from '../button'
import type { ControlSize } from '../control/context'
import { Flex } from '../flex'
import { Icon } from '../icon'
import { Input } from '../input'
import { TagInputBadge } from './tag-input-badge'
import { useTagInput } from './use-tag-input'
import { useTagInputKeyboard } from './use-tag-input-keyboard'

/**
 * Props for {@link TagInput}: controlled/uncontrolled tag list plus `max`, `validate`, and `<Form>` binding via `name`.
 *
 * @see {@link TagInput}
 */
export type TagInputProps = {
	id?: string
	/** Binds the tag list to an enclosing Form field. `Form.defaultValues` should seed `string[]`. */
	name?: string
	size?: ControlSize
	/** Tag appearance; `color` is the badge color for every tag (default `'zinc'`). */
	tag?: { color?: Color }
	/** Current tag values (controlled). */
	value?: string[]
	/** Initial tag values (uncontrolled). */
	defaultValue?: string[]
	/** Called when the tag list changes. */
	onValueChange?: (value: string[] | undefined) => void
	/**
	 * Placeholder shown while the tag list is empty; doubles as the input's
	 * `aria-label`.
	 *
	 * @defaultValue `'Add tags'` (aria-label fallback when unset)
	 */
	placeholder?: string
	/** Disables editing and removal. */
	disabled?: boolean
	/** Maximum number of tags; at the cap the field goes read-only (further additions are rejected) while existing tags stay removable. */
	max?: number
	/**
	 * Gates a trimmed tag before it is committed. Return `false` to reject.
	 *
	 * @remarks
	 * Runs after the empty/duplicate/`max` checks, so it only sees novel,
	 * within-limit candidates.
	 */
	validate?: (tag: string) => boolean
	ref?: Ref<HTMLInputElement>
	className?: string
}

/**
 * Token-entry field rendering its tags as removable badges in the `<Input>`
 * prefix; controlled or uncontrolled via `value`/`defaultValue`, committing
 * on Enter or comma, removing the trailing tag with Backspace, and gating
 * additions through `validate` and `max`.
 *
 * @remarks
 * Binds to an enclosing `<Form>` field by `name` (the inner text input stays
 * nameless). At the cap the field switches to read-only rather than disabled,
 * so the tags stay removable and the control isn't greyed. Announces each
 * add/remove/duplicate/limit outcome to the live region and returns focus to
 * the input after a removal (WCAG 4.1.3, 2.4.3).
 */
export function TagInput({
	id,
	name,
	size,
	tag,
	value,
	defaultValue,
	onValueChange,
	placeholder,
	disabled,
	max,
	validate,
	ref,
	className,
}: TagInputProps) {
	const inputRef = useRef<HTMLInputElement>(null)

	const setRefs = useComposedRef(inputRef, ref)

	// The tag row rides the control's density; resolve the step to pad it.
	const { space } = useControlSize(size)

	const { tags, atMax, addTag, removeTag, setTouched, invalid } = useTagInput({
		name,
		value,
		defaultValue,
		onValueChange,
		max,
		validate,
	})

	const [inputValue, setInputValue] = useState('')

	const resolvedColor = tag?.color ?? 'zinc'

	const clearInput = useCallback(() => setInputValue(''), [])

	const handleKeyDown = useTagInputKeyboard({
		inputValue,
		addTag,
		removeTag,
		clearInput,
		tagCount: tags.length,
	})

	const handleBlur = useCallback(() => {
		setTouched()

		if (addTag(inputValue)) {
			setInputValue('')
		}
	}, [addTag, inputValue, setTouched])

	const handleSubmit = useCallback(() => {
		if (addTag(inputValue)) {
			setInputValue('')

			inputRef.current?.focus()
		}
	}, [addTag, inputValue])

	// Duplicate controlled values ('a','a') collide on a bare value key;
	// repeats get an occurrence suffix (the validate path dedupes, the
	// controlled path can't).
	const keyedTags = keyByOccurrence(tags)

	const badges =
		tags.length > 0 ? (
			<Flex data-slot="tags" role="list" aria-label="Tags" gap="xs" wrap className={k.tags[space]}>
				{keyedTags.map(({ value: t, key }, i) => (
					<TagInputBadge
						key={key}
						label={t}
						color={resolvedColor}
						disabled={disabled}
						onRemove={() => {
							removeTag(i)

							// Returns focus to the input after badge removal (WCAG 2.4.3).
							// The field stays focusable at the cap (read-only, not disabled),
							// so this lands even when the removal is what clears the cap.
							inputRef.current?.focus()
						}}
					/>
				))}
			</Flex>
		) : undefined

	return (
		<Input
			ref={setRefs}
			id={id}
			size={size}
			disabled={disabled}
			// At the cap the field is read-only, not disabled: a disabled child trips
			// the frame's has-[>:disabled] chrome and greys the whole control, so
			// read-only blocks new entries while existing tags stay removable.
			readOnly={atMax || undefined}
			// Field error forces invalid; otherwise the Input inherits ambient
			// Control/Field state. The inner Input is intentionally nameless.
			invalid={invalid || undefined}
			placeholder={tags.length === 0 ? placeholder : undefined}
			aria-label={placeholder ?? 'Add tags'}
			value={inputValue}
			onChange={(event) => setInputValue(event.target.value)}
			onKeyDown={handleKeyDown}
			onBlur={handleBlur}
			prefix={badges}
			suffix={
				<Button
					aria-label="Add tag"
					variant="bare"
					disabled={disabled || atMax || inputValue.trim() === ''}
					onMouseDown={(event) => event.preventDefault()}
					onClick={handleSubmit}
				>
					<Icon icon={<CornerLeftDown />} />
				</Button>
			}
			className={className}
		/>
	)
}
