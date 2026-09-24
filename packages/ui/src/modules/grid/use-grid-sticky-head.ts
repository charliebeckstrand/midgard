'use client'

import { type RefObject, useLayoutEffect } from 'react'

/**
 * Sets the band height of a two-row header on the `<thead>`. The column row
 * sticks at this height below the column-group band (see `k.sticky.stack`).
 * A head with one row gets no value.
 *
 * @remarks The grid head and the top new-row slot both call it before they read
 * the head. A resize of the band calls each observer in an order that is not
 * fixed, so each caller writes the value that it reads. The write is idempotent.
 *
 * @internal
 */
export function stackStickyHead(head: HTMLTableSectionElement): void {
	const band = head.rows[0]

	if (!band || head.rows.length < 2) {
		head.style.removeProperty('--grid-band-height')

		return
	}

	head.style.setProperty('--grid-band-height', `${band.getBoundingClientRect().height}px`)
}

/**
 * Runs `measure` for an element of a grid table after each layout, and again
 * on each resize of the table's `<thead>`. The sticky offsets of the grid read
 * the head, and density and wrapped labels change its height. A `null`
 * `measure` or a table with no head does nothing.
 *
 * @param ref - The element that `measure` writes to.
 * @param measure - Writes an offset from the head. It must keep one identity
 * across renders, or the observer starts again on each render.
 * @internal
 */
export function useGridStickyHead<E extends HTMLElement>(
	ref: RefObject<E | null>,
	measure: ((element: E, head: HTMLTableSectionElement) => void) | null,
): void {
	useLayoutEffect(() => {
		const element = ref.current

		const head = element?.closest('table')?.tHead

		if (!element || !head || !measure) return

		const run = () => measure(element, head)

		run()

		if (typeof ResizeObserver === 'undefined') return

		const observer = new ResizeObserver(run)

		observer.observe(head)

		return () => observer.disconnect()
	}, [ref, measure])
}
