'use client'

import { type ReactNode, useId } from 'react'
import { useAriaIds } from '../../hooks'

/**
 * The text that a field puts in one affix slot to tell about its value, such
 * as a currency symbol or a card brand. Focus mode does not read text in an
 * affix, so the text also describes the input.
 *
 * @param text - The text to show. `undefined` shows nothing.
 * @param slot - The affix that the caller gives for the same slot. Any value
 * other than `undefined`, `null` included, replaces the text.
 * @param describedBy - The `aria-describedby` of the caller.
 * @returns The `node` for the slot, and the `describedBy` that adds the id of
 * the text while the text shows.
 * @internal
 */
export function useInputAffixText(
	text: string | undefined,
	slot: ReactNode,
	describedBy: string | undefined,
) {
	const id = useId()

	const shows = slot === undefined && text !== undefined

	return {
		node: shows ? <span id={id}>{text}</span> : slot,
		describedBy: useAriaIds(shows && id, describedBy),
	}
}
