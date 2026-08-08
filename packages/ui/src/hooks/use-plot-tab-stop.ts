'use client'

import { type FocusEvent, useEffect, useRef } from 'react'

/**
 * The exit half of a navigable plot region, shared by the chart and map
 * keyboard cursors: how Escape leaves, and what leaving clears.
 *
 * Both modules make their `role="img"` plot one arrow-navigable tab stop over a
 * cursor of their own — a chart's category and value axes, a map's compass
 * wedges — but the way a reader gets out is the same in each, and it is the
 * subtlest part: Escape must drop focus AND reclaim the following Tab, or the
 * blur strands the reader and the next Tab steps to the control after the plot
 * rather than back onto the plot they just left. Held here so the rule has one
 * home, and a correction to it can never land in one module alone.
 *
 * @internal
 */
export type PlotTabStop = {
	/**
	 * Leaves the region on Escape: clears the readout, drops focus to the body,
	 * then arms the next forward Tab to return here. The catch cedes the Tab on
	 * any other exit — a Shift+Tab, or a click that moved focus elsewhere — so it
	 * only ever reclaims a reader who is still where Escape left them.
	 */
	exit: (region: HTMLElement) => void
	/**
	 * Clears the cursor when focus leaves the region for good. A blur that stays
	 * inside it is not a real exit, and a focus that never navigated (a click,
	 * with the pointer owning the readout) leaves that readout untouched.
	 */
	onBlur: (event: FocusEvent<HTMLElement>) => void
}

/**
 * The shared exit behaviour for a plot region that is one keyboard tab stop.
 *
 * @param navigated - Whether a cursor is live, so a blur that never navigated leaves the pointer's readout alone.
 * @param clear - Drops the cursor and its readout.
 * @internal
 */
export function usePlotTabStop(navigated: boolean, clear: () => void): PlotTabStop {
	// The pending "return the next Tab to the region" listener's remover, cleared
	// when it fires or the hook unmounts. Escape drops focus to the body, so a
	// document-level catch is the only way to reclaim the following Tab.
	const returnTab = useRef<(() => void) | null>(null)

	useEffect(() => () => returnTab.current?.(), [])

	const exit = (region: HTMLElement) => {
		const doc = region.ownerDocument

		returnTab.current?.()

		const onDocKeyDown = (keydown: globalThis.KeyboardEvent) => {
			returnTab.current?.()

			if (keydown.key !== 'Tab' || keydown.shiftKey || doc.activeElement !== doc.body) return

			keydown.preventDefault()

			region.focus()
		}

		doc.addEventListener('keydown', onDocKeyDown, true)

		returnTab.current = () => {
			doc.removeEventListener('keydown', onDocKeyDown, true)

			returnTab.current = null
		}

		region.blur()
	}

	const onBlur = (event: FocusEvent<HTMLElement>) => {
		if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget)) return

		if (navigated) clear()
	}

	return { exit, onBlur }
}
