'use client'

import { type FocusEvent, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import { lastInput } from '../../utilities/last-input'
import type { ChatCitation } from './engine/chat-content/types'

/**
 * One input that makes a citation active. `'click'` toggles it on a press.
 * `'hover'` makes it active while the pointer or the keyboard focus is on it.
 */
export type ChatCitationTriggerInput = 'click' | 'hover'

/**
 * The inputs that make a citation active: one input, or a list of them. With
 * `['hover', 'click']`, a hover or a focus previews the citation, and a press
 * keeps it.
 */
export type ChatCitationTrigger =
	| ChatCitationTriggerInput
	| readonly [ChatCitationTriggerInput, ...ChatCitationTriggerInput[]]

/**
 * The inputs of a trigger as one value, so that a memo can list it.
 * `'hover-click'` is a hover that previews and a press that keeps.
 *
 * @internal
 */
export type ChatCitationMode = 'click' | 'hover' | 'hover-click'

/**
 * Reads the mode of a trigger. A list with no input takes the click default.
 *
 * @internal
 */
export function toCitationMode(trigger: ChatCitationTrigger): ChatCitationMode {
	if (typeof trigger === 'string') return trigger

	const hover = trigger.includes('hover')

	if (!hover) return 'click'

	return trigger.includes('click') ? 'hover-click' : 'hover'
}

/** The input that holds a preview. */
type PreviewSource = 'pointer' | 'focus'

/**
 * A citation that a hover or a focus shows. `committed` is the citation that
 * comes back when the preview ends. `sources` are the inputs that still hold
 * the preview.
 */
type Preview = { id: string; committed: ChatCitation | null; sources: Set<PreviewSource> }

/** The calls that the pieces of a citation make, and the citation that is pressed. @internal */
export type ChatCitationActions = {
	/** The citation that `aria-pressed` shows: the committed citation, not a preview. */
	pressed: ChatCitation | null
	/** Starts a preview of `citation`, or adds a source to its preview. */
	preview: (citation: ChatCitation, source: PreviewSource) => void
	/** Removes a source from the preview of `citation`. The preview ends with its last source. */
	unpreview: (citation: ChatCitation, source: PreviewSource) => void
	/**
	 * Ends a preview and sends `null`, as Escape does. Returns `false` when no
	 * citation was active, so that Escape can go on to the surface that holds
	 * the chat.
	 */
	clear: () => boolean
	/** A click, Enter, or Space on `citation`. `touch` is true for a tap. */
	press: (citation: ChatCitation, touch: boolean) => void
}

/**
 * Whether a focus previews a citation. A keyboard focus previews it. The focus
 * that a click or a tap gives the span does not, as the focus ring does not
 * show for it.
 *
 * @internal
 */
export function focusPreviews(event: FocusEvent<HTMLElement>): boolean {
	if (lastInput() === 'touch') return false

	try {
		return event.currentTarget.matches(':focus-visible')
	} catch {
		return true
	}
}

/** Whether a tap made the last input, so a click is a tap. @internal */
export function lastInputIsTouch(): boolean {
	return lastInput() === 'touch'
}

/**
 * The trigger logic of {@link ChatCitationProvider}. It sends each change
 * through `onCitedChange`, so the app holds one value, `cited`.
 *
 * A preview keeps the committed citation, and the end of the preview sends it
 * again. Thus a hover never clears a citation that a press keeps. A preview
 * ends only when its last source ends, so a pointer that leaves a citation
 * with the keyboard focus on it keeps the preview.
 *
 * Escape clears the active citation in each mode, kept or previewed, as the
 * Clear control of a view does. The focus stays on the citation.
 *
 * Two pointer events can come before the app draws the last value that the
 * hook sent, as when the pointer moves from one citation to the next. The hook
 * thus reads the value that it sent until the next commit. Each send asks for
 * a render, and each commit forgets the sent value, so after a commit `cited`
 * is the truth. Thus an app that changes `cited` again, or that does not take
 * a sent value, does not leave a stale value.
 *
 * @internal
 */
export function useChatCitationTrigger(
	trigger: ChatCitationMode,
	cited: ChatCitation | null,
	onCitedChange: (citation: ChatCitation | null) => void,
): ChatCitationActions {
	const previewRef = useRef<Preview | null>(null)

	// The value that the hook sent since the last commit, or `null` when it sent none.
	const sentRef = useRef<{ value: ChatCitation | null } | null>(null)

	// A send asks for a render, so that a commit comes even when the app does
	// not take the value.
	const [, setSends] = useState(0)

	useLayoutEffect(() => {
		sentRef.current = null
	})

	// The preview that the render reads, for `pressed`. The ref holds the same
	// value for the events, which can come before the next render.
	const [shown, setShown] = useState<{ id: string; committed: ChatCitation | null } | null>(null)

	const setPreview = (next: Preview | null) => {
		previewRef.current = next

		setShown(next && { id: next.id, committed: next.committed })
	}

	const current = useStableEvent((): ChatCitation | null => {
		const sent = sentRef.current

		return sent ? sent.value : cited
	})

	const send = useStableEvent((next: ChatCitation | null) => {
		const now = current()

		if (now?.id === next?.id) return

		sentRef.current = { value: next }

		setSends((count) => count + 1)

		onCitedChange(next)
	})

	const end = useStableEvent((preview: Preview) => {
		setPreview(null)

		// The app can change `cited` during the preview, as a pick in a view does.
		// Then the preview is not on screen, and its end sends nothing.
		if (current()?.id === preview.id) send(preview.committed)
	})

	const preview = useStableEvent((citation: ChatCitation, source: PreviewSource) => {
		if (trigger === 'click') return

		const open = previewRef.current

		if (open?.id === citation.id) {
			open.sources.add(source)

			return
		}

		// A move from one preview to the next keeps the committed citation of the
		// first, because the citation on screen is a preview.
		const committed = open && current()?.id === open.id ? open.committed : current()

		setPreview({ id: citation.id, committed, sources: new Set([source]) })

		send(citation)
	})

	const unpreview = useStableEvent((citation: ChatCitation, source: PreviewSource) => {
		const open = previewRef.current

		if (open?.id !== citation.id) return

		open.sources.delete(source)

		if (open.sources.size === 0) end(open)
	})

	const clear = useStableEvent((): boolean => {
		const open = previewRef.current

		if (open === null && current() === null) return false

		if (open !== null) setPreview(null)

		send(null)

		return true
	})

	const press = useStableEvent((citation: ChatCitation, touch: boolean) => {
		// A touch screen has no hover, so a tap toggles the citation in each mode.
		if (trigger === 'hover' && !touch) return

		const open = previewRef.current

		if (open?.id === citation.id) {
			// The preview stays on screen. The press changes what its end sends.
			setPreview({
				...open,
				committed: open.committed?.id === citation.id ? null : citation,
			})

			return
		}

		send(current()?.id === citation.id ? null : citation)
	})

	const pressed = shown && cited?.id === shown.id ? shown.committed : cited

	return useMemo(
		() => ({ pressed, preview, unpreview, clear, press }),
		[pressed, preview, unpreview, clear, press],
	)
}
