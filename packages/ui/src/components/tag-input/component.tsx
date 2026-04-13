'use client'

import { forwardRef, type KeyboardEvent, useCallback, useRef } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks'
import { FormControl } from '../../primitives'
import { katachi } from '../../recipes'
import { Chip } from '../chip'
import { type TagInputVariants, tagInputVariants } from './variants'

const k = katachi.tagInput

export type TagInputProps = Omit<TagInputVariants, 'size'> & {
	size?: 'sm' | 'md' | 'lg'
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

const chipSize = { sm: 'sm', md: 'sm', lg: 'md' } as const

export const TagInput = forwardRef<HTMLInputElement, TagInputProps>(function TagInput(
	{ size, value, defaultValue, onChange, placeholder, disabled, max, validate, className },
	ref,
) {
	const [tags = [], setTags] = useControllable<string[]>({
		value,
		defaultValue: defaultValue ?? [],
		onChange,
	})

	const innerRef = useRef<HTMLInputElement>(null)
	const inputRef = (ref as React.RefObject<HTMLInputElement>) ?? innerRef

	const resolvedSize = size ?? 'md'

	const addTag = useCallback(
		(raw: string) => {
			const tag = raw.trim()
			if (!tag) return
			if (tags.includes(tag)) return
			if (max !== undefined && tags.length >= max) return
			if (validate && !validate(tag)) return
			setTags([...tags, tag])
		},
		[tags, setTags, max, validate],
	)

	const removeTag = useCallback(
		(index: number) => {
			setTags(tags.filter((_, i) => i !== index))
		},
		[tags, setTags],
	)

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLInputElement>) => {
			const input = e.currentTarget

			if (e.key === 'Enter' || e.key === ',') {
				e.preventDefault()
				addTag(input.value)
				input.value = ''
			}

			if (e.key === 'Backspace' && input.value === '' && tags.length > 0) {
				removeTag(tags.length - 1)
			}
		},
		[addTag, removeTag, tags.length],
	)

	const handleBlur = useCallback(
		(e: React.FocusEvent<HTMLInputElement>) => {
			addTag(e.currentTarget.value)
			e.currentTarget.value = ''
		},
		[addTag],
	)

	return (
		<FormControl>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: click-to-focus is a convenience, keyboard users focus the input directly */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: the inner input handles all keyboard interaction */}
			<div
				data-slot="tag-input"
				className={cn(tagInputVariants({ size }), className)}
				onClick={() => inputRef.current?.focus()}
			>
				{tags.map((tag, i) => (
					<Chip key={tag} size={chipSize[resolvedSize]} variant="soft">
						{tag}
						{!disabled && (
							<button
								type="button"
								aria-label={`Remove ${tag}`}
								className="ml-1 -mr-0.5 inline-flex items-center justify-center rounded-full opacity-60 hover:opacity-100 focus:outline-none"
								onClick={(e) => {
									e.stopPropagation()
									removeTag(i)
								}}
							>
								<svg viewBox="0 0 16 16" fill="currentColor" className="size-3" aria-hidden="true">
									<path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94L5.28 4.22Z" />
								</svg>
							</button>
						)}
					</Chip>
				))}

				<input
					ref={inputRef}
					type="text"
					className={cn(k.input)}
					placeholder={tags.length === 0 ? placeholder : undefined}
					disabled={disabled}
					onKeyDown={handleKeyDown}
					onBlur={handleBlur}
				/>
			</div>
		</FormControl>
	)
})
