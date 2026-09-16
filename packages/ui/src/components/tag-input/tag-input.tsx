'use client'

import { CornerLeftDown } from 'lucide-react'
import { type ClipboardEvent, useCallback, useRef, useState } from 'react'
import { cn } from '../../core'
import { useComposedRef } from '../../hooks'
import { useControlSize } from '../../primitives/density'
import type { Color } from '../../recipes'
import { k } from '../../recipes/kata/tag-input'
import { keyByOccurrence } from '../../utilities'
import { Button } from '../button'
import { useControl } from '../control/context'
import { Flex } from '../flex'
import { Icon } from '../icon'
import { Input, type InputProps } from '../input'
import { TagInputBadge } from './tag-input-badge'
import { hasSeparator, splitTokens, type TokenRejection } from './tag-input-utilities'
import { useTagInput } from './use-tag-input'
import { useTagInputKeyboard } from './use-tag-input-keyboard'

/**
 * Props for {@link TagInput}: controlled/uncontrolled tag list plus `max`, `validate`, the `onReject` report, and `<Form>` binding via `name`.
 *
 * @see {@link TagInput}
 */
export type TagInputProps = Omit<
	InputProps,
	| 'value'
	| 'defaultValue'
	| 'onChange'
	| 'prefix'
	| 'suffix'
	| 'readOnly'
	| 'invalid'
	| 'type'
	| 'children'
> & {
	/** Binds the tag list to an enclosing Form field. `Form.defaultValues` seeds `string[]`. */
	name?: string
	/** Badge color for every tag. @defaultValue 'zinc' */
	tagColor?: Color
	/** Current tag values (controlled); `null` is controlled-and-empty (CONVENTIONS §7.3). */
	value?: string[] | null
	/** Initial tag values (uncontrolled). */
	defaultValue?: string[]
	/** Called when the tag list changes. */
	onValueChange?: (value: string[]) => void
	/**
	 * Placeholder shown while the tag list is empty. It also names the input,
	 * where no `aria-label` and no wrapping `<Field>`/`<Label>` does.
	 *
	 * @defaultValue `'Add tags'` (aria-label fallback when unset)
	 */
	placeholder?: string
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
	/**
	 * Fires with the refused part of a commit: the tags `validate` turned away, the
	 * ones already held, and how many had no room.
	 *
	 * Every commit splits four ways, and `onValueChange` reports one part of it.
	 * The other three reach the live region and stop there, which no caller can
	 * read. Use this callback to explain a refusal in the caller's own words, or to
	 * count what a paste dropped. `rejected` is also what the field puts back in the
	 * draft; `duplicates` and `overLimit` are not, because the field already shows
	 * both.
	 */
	onReject?: (rejected: TokenRejection) => void
}

/**
 * Token-entry field rendering its tags as removable badges in the `<Input>`
 * prefix. It is controlled or uncontrolled via `value`/`defaultValue`. It
 * commits on Enter, comma, blur, the Add button or a paste. Backspace removes
 * the trailing tag, and `validate` and `max` gate the additions.
 *
 * @remarks
 * Binds to an enclosing `<Form>` field by `name` (the inner text input stays
 * nameless). At the cap the field switches to read-only rather than disabled,
 * so the tags stay removable and the control isn't greyed. Announces each
 * add/remove/duplicate/limit outcome to the live region and returns focus to
 * the input after a removal (WCAG 4.1.3, 2.4.3).
 *
 * **A paste commits every token in it.** Pasting a list is the commonest way to
 * fill a token field, and it used to commit nothing. The draft only tokenized on
 * a `keydown`, which a paste does not fire. The whole string therefore sat in
 * the input until blur refused it as one invalid tag. `onPaste` reads
 * `clipboardData` BEFORE the default insertion. That is the only point a
 * newline-separated spreadsheet column is still splittable. A native `<input>`
 * strips the newlines from its own value, which destroys the boundaries. Every
 * commit channel routes through one tokenizer, so all of them accept the same
 * input.
 *
 * Tokens `validate` refuses stay in the draft and mark the field invalid. A
 * mistyped code in a list of forty is thus visible and directly editable, not
 * announced once and lost.
 */
export function TagInput({
	name,
	size,
	tagColor,
	value,
	defaultValue,
	onValueChange,
	placeholder,
	disabled,
	max,
	validate,
	onReject,
	ref,
	className,
	'aria-label': ariaLabel,
	...props
}: TagInputProps) {
	const inputRef = useRef<HTMLInputElement>(null)

	const setRefs = useComposedRef(inputRef, ref)

	const control = useControl()

	// The tag row rides the control's density; resolve the step to pad it.
	const { space } = useControlSize(size)

	const { tags, atMax, addTags, removeTag, setTouched, invalid } = useTagInput({
		name,
		value,
		defaultValue,
		onValueChange,
		max,
		validate,
		onReject,
	})

	const [inputValue, setInputValue] = useState('')

	// Set when a commit refused tokens, cleared on the next keystroke. The field's own `invalid` can
	// only arrive from a bound Form field, so without this a rejected draft had no sighted feedback
	// at all — the reason a refused paste read as nothing happening.
	const [refused, setRefused] = useState(false)

	const resolvedColor = tagColor ?? 'zinc'

	/**
	 * The one commit path: tokenize, add what is addable, keep what was refused.
	 *
	 * Every channel goes through here — Enter, comma, blur, the Add button, a paste — which is what
	 * makes them agree. The Add button in particular used to be enabled for a multi-token draft and do
	 * nothing when pressed, because it called the single-tag path.
	 */
	const commit = useCallback(
		(raw: string) => {
			const tokens = splitTokens(raw)

			if (tokens.length === 0) return

			const rejected = addTags(tokens)

			setInputValue(rejected.join(' '))

			setRefused(rejected.length > 0)
		},
		[addTags],
	)

	const handleKeyDown = useTagInputKeyboard({
		inputValue,
		commit,
		removeTag,
		tagCount: tags.length,
	})

	const handleBlur = useCallback(() => {
		setTouched()

		commit(inputValue)
	}, [commit, inputValue, setTouched])

	const handleSubmit = useCallback(() => {
		commit(inputValue)

		inputRef.current?.focus()
	}, [commit, inputValue])

	const handlePaste = useCallback(
		(event: ClipboardEvent<HTMLInputElement>) => {
			// At the cap the field is read-only and there is nothing to add; let the browser's own
			// no-op stand rather than consuming the event.
			if (disabled || atMax) return

			const pasted = event.clipboardData.getData('text')

			// A paste with no delimiter is ordinary typing — let it land at the caret so a user can
			// paste one code into the middle of a draft and keep editing. The delimiter is the whole
			// test: a token count cannot disagree with it, since two tokens can only come from a split
			// that matched, while one token plus a trailing newline is still a pasted list.
			if (!hasSeparator(pasted)) return

			event.preventDefault()

			// Spliced at the caret rather than appended, so pasting into a non-empty draft commits what
			// the field would have read rather than a re-ordered concatenation.
			const element = event.currentTarget

			const start = element.selectionStart ?? inputValue.length

			const end = element.selectionEnd ?? inputValue.length

			commit(inputValue.slice(0, start) + pasted + inputValue.slice(end))
		},
		[commit, inputValue, disabled, atMax],
	)

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
			{...props}
			ref={setRefs}
			size={size}
			disabled={disabled}
			// At the cap the field is read-only, not disabled: a disabled child trips
			// the frame's has-[>:disabled] chrome and greys the whole control, so
			// read-only blocks new entries while existing tags stay removable.
			readOnly={atMax || undefined}
			// Field error forces invalid; otherwise the Input inherits ambient
			// Control/Field state. The inner Input is intentionally nameless.
			invalid={invalid || refused || undefined}
			placeholder={tags.length === 0 ? placeholder : undefined}
			// Yields to a wrapping `<Field>`/`<Label>`: an own name shadows it, and a
			// placeholder is not a programmatic name. Names the field only when
			// nothing else does.
			aria-label={ariaLabel ?? (control?.labelledBy ? undefined : (placeholder ?? 'Add tags'))}
			value={inputValue}
			onChange={(event) => {
				setInputValue(event.target.value)

				setRefused(false)
			}}
			onKeyDown={handleKeyDown}
			onPaste={handlePaste}
			onBlur={handleBlur}
			prefix={badges}
			suffix={
				<Button
					type="button"
					aria-label="Add tag"
					variant="bare"
					disabled={disabled || atMax || inputValue.trim() === ''}
					onMouseDown={(event) => event.preventDefault()}
					onClick={handleSubmit}
				>
					<Icon icon={<CornerLeftDown />} />
				</Button>
			}
			className={cn(className, atMax && 'cursor-not-allowed')}
		/>
	)
}
