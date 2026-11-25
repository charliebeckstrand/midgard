'use client'

import { type RefObject, useCallback, useId, useLayoutEffect, useRef, useState } from 'react'
import { announce } from '../../core/announcer'
import { useA11yAnnouncements } from '../../hooks/a11y/use-a11y-announcements'
import {
	clearVirtualActive,
	type RovingKeyEvent,
	seedVirtualTopMatch,
	useA11yRoving,
} from '../../hooks/a11y/use-a11y-roving'
import { useStableEvent } from '../../hooks/use-stable-event'
import { defineMessages, intlMessages } from '../../primitives/intl/intl-messages'
import type { IntlShape } from '../../primitives/intl/types'
import { useIntl } from '../../primitives/intl/use-intl'
import { isComposing } from '../../utilities/is-composing'
import { hasBrowserModifier } from '../../utilities/modifier-keys'
import { noop } from '../../utilities/noop'
import { randomId } from '../../utilities/random-id'
import type { ChatCitation } from './engine/chat-content/types'
import {
	activeTrigger,
	chooseInTrigger,
	type TriggerAnchor,
	type TriggerChoice,
	type TriggerMatch,
} from './engine/chat-draft/trigger'
import type { ChatPromptItem, ChatPromptSource } from './types'

const messages = defineMessages<{
	added: { label: string; source: string }
	loading: Record<never, never>
	failed: Record<never, never>
}>({
	loading: {
		id: 'ui.chat.pickerLoading',
		defaultMessage: 'Loading',
		description: 'The status of the picker of the chat composer while it loads its choices.',
	},
	failed: {
		id: 'ui.chat.pickerFailed',
		defaultMessage: 'Could not load the choices',
		description: 'The status of the picker of the chat composer when its choices failed to load.',
	},
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
	/**
	 * The trigger that the results are for: its source and its offset. The
	 * items of one trigger stay while its next query loads, and the items of
	 * another trigger never show. No key chooses an item that stays while the
	 * list loads, so an early Enter cannot choose an item of an earlier query.
	 */
	trigger: string
	status: PickerStatus
	items: readonly ChatPromptItem[]
}

/** The trigger offset and the draft at a dismissal of the picker. @internal */
type Dismissal = { start: number; value: string }

/** The trigger of a citation that a Backspace dissolves, and the draft before the key. @internal */
type PendingAnchor = { anchor: TriggerAnchor; value: string }

/** The items of a trigger with no result. @internal */
const NO_ITEMS: readonly ChatPromptItem[] = []

const NO_RESULTS: PickerResults = { trigger: '', status: 'ready', items: NO_ITEMS }

/**
 * The text that the picker reads, and the caret in it. The offsets of the
 * citations and of the caret are offsets of `value`.
 *
 * @internal
 */
export type PickerDraft = {
	value: string
	citations: readonly ChatCitation[]
	/** The offset of the collapsed selection. */
	caret: number
}

/**
 * The field of a picker: the textarea of the composer, or its formatted field.
 *
 * @internal
 */
export type PickerField = {
	/** The text at the caret, or `null` while the field has no focus or no collapsed selection. */
	draft: PickerDraft | null
	/** The element that has the focus. The options are its active descendant. */
	elementRef: RefObject<HTMLElement | null>
	/** Puts a choice in the field, in place of the word of the trigger. */
	write: (choice: TriggerChoice) => void
}

/** The parts of a key press that the picker reads, from a React or a DOM event. @internal */
export type PickerKeyEvent = RovingKeyEvent & Parameters<typeof isComposing>[0]

/** Options for {@link useChatPromptPicker}. @internal */
export type ChatPromptPickerOptions = {
	sources: readonly ChatPromptSource[] | undefined
	field: PickerField
}

/** The draft of a field with no caret, which opens no picker. @internal */
const NO_DRAFT: Omit<PickerDraft, 'caret'> & { caret: null } = {
	value: '',
	citations: [],
	caret: null,
}

/**
 * The state and the keys of the picker that a trigger character opens in
 * `ChatPrompt`.
 *
 * @remarks
 * The picker is open while the caret is in a trigger, and until the reader
 * dismisses it. A dismissal holds only while the draft stays the same: the
 * next character or Backspace opens the picker again.
 *
 * A Backspace at the end of a citation deletes one character, as in prose.
 * The citation dissolves, and the picker opens again at its trigger, with the
 * rest of its label as the query. That query can hold the spaces of the
 * label. It ends where any query ends: at a space after the words of the
 * label, or with the caret before the trigger.
 *
 * The field keeps the focus. The options are its active descendant, through
 * the virtual mode of `useA11yRoving`, as the options of a combobox are. A
 * textbox cannot take the `combobox` role, so it keeps its role, with
 * `aria-autocomplete`, `aria-haspopup`, and `aria-controls`.
 *
 * The picker reads the text of the field and writes a choice through a
 * {@link PickerField}, so it works on each field of the composer.
 *
 * The panel (`ChatPromptPicker`) places itself, and it calls `dismiss` on a
 * press outside it. Thus a key in the field while the picker is closed does no
 * work of placement.
 *
 * @internal
 */
export function useChatPromptPicker({ sources, field }: ChatPromptPickerOptions) {
	const intl = useIntl()

	const listId = useId()

	const { draft, elementRef } = field

	const { value, citations, caret } = draft ?? NO_DRAFT

	// The trigger and the draft at a dismissal.
	const [dismissed, setDismissed] = useState<Dismissal | null>(null)

	const { anchor, setAnchor, recordKey } = useDissolvedAnchor(draft)

	const { match, anchored } = findTrigger(value, caret, sources, citations, anchor)

	// An anchor holds while the caret is in its query. With no anchored trigger, it goes.
	if (anchor !== null && !anchored) setAnchor(null)

	// A dismissal holds while the caret stays in its trigger and the draft stays the same.
	const held = dismissed !== null && dismissed.start === match?.start && dismissed.value === value

	if (dismissed !== null && !held) setDismissed(null)

	const open = match !== null && !held

	const matchSource = open ? match.index : -1

	const matchTrigger = open ? `${match.index}:${match.start}` : ''

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
			setResults({ trigger: matchTrigger, status: 'failed', items: [] })

			return
		}

		if (result === undefined || Array.isArray(result)) {
			setResults({ trigger: matchTrigger, status: 'ready', items: result ?? [] })

			return
		}

		// The items of the last query stay while the next one loads, so the list does not blink.
		setResults((prev) => ({
			trigger: matchTrigger,
			status: 'loading',
			items: prev.trigger === matchTrigger ? prev.items : [],
		}))

		Promise.resolve(result).then(
			(items) => {
				if (!controller.signal.aborted)
					setResults({ trigger: matchTrigger, status: 'ready', items })
			},
			() => {
				if (!controller.signal.aborted) {
					setResults({ trigger: matchTrigger, status: 'failed', items: [] })
				}
			},
		)

		// The next query aborts this search, so its result has no reader.
		return () => controller.abort()
	}, [matchSource, matchTrigger, matchQuery, search])

	const listRef = useRef<HTMLDivElement>(null)

	const activeIndexRef = useRef(-1)

	const rove = useA11yRoving(listRef, {
		mode: 'virtual',
		itemSelector: PICKER_OPTION,
		activeDescendantRef: elementRef,
		activationKey: null,
		enabled: open,
	})

	// A dismissal of the panel, such as a press outside it, holds the trigger closed.
	const dismiss = useStableEvent(() => {
		if (match) setDismissed({ start: match.start, value })
	})

	// One empty list for each render with no items of the trigger, so the panel,
	// which is memoized, does not render again for a new empty list.
	const items = results.trigger === matchTrigger ? results.items : NO_ITEMS

	// A trigger that has no result yet loads.
	const status: PickerStatus = results.trigger === matchTrigger ? results.status : 'loading'

	const statusText = open ? pickerStatusText(intl, status, items) : ''

	// The panel mounts with each open, and a screen reader does not speak the text
	// of a new live region. The shared announcer stays mounted, so it speaks each
	// change of the status.
	useA11yAnnouncements(statusText)

	// The top match takes the highlight each time the items change, so Enter
	// chooses what the reader sees first.
	useLayoutEffect(() => {
		if (!open) {
			clearVirtualActive(elementRef)

			return
		}

		if (items.length === 0) return

		seedVirtualTopMatch(listRef.current, PICKER_OPTION, null, activeIndexRef, elementRef)
	}, [open, items, elementRef])

	const choose = useStableEvent((item: ChatPromptItem) => {
		const source = match && sources?.[match.index]

		if (!match || !source) return

		field.write(
			chooseInTrigger(value, citations, match, source.trigger, item.label, {
				id: randomId(),
				target: source.target,
				selector: item.selector,
			}),
		)

		announce(intl.formatMessage(messages.added, { label: item.label, source: source.label }))
	})

	/** The item that has the highlight, or `undefined`. */
	const activeItem = useCallback((): ChatPromptItem | undefined => {
		const index = listRef.current?.querySelector<HTMLElement>('[data-active]')?.dataset.index

		return index === undefined ? undefined : items[Number(index)]
	}, [items])

	/**
	 * Handles a key of the field. It gives `true` for a key that the open picker
	 * took, and the composer then does nothing more.
	 */
	const onKeyDown = useCallback(
		(event: PickerKeyEvent): boolean => {
			recordKey(event)

			if (!open || isComposing(event) || hasBrowserModifier(event) || event.shiftKey) return false

			if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
				// With no option to move to, the arrow moves the caret between lines.
				return takeKey(event, Boolean(listRef.current?.querySelector(PICKER_OPTION)), rove)
			}

			if (event.key === 'Enter' || event.key === 'Tab') {
				// While the list loads, its items answer an earlier query or there
				// are none, so no key chooses. The key then does nothing: Enter does
				// not send a draft that the reader meant to complete, and Tab does
				// not move the focus out of the composer.
				if (status === 'loading') return takeKey(event, true, noop)

				const item = activeItem()

				return takeKey(event, item !== undefined, () => item && choose(item))
			}

			return false
		},
		[open, rove, activeItem, choose, recordKey, status],
	)

	const source = match ? sources?.[match.index] : undefined

	return {
		open,
		listId,
		listRef,
		source,
		items,
		status,
		statusText,
		elementRef,
		dismiss,
		choose,
		onKeyDown,
	}
}

/**
 * The trigger of a citation that a Backspace at its end dissolved. The keydown
 * records it with `recordKey`, and the change of the draft that the key makes
 * sets it. The caller clears it with `setAnchor` when no trigger is at it.
 *
 * @internal
 */
function useDissolvedAnchor(draft: PickerDraft | null) {
	const [anchor, setAnchor] = useState<TriggerAnchor | null>(null)

	const [pending, setPending] = useState<PendingAnchor | null>(null)

	if (pending !== null && draft !== null && draft.value !== pending.value) {
		setAnchor(pending.anchor)

		setPending(null)
	}

	const recordKey = useCallback(
		(event: PickerKeyEvent) => {
			const dissolved = draft && dissolvedTrigger(event, draft)

			setPending(dissolved ? { anchor: dissolved, value: draft.value } : null)
		},
		[draft],
	)

	return { anchor, setAnchor, recordKey }
}

/**
 * The status line of the open picker: that the list loads, that it holds no
 * item, or that it failed. A failure always shows. Else the status shows only
 * while the list is empty.
 *
 * @internal
 */
function pickerStatusText(
	intl: IntlShape,
	status: PickerStatus,
	items: readonly ChatPromptItem[],
): string {
	if (status === 'failed') return intl.formatMessage(messages.failed)

	if (items.length > 0) return ''

	return intl.formatMessage(status === 'loading' ? messages.loading : intlMessages.noResults)
}

/**
 * The trigger that the caret is in, and whether it is at the anchor. A trigger
 * at the anchor comes first.
 *
 * @internal
 */
function findTrigger(
	value: string,
	caret: number | null,
	sources: readonly ChatPromptSource[] | undefined,
	citations: readonly ChatCitation[],
	anchor: TriggerAnchor | null,
): { match: TriggerMatch | null; anchored: boolean } {
	if (!sources || sources.length === 0 || caret === null) return { match: null, anchored: false }

	const anchored = anchor === null ? null : activeTrigger(value, caret, sources, citations, anchor)

	if (anchored) return { match: anchored, anchored: true }

	return { match: activeTrigger(value, caret, sources, citations), anchored: false }
}

/**
 * The anchor of the citation that a Backspace at its end dissolves, or `null`
 * for any other key. A Backspace with a modifier deletes more than one
 * character, so it does not count.
 *
 * @internal
 */
function dissolvedTrigger(event: PickerKeyEvent, draft: PickerDraft): TriggerAnchor | null {
	if (event.key !== 'Backspace' || hasBrowserModifier(event) || isComposing(event)) return null

	const citation = draft.citations.find((c) => c.end === draft.caret)

	return citation ? { start: citation.start, quote: citation.quote } : null
}

/**
 * Takes a key for the picker when `taken`: cancels its default and runs `run`.
 * A key that the picker does not take stays with the field.
 *
 * @internal
 * @returns Whether the picker took the key.
 */
function takeKey<E extends PickerKeyEvent>(
	event: E,
	taken: boolean,
	run: (event: E) => void,
): boolean {
	if (!taken) return false

	event.preventDefault()

	run(event)

	return true
}
