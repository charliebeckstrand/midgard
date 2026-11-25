'use client'

import {
	type CSSProperties,
	type FocusEvent,
	type MouseEvent,
	type ReactNode,
	type Ref,
	useImperativeHandle,
	useMemo,
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
import type { scale } from '../../recipes/kata/wysiwyg'
import { clamp } from '../../utilities/clamp'
import { noopSubscribe } from '../../utilities/noop'
import { isPrimaryPress } from '../../utilities/primary-press'
import { WysiwygContext, type WysiwygContextValue } from './context'
import type { WysiwygBlock, WysiwygHandle, WysiwygHeadingLevel, WysiwygToggleAction } from './types'
import { useWysiwygEditor } from './use-wysiwyg-editor'
import { useWysiwygField } from './use-wysiwyg-field'
import { useWysiwygLabelFocus } from './use-wysiwyg-label-focus'
import { useWysiwygSelection } from './use-wysiwyg-selection'
import type { WysiwygEarlyItem } from './wysiwyg-early-input'
import { WysiwygStatic } from './wysiwyg-static'

/** Props for {@link Wysiwyg}. */
export type WysiwygProps<R extends MarkdownRange = MarkdownRange> = {
	/**
	 * Controlled value, in Markdown. `undefined` leaves the field uncontrolled; `null` keeps it controlled with no current value (CONVENTIONS §7.3).
	 *
	 * @remarks A clear after a send, a value that refuses an edit, or another
	 * value that is not the last edit replaces the doc. It starts a new undo history, so an undo does not bring
	 * back text or ranges from before it.
	 */
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
	 * the edit kept. An edit that changes only the ranges, such as a `replace`
	 * that marks text of the value, also fires it. Each range is the object of
	 * `ranges` with the `start`, `end`, and `quote` of the new value. A native
	 * reset of an uncontrolled field gives the ranges of the first render that
	 * can draw on its default value.
	 */
	onValueChange?: (value: string, ranges: R[]) => void
	/**
	 * The minimum height in lines. The field grows with its content, and a
	 * `max-height` class sets the maximum height.
	 * @defaultValue 1
	 * @minimum 1
	 */
	rows?: number
	/** The text that the empty field shows. A screen reader gets it through `aria-placeholder`. */
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
	 * Shift+Enter breaks the line. Enter after a fence at the start of a block,
	 * such as ```` ```js ````, makes a code block and does not call it. A new
	 * line on an empty last line of a code block leaves the block, and ArrowDown
	 * on the last line of the last code block adds a paragraph after it.
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

/**
 * The ranges that can draw on `value`, in the order of their text: each range
 * of `ranges` that can, then each range of `fallback` with another id that can
 * and that does not overlap a range of `ranges`.
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

	const free = (range: R) =>
		!ids.has(range.id) && kept.every((own) => range.end <= own.start || range.start >= own.end)

	const rest = rangeWalk(value, fallback.filter(free))?.ranges ?? []

	return [...kept, ...rest].sort((a, b) => a.start - b.start)
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
 * Enter after a fence also makes a code block, and Mod+Z undoes that. Plain
 * text that the reader pastes is read as Markdown. A web URL that the reader
 * pastes over selected text links the text, as one undo step, and the text
 * stays.
 *
 * Resolves `id`, `disabled`, `readOnly`, `required`, and `invalid` from an
 * enclosing `<Control>` or `<Field>`, and binds to an enclosing Form field by
 * `name`. The Label of a Field names the field through `aria-labelledby`, and
 * a click on the Label moves the focus to the field.
 *
 * @remarks The field is a `contenteditable` element with `role="textbox"` and
 * `aria-multiline`, because a `<textarea>` cannot show formatting. The editor
 * is ProseMirror. It loads after the mount, in idle time, or at once when the
 * pointer comes over the field or its toolbar, or when one of them gets the
 * focus. Until then, and in the server render, the field shows the formatting
 * of the value as the editor draws it, so the first paint has the layout of
 * the field.
 *
 * After hydration, the field takes input before the editor loads. The browser
 * shows each key that edits the text of a block at once. The field holds each
 * other input: Enter, a format shortcut, an undo, a paste, a delete that joins
 * two blocks, and a press of the toolbar. From the first held input, the field
 * holds each input after it too. When the editor loads, it takes the text and
 * the caret of the field, and then runs each held input in its order, as if
 * the reader gave it then. A held input runs at the caret where the reader
 * gave it. A value that the parent sets after the first input wins over the
 * input in the field. Thus a held Enter with `onEnter` sends the text
 * before it, and a Markdown shortcut that the reader typed turns into
 * formatting. An input method composition goes on to its end before the editor
 * takes over. A drop before the load does nothing. The focus goes on to the
 * editor when it loads.
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

	// Each range that the field has held since the doc last took a value, by its
	// id, so an undo that brings a range back gives the object of the caller. A
	// set of the value starts a new undo history, so it empties the map.
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

	// Each part of the field apart, so the render reads values and not one
	// object, and the compiler can keep the memo of the context below.
	const {
		resetRef,
		value,
		controlled,
		setValue,
		setTouched,
		fieldId,
		disabled,
		locked,
		labelId,
		slots,
		attributes,
	} = useWysiwygField({
		...options,
		onValueChange: onValueChange && emit,
		defaultValue: options.defaultValue ?? '',
		placeholder,
		// The frame stacks the field with a row above or below it. With a toolbar
		// in the frame and no actions row, the field is the last row.
		layout: {
			actions: hasActions || inside,
			toolbar: inside && !hasActions,
			separated,
			top: inside,
		},
	})

	const host = useRef<HTMLDivElement>(null)

	// The openers of the link dialogs of the toolbars of the field. The link
	// shortcut opens the dialog of the last one, and goes on as a key with none.
	const linkOpeners = useRef(new Set<() => void>())

	// One identity for the mount, so each link button registers once, and the
	// set keeps the order of the mounts.
	const registerLink = useStableEvent((open: () => void) => {
		linkOpeners.current.add(open)

		return () => {
			linkOpeners.current.delete(open)
		}
	})

	const openLink = useStableEvent(() => {
		const open = [...linkOpeners.current].at(-1)

		open?.()

		return open !== undefined
	})

	const handleChange = useStableEvent((markdown: string, spans: MarkdownRange[], text: boolean) => {
		for (const range of ranges) known.current.set(range.id, range)

		edited.current = spans.flatMap((span) => {
			const range = known.current.get(span.id)

			return range ? [{ ...range, ...span }] : []
		})

		// A set of the value reports only a change of the text. An edit that
		// changes only the ranges thus reports by itself, as there is no new
		// value to keep.
		if (text) setValue(markdown)
		else onValueChange?.(markdown, edited.current)

		edited.current = undefined
	})

	const forgetRanges = useStableEvent(() => known.current.clear())

	const { editor, subscribe, loadedAtMount, load, whenReady, early } = useWysiwygEditor({
		host,
		value,
		ranges,
		props: {
			attributes: attributes,
			editable: !locked,
			onEnter,
			onKeyDown,
			onLink: openLink,
		},
		onChange: handleChange,
		onSet: forgetRanges,
	})

	// An input before the load, which the editor runs when it loads.
	const holdInput = useStableEvent((item: WysiwygEarlyItem) =>
		whenReady((ready) => ready.replay(item)),
	)

	// The editable element, or the markup before the editor loads.
	const element = () =>
		editor ? editor.view.dom : (host.current?.firstElementChild as HTMLElement | null)

	const focus = () => {
		load()

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

	useWysiwygLabelFocus(disabled ? undefined : labelId, focus)

	const toolbarClassName = cn(slots.toolbar)

	// The value keeps its identity while its inputs do. A keystroke renders the
	// field, and the toolbar then renders only the buttons whose state changed.
	// The effects of the link button, which run on `registerLink` and
	// `holdSelection`, thus do not run again on an edit or on an open of the
	// dialog.
	// One identity for the mount, so the memo below does not list it.
	const focusField = useStableEvent(focus)

	const context = useMemo<WysiwygContextValue>(
		() => ({
			fieldId,
			locked,
			toolbarClassName,
			// A locked field is inert: the toolbar does not follow the selection, and
			// it shows no action as on.
			subscribe: locked ? noopSubscribe : subscribe,
			isActive: (action) => !locked && (editor?.isActive(action) ?? false),
			// A press before the editor loads starts the load, and the action runs
			// when the editor comes.
			run: (action: WysiwygToggleAction) => whenReady((ready) => ready.run(action)),
			setHeading: (level: WysiwygHeadingLevel) => whenReady((ready) => ready.setHeading(level)),
			headingLevel: () => (locked ? null : (editor?.headingLevel() ?? null)),
			// Before the editor loads, each level is open, so a press starts the load.
			canSetHeading: (level: WysiwygHeadingLevel) =>
				!editor || editor.headingLevel() === level || editor.canSetHeading(level),
			whenReady,
			registerLink,
			linkDraft: () => editor?.linkDraft() ?? { text: '', href: '' },
			setLink: (href: string, text: string) => editor?.link(href, text),
			holdSelection: (held: boolean) => editor?.hold(held),
			fieldFocused: () => editor?.view.hasFocus() ?? false,
			focusField,
		}),
		[fieldId, editor, locked, toolbarClassName, subscribe, whenReady, registerLink, focusField],
	)

	// The field is touched when the focus leaves the field and its rows, and not
	// when it moves to a part of them, such as a toolbar button.
	function handleBlur(event: FocusEvent<HTMLElement>) {
		if (!event.currentTarget.contains(event.relatedTarget)) setTouched()
	}

	// Below a toolbar, the space above the text is a margin of the field, so the
	// host gets a press in that space and not the field. The press puts the
	// caret in the first visible row of text, as a press on the field does.
	function handleHostPress(event: MouseEvent<HTMLDivElement>) {
		if (event.target !== event.currentTarget || disabled || !isPrimaryPress(event)) return

		event.preventDefault()

		const box = editor?.view.dom.getBoundingClientRect()

		if (editor && box) {
			editor.focusAt(event.clientX, clamp(event.clientY, box.top + 1, box.bottom - 1))
		} else focus()
	}

	// The root keeps one shape for each layout, so a change of `separated` does
	// not mount the host again, which holds the element of the editor.
	return (
		<WysiwygContext value={context}>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: a focus-out surface for the toolbar and the field, not a control. The field marks itself touched when the focus leaves both. */}
			<div
				data-slot="wysiwyg-root"
				data-disabled={dataAttr(disabled)}
				className={cn(slots.root)}
				onBlur={handleBlur}
				onPointerEnter={load}
				onFocus={load}
			>
				{apart && children}
				<ControlFrame
					as="div"
					density={size}
					data-disabled={dataAttr(disabled)}
					className={cn(slots.base)}
				>
					{inside && children}
					{/* biome-ignore lint/a11y/noStaticElementInteractions: a press surface around the field, not a control. The field takes the focus and the keys. */}
					<div
						ref={host}
						data-slot="wysiwyg"
						className={cn(slots.host)}
						style={fieldStyle(rows, placeholder)}
						onMouseDown={handleHostPress}
					>
						{/* With the engine at the mount, the editor comes before the first paint. */}
						{!editor && !loadedAtMount && (
							<WysiwygStatic
								attributes={attributes}
								value={value}
								ranges={ranges}
								focusable={!disabled}
								editable={!locked}
								early={early}
								hold={holdInput}
							/>
						)}
					</div>
					{hasActions && (
						<ControlActions data-slot="wysiwyg-actions" className={cn(slots.actions)}>
							{actions}
						</ControlActions>
					)}
					{!controlled && <input type="hidden" ref={resetRef} />}
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
