'use client'

import { type RefObject, useEffect, useEffectEvent, useRef } from 'react'
import { announce } from '../../core'

/** Options for {@link useAnnounceOnAppear}. @internal */
export type AnnounceOnAppearOptions = {
	/**
	 * Whether a message that is shown at mount counts as one that appears.
	 * @defaultValue false
	 */
	onMount?: boolean
	/**
	 * Whether the hook announces. The hook records each change of `shown` also
	 * while this is false, so an announcement starts only at the next appearance.
	 * @defaultValue true
	 */
	enabled?: boolean
}

/**
 * Sends a message to the shared polite announcer when `shown` changes from
 * false to true. A screen reader can miss a live region that the page inserts
 * together with its text (WCAG 4.1.3). The shared announcer is in the page
 * before the text, so the screen reader speaks the change.
 *
 * `source` is the text, or a ref to the element whose trimmed text content is
 * the message. The hook reads the ref after the commit, so the message is the
 * text that the page shows.
 *
 * @internal
 */
export function useAnnounceOnAppear(
	source: RefObject<HTMLElement | null> | string | undefined,
	shown: boolean,
	{ onMount = false, enabled = true }: AnnounceOnAppearOptions = {},
): void {
	const wasShown = useRef(shown && !onMount)

	// An effect event: the message is read when `shown` changes, not when
	// `source` changes, so the effect does not key on it.
	const readMessage = useEffectEvent(() =>
		typeof source === 'string' ? source : source?.current?.textContent?.trim(),
	)

	useEffect(() => {
		const appeared = shown && !wasShown.current

		wasShown.current = shown

		if (!appeared || !enabled) return

		const message = readMessage()

		if (message) announce(message)
	}, [shown, enabled])
}
