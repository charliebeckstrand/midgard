'use client'

import {
	type KeyboardEvent,
	type RefObject,
	useCallback,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { announce } from '../../core/announcer'
import {
	clearVirtualActive,
	seedVirtualTopMatch,
	useA11yRoving,
} from '../../hooks/a11y/use-a11y-roving'
import { useFloatingUI } from '../../hooks/use-floating-ui'
import { useStableEvent } from '../../hooks/use-stable-event'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { isComposing } from '../../utilities/is-composing'
import { hasBrowserModifier } from '../../utilities/modifier-keys'
import { randomId } from '../../utilities/random-id'
import type { ChatCitation } from './engine/chat-content/types'
import { activeTrigger, chooseInTrigger, type TriggerMatch } from './engine/chat-draft/trigger'
import type { ChatPromptItem, ChatPromptSource } from './types'

const messages = defineMessages<{ added: { label: string; source: string } }>({
	added: {
		id: 'ui.chat.pickerAdded',
		defaultMessage: 'Added {label}, {source}',
		description:
			'Spoken when the reader chooses an item in the picker of the chat composer. The label is the choice, such as "Late stops", and the source names its list, such as "Datasets".',
	},
})

/** The selector of an option that the keys can reach. @internal */
export const PICKER_OPTION = '[role="option"]:not([data-disabled])'

/** Where the search of the open picker is. @internal */
export type PickerStatus = 'loading' | 'ready' | 'failed'

/** The result of the last search, and the source that it is for. @internal */
type PickerResults = {
	source: number
	status: PickerStatus
	items: readonly ChatPromptItem[]
}

const NO_RESULTS: PickerResults = { source: -1, status: 'ready', items: [] }

/** Options for {@link useChatPromptPicker}. @internal */
export type ChatPromptPickerOptions = {
	sources: readonly ChatPromptSource[] | undefined
	value: string
	citations: readonly ChatCitation[]
	textareaRef: RefObject<HTMLTextAreaElement | null>
	onValueChange: (value: string, citations: readonly ChatCitation[]) => void
}

/**
 * The state and the keys of the picker that a trigger character opens in
 * `ChatPrompt`.
 *
 * @remarks
 * The picker is open while the caret is in a trigger, and until the reader
 * dismisses it. A dismissal holds for that trigger: the picker opens again at
 * the next trigger.
 *
 * The textarea keeps the focus. The options are its active descendant, through
 * the virtual mode of `useA11yRoving`, as the options of a combobox are. A
 * `<textarea>` cannot take the `combobox` role, so it keeps its textbox role,
 * with `aria-autocomplete`, `aria-haspopup`, and `aria-controls`.
 *
 * A choice goes in through `execCommand('insertText')`, so it is on the undo
 * stack of the browser. Where the command does nothing, the draft takes the
 * choice from `onValueChange` alone.
 *
 * @internal
 */
export function useChatPromptPicker({
	sources,
	value,
	citations,
	textareaRef,
	onValueChange,
}: ChatPromptPickerOptions) {
	const intl = useIntl()

	const listId = useId()

	// The offset of a collapsed selection while the textarea has the focus.
	const [caret, setCaret] = useState<number | null>(null)

	const [dismissed, setDismissed] = useState<number | null>(null)

	const match: TriggerMatch | null =
		sources && sources.length > 0 && caret !== null
			? activeTrigger(value, caret, sources, citations)
			: null

	// A dismissal holds for one trigger. With no trigger, it goes.
	if (match === null && dismissed !== null) setDismissed(null)

	const open = match !== null && dismissed !== match.start

	const matchSource = open ? match.index : -1

	const matchQuery = open ? match.query : ''

	const [results, setResults] = useState<PickerResults>(NO_RESULTS)

	const search = useStableEvent((index: number, query: string, signal: AbortSignal) =>
		sources?.[index]?.search(query, signal),
	)

	// A layout effect, so the items of a source that answers at once land before
	// the paint, and the list does not show "Loading" for one frame.
	useLayoutEffect(() => {
		if (matchSource === -1) return

		const controller = new AbortController()

		let result: ReturnType<typeof search>

		try {
			result = search(matchSource, matchQuery, controller.signal)
		} catch {
			setResults({ source: matchSource, status: 'failed', items: [] })

			return
		}

		if (result === undefined || Array.isArray(result)) {
			setResults({ source: matchSource, status: 'ready', items: result ?? [] })

			return
		}

		// The items of the last query stay while the next one loads, so the list does not blink.
		setResults((prev) => ({
			source: matchSource,
			status: 'loading',
			items: prev.source === matchSource ? prev.items : [],
		}))

		Promise.resolve(result).then(
			(items) => {
				if (!controller.signal.aborted) setResults({ source: matchSource, status: 'ready', items })
			},
			() => {
				if (!controller.signal.aborted) {
					setResults({ source: matchSource, status: 'failed', items: [] })
				}
			},
		)

		// The next query aborts this search, so its result has no reader.
		return () => controller.abort()
	}, [matchSource, matchQuery, search])

	const listRef = useRef<HTMLDivElement>(null)

	const activeIndexRef = useRef(-1)

	const rove = useA11yRoving(listRef, {
		mode: 'virtual',
		itemSelector: PICKER_OPTION,
		activeDescendantRef: textareaRef,
		activationKey: null,
		enabled: open,
	})

	// The panel sits over the composer, and not over the caret.
	const floating = useFloatingUI({
		open,
		onOpenChange: (next) => {
			if (!next && match) setDismissed(match.start)
		},
		placement: 'top-start',
		matchReferenceWidth: true,
		fitHeight: true,
		role: null,
	})

	const { setReference } = floating.refs

	useLayoutEffect(() => {
		const textarea = textareaRef.current

		setReference(textarea?.closest<HTMLElement>('[data-slot="control-frame"]') ?? textarea)
	}, [setReference, textareaRef])

	const items = results.source === matchSource ? results.items : []

	// The top match takes the highlight each time the items change, so Enter
	// chooses what the reader sees first.
	useLayoutEffect(() => {
		if (!open) {
			clearVirtualActive(textareaRef)

			return
		}

		if (items.length === 0) return

		seedVirtualTopMatch(listRef.current, PICKER_OPTION, null, activeIndexRef, textareaRef)
	}, [open, items, textareaRef])

	// The caret after a choice. The draft takes the choice in the next render,
	// so the caret goes there after it.
	const pendingCaret = useRef<number | null>(null)

	useLayoutEffect(() => {
		const textarea = textareaRef.current

		const next = pendingCaret.current

		if (!textarea || next === null || textarea.value !== value) return

		pendingCaret.current = null

		textarea.setSelectionRange(next, next)

		setCaret(next)
	}, [value, textareaRef])

	const choose = useStableEvent((item: ChatPromptItem) => {
		const textarea = textareaRef.current

		const source = match && sources?.[match.index]

		if (!textarea || !match || !source) return

		const choice = chooseInTrigger(value, citations, match, source.trigger, item.label, {
			id: randomId(),
			target: source.target,
			selector: item.selector,
		})

		// The command puts the text on the undo stack. Its input event reaches the
		// composer first, and the call after it adds the citation.
		textarea.setSelectionRange(match.start, choice.tail)

		insertText(choice.text)

		onValueChange(choice.value, choice.citations)

		pendingCaret.current = choice.caret

		announce(intl.formatMessage(messages.added, { label: item.label, source: source.label }))
	})

	/** The item that has the highlight, or `undefined`. */
	const activeItem = useCallback((): ChatPromptItem | undefined => {
		const index = listRef.current?.querySelector<HTMLElement>('[data-active]')?.dataset.index

		return index === undefined ? undefined : items[Number(index)]
	}, [items])

	/**
	 * Handles a key of the textarea while the picker is open. It gives `true`
	 * for a key that the picker took, and the composer then does nothing more.
	 */
	const onKeyDown = useCallback(
		(event: KeyboardEvent<HTMLTextAreaElement>): boolean => {
			if (!open || isComposing(event)) return false

			if (hasBrowserModifier(event) || event.shiftKey) return false

			if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
				event.preventDefault()

				rove(event)

				return true
			}

			if (event.key === 'Enter' || event.key === 'Tab') {
				const item = activeItem()

				if (!item) return false

				event.preventDefault()

				choose(item)

				return true
			}

			return false
		},
		[open, rove, activeItem, choose],
	)

	const hasSources = sources !== undefined && sources.length > 0

	/**
	 * Records the caret of the textarea. Call it on a change, a selection, and a
	 * focus. A composer with no source holds no caret, because nothing reads it.
	 */
	const trackCaret = useCallback(
		(textarea: HTMLTextAreaElement) => {
			if (!hasSources) return

			setCaret(textarea.selectionStart === textarea.selectionEnd ? textarea.selectionEnd : null)
		},
		[hasSources],
	)

	const forgetCaret = useCallback(() => setCaret(null), [])

	const source = match ? sources?.[match.index] : undefined

	return {
		open,
		listId,
		listRef,
		source,
		items,
		status: results.source === matchSource ? results.status : ('loading' as const),
		floating,
		choose,
		onKeyDown,
		trackCaret,
		forgetCaret,
	}
}

/**
 * Inserts `text` at the selection of the focused field, through the command
 * that puts the change on the undo stack. A browser that has no such command,
 * such as jsdom, changes nothing, and the draft takes the change from the
 * caller.
 *
 * @internal
 */
function insertText(text: string): void {
	try {
		document.execCommand?.('insertText', false, text)
	} catch {
		// The draft takes the change from `onValueChange`.
	}
}
