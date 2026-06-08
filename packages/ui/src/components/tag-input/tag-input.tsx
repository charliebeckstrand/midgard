'use client'

import { CornerLeftDown } from 'lucide-react'
import { type Ref, useCallback, useEffect, useRef, useState } from 'react'
import { useComposedRef } from '../../hooks'
import type { Color } from '../../recipes'
import { Button } from '../button'
import type { ControlSize } from '../control/context'
import { Flex } from '../flex'
import { Icon } from '../icon'
import { Input } from '../input'
import { TagInputBadge } from './tag-input-badge'
import { useTagInput } from './use-tag-input'
import { useTagInputKeyboard } from './use-tag-input-keyboard'

export type TagInputProps = {
	id?: string
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
 * prefix — controlled or uncontrolled via `value`/`defaultValue`, committing
 * on Enter, removing with Backspace, and gating additions through `validate`
 * and `max`.
 */
export function TagInput({
	id,
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

	const { tags, atMax, addTag, removeTag } = useTagInput({
		value,
		defaultValue,
		onValueChange,
		max,
		validate,
		onMaxReleased: () => {
			refocusOnMaxRelease.current = true
		},
	})

	// Return focus to the input once it can hold focus again (WCAG 2.4.3). At max
	// the input is disabled, so it only re-enables on the releasing render;
	// focusing from this effect — after commit — rather than a synchronous frame in
	// onMaxReleased avoids racing the commit, which under load could focus the
	// still-disabled input and silently drop the focus.
	useEffect(() => {
		if (refocusOnMaxRelease.current && !atMax) {
			refocusOnMaxRelease.current = false

			inputRef.current?.focus()
		}
	}, [atMax])

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
		if (addTag(inputValue)) {
			setInputValue('')
		}
	}, [addTag, inputValue])

	const handleSubmit = useCallback(() => {
		if (addTag(inputValue)) {
			setInputValue('')

			inputRef.current?.focus()
		}
	}, [addTag, inputValue])

	const badges =
		tags.length > 0 ? (
			<Flex data-slot="tags" role="list" aria-label="Tags" gap="xs" wrap>
				{tags.map((t, i) => (
					<TagInputBadge
						key={t}
						label={t}
						color={resolvedColor}
						disabled={disabled}
						onRemove={() => {
							removeTag(i)

							// Returns focus to the input after badge removal (WCAG 2.4.3). At max
							// the input is still disabled here, so this no-ops; the effect above
							// re-focuses once the releasing render commits.
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
