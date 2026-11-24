'use client'

import {
	type CSSProperties,
	type FocusEvent,
	type ReactNode,
	type Ref,
	useImperativeHandle,
	useRef,
	useState,
} from 'react'
import type { ControlVariant } from '../../components/control/context'
import { type MarkdownRange, rangeWalk } from '../../components/markdown/markdown-ranges'
import { cn } from '../../core/cn'
import { dataAttr } from '../../core/data-attr'
import type { ScaleStep } from '../../core/density/scale'
import { useStableEvent } from '../../hooks/use-stable-event'
import { ControlActions, ControlFrame } from '../../primitives/control'
import { k as markdown } from '../../recipes/kata/markdown'
import type { scale } from '../../recipes/kata/wysiwyg'
import { WysiwygContext, type WysiwygContextValue } from './context'
import type { WysiwygBlock, WysiwygHandle, WysiwygToggleAction } from './types'
import { useWysiwygEditor } from './use-wysiwyg-editor'
import { useWysiwygField } from './use-wysiwyg-field'
import { useWysiwygLabelFocus } from './use-wysiwyg-label-focus'
import { useWysiwygSelection } from './use-wysiwyg-selection'
import type { WysiwygEditor } from './wysiwyg-editor'

/** Props for {@link Wysiwyg}. */
export type WysiwygProps<R extends MarkdownRange = MarkdownRange> = {
	/** Controlled value, in Markdown. `undefined` leaves the field uncontrolled; `null` keeps it controlled with no current value (CONVENTIONS §7.3). */
	value?: string | null
	/** Initial value, in Markdown, when uncontrolled and not form-bound. */
	defaultValue?: string
	/**
	 * The ranges of the value, such as the citations of a chat draft. The field
	 * marks the text of each range, as `Markdown` draws it.
	 *
	 * @remarks
	 * A range is constructed and not typed: no edit and no paste makes one. An
	 * edit in a range, or a split of its block, removes its mark, and its text
	 * stays as prose. An undo brings the range back. A range draws only while
	 * its `quote` matches the value. A range in a code block, or in a construct
	 * that the field shows as its source, is not marked.
	 *
	 * Give back the ranges of `onValueChange` at each edit, as with a
	 * controlled value. A new set of ranges, or a range with other offsets,
	 * marks the field again.
	 * @defaultValue []
	 */
	ranges?: readonly R[]
	/**
	 * Fires with the Markdown of the field after each edit, and the ranges that
	 * the edit kept. Each range is the object of `ranges` with the `start`,
	 * `end`, and `quote` of the new value. A native reset of an uncontrolled
	 * field gives the ranges of the first render that can draw on its default
	 * value.
	 */
	onValueChange?: (value: string, ranges: R[]) => void
	/**
	 * The minimum height in lines. The field grows with its content, and a
	 * `max-height` class sets the maximum height.
	 * @defaultValue 1
	 * @minimum 1
	 */
	rows?: number
	/** The text that the empty field shows. */
	placeholder?: string
	/**
	 * Control slot rendered as a right-justified row below the field, as on
	 * Textarea. `null` and `false` count as absent. A press in the row does not
	 * move the focus.
	 */
	actions?: ReactNode
	/**
	 * The row above the field, such as a {@link WysiwygToolbar}. A press in the
	 * row does not move the focus, so the selection stays in the field.
	 */
	children?: ReactNode
	/**
	 * Puts the row above the field, such as a {@link WysiwygToolbar}, above the
	 * frame with a gap. The frame then holds only the field and `actions`.
	 * @defaultValue false
	 */
	separated?: boolean
	/**
	 * Enter calls it, and Shift+Enter then does what Enter does without it, so a
	 * Markdown shortcut such as `- ` works on the new line. Without it, Enter
	 * starts a new block, continues a list, or adds a line to a code block, and
	 * Shift+Enter breaks the line. A new line on an empty last line of a code
	 * block leaves the block, and ArrowDown on the last line of the last code
	 * block adds a paragraph after it.
	 */
	onEnter?: () => void
	/** Runs first on each key in the field. A handler that cancels the key stops the editor. */
	onKeyDown?: (event: KeyboardEvent) => void
	/**
	 * Fires with the text block that holds the caret ({@link WysiwygBlock}) when
	 * the block, its text, or the caret changes, such as for a completion that
	 * reads the word at the caret. It gives `null` while the field does not have
	 * the focus, while the field is disabled or read-only, and while the
	 * selection is not a caret in a text block outside a code block.
	 */
	onSelectionChange?: (block: WysiwygBlock | null) => void
	/**
	 * The `enterkeyhint` of the field, such as `send`, for the Enter key of a virtual keyboard.
	 * @defaultValue No hint: the keyboard shows its own Enter key.
	 */
	enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send'
	/**
	 * The surface of the control, as on Textarea ({@link ControlVariant}). When
	 * the prop is unset, the field takes the variant of the enclosing Control.
	 * Without one, it takes the glass surface in a GlassProvider.
	 * @defaultValue 'default'
	 */
	variant?: ControlVariant
	/** The density step. Omit it to take the step of the nearest density scope. A step makes the frame a density scope. */
	size?: ScaleStep<typeof scale>
	/** Binds the value to the enclosing Form field of this name (CONVENTIONS §7.2). */
	name?: string
	/** Id for the field; resolves through the explicit prop, then an enclosing `<Control>` / `<Field>`. */
	id?: string
	/** @defaultValue `false`, or the state of the enclosing Control or Field. */
	disabled?: boolean
	/** @defaultValue `false`, or the state of the enclosing Control or Field. */
	readOnly?: boolean
	/** @defaultValue `false`, or the state of the enclosing Control or Field. */
	required?: boolean
	/**
	 * Forces the invalid state. When omitted, inherits from Control / Form context.
	 * @defaultValue `false`, or `true` when the bound form field has an error or the enclosing Control has the `error` severity.
	 */
	invalid?: boolean
	/** Classes for the field, such as a `max-h-*` class that caps the growth. */
	className?: string
	/** Names the field when no `<Field>` / `<Label>` names it. */
	'aria-label'?: string
	/** Names the field. It wins over the Label of an enclosing Field. */
	'aria-labelledby'?: string
	/** Consumer-supplied `aria-describedby`, merged ahead of the field's registered description / error ids. */
	'aria-describedby'?: string
	/**
	 * The `aria-autocomplete` of the field, for a completion that it controls.
	 * @defaultValue No attribute: the field offers no completion.
	 */
	'aria-autocomplete'?: 'inline' | 'list' | 'both' | 'none'
	/**
	 * The `aria-haspopup` of the field, for a completion that it controls.
	 * @defaultValue No attribute: the field opens no popup.
	 */
	'aria-haspopup'?: 'listbox' | 'menu' | 'tree' | 'grid' | 'dialog'
	/** The `aria-controls` of the field, such as the id of an open completion list. */
	'aria-controls'?: string
	/** Gets the {@link WysiwygHandle} of the field. */
	ref?: Ref<WysiwygHandle<R>>
}

/** The subscription of a locked field, which takes no update. @internal */
function ignoreUpdates(): () => void {
	return () => undefined
}

/**
 * How the toolbar follows the selection. A locked field is inert: the toolbar
 * does not follow the selection, and it shows no action as on.
 *
 * @internal
 */
function selection(
	editor: WysiwygEditor | null,
	subscribe: WysiwygContextValue['subscribe'],
	locked: boolean,
): Pick<WysiwygContextValue, 'subscribe' | 'isActive'> {
	if (locked) return { subscribe: ignoreUpdates, isActive: () => false }

	return { subscribe, isActive: (action) => editor?.isActive(action) ?? false }
}

/**
 * The ranges that can draw on `value`: each range of `ranges` that can, then
 * each range of `fallback` with another id that can.
 *
 * @internal
 */
function drawable<R extends MarkdownRange>(
	value: string,
	ranges: readonly R[],
	fallback: readonly R[],
): R[] {
	const kept = rangeWalk(value, ranges)?.ranges ?? []

	const ids = new Set(kept.map((range) => range.id))

	const rest = fallback.filter((range) => !ids.has(range.id))

	return [...kept, ...(rangeWalk(value, rest)?.ranges ?? [])]
}

/**
 * The HTML attributes of the field as React props, for the markup before the
 * editor loads. The editor takes them by their HTML names.
 *
 * @internal
 */
function reactProps(attributes: Record<string, string>): Record<string, string> {
	const { class: className = '', tabindex, enterkeyhint, ...rest } = attributes

	return {
		...rest,
		className,
		...(tabindex === undefined ? {} : { tabIndex: tabindex }),
		...(enterkeyhint === undefined ? {} : { enterKeyHint: enterkeyhint }),
	}
}

/**
 * A rich text field that holds Markdown. It shows the formatting of its
 * source, rather than the syntax: `**bold**` shows as **bold**. Its value is a
 * Markdown string. Its children are the row above the field, such as a
 * {@link WysiwygToolbar}, and `actions` is the row below it, as on Textarea.
 *
 * The field grows with its content from a minimum of `rows` lines, and a
 * `max-height` class sets the maximum height. Markdown shortcuts work as the
 * reader types: `**text**`, `*text*`, `` `text` ``, `~~text~~`, `- `, `1. `,
 * `> `, `# `, and a code fence. Backspace right after a shortcut undoes it.
 * Plain text that the reader pastes is read as Markdown.
 *
 * Resolves `id`, `disabled`, `readOnly`, `required`, and `invalid` from an
 * enclosing `<Control>` or `<Field>`, and binds to an enclosing Form field by
 * `name`. The Label of a Field names the field through `aria-labelledby`, and
 * a click on the Label moves the focus to the field.
 *
 * @remarks The field is a `contenteditable` element with `role="textbox"` and
 * `aria-multiline`, because a `<textarea>` cannot show formatting. The editor
 * is ProseMirror. It loads after the mount, in idle time, or at once on the
 * first focus or press of the field. Until then, the field shows the Markdown
 * source as text, with the same frame and the same minimum height, and a key
 * that the reader types goes nowhere. The focus goes on to the editor when it
 * loads.
 *
 * With `ranges`, the field marks the text of each range, such as a citation,
 * and keeps the ranges across each edit that does not touch them.
 *
 * The value is the Markdown source. A value with another spelling of a
 * construct, such as `__bold__`, stays as given until the reader edits the
 * field. An edit then gives the one spelling of each construct: `**bold**`,
 * `*italic*`, `~~strike~~`, `-` bullets, and fenced code. A construct that the
 * field cannot show, such as a table, shows as its source and keeps it.
 *
 * The field submits nothing to a native `<form>`, as Rating does. Bind it to a
 * `Form` field by `name`, or read `value`. A native form reset sets an
 * uncontrolled field back to `defaultValue`.
 */
export function Wysiwyg<R extends MarkdownRange = MarkdownRange>({
	rows = 1,
	placeholder,
	actions,
	children,
	onEnter,
	onKeyDown,
	onSelectionChange,
	separated = false,
	size,
	ref,
	ranges = [],
	onValueChange,
	...options
}: WysiwygProps<R>) {
	const hasActions = actions != null && actions !== false

	const hasToolbar = children != null && children !== false

	// The toolbar is the top row of the frame, or above the frame with `separated`.
	const inside = hasToolbar && !separated

	const apart = hasToolbar && separated

	// Each range that the field has held, by its id, so an undo that brings a
	// range back gives the object of the caller.
	const known = useRef(new Map<string, R>())

	// The ranges of the first render, which are the ranges of the default value.
	const [initialRanges] = useState(ranges)

	// The ranges of the edit that sets the value now. A change of the value that
	// is not an edit, such as a form reset, has none, and gives the ranges that
	// can draw on the new value.
	const edited = useRef<R[] | undefined>(undefined)

	const emit = useStableEvent((next: string) =>
		onValueChange?.(next, edited.current ?? drawable(next, ranges, initialRanges)),
	)

	// The reset ref apart, so the rest of the field reads as values in the render.
	const { resetRef, ...field } = useWysiwygField({
		...options,
		onValueChange: onValueChange && emit,
		defaultValue: options.defaultValue ?? '',
		placeholder,
		stacked: hasActions || inside,
		toolbar: inside && !hasActions,
		separated,
		top: inside,
	})

	const { value, slots, locked } = field

	const host = useRef<HTMLDivElement>(null)

	// The first focus or press of the field loads the editor at once.
	const [wanted, setWanted] = useState(false)

	const [linkOpen, setLinkOpen] = useState(false)

	// The link buttons of the toolbars of the field. The link shortcut opens the
	// popover only when there is one.
	const linkButtons = useRef(0)

	const openLink = useStableEvent(() => {
		if (linkButtons.current === 0) return false

		setLinkOpen(true)

		return true
	})

	const handleChange = useStableEvent((markdown: string, spans: MarkdownRange[]) => {
		for (const range of ranges) known.current.set(range.id, range)

		edited.current = spans.flatMap((span) => {
			const range = known.current.get(span.id)

			return range ? [{ ...range, ...span }] : []
		})

		field.setValue(markdown)

		edited.current = undefined
	})

	const { editor, subscribe } = useWysiwygEditor({
		host,
		value,
		ranges,
		wanted,
		props: {
			attributes: field.attributes,
			editable: !locked,
			onSubmit: onEnter,
			onKeyDown,
			onLink: openLink,
		},
		onChange: handleChange,
	})

	// The editable element, or the markup before the editor loads.
	const element = () =>
		editor ? editor.view.dom : (host.current?.firstElementChild as HTMLElement | null)

	const focus = () => {
		setWanted(true)

		if (editor) editor.focus()
		else element()?.focus()
	}

	const replace = (from: number, to: number, text: string, range?: R) => {
		// The edit gives the range back by its id, as the object of the caller.
		if (range) known.current.set(range.id, range)

		editor?.replace(from, to, text, range && { id: range.id, start: range.start, end: range.end })
	}

	// The handle is made again at each commit, so it holds the current value and element.
	useImperativeHandle(ref, () => ({ focus, value, element: element(), replace }))

	useWysiwygSelection(editor, subscribe, locked, onSelectionChange)

	useWysiwygLabelFocus(field.disabled ? undefined : field.labelId, focus)

	const context: WysiwygContextValue = {
		fieldId: field.fieldId,
		ready: editor !== null,
		locked,
		toolbarClassName: cn(slots.toolbar),
		...selection(editor, subscribe, locked),
		run: (action: WysiwygToggleAction) => {
			editor?.run(action)
		},
		linkOpen,
		setLinkOpen,
		registerLink: () => {
			linkButtons.current++

			return () => {
				linkButtons.current--
			}
		},
		linkDraft: () => editor?.linkDraft() ?? { text: '', href: '' },
		setLink: (href: string, text: string) => editor?.link(href, text),
		holdSelection: (held: boolean) => editor?.hold(held),
	}

	// The field is touched when the focus leaves the field and its rows, and not
	// when it moves to a part of them, such as a toolbar button.
	function handleBlur(event: FocusEvent<HTMLElement>) {
		if (!event.currentTarget.contains(event.relatedTarget)) field.setTouched()
	}

	// The root keeps one shape for each layout, so a change of `separated` does
	// not mount the host again, which holds the element of the editor.
	return (
		<WysiwygContext value={context}>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: a focus-out surface for the toolbar and the field, not a control. The field marks itself touched when the focus leaves both. */}
			<div
				data-slot="wysiwyg-root"
				data-disabled={dataAttr(field.disabled)}
				className={cn(slots.root)}
				onBlur={handleBlur}
			>
				{apart && children}
				<ControlFrame
					as="div"
					density={size}
					data-disabled={dataAttr(field.disabled)}
					className={cn(slots.base)}
				>
					{inside && children}
					<div
						ref={host}
						data-slot="wysiwyg"
						className={cn(slots.host)}
						style={fieldStyle(rows, placeholder)}
					>
						{!editor && (
							<WysiwygStatic
								attributes={field.attributes}
								value={value}
								focusable={!field.disabled}
								onWant={() => setWanted(true)}
							/>
						)}
					</div>
					{hasActions && (
						<ControlActions data-slot="wysiwyg-actions" className={cn(slots.actions)}>
							{actions}
						</ControlActions>
					)}
					{!field.controlled && <input type="hidden" ref={resetRef} />}
				</ControlFrame>
			</div>
		</WysiwygContext>
	)
}

/** The custom properties of the field: its minimum rows and its placeholder text. */
function fieldStyle(rows: number, placeholder: string | undefined) {
	return {
		'--wysiwyg-rows': rows,
		...(placeholder === undefined ? {} : { '--wysiwyg-placeholder': JSON.stringify(placeholder) }),
	} as CSSProperties
}

/** Props for {@link WysiwygStatic}. @internal */
type WysiwygStaticProps = {
	attributes: Record<string, string>
	value: string
	focusable: boolean
	/** Fires on the first focus or press, which loads the editor at once. */
	onWant: () => void
}

/**
 * The field before the editor loads, and the markup of the server render: the
 * Markdown source as text, with the attributes of the field. The editor puts
 * its own element beside it, and this one then goes.
 *
 * @internal
 */
function WysiwygStatic({ attributes, value, focusable, onWant }: WysiwygStaticProps) {
	return (
		// biome-ignore lint/a11y/useSemanticElements: the field holds the blocks of the editor, which a <textarea> cannot hold.
		<div
			{...reactProps(attributes)}
			role="textbox"
			tabIndex={focusable ? 0 : undefined}
			data-empty={dataAttr(value.trim() === '')}
			onFocus={onWant}
			onPointerDown={onWant}
		>
			<p className={markdown().paragraph}>{value === '' ? <br /> : value}</p>
		</div>
	)
}
