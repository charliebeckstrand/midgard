'use client'

import { type FocusEvent, useMemo, useRef } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import { lastInput } from '../../utilities/last-input'
import type { ChatCitation } from './engine/chat-content/types'

/**
 * One input that shows a citation. `'click'` toggles the cited citation on a
 * press. `'hover'` previews the citation while the pointer or the keyboard
 * focus is on it.
 */
export type ChatCitationTriggerInput = 'click' | 'hover'

/**
 * The inputs that show a citation: one input, or a list of them. With
 * `['hover', 'click']`, a hover or a focus previews the citation, and a press
 * cites it.
 */
export type ChatCitationTrigger =
	| ChatCitationTriggerInput
	| readonly [ChatCitationTriggerInput, ...ChatCitationTriggerInput[]]

/**
 * The inputs of a trigger as one value, so that a memo can list it.
 * `'hover-click'` is a hover that previews and a press that cites.
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

/** The previewed citation, and the inputs that still hold the preview. */
type Preview = { citation: ChatCitation; sources: Set<PreviewSource> }

/** The calls that the pieces of a citation make. @internal */
export type ChatCitationActions = {
	/** Starts a preview of `citation`, or adds a source to its preview. */
	preview: (citation: ChatCitation, source: PreviewSource) => void
	/** Removes a source from the preview of `citation`. The preview ends with its last source. */
	unpreview: (citation: ChatCitation, source: PreviewSource) => void
	/** Ends the preview of the citation `id`, as Escape or an unmount does. */
	dismiss: (id: string) => void
	/**
	 * Ends a preview, and sends `null` through `onCitedChange` when a citation
	 * is cited, as Escape does. Returns `false` when it had nothing to clear, so
	 * that Escape can go on to the surface that holds the chat.
	 */
	clear: () => boolean
	/**
	 * A click, a tap, Enter, or Space on `citation`. `hoverless` is true for an
	 * input that cannot hover: a tap or a key.
	 */
	press: (citation: ChatCitation, hoverless: boolean) => void
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
 * The trigger logic of {@link ChatCitationProvider}. A press toggles `cited`
 * through `onCitedChange`. A hover or a keyboard focus sends a preview through
 * `onPreviewChange`, and never changes `cited`.
 *
 * A preview ends only when its last source ends, so a pointer that leaves a
 * citation with the keyboard focus on it keeps the preview. The hook keeps the
 * preview in a ref, because two pointer events can come before a render.
 *
 * Escape clears both, as the Clear control of a view clears `cited`. The focus
 * stays on the citation.
 *
 * @internal
 */
export function useChatCitationTrigger(
	trigger: ChatCitationMode,
	cited: ChatCitation | null,
	onCitedChange: (citation: ChatCitation | null) => void,
	onPreviewChange: ((citation: ChatCitation | null) => void) | undefined,
): ChatCitationActions {
	const previewRef = useRef<Preview | null>(null)

	const end = useStableEvent(() => {
		previewRef.current = null

		onPreviewChange?.(null)
	})

	const preview = useStableEvent((citation: ChatCitation, source: PreviewSource) => {
		if (trigger === 'click') return

		const open = previewRef.current

		if (open?.citation.id === citation.id) {
			open.sources.add(source)

			return
		}

		previewRef.current = { citation, sources: new Set([source]) }

		onPreviewChange?.(citation)
	})

	const unpreview = useStableEvent((citation: ChatCitation, source: PreviewSource) => {
		const open = previewRef.current

		if (open?.citation.id !== citation.id) return

		open.sources.delete(source)

		if (open.sources.size === 0) end()
	})

	const dismiss = useStableEvent((id: string) => {
		if (previewRef.current?.citation.id === id) end()
	})

	const clear = useStableEvent((): boolean => {
		const previewing = previewRef.current !== null

		if (previewing) end()

		if (cited !== null) onCitedChange(null)

		return previewing || cited !== null
	})

	const press = useStableEvent((citation: ChatCitation, hoverless: boolean) => {
		// A tap and a key cannot hover, so they toggle the citation in each mode.
		// A citation is then a toggle button that a press changes.
		if (trigger === 'hover' && !hoverless) return

		onCitedChange(cited?.id === citation.id ? null : citation)
	})

	return useMemo(
		() => ({ preview, unpreview, dismiss, clear, press }),
		[preview, unpreview, dismiss, clear, press],
	)
}
