'use client'

import { CornerLeftDown } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { cn, composeEventHandlers } from '../../core'
import { useComposedRef } from '../../hooks'
import type { Color } from '../../recipes'
import { k } from '../../recipes/kata/tag-input'
import { Flex } from '../../structure/flex'
import { keyByOccurrence } from '../../utilities'
import { BadgeRemovable } from '../badge/badge-removable'
import { Button } from '../button'
import { useControlFallbackLabel } from '../control/use-control-fallback-label'
import { useControlProps } from '../control/use-control-props'
import { Icon } from '../icon'
import { Input, type InputProps } from '../input'
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
	 * where no `aria-label` and no wrapping `<Field>`/`<Label>` does. With no
	 * placeholder either, the name is "Add tags".
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
 * nameless). Resolves `disabled` and `readOnly` against an enclosing
 * `<Control>`. Then the tags stay, and no tag is added or removed. A consumer
 * `onKeyDown`, `onPaste`, or `onBlur` runs before the handler of the field.
 * At the cap the field switches to read-only rather than disabled,
 * so the tags stay removable and the control isn't grayed. Announces each
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
	onKeyDown,
	onPaste,
	onBlur,
	...props
}: TagInputProps) {
	const inputRef = useRef<HTMLInputElement>(null)

	const setRefs = useComposedRef(inputRef, ref)

	// The Control cascade: an explicit `disabled` wins over the enclosing
	// Control. A disabled or read-only field keeps its tags and adds none.
	const ambient = useControlProps({ disabled })

	const locked = ambient.disabled === true || ambient.readOnly === true

	const fallbackLabel = useControlFallbackLabel(placeholder ?? 'Add tags')

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
			if (locked) return

			const tokens = splitTokens(raw)

			if (tokens.length === 0) return

			const rejected = addTags(tokens)

			setInputValue(rejected.join(' '))

			setRefused(rejected.length > 0)
		},
		[addTags, locked],
	)

	const keyboard = useTagInputKeyboard({
		inputValue,
		commit,
		removeTag,
		tagCount: tags.length,
	})

	// A consumer handler runs first. Its `preventDefault()` cancels the commit or
	// the removal of the key (CONVENTIONS.md §3.9).
	const handleKeyDown = composeEventHandlers(onKeyDown, (event) => {
		if (locked) return

		keyboard(event)
	})

	// The touched mark and the commit keep the state of the field true, so a
	// consumer `preventDefault()` does not skip them.
	const handleBlur = composeEventHandlers(
		onBlur,
		() => {
			setTouched()

			commit(inputValue)
		},
		{ checkForDefaultPrevented: false },
	)

	const handleSubmit = useCallback(() => {
		commit(inputValue)

		inputRef.current?.focus()
	}, [commit, inputValue])

	// A consumer handler runs first, and its `preventDefault()` keeps the paste as
	// ordinary typing, as a paste with no delimiter is.
	const handlePaste = composeEventHandlers(onPaste, (event) => {
		// At the cap the field is read-only and there is nothing to add; let the browser's own
		// no-op stand rather than consuming the event.
		if (locked || atMax) return

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
	})

	// Duplicate controlled values ('a','a') collide on a bare value key;
	// repeats get an occurrence suffix (the validate path dedupes, the
	// controlled path can't).
	const keyedTags = keyByOccurrence(tags)

	// The list sits in the prefix `<span>` of the ControlFrame `<span>`, so it is
	// a `<span>` and not a `<ul>`.
	const badges =
		tags.length > 0 ? (
			<Flex
				as="span"
				data-slot="tags"
				role="list"
				aria-label="Tags"
				gap="xs"
				wrap
				className={cn(k.tags)}
			>
				{keyedTags.map(({ value: t, key }, i) => (
					// The chip sits in the prefix scope of the host Input, one step below
					// the control, so it takes that step with no `size`. A locked chip has
					// no remove button and no Tab stop. A press on the button keeps the
					// focus in the input, and its click does not reach the frame.
					<BadgeRemovable
						key={key}
						role="listitem"
						label={t}
						color={resolvedColor}
						className={cn(k.badge)}
						removeProps={{
							onMouseDown: (event) => event.preventDefault(),
							onClick: (event) => event.stopPropagation(),
						}}
						onRemove={
							locked
								? undefined
								: () => {
										removeTag(i)

										// Returns focus to the input after badge removal (WCAG 2.4.3).
										// The field stays focusable at the cap (read-only, not disabled),
										// so this lands even when the removal is what clears the cap.
										inputRef.current?.focus()
									}
						}
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
			// the frame's has-[>:disabled] chrome and grays the whole control, so
			// read-only blocks new entries while existing tags stay removable.
			readOnly={atMax || undefined}
			// Field error forces invalid; otherwise the Input inherits ambient
			// Control/Field state. The inner Input is intentionally nameless.
			invalid={invalid || refused || undefined}
			placeholder={tags.length === 0 ? placeholder : undefined}
			// Yields to a wrapping `<Field>`/`<Label>`: an own name shadows it, and a
			// placeholder is not a programmatic name. Names the field only when
			// nothing else does.
			aria-label={ariaLabel ?? fallbackLabel}
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
					disabled={locked || atMax || inputValue.trim() === ''}
					onMouseDown={(event) => event.preventDefault()}
					onClick={handleSubmit}
				>
					<Icon icon={<CornerLeftDown />} />
				</Button>
			}
			className={cn(k.input, className, atMax && 'cursor-not-allowed')}
		/>
	)
}
