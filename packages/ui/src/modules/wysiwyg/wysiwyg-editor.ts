import { baseKeymap, chainCommands, exitCode, newlineInCode } from 'prosemirror-commands'
import { history, redo, undo } from 'prosemirror-history'
import { undoInputRule } from 'prosemirror-inputrules'
import { keymap } from 'prosemirror-keymap'
import { Fragment, Slice } from 'prosemirror-model'
import { splitListItem } from 'prosemirror-schema-list'
import { type Command, EditorState, type Transaction } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import type { MarkdownRange } from '../../components/markdown/markdown-ranges'
import { isComposing } from '../../utilities/is-composing'
import { linkDraft, linkRange, setLink, wysiwygCommands } from './engine/wysiwyg-commands'
import { HELD, wysiwygHeld } from './engine/wysiwyg-held'
import { wysiwygInputRules } from './engine/wysiwyg-input-rules'
import { parseMarkdown } from './engine/wysiwyg-markdown/parse'
import { serializeMarkdown, serializeMarkdownRanges } from './engine/wysiwyg-markdown/serialize'
import { SET_VALUE, wysiwygRanges } from './engine/wysiwyg-ranges'
import { isEmptyDoc, schema } from './engine/wysiwyg-schema'
import type { WysiwygAction } from './types'
import { type WysiwygShortcut, wysiwygActions } from './wysiwyg-actions'

/**
 * The settings of an editor that the field can change while it lives.
 *
 * @internal
 */
export type WysiwygEditorProps = {
	/**
	 * The attributes of the editable element: its role, its ARIA, and its
	 * classes. The editor adds `data-empty` while the doc is empty.
	 */
	attributes: Record<string, string>
	editable: boolean
	/** Fires with the Markdown of the doc and its ranges after each change of the doc. */
	onChange: (markdown: string, ranges: MarkdownRange[]) => void
	/** Fires after each new state, so the toolbar can read the active actions. */
	onUpdate: () => void
	/**
	 * Enter calls it, and Shift+Enter then does what Enter does without it.
	 * Without it, Enter splits the block, continues a list, or adds a line to a
	 * code block, and Shift+Enter breaks the line.
	 */
	onSubmit: (() => void) | undefined
	/** Runs first on each key. A handler that cancels the key stops the editor. */
	onKeyDown: ((event: KeyboardEvent) => void) | undefined
	/**
	 * Runs on the link shortcut, and opens the link popover. It gives `false`
	 * when no toolbar has a link button, and the key then goes on.
	 */
	onLink: () => boolean
}

/**
 * The editor of a Wysiwyg field: the ProseMirror view and the Markdown
 * bridge. The field loads this module after it mounts, so a page with no
 * field loads no editor.
 *
 * @internal
 */
export type WysiwygEditor = {
	view: EditorView
	/** Gives the editor new settings. */
	update: (props: WysiwygEditorProps) => void
	/** Replaces the doc with a Markdown source and its ranges, out of the undo history. */
	setValue: (markdown: string, ranges: readonly MarkdownRange[]) => void
	/** Runs an action on the selection. */
	run: (action: WysiwygAction) => boolean
	/** Whether an action is on at the selection. */
	isActive: (action: WysiwygAction) => boolean
	/**
	 * Sets the text and the link of the selection, or of the link at a caret,
	 * and moves the focus back to the field. An empty URL removes the link.
	 */
	link: (href: string, text: string) => void
	/** The text and the URL of the selection, or of the link at a caret. */
	linkDraft: () => { text: string; href: string }
	/**
	 * Marks the range of the link action while the focus is in the link
	 * popover. `false` removes the mark.
	 */
	hold: (held: boolean) => void
	destroy: () => void
}

/**
 * The ProseMirror key name of a shortcut. A letter with Shift is upper case,
 * as the key of the event is.
 *
 * @internal
 */
function keyName({ shift, alt, key }: WysiwygShortcut): string {
	return `Mod-${shift ? 'Shift-' : ''}${alt ? 'Alt-' : ''}${shift ? key : key.toLowerCase()}`
}

/** A line break, as a hard break node. @internal */
const breakLine: Command = (state, dispatch) => {
	dispatch?.(state.tr.replaceSelectionWith(schema.nodes.hard_break.create()).scrollIntoView())

	return true
}

/**
 * Creates the editor of a field, and appends its editable element to `host`.
 *
 * @internal
 */
export function createWysiwygEditor(
	host: HTMLElement,
	value: string,
	ranges: readonly MarkdownRange[],
	initial: WysiwygEditorProps,
): WysiwygEditor {
	let props = initial

	const actionKeys: Record<string, Command> = {}

	for (const action of Object.keys(wysiwygActions) as WysiwygAction[]) {
		const key = keyName(wysiwygActions[action].shortcut)

		actionKeys[key] = action === 'link' ? () => props.onLink() : wysiwygCommands[action].run
	}

	// A new block, so a Markdown shortcut such as `- ` works after the key. With
	// `onSubmit`, Shift+Enter takes this command, as a chat composer does.
	const newBlock = chainCommands(
		newlineInCode,
		splitListItem(schema.nodes.list_item),
		baseKeymap.Enter as Command,
	)

	const enterKeys: Record<string, Command> = {
		Enter: (state, dispatch, view) => {
			if (!props.onSubmit) return newBlock(state, dispatch, view)

			props.onSubmit()

			return true
		},
		'Shift-Enter': (state, dispatch, view) =>
			props.onSubmit
				? newBlock(state, dispatch, view)
				: chainCommands(exitCode, breakLine)(state, dispatch, view),
	}

	const state = EditorState.create({
		doc: parseMarkdown(value, ranges),
		plugins: [
			wysiwygRanges(),
			wysiwygHeld(),
			wysiwygInputRules(),
			history(),
			keymap({
				...actionKeys,
				...enterKeys,
				'Mod-z': undo,
				'Mod-Shift-Z': redo,
				'Mod-y': redo,
				Backspace: undoInputRule,
			}),
			keymap(baseKeymap),
		],
	})

	const view: EditorView = new EditorView(host, {
		state,
		attributes: (current) =>
			isEmptyDoc(current.doc) ? { ...props.attributes, 'data-empty': '' } : props.attributes,
		editable: () => props.editable,
		handleKeyDown: (_, event) => {
			if (isComposing(event)) return false

			props.onKeyDown?.(event)

			return event.defaultPrevented
		},
		handleDOMEvents: {
			// ProseMirror takes a press from the browser and draws the selection
			// itself, but only in a view that takes edits. A read-only field leaves
			// the press to the browser, so the reader can select its text.
			mousedown: () => !props.editable,
			// The edit menu of iOS and the format keys of some keyboards send these.
			beforeinput: (_, event) => {
				const action = formatAction((event as InputEvent).inputType)

				if (!action) return false

				event.preventDefault()

				wysiwygCommands[action].run(view.state, view.dispatch)

				return true
			},
		},
		// Plain text that the reader pastes is Markdown, except in a code block.
		clipboardTextParser: (text, $context) => {
			if ($context.parent.type.spec.code) {
				return text ? new Slice(Fragment.from(schema.text(text)), 0, 0) : Slice.empty
			}

			const doc = parseMarkdown(text)

			return Slice.maxOpen(doc.content)
		},
		clipboardTextSerializer: (slice) => {
			const doc = schema.topNodeType.createAndFill(null, slice.content)

			return doc ? serializeMarkdown(doc) : slice.content.textBetween(0, slice.content.size, '\n\n')
		},
		dispatchTransaction: (tr: Transaction) => {
			const next = view.state.apply(tr)

			view.updateState(next)

			if (tr.docChanged) {
				const out = serializeMarkdownRanges(next.doc)

				props.onChange(out.markdown, out.ranges)
			}

			props.onUpdate()
		},
	})

	return {
		view,
		update: (next) => {
			props = next

			view.setProps({})
		},
		setValue: (markdown, next) => {
			const doc = parseMarkdown(markdown, next)

			const tr = view.state.tr
				.replaceWith(0, view.state.doc.content.size, doc.content)
				.setMeta('addToHistory', false)
				.setMeta(SET_VALUE, true)

			view.updateState(view.state.apply(tr))

			props.onUpdate()
		},
		run: (action) => wysiwygCommands[action].run(view.state, view.dispatch, view),
		isActive: (action) => wysiwygCommands[action].active(view.state),
		link: (href, text) => {
			setLink(href, text)(view.state, view.dispatch, view)

			view.focus()
		},
		linkDraft: () => linkDraft(view.state),
		hold: (held) => {
			// The field can go before the popover does.
			if (view.isDestroyed) return

			view.dispatch(view.state.tr.setMeta(HELD, held ? linkRange(view.state) : null))
		},
		destroy: () => view.destroy(),
	}
}

/**
 * The action of a format input, such as the Bold item of the edit menu of iOS.
 * Markdown has no underline, so `formatUnderline` has none.
 *
 * @internal
 */
function formatAction(inputType: string): WysiwygAction | undefined {
	switch (inputType) {
		case 'formatBold':
			return 'bold'
		case 'formatItalic':
			return 'italic'
		case 'formatStrikeThrough':
			return 'strike'
		default:
			return undefined
	}
}
