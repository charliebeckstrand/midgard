'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMediaQuery } from '../../hooks/use-media-query'
import { toggleItem } from '../../utilities'
import { REGION_FADE } from './engine/map-motion'

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
 * @remarks Nor can an entry still arriving. Under `animate` a toggled-on entry
 * washes its colour back in, and the emphasis would cover that wash the moment
 * it landed: the layer recedes and the emphasised marks redraw above it at full
 * strength, painted at the colour the marks beneath are still travelling to. The
 * toggle that turned it on is also the click that put the pointer on its legend
 * entry, so the two always coincide — and the wash would never be seen in that
 * direction, where toggling off (which clears the emphasis by hiding the entry)
 * plays in the open. So the emphasis waits out one fade, and the entry arrives
 * before the map dims around it.
 *
 * The wait is the region wash's, because the region layer is the only thing an
 * emphasis paints a copy over: an overlay's marks unmount when hidden, so a
 * toggled-on overlay has nothing dimmed underneath to cover, and it rides the
 * same wait only because one legend drives both. Held for the fade alone, not
 * the reveal's fade-plus-stagger, since the stagger retires with the reveal that
 * owns it ({@link MapWash}).
 *
 * It is skipped where there is no wash to protect: a static map, and a
 * reduced-motion reader, whose `motion-reduce` fallback drops the transition, so
 * the colour is already there and the wait would be dead time. That preference
 * is read live rather than sampled at mount, so turning it on mid-session takes
 * effect on the next toggle.
 *
 * @param animate - Whether the plat animates, so a toggle has a wash to wait for.
 * @internal
 */
export function useMapToggle(animate: boolean): MapToggle {
	const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set())

	const [focus, setFocus] = useState<string | null>(null)

	const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

	const washes = animate && !reducedMotion

	/** Whether a toggle's wash is still running, holding the emphasis off. */
	const [washing, setWashing] = useState(false)

	// Re-armed per toggle rather than keyed off the flag, so toggling twice inside
	// one fade holds for the second wash instead of clearing on the first one's
	// timer. The wheel settle in `use-map-zoom` re-arms the same way.
	const settle = useRef<ReturnType<typeof setTimeout>>(undefined)

	useEffect(() => () => clearTimeout(settle.current), [])

	const toggle = useCallback(
		(id: string) => {
			// Only the way back on has a wash to protect. Hiding an entry drops the
			// emphasis on its own — a hidden entry can't hold one — so the hold could
			// change nothing there, and arming it would spend a timer and the render
			// that ends it for a beat no one can see.
			const restoring = hidden.has(id)

			setHidden((current) => toggleItem(current, id))

			if (!washes || !restoring) return

			setWashing(true)

			clearTimeout(settle.current)

			settle.current = setTimeout(() => setWashing(false), REGION_FADE.duration * 1000)
		},
		[hidden, washes],
	)

	return {
		hidden,
		toggle,
		setFocus,
		emphasis: focus !== null && !hidden.has(focus) && !washing ? focus : null,
	}
}
