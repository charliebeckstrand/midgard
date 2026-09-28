'use client'

import { type RefObject, useLayoutEffect, useRef, useState } from 'react'
import { estimateTextWidth, type TextWidth } from './chart-text-width'

const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Measures each text as an SVG `text` with `className`, inside `host`. The
 * probe inherits the font of the host, so the widths come from the font that
 * the chart renders, whatever font the page sets. The probe is out of flow and
 * invisible, and it is removed before the function returns. Returns `null`
 * where the DOM has no SVG text layout.
 *
 * @internal
 */
function measureTexts(
	host: Element,
	className: string,
	texts: readonly string[],
): Map<string, number> | null {
	const svg = document.createElementNS(SVG_NS, 'svg')

	svg.setAttribute('aria-hidden', 'true')

	svg.setAttribute('class', 'invisible absolute size-0 overflow-hidden')

	const nodes = texts.map((text) => {
		const node = document.createElementNS(SVG_NS, 'text')

		node.setAttribute('class', className)

		node.textContent = text

		svg.append(node)

		return [text, node] as const
	})

	if (typeof nodes[0]?.[1].getBBox !== 'function') return null

	host.append(svg)

	// The box, not the advance: the glyphs can paint about 1 px past the advance,
	// and a label that fits to the frame edge clips by that much. One layout serves
	// every read, because no read writes to the DOM.
	const widths = new Map(nodes.map(([text, node]) => [text, node.getBBox().width]))

	svg.remove()

	return widths
}

/** The widths an instance holds, for the classes they were measured in. @internal */
type Measured = { className: string; widths: ReadonlyMap<string, number> }

const NONE: ReadonlyMap<string, number> = new Map()

/** What {@link useChartTextWidth} returns. @internal */
export type ChartTextWidth = {
	/** The measured width of a text, or the estimate for a text not measured yet. */
	width: TextWidth
	/** Attach to an element inside the chart, so that the probe inherits its font. */
	hostRef: RefObject<HTMLDivElement | null>
}

/**
 * Measures the rendered width of each label in `texts`, set in `className`, so
 * that a chart reserves room from the real text and not from a per-glyph
 * estimate. A proportional font has no one advance that bounds every label, so
 * an estimate clips a wide label or wastes room on a narrow one.
 *
 * @remarks The first render uses the {@link estimateTextWidth | estimate}, on
 * the server and on the client alike, so hydration matches. A layout effect
 * then measures the texts and renders again before the first paint. The
 * instance keeps each width it measures. A change to `texts` measures only the
 * texts that it does not hold yet, and renders again only for them, so a chart
 * that alternates between known labels does no DOM work. When a web font
 * finishes loading, the instance lets go of its widths and measures again,
 * because the widths change with the font. A label width does not depend on
 * the layout, so a measurement cannot feed back into the layout that reads it.
 * @param texts - Every label that the chart can draw. Order and duplicates do
 * not matter.
 * @param className - The classes of the drawn label, so that the probe sets the
 * same size, weight, and figures.
 * @param charWidth - The per-glyph advance of the estimate.
 * @internal
 */
export function useChartTextWidth(
	texts: readonly string[],
	className: string,
	charWidth: number,
): ChartTextWidth {
	const hostRef = useRef<HTMLDivElement>(null)

	const [measured, setMeasured] = useState<Measured>({ className, widths: NONE })

	// Widths from other classes do not apply.
	const widths = measured.className === className ? measured.widths : NONE

	// A key, so that an equal list in a new array does not measure again.
	const key = [...new Set(texts)].filter(Boolean).join('\u0000')

	useLayoutEffect(() => {
		const host = hostRef.current

		if (!host || key === '') return

		const missing = key.split('\u0000').filter((text) => !widths.has(text))

		if (missing.length === 0) return

		const next = measureTexts(host, className, missing)

		if (next) setMeasured({ className, widths: new Map([...widths, ...next]) })
	}, [key, className, widths])

	// A web font that loads later changes the widths, so the instance measures again.
	useLayoutEffect(() => {
		const fonts = document.fonts

		if (!fonts) return

		const forget = () => setMeasured((current) => ({ ...current, widths: NONE }))

		fonts.addEventListener('loadingdone', forget)

		return () => fonts.removeEventListener('loadingdone', forget)
	}, [])

	const estimate = estimateTextWidth(charWidth)

	return {
		width: (text) => widths?.get(text) ?? estimate(text),
		hostRef,
	}
}
