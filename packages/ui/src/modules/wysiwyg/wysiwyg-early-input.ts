import type { MarkdownRange } from '../../components/markdown/markdown-ranges'
import { isApplePlatform } from '../../utilities/apple-platform'
import { isComposing } from '../../utilities/is-composing'
import type { WysiwygToggleAction } from './types'
import { WYSIWYG_ACTIONS, wysiwygActions } from './wysiwyg-actions'
import type { WysiwygEditor } from './wysiwyg-editor'

/**
 * An input of the field before the editor loads that the browser cannot make
 * in the markup of the field. The field holds it, and the editor runs it when
 * it loads, as if the reader gave it then.
 *
 * - `key`: a key that the editor binds, such as Enter or a format shortcut.
 * - `text`: text to type at the selection.
 * - `delete`: a delete of the selection, or of a character, a word, or a line
 *   before or after the caret.
 * - `paste`: the plain text and the HTML of a paste.
 * - `format`: a format input, such as the Bold item of the edit menu of iOS.
 * - `history`: an undo or a redo.
 *
 * @internal
 */
export type WysiwygEarlyItem =
	| {
			type: 'key'
			key: string
			code: string
			shiftKey: boolean
			altKey: boolean
			ctrlKey: boolean
			metaKey: boolean
	  }
	| { type: 'text'; text: string }
	| { type: 'delete'; forward: boolean; unit: 'character' | 'word' | 'line' }
	| { type: 'paste'; text: string; html: string }
	| { type: 'format'; action: WysiwygToggleAction }
	| { type: 'history'; redo: boolean }

/** A point of a DOM selection: a node, and an offset in it. @internal */
export type WysiwygEarlyPoint = { node: Node; offset: number }

/**
 * The markup of the field before the editor loads, as the editor takes it:
 * the element, and the selection of the reader in it.
 *
 * @internal
 */
export type WysiwygEarlyField = {
	root: Element
	anchor: WysiwygEarlyPoint | null
	head: WysiwygEarlyPoint | null
}

/** A Markdown source and its ranges. @internal */
type Source = { value: string; ranges: readonly MarkdownRange[] }

/** A point as the child indexes from the root to its node, so it can find the same node in a copy. @internal */
type PathPoint = { path: number[]; offset: number }

/** The child indexes from `root` to `node`, or `null` when `root` does not hold `node`. @internal */
function findPath(root: Node, node: Node): number[] | null {
	const path: number[] = []

	for (let at: Node = node; at !== root; ) {
		const parent = at.parentNode

		if (!parent) return null

		path.unshift(Array.prototype.indexOf.call(parent.childNodes, at))

		at = parent
	}

	return path
}

/** The node at the end of a path from `root`, or `null`. @internal */
function nodeAt(root: Node, path: readonly number[]): Node | null {
	let at: Node | undefined = root

	for (const index of path) {
		at = at.childNodes[index]

		if (!at) return null
	}

	return at
}

/** The anchor and the head of the DOM selection, where `root` holds them. @internal */
function selectionIn(root: Element): Pick<WysiwygEarlyField, 'anchor' | 'head'> {
	const selection = root.ownerDocument.getSelection()

	const point = (node: Node | null | undefined, offset: number) =>
		node && root.contains(node) ? { node, offset } : null

	return {
		anchor: point(selection?.anchorNode, selection?.anchorOffset ?? 0),
		head: point(selection?.focusNode, selection?.focusOffset ?? 0),
	}
}

/**
 * A copy of the markup of the field and of the selection in it, as at the
 * moment of the copy. Each later change of the markup does not change it.
 *
 * @internal
 */
function snapshot(root: Element): WysiwygEarlyField {
	const { anchor, head } = selectionIn(root)

	const copy = root.cloneNode(true) as Element

	const point = (at: WysiwygEarlyPoint | null) => {
		const path: PathPoint | null = at && { path: findPath(root, at.node) ?? [], offset: at.offset }

		const node = path && nodeAt(copy, path.path)

		return node && path ? { node, offset: path.offset } : null
	}

	return { root: copy, anchor: point(anchor), head: point(head) }
}

/**
 * The input of a field before its editor loads. The browser makes each edit
 * of the text in a text block in the markup of the field, so the reader sees
 * it at once. Such an edit is a typed key, a delete, an input method
 * composition, or an autocorrect. The editor takes the text of the markup
 * when it loads.
 *
 * Each other input waits for the editor in one queue, in its order. It is a
 * key that the editor binds, a paste, an edit that crosses a block, or a
 * press of the toolbar. The first one takes a copy of the markup. From then
 * on, the field holds each input, so the editor runs them in their order.
 *
 * @internal
 */
export type WysiwygEarlyInput = {
	/** Whether the queue holds an input. Each input then waits for the editor. */
	held: () => boolean
	/**
	 * Puts a task in the queue. The first task copies `field`, the markup of the
	 * field. An input method composition puts off the copy to its end, so the
	 * copy holds the composed text.
	 */
	hold: (task: (editor: WysiwygEditor) => void, field: Element | null) => void
	/** Whether an input method composes in the field. The editor waits for the end. */
	composing: () => boolean
	/** The source that the markup drew at the first edit of the browser, or `null`. */
	edited: () => Source | null
	/** Records the first edit of the browser in the markup, which drew `source`. */
	edit: (source: Source) => void
	/**
	 * The markup of the field as the editor takes it: the copy of the first
	 * held task, or else `field` and the selection in it.
	 */
	take: (field: Element) => WysiwygEarlyField
	/** Runs the first task of the queue on `editor`. Gives whether tasks remain. */
	next: (editor: WysiwygEditor) => boolean
	/** Starts a composition. */
	compositionStart: () => void
	/** Ends a composition in `field`, which composed `text`. */
	compositionEnd: (field: Element, text: string) => void
	/** Calls `listener` at the start and the end of each composition. Gives the cleanup. */
	subscribe: (listener: () => void) => () => void
}

/** @internal */
export function createEarlyInput(): WysiwygEarlyInput {
	const queue: ((editor: WysiwygEditor) => void)[] = []

	let copy: WysiwygEarlyField | null = null

	// A held task came during a composition, so the copy waits for its end.
	let copyAtEnd = false

	let composing = false

	// The composition started while the queue held a task, so its text waits too.
	let composingHeld = false

	let edited: Source | null = null

	const listeners = new Set<() => void>()

	return {
		held: () => queue.length > 0,
		hold: (task, field) => {
			if (queue.length === 0 && copy === null && field) {
				if (composing) copyAtEnd = true
				else copy = snapshot(field)
			}

			queue.push(task)
		},
		composing: () => composing,
		edited: () => edited,
		edit: (source) => {
			edited ??= source
		},
		take: (field) => {
			const taken = copy ?? { root: field, ...selectionIn(field) }

			copy = null

			return taken
		},
		next: (editor) => {
			queue.shift()?.(editor)

			return queue.length > 0
		},
		compositionStart: () => {
			composing = true

			composingHeld = queue.length > 0 && !copyAtEnd

			for (const listener of listeners) listener()
		},
		compositionEnd: (field, text) => {
			composing = false

			if (copyAtEnd) {
				copyAtEnd = false

				copy = snapshot(field)
			} else if (composingHeld && text) {
				queue.push((editor) => editor.replay({ type: 'text', text }))
			}

			composingHeld = false

			for (const listener of listeners) listener()
		},
		subscribe: (listener) => {
			listeners.add(listener)

			return () => {
				listeners.delete(listener)
			}
		},
	}
}

/**
 * The content element of each text block of the markup: a paragraph, a
 * heading, and the code of a code block.
 */
const TEXT_BLOCK = 'p, h1, h2, h3, h4, h5, h6, pre:not([data-raw]) > code'

/**
 * The content element of the text block of the markup that holds `node`, or
 * `null` when no text block of `root` holds it, or an atom does, such as an
 * inline source. The browser cannot edit an atom, as the editor does not.
 *
 * @internal
 */
function findTextBlock(root: Element, node: Node): Element | null {
	const element = node instanceof Element ? node : node.parentElement

	if (!element || element.closest('[data-raw]')) return null

	const block = element.closest(TEXT_BLOCK)

	return block && root.contains(block) ? block : null
}

/** Whether the text of `block` before (or after, with `forward`) a point is empty. @internal */
function atEdge(block: Element, point: WysiwygEarlyPoint, forward: boolean): boolean {
	const range = block.ownerDocument.createRange()

	range.selectNodeContents(block)

	if (forward) range.setStart(point.node, point.offset)
	else range.setEnd(point.node, point.offset)

	return range.toString() === '' && !range.cloneContents().querySelector('br, [data-raw]')
}

/**
 * The inputs that the browser makes in the markup when the change stays in
 * one text block. An input method composition is not in the list: the
 * browser makes it in each case, and no handler can stop it.
 */
const IN_PLACE = new Set([
	'insertText',
	'insertReplacementText',
	'insertTranspose',
	'deleteContentBackward',
	'deleteContentForward',
	'deleteWordBackward',
	'deleteWordForward',
	'deleteSoftLineBackward',
	'deleteSoftLineForward',
	'deleteHardLineBackward',
	'deleteHardLineForward',
	'deleteByCut',
	'deleteContent',
])

/** The inputs of an input method composition, which no handler can stop. */
const COMPOSITION = new Set([
	'insertCompositionText',
	'deleteCompositionText',
	'insertFromComposition',
])

/** The ranges that an input changes, or the range of the selection when the browser gives none. @internal */
function changedRanges(root: Element, event: InputEvent): readonly AbstractRange[] {
	const targets = event.getTargetRanges()

	if (targets.length > 0) return targets

	const selection = root.ownerDocument.getSelection()

	return selection && selection.rangeCount > 0 ? [selection.getRangeAt(0)] : []
}

/**
 * Whether the browser can make an input in the markup. The input is in
 * {@link IN_PLACE}, and each range that it changes is in one text block. A
 * delete at the edge of a block joins two blocks, so it waits.
 *
 * @internal
 */
function inPlace(root: Element, event: InputEvent): boolean {
	if (!IN_PLACE.has(event.inputType)) return false

	const ranges = changedRanges(root, event)

	if (ranges.length === 0) return false

	const each = ranges.every((range) => {
		const block = findTextBlock(root, range.startContainer)

		return block !== null && block === findTextBlock(root, range.endContainer)
	})

	if (!each) return false

	const range = ranges[0] as AbstractRange

	if (!event.inputType.startsWith('delete') || !range.collapsed) return true

	// A collapsed range of a delete: the browser can give the caret and not
	// the span that the delete removes.
	const block = findTextBlock(root, range.startContainer) as Element

	const point = { node: range.startContainer, offset: range.startOffset }

	return !atEdge(block, point, event.inputType.endsWith('Forward'))
}

/** The held item of an input that the browser does not make, or `null` for an input that does nothing. @internal */
function readHeldInput(event: InputEvent): WysiwygEarlyItem | null {
	const type = event.inputType

	switch (type) {
		case 'insertText':
		case 'insertReplacementText': {
			const text = event.data ?? event.dataTransfer?.getData('text/plain') ?? ''

			return text ? { type: 'text', text } : null
		}
		case 'insertParagraph':
		case 'insertLineBreak':
			return {
				type: 'key',
				key: 'Enter',
				code: 'Enter',
				shiftKey: type === 'insertLineBreak',
				altKey: false,
				ctrlKey: false,
				metaKey: false,
			}
		case 'formatBold':
			return { type: 'format', action: 'bold' }
		case 'formatItalic':
			return { type: 'format', action: 'italic' }
		case 'formatStrikeThrough':
			return { type: 'format', action: 'strike' }
		case 'historyUndo':
		case 'historyRedo':
			return { type: 'history', redo: type === 'historyRedo' }
	}

	if (!type.startsWith('delete')) return null

	return { type: 'delete', forward: type.endsWith('Forward'), unit: deleteUnit(type) }
}

/** The unit of a delete input: a word, a line, or a character. @internal */
function deleteUnit(type: string): 'character' | 'word' | 'line' {
	if (type.includes('Word')) return 'word'

	return type.includes('Line') ? 'line' : 'character'
}

/** Whether a key is a shortcut of the editor: an action, an undo, or a redo. @internal */
function isEditorShortcut(event: KeyboardEvent): boolean {
	const apple = isApplePlatform()

	const mod = apple ? event.metaKey : event.ctrlKey

	if (!mod || (apple ? event.ctrlKey : event.metaKey)) return false

	const key = event.key.toLowerCase()

	const redo = key === 'y' && !event.shiftKey

	if (!event.altKey && (key === 'z' || redo)) return true

	return WYSIWYG_ACTIONS.some((action) => {
		const { shift = false, alt = false, key: bound } = wysiwygActions[action].shortcut

		return shift === event.shiftKey && alt === event.altKey && bound.toLowerCase() === key
	})
}

/** The held item of a key. @internal */
function keyItem(event: KeyboardEvent): WysiwygEarlyItem {
	return {
		type: 'key',
		key: event.key,
		code: event.code,
		shiftKey: event.shiftKey,
		altKey: event.altKey,
		ctrlKey: event.ctrlKey,
		metaKey: event.metaKey,
	}
}

/** What the capture of a field reads from its field. @internal */
type EarlyCaptureOptions = {
	early: WysiwygEarlyInput
	/** Puts an input in the queue of the editor. */
	hold: (item: WysiwygEarlyItem) => void
	/** Fires before each edit that the browser makes in the markup. */
	onEdit: () => void
	/** Fires after each change of the markup. */
	onInput: (root: Element) => void
}

/**
 * Listens to the input of the markup of a field before the editor loads. The
 * browser makes each edit of the text in a text block, and the field holds
 * each other input ({@link WysiwygEarlyInput}).
 *
 * @returns The cleanup.
 * @internal
 */
export function captureEarlyInput(
	root: HTMLElement,
	{ early, hold, onEdit, onInput }: EarlyCaptureOptions,
): () => void {
	const beforeInput = (event: InputEvent) => {
		if (COMPOSITION.has(event.inputType)) return

		if (!early.held() && inPlace(root, event)) {
			onEdit()

			return
		}

		event.preventDefault()

		const item = readHeldInput(event)

		if (item) hold(item)
	}

	const keyDown = (event: KeyboardEvent) => {
		if (isComposing(event) || (event.key !== 'Enter' && !isEditorShortcut(event))) return

		event.preventDefault()

		hold(keyItem(event))
	}

	const paste = (event: ClipboardEvent) => {
		event.preventDefault()

		const text = event.clipboardData?.getData('text/plain') ?? ''

		const html = event.clipboardData?.getData('text/html') ?? ''

		if (text || html) hold({ type: 'paste', text, html })
	}

	// A drop before the editor loads does nothing.
	const drop = (event: DragEvent) => event.preventDefault()

	const compositionStart = () => {
		onEdit()

		early.compositionStart()
	}

	const compositionEnd = (event: CompositionEvent) => early.compositionEnd(root, event.data)

	const input = () => onInput(root)

	const listeners = [
		['beforeinput', beforeInput],
		['keydown', keyDown],
		['paste', paste],
		['drop', drop],
		['compositionstart', compositionStart],
		['compositionend', compositionEnd],
		['input', input],
	] as const

	for (const [type, listener] of listeners) root.addEventListener(type, listener as EventListener)

	return () => {
		for (const [type, listener] of listeners) {
			root.removeEventListener(type, listener as EventListener)
		}
	}
}
