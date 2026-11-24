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
import { cn } from '../../core/cn'
import { dataAttr } from '../../core/data-attr'
import type { ScaleStep } from '../../core/density/scale'
import { useStableEvent } from '../../hooks/use-stable-event'
import { ControlActions, ControlFrame } from '../../primitives/control'
import { k as markdown } from '../../recipes/kata/markdown'
import type { scale } from '../../recipes/kata/wysiwyg'
import { WysiwygContext, type WysiwygContextValue } from './context'
import type { WysiwygAction, WysiwygHandle } from './types'
import { useWysiwygEditor } from './use-wysiwyg-editor'
import { useWysiwygField } from './use-wysiwyg-field'
import { useWysiwygLabelFocus } from './use-wysiwyg-label-focus'

/** Props for {@link Wysiwyg}. */
export type WysiwygProps = {
	/** Controlled value, in Markdown. `undefined` leaves the field uncontrolled; `null` keeps it controlled with no current value (CONVENTIONS §7.3). */
	value?: string | null
	/** Initial value, in Markdown, when uncontrolled and not form-bound. */
	defaultValue?: string
	/** Fires with the Markdown of the field after each edit. */
	onValueChange?: (value: string) => void
	/**
	 * The minimum height in lines. The field grows with its content, and a
	 * `max-height` class sets the maximum height.
	 * @defaultValue 3
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
	 * Enter calls it, and Shift+Enter then does what Enter does without it, so a
	 * Markdown shortcut such as `- ` works on the new line. Without it, Enter
	 * starts a new block, continues a list, or adds a line to a code block, and
	 * Shift+Enter breaks the line.
	 */
	onEnter?: () => void
	/** Runs first on each key in the field. A handler that cancels the key stops the editor. */
	onKeyDown?: (event: KeyboardEvent) => void
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
	/** Gets the {@link WysiwygHandle} of the field. */
	ref?: Ref<WysiwygHandle>
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
export function Wysiwyg({
	rows = 3,
	placeholder,
	actions,
	children,
	onEnter,
	onKeyDown,
	size,
	ref,
	...options
}: WysiwygProps) {
	const hasActions = actions != null && actions !== false

	const hasToolbar = children != null && children !== false

	// The reset ref apart, so the rest of the field reads as values in the render.
	const { resetRef, ...field } = useWysiwygField({
		...options,
		defaultValue: options.defaultValue ?? '',
		placeholder,
		rows: hasActions || hasToolbar,
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

	const { editor, subscribe } = useWysiwygEditor({
		host,
		value,
		wanted,
		props: {
			attributes: field.attributes,
			editable: !locked,
			onSubmit: onEnter,
			onKeyDown,
			onLink: openLink,
		},
		onChange: field.setValue,
	})

	// The editable element, or the markup before the editor loads.
	const element = () =>
		editor ? editor.view.dom : (host.current?.firstElementChild as HTMLElement | null)

	const focus = () => {
		setWanted(true)

		if (editor) editor.view.focus()
		else element()?.focus()
	}

	// The handle is made again at each commit, so it holds the current value and element.
	useImperativeHandle(ref, () => ({ focus, value, element: element() }))

	useWysiwygLabelFocus(field.disabled ? undefined : field.labelId, focus)

	const context: WysiwygContextValue = {
		fieldId: field.fieldId,
		ready: editor !== null,
		locked,
		subscribe,
		isActive: (action: WysiwygAction) => editor?.isActive(action) ?? false,
		run: (action: WysiwygAction) => {
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
		linkHref: () => editor?.linkHref() ?? '',
		setLink: (href: string) => editor?.link(href),
	}

	// The field is touched when the focus leaves the frame, and not when it
	// moves to a part of it, such as a toolbar button.
	function handleBlur(event: FocusEvent<HTMLSpanElement>) {
		if (!event.currentTarget.contains(event.relatedTarget)) field.setTouched()
	}

	const style = {
		'--wysiwyg-rows': rows,
		...(placeholder === undefined ? {} : { '--wysiwyg-placeholder': JSON.stringify(placeholder) }),
	} as CSSProperties

	return (
		<WysiwygContext value={context}>
			<ControlFrame
				as="div"
				density={size}
				data-disabled={dataAttr(field.disabled)}
				className={cn(slots.base)}
				onBlur={handleBlur}
			>
				{hasToolbar && children}
				<div ref={host} data-slot="wysiwyg" className={cn(slots.host)} style={style}>
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
		</WysiwygContext>
	)
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
