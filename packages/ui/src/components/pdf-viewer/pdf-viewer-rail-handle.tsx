'use client'

import { type KeyboardEvent, type PointerEvent, useLayoutEffect, useRef, useState } from 'react'
import { dataAttr } from '../../core/data-attr'
import { isRtl, logicalArrowKey } from '../../hooks/a11y/logical-arrow'
import { useDragCursor } from '../../hooks/use-drag-cursor'
import { useIntl } from '../../primitives/intl/use-intl'
import { Splitter } from '../../primitives/splitter/splitter'
import { k } from '../../recipes/kata/pdf-viewer'
import { clamp } from '../../utilities/clamp'
import { holdTextSelection } from '../../utilities/hold-text-selection'
import { hasBrowserModifier } from '../../utilities/modifier-keys'
import { isPrimaryPress } from '../../utilities/primary-press'
import { pdfViewerMessages } from './pdf-viewer-messages'
import { PDF_VIEWER_RAIL_PROPERTY, PDF_VIEWER_RAIL_WIDTH } from './pdf-viewer-rail'

const { min, max } = PDF_VIEWER_RAIL_WIDTH

/** How far one arrow press moves the edge, in CSS pixels. */
const STEP = 8

/** How far one PageUp or PageDown press moves the edge, in CSS pixels. */
const PAGE_STEP = 32

/** The width that a key sets from `width`, or `null` for a key that does not resize. @internal */
function widthForKey(key: string, width: number): number | null {
	switch (key) {
		case 'ArrowLeft':
			return width - STEP
		case 'ArrowRight':
			return width + STEP
		case 'PageDown':
			return width - PAGE_STEP
		case 'PageUp':
			return width + PAGE_STEP
		case 'Home':
			return min
		case 'End':
			return max
		default:
			return null
	}
}

/** What a drag measured at its start. @internal */
type Grab = {
	/** The pointer that pressed the handle. The drag follows only that pointer. */
	pointer: number
	/** Where the pointer went down on the x axis, and the width that it went down on. */
	at: number
	width: number
	/** `1` where a move to the right widens the rail, and `-1` in a right-to-left layout. */
	sign: 1 | -1
}

/** Props for {@link PdfViewerRailHandle}. @internal */
type PdfViewerRailHandleProps = {
	/** The id of the rail, which the splitter names in `aria-controls`. */
	controls: string
}

/**
 * The resize handle of the thumbnail rail: a {@link Splitter} on the end edge of the rail. It
 * is a child of the rail, and it sizes its parent.
 *
 * A drag moves the edge. The arrow keys step the width by 8px, PageUp and PageDown step it by
 * 32px, and Home and End set the bounds of {@link PDF_VIEWER_RAIL_WIDTH}. A double-click sets the
 * default width again. A key with Ctrl, Meta, or Alt is for the browser, so it keeps its default.
 * The rail starts at the inline start, so in a right-to-left layout the drag and the horizontal
 * arrows mirror: ArrowLeft and a move to the left widen the rail.
 *
 * @remarks The handle holds the width, and writes it on the rail as the custom property
 * `--pdf-viewer-rail`. Thus a drag renders only the handle, and not the tiles of the rail, which
 * a long document has many of. The width stays when the rail collapses and opens again.
 *
 * The rail moves focus between its tiles with the arrow keys, Home, and End. The handle is in
 * the rail, so a key that resizes stops at the handle.
 * @internal
 */
export function PdfViewerRailHandle({ controls }: PdfViewerRailHandleProps) {
	const intl = useIntl()

	const [width, setWidth] = useState<number>(PDF_VIEWER_RAIL_WIDTH.default)

	const [dragging, setDragging] = useState(false)

	const grab = useRef<Grab | null>(null)

	const ref = useRef<HTMLHRElement>(null)

	// The resize cursor stays on the page for the whole drag, over a tile or the page too.
	useDragCursor(dragging, 'col-resize')

	// Before the paint, so the rail never shows a width that the handle does not report. The
	// handle reads the rail through its own node: React attaches the ref of a parent after the
	// layout effects of its children, so a ref of the rail is still empty at the first commit.
	useLayoutEffect(() => {
		ref.current?.parentElement?.style.setProperty(PDF_VIEWER_RAIL_PROPERTY, `${width}px`)
	}, [width])

	function resizeTo(next: number) {
		setWidth(clamp(Math.round(next), min, max))
	}

	function handlePointerDown(event: PointerEvent<HTMLHRElement>) {
		// Only a plain primary press starts a drag. A context-menu gesture falls through.
		if (!isPrimaryPress(event)) return

		holdTextSelection(event)

		event.preventDefault()

		// Capture holds the handle as the pointer target for the whole drag, so the moves come
		// here, and the tiles under the pointer show no hover. The browser releases the capture
		// on pointerup and pointercancel, and the release ends the drag.
		event.currentTarget.setPointerCapture(event.pointerId)

		grab.current = {
			pointer: event.pointerId,
			at: event.clientX,
			width,
			sign: isRtl(event.currentTarget) ? -1 : 1,
		}

		setDragging(true)
	}

	function handlePointerMove(event: PointerEvent<HTMLHRElement>) {
		const start = grab.current

		if (start?.pointer !== event.pointerId) return

		resizeTo(start.width + start.sign * (event.clientX - start.at))
	}

	function handleLostPointerCapture(event: PointerEvent<HTMLHRElement>) {
		if (grab.current?.pointer !== event.pointerId) return

		grab.current = null

		setDragging(false)
	}

	function handleKeyDown(event: KeyboardEvent<HTMLHRElement>) {
		if (hasBrowserModifier(event)) return

		const next = widthForKey(logicalArrowKey(event.key, event.currentTarget), width)

		if (next === null) return

		event.preventDefault()

		// The roving focus of the rail must not move focus to a tile for this key.
		event.stopPropagation()

		resizeTo(next)
	}

	return (
		<Splitter
			ref={ref}
			data-slot="pdf-viewer-rail-handle"
			data-dragging={dataAttr(dragging)}
			label={intl.formatMessage(pdfViewerMessages.resizePages)}
			orientation="vertical"
			value={width}
			valueText={intl.formatMessage(pdfViewerMessages.railWidth, { width })}
			min={min}
			max={max}
			controls={controls}
			className={k().sidebar.handle}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onLostPointerCapture={handleLostPointerCapture}
			onDoubleClick={() => resizeTo(PDF_VIEWER_RAIL_WIDTH.default)}
			onKeyDown={handleKeyDown}
		/>
	)
}
