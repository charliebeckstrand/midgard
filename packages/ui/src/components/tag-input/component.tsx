'use client'

import { PlusIcon, XIcon } from 'lucide-react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { cn } from '../../core'
import { useControllable, useTagKeyboard } from '../../hooks'
import { FormControl } from '../../primitives'
import { katachi } from '../../recipes'
import type { Color } from '../../recipes/nuri/palette'
import { Button } from '../button'
import { Chip } from '../chip'
import { Icon } from '../icon'
import { buttonSize, chipSize } from './utilities'
import { type TagInputVariants, tagInputContainerVariants, tagInputVariants } from './variants'

const k = katachi.tagInput

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
	/** Placeholder shown when the input is empty and there are no tags. */
	placeholder?: string
	/** Prevent editing. */
	disabled?: boolean
	/** Maximum number of tags allowed. */
	max?: number
	/** Validate a tag before adding. Return `false` to reject. */
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
		},
		[tags, setTags],
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
							variant="solid"
							color={resolvedColor}
							className={cn(
								'max-w-full',
								resolvedSize === 'sm' && 'text-[0.625rem]/3 px-1.5 py-px',
							)}
						>
							<span className="truncate">{t}</span>
							{!disabled && (
								<button
									type="button"
									aria-label={`Remove ${t}`}
									className="relative ml-1 -mr-0.5 inline-flex shrink-0 items-center justify-center rounded-full opacity-60 hover:opacity-100 focus:outline-none before:absolute before:-inset-2 before:content-['']"
									onMouseDown={(e) => e.preventDefault()}
									onClick={(e) => {
										e.stopPropagation()

										removeTag(i)
									}}
								>
									<Icon icon={<XIcon />} size="xs" />
								</button>
							)}
						</Chip>
					))}

					<input
						ref={inputRef}
						type="text"
						value={inputValue}
						className={cn(k.input)}
						placeholder={tags.length === 0 ? placeholder : undefined}
						disabled={disabled}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={handleKeyDown}
						onBlur={handleBlur}
					/>
				</div>

				{/* {inputValue.trim() && !disabled && (
					<Button
						type="button"
						color="blue"
						size="xs"
						disabled={max !== undefined && tags.length >= max}
						aria-label="Add tag"
						onMouseDown={(e) => e.preventDefault()}
						onClick={handleSubmit}
					>
						<PlusIcon className="size-4" />
					</Button>
				)} */}
				<Button
					type="button"
					color="blue"
					size={buttonSize[resolvedSize]}
					disabled={disabled || (max !== undefined && tags.length >= max) || !inputValue.trim()}
					aria-label="Add tag"
					onMouseDown={(e) => e.preventDefault()}
					onClick={handleSubmit}
				>
					<PlusIcon className="size-4" />
				</Button>
			</div>
		</FormControl>
	)
})
