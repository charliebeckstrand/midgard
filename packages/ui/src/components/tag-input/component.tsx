'use client'

import { CornerLeftDown, X } from 'lucide-react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { cn } from '../../core'
import { useControllable, useTagKeyboard } from '../../hooks'
import { FormControl } from '../../primitives'
import type { Color } from '../../recipes/nuri/palette'
import { Button } from '../button'
import { Chip } from '../chip'
import { Icon } from '../icon'
import { chipRemoveSize, chipSize } from './utilities'
import { k, type TagInputVariants, tagInputContainerVariants, tagInputVariants } from './variants'

export type TagInputProps = Omit<TagInputVariants, 'size'> & {
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
	className?: string
}

export const TagInput = forwardRef<HTMLInputElement, TagInputProps>(function TagInput(
	{ size, tag, value, defaultValue, onChange, placeholder, disabled, max, validate, className },
	ref,
) {
	const [tags = [], setTags] = useControllable<string[]>({
		value,
		defaultValue: defaultValue ?? [],
		onChange,
	})

	const [inputValue, setInputValue] = useState('')

	const containerRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)

	useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

	useEffect(() => {
		const el = containerRef.current

		if (!el) return

		const handler = (e: MouseEvent) => {
			if ((e.target as HTMLElement).closest('button')) return

			inputRef.current?.focus()
		}

		el.addEventListener('click', handler)

		return () => el.removeEventListener('click', handler)
	}, [])

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

	const handleKeyDown = useTagKeyboard({
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

	return (
		<FormControl>
			<div
				ref={containerRef}
				data-slot="tag-input"
				data-disabled={disabled || undefined}
				className={cn(tagInputContainerVariants({ size }), className)}
			>
				<div className={cn(tagInputVariants({ size }))}>
					{tags.map((t, i) => (
						<Chip
							key={t}
							size={chipSize[resolvedSize]}
							variant="outline"
							color={resolvedColor}
							className="max-w-full"
						>
							<span className="truncate">{t}</span>
							{!disabled && (
								<Button
									aria-label={`Remove ${t}`}
									className={chipRemoveSize[resolvedSize]}
									size="xs"
									variant="plain"
									onMouseDown={(e) => e.preventDefault()}
									onClick={(e) => {
										e.stopPropagation()

										removeTag(i)
									}}
								>
									<Icon icon={<X />} />
								</Button>
							)}
						</Chip>
					))}

					<input
						ref={inputRef}
						type="text"
						value={inputValue}
						aria-label={placeholder ?? 'Add tags'}
						className={cn(k.input)}
						placeholder={tags.length === 0 ? placeholder : undefined}
						disabled={disabled || atMax}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={handleKeyDown}
						onBlur={handleBlur}
					/>

					<Button
						size="xs"
						color="blue"
						disabled={disabled || atMax || inputValue.trim() === ''}
						onMouseDown={(e) => e.preventDefault()}
						onClick={handleSubmit}
					>
						<Icon icon={<CornerLeftDown />} />
					</Button>
				</div>
			</div>
		</FormControl>
	)
})
