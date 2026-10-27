'use client'

import { type RefObject, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
	ELLIPSIS,
	estimateTextFit,
	graphemeEnds,
	type TextFit,
	type TextWidth,
} from './chart-text-width'

const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * The longest start of `text` that fits in `maxWidth` with the ellipsis after
 * it. Each start ends on a whole character ({@link graphemeEnds}). `node` holds
 * `text` and is in the layout. The advance of each start comes from one
 * layout, and the box of the cut text then confirms the fit, because the
 * glyphs can paint past the advance.
 *
 * @internal
 */
function fitNode(node: SVGTextElement, text: string, ellipsis: number, maxWidth: number): TextFit {
	const ends = [0, ...graphemeEnds(text)]

	let at = ends.length - 1

	while (at > 0 && node.getSubStringLength(0, ends[at] ?? 0) + ellipsis > maxWidth) at--

	for (;;) {
		const cut = `${text.slice(0, ends[at]).trimEnd()}${ELLIPSIS}`

		node.textContent = cut

		const width = node.getBBox().width

		if (width <= maxWidth || at === 0) return { text: cut, width }

		at--
	}
}

/** The widths that a measure gives. @internal */
type Measure = {
	/** The whole width of each text. */
	widths: Map<string, number>
	/** Each text wider than the room, cut to fit it. */
	cuts: Map<string, TextFit>
}

/**
 * Measures each text as an SVG `text` with `className`, inside `host`. The
 * probe inherits the font of the host, so the widths come from the font that
 * the chart renders, whatever font the page sets. A text wider than
 * `maxWidth` is cut to fit with an {@link ELLIPSIS}. The probe is out of flow
 * and invisible, and it is removed before the function returns. Returns `null`
 * where the DOM has no SVG text layout.
 *
 * @internal
 */
function measureTexts(
	host: Element,
	className: string,
	texts: readonly string[],
	maxWidth: number,
): Measure | null {
	const svg = document.createElementNS(SVG_NS, 'svg')

	svg.setAttribute('aria-hidden', 'true')

	svg.setAttribute('class', 'invisible absolute size-0 overflow-hidden')

	const probe = (text: string) => {
		const node = document.createElementNS(SVG_NS, 'text')

		node.setAttribute('class', className)

		node.textContent = text

		svg.append(node)

		return node
	}

	const nodes = texts.map((text) => [text, probe(text)] as const)

	const ellipsisNode = probe(ELLIPSIS)

	if (typeof ellipsisNode.getBBox !== 'function') return null

	host.append(svg)

	// The box, not the advance: the glyphs can paint about 1 px past the advance,
	// and a label that fits to the frame edge clips by that much. One layout serves
	// every read, because no read writes to the DOM.
	const boxes = nodes.map(([text, node]) => [text, node, node.getBBox().width] as const)

	const ellipsis = ellipsisNode.getComputedTextLength()

	const widths = new Map(boxes.map(([text, , width]) => [text, width]))

	// Only a label past the room writes to the probe, after every read above.
	const cuts = new Map(
		boxes
			.filter(([, , width]) => width > maxWidth)
			.map(([text, node]) => [text, fitNode(node, text, ellipsis, maxWidth)]),
	)

	svg.remove()

	return { widths, cuts }
}

/**
 * The measures that an instance holds, for the classes they were measured in.
 * The whole widths hold for any room. The cuts hold only for `maxWidth`.
 *
 * @internal
 */
type Measured = {
	className: string
	widths: ReadonlyMap<string, number>
	maxWidth: number
	cuts: ReadonlyMap<string, TextFit>
}

const NO_WIDTHS: ReadonlyMap<string, number> = new Map()

const NO_CUTS: ReadonlyMap<string, TextFit> = new Map()

/** What {@link useChartTextWidth} returns. @internal */
export type ChartTextWidth = {
	/** The drawn width of a text, cut to its room, or the estimate for a text not measured yet. */
	width: TextWidth
	/** The text as it draws: whole, or cut with an ellipsis to fit `maxWidth`. */
	fit: (text: string) => string
	/** Attach to an element inside the chart, so that the probe inherits its font. */
	hostRef: RefObject<HTMLDivElement | null>
}

/**
 * Measures the rendered width of each label in `texts`, set in `className`, so
 * that a chart reserves room from the real text and not from a per-glyph
 * estimate. A proportional font has no one advance that bounds every label, so
 * an estimate clips a wide label or wastes room on a narrow one.
 *
 * @remarks The first render uses the estimate (`estimateTextFit`), on
 * the server and on the client alike, so hydration matches. A layout effect
 * then measures the texts and renders again before the first paint. The
 * instance keeps each width it measures. A change to `texts` measures only the
 * texts that it does not hold yet, and renders again only for them, so a chart
 * that alternates between known labels does no DOM work. A change to
 * `maxWidth` keeps the whole widths, and measures again only the texts wider
 * than the new room, so a resize that every label fits does no DOM work. When a
 * web font finishes loading, the instance lets go of its widths and measures
 * again, because the widths change with the font. A label width does not
 * depend on the layout, so a measurement cannot feed back into the layout that
 * reads it.
 * @param texts - Every label that the chart can draw. Order and duplicates do
 * not matter.
 * @param className - The classes of the drawn label, so that the probe sets the
 * same size, weight, and figures.
 * @param charWidth - The per-glyph advance of the estimate.
 * @param maxWidth - The room of one label. A wider label is cut with an
 * ellipsis to fit it, and its width is the width of the cut text. Unset, no
 * label is cut.
 * @internal
 */
export function useChartTextWidth(
	texts: readonly string[],
	className: string,
	charWidth: number,
	maxWidth = Number.POSITIVE_INFINITY,
): ChartTextWidth {
	const hostRef = useRef<HTMLDivElement>(null)

	const [measured, setMeasured] = useState<Measured>({
		className,
		widths: NO_WIDTHS,
		maxWidth,
		cuts: NO_CUTS,
	})

	// Widths from other classes do not apply, and cuts for another room do not either.
	const widths = measured.className === className ? measured.widths : NO_WIDTHS

	const cuts = widths !== NO_WIDTHS && measured.maxWidth === maxWidth ? measured.cuts : NO_CUTS

	// A key, so that an equal list in a new array does not measure again.
	const key = [...new Set(texts)].filter(Boolean).join('\u0000')

	useLayoutEffect(() => {
		const host = hostRef.current

		if (!host || key === '') return

		// A text needs the DOM when its whole width is unknown, or when it is wider
		// than the room and has no cut for it yet.
		const missing = key.split('\u0000').filter((text) => {
			const width = widths.get(text)

			return width === undefined || (width > maxWidth && !cuts.has(text))
		})

		// A new room that every text fits needs no cut, so it renders nothing again.
		if (missing.length === 0) return

		const next = measureTexts(host, className, missing, maxWidth)

		if (next) {
			setMeasured({
				className,
				widths: new Map([...widths, ...next.widths]),
				maxWidth,
				cuts: new Map([...cuts, ...next.cuts]),
			})
		}
	}, [key, className, maxWidth, widths, cuts])

	// A web font that loads later changes the widths, so the instance measures again.
	useLayoutEffect(() => {
		const fonts = document.fonts

		if (!fonts) return

		const forget = () => setMeasured((prev) => ({ ...prev, widths: NO_WIDTHS, cuts: NO_CUTS }))

		fonts.addEventListener('loadingdone', forget)

		return () => fonts.removeEventListener('loadingdone', forget)
	}, [])

	// One identity for each set of fits, so that a memo that reads the widths
	// computes again only when a width changes.
	return useMemo(() => {
		const getFit = (text: string): TextFit => {
			const width = widths.get(text)

			if (width !== undefined && width <= maxWidth) return { text, width }

			return cuts.get(text) ?? estimateTextFit(text, charWidth, maxWidth)
		}

		return {
			width: (text) => getFit(text).width,
			fit: (text) => getFit(text).text,
			hostRef,
		}
	}, [widths, cuts, charWidth, maxWidth])
}
