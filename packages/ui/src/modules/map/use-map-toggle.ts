'use client'

import { useCallback, useState } from 'react'

/** The legend's switchboard state, keyed by legend id. @internal */
export type MapToggle = {
	/** Legend ids toggled off. */
	hidden: ReadonlySet<string>
	/** Toggles an id on or off. */
	toggle: (id: string) => void
	/** Moves the legend emphasis (`null` clears it). */
	setFocus: (id: string | null) => void
	/** The emphasised id while it is still visible; other marks dim against it. */
	emphasis: string | null
}

/**
 * Owns the map legend's interactions: which entries — region categories and
 * overlays alike — are toggled off, and which one is emphasised by a hovered
 * or focused legend entry. The chart's series switchboard re-keyed by string
 * id, since the map's legend merges two entry sources. A hidden entry can't
 * hold the emphasis — dimming everything against an invisible entry would
 * read as a broken map.
 *
 * @internal
 */
export function useMapToggle(): MapToggle {
	const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set())

	const [focus, setFocus] = useState<string | null>(null)

	const toggle = useCallback((id: string) => {
		setHidden((current) => {
			const next = new Set(current)

			if (next.has(id)) {
				next.delete(id)
			} else {
				next.add(id)
			}

			return next
		})
	}, [])

	return {
		hidden,
		toggle,
		setFocus,
		emphasis: focus !== null && !hidden.has(focus) ? focus : null,
	}
}
