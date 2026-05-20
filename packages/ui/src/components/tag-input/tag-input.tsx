'use client'

import { CornerLeftDown } from 'lucide-react'
import { type Ref, useCallback, useImperativeHandle, useRef, useState } from 'react'
import type { Color } from '../../recipes'
import { Button } from '../button'
import type { ControlSize } from '../control/context'
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

	useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

	const { tags, atMax, addTag, removeTag } = useTagInput({
		value,
		defaultValue,
		onValueChange,
		max,
		validate,
		onMaxReleased: () => {
			requestAnimationFrame(() => inputRef.current?.focus())
		},
	})

	const [inputValue, setInputValue] = useState('')

	const resolvedSize = size ?? 'md'

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
			<span data-slot="tag-input" className="flex flex-wrap gap-1 min-w-0 cursor-text">
				{tags.map((t, i) => (
					<TagInputBadge
						key={t}
						label={t}
						size={resolvedSize}
						color={resolvedColor}
						disabled={disabled}
						onRemove={() => removeTag(i)}
					/>
				))}
			</span>
		) : undefined

	return (
		<Input
			ref={inputRef}
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
					size="xs"
					color="blue"
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
