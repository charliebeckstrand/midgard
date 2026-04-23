'use client'

import { CornerLeftDown, X } from 'lucide-react'
import { type Ref, useCallback, useImperativeHandle, useRef, useState } from 'react'
import { useControllable, useInputTagKeyboard } from '../../hooks'
import type { Color } from '../../recipes/iro'
import { Badge } from '../badge'
import { Button } from '../button'
import { Icon } from '../icon'
import { Input } from '../input'
import { tagRemoveSize, tagSize } from './utilities'

export type TagInputProps = {
	id?: string
	size?: 'sm' | 'md' | 'lg'
	/** Tag appearance. */
	tag?: { color?: Color }
	/** Current tag values (controlled). */
	value?: string[]
	/** Initial tag values (uncontrolled). */
	defaultValue?: string[]
	/** Called when the tag list changes. */
	onChange?: (value: string[] | undefined) => void
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
	onChange,
	placeholder,
	disabled,
	max,
	validate,
	ref,
	className,
}: TagInputProps) {
	const [tags = [], setTags] = useControllable<string[]>({
		value,
		defaultValue: defaultValue ?? [],
		onChange,
	})

	const [inputValue, setInputValue] = useState('')

	const inputRef = useRef<HTMLInputElement>(null)

	useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

	const resolvedSize = size ?? 'md'

	const resolvedColor = tag?.color ?? 'zinc'

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

			if (atMax) {
				requestAnimationFrame(() => inputRef.current?.focus())
			}
		},
		[tags, setTags, atMax],
	)

	const clearInput = useCallback(() => setInputValue(''), [])

	const handleKeyDown = useInputTagKeyboard({
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
					<Badge
						key={t}
						size={tagSize[resolvedSize]}
						variant="outline"
						rounded="full"
						color={resolvedColor}
					>
						<span className="truncate">{t}</span>
						{!disabled && (
							<Button
								aria-label={`Remove ${t}`}
								className={tagRemoveSize[resolvedSize]}
								size="xs"
								variant="plain"
								prefix={<Icon icon={<X />} />}
								onMouseDown={(e) => e.preventDefault()}
								onClick={(e) => {
									e.stopPropagation()

									removeTag(i)
								}}
							/>
						)}
					</Badge>
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
					prefix={<Icon icon={<CornerLeftDown />} />}
					onMouseDown={(e) => e.preventDefault()}
					onClick={handleSubmit}
				/>
			}
			className={className}
		/>
	)
}
