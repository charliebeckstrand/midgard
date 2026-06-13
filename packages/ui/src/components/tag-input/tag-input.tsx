'use client'

import { CornerLeftDown } from 'lucide-react'
import { type Ref, useCallback, useEffect, useRef, useState } from 'react'
import { useComposedRef } from '../../hooks'
import type { Color } from '../../recipes'
import { keyByOccurrence } from '../../utilities'
import { Button } from '../button'
import type { ControlSize } from '../control/context'
import { Flex } from '../flex'
import { Icon } from '../icon'
import { Input } from '../input'
import { TagInputBadge } from './tag-input-badge'
import { useTagInput } from './use-tag-input'
import { useTagInputKeyboard } from './use-tag-input-keyboard'

/** Props for {@link TagInput}: controlled/uncontrolled tag list plus `max`, `validate`, and `<Form>` binding via `name`. */
export type TagInputProps = {
	id?: string
	/** Binds the tag list to an enclosing Form field. `Form.defaultValues` should seed `string[]`. */
	name?: string
	size?: ControlSize
	/** Tag appearance. */
	tag?: { color?: Color }
	/** Current tag values (controlled). */
	value?: string[]
	/** Initial tag values (uncontrolled). */
	defaultValue?: string[]
	/** Called when the tag list changes. */
	onValueChange?: (value: string[] | undefined) => void
	/** Placeholder shown when empty. */
	placeholder?: string
	/** Prevent editing. */
	disabled?: boolean
	/** Maximum number of tags. */
	max?: number
	/** Validates a tag before adding. Return false to reject. */
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
 * nameless). Announces each add/remove/duplicate/limit outcome to the live
 * region and returns focus to the input after a removal releases the at-max
 * state (WCAG 4.1.3, 2.4.3).
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

	// Set when a removal releases the at-max state; consumed by the effect below
	// once the re-enabling render has committed.
	const refocusOnMaxRelease = useRef(false)

	const { tags, atMax, addTag, removeTag, setTouched, invalid } = useTagInput({
		name,
		value,
		defaultValue,
		onValueChange,
		max,
		validate,
		onMaxReleased: () => {
			refocusOnMaxRelease.current = true
		},
	})

	// Returns focus to the input once it can hold focus again (WCAG 2.4.3). At
	// max the input is disabled and re-enables only on the releasing render; a
	// synchronous focus in onMaxReleased can race the commit and land on the
	// still-disabled input.
	useEffect(() => {
		// Consumes the flag on every committed render, including when a
		// controlled parent rejects the removal (atMax never released).
		const shouldRefocus = refocusOnMaxRelease.current

		refocusOnMaxRelease.current = false

		if (shouldRefocus && !atMax) inputRef.current?.focus()
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
			<Flex data-slot="tags" role="list" aria-label="Tags" gap="xs" wrap>
				{keyedTags.map(({ value: t, key }, i) => (
					<TagInputBadge
						key={key}
						label={t}
						color={resolvedColor}
						disabled={disabled}
						onRemove={() => {
							removeTag(i)

							// Returns focus to the input after badge removal (WCAG 2.4.3).
							// At max the input is still disabled here and this no-ops; the
							// effect above re-focuses once the releasing render commits.
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
			disabled={disabled || atMax}
			// Field error forces invalid; otherwise the Input inherits ambient
			// Control/Field state. The inner Input is intentionally nameless.
			invalid={invalid || undefined}
			placeholder={tags.length === 0 ? placeholder : undefined}
			aria-label={placeholder ?? 'Add tags'}
			value={inputValue}
			onChange={(e) => setInputValue(e.target.value)}
			onKeyDown={handleKeyDown}
			onBlur={handleBlur}
			prefix={badges}
			suffix={
				<Button
					aria-label="Add tag"
					variant="bare"
					disabled={disabled || atMax || inputValue.trim() === ''}
					onMouseDown={(e) => e.preventDefault()}
					onClick={handleSubmit}
				>
					<Icon icon={<CornerLeftDown />} />
				</Button>
			}
			className={className}
		/>
	)
}
