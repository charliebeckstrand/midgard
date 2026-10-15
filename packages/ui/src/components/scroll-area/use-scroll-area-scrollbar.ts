'use client'

import {
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'
import { isRtl } from '../../hooks/a11y/logical-arrow'
import { observeScrollExtent } from '../../hooks/observe-scroll-extent'
import { holdDragCursor } from '../../hooks/use-drag-cursor'
import { useAnimationFrame, useTimeout } from '../../hooks/use-timeout'
import type { ScrollOrientation } from '../../types'
import { holdTextSelection } from '../../utilities/hold-text-selection'
import { hiddenThumb, SCROLL_FADE_DELAY_MS, type ThumbState } from './scroll-area-constants'
import {
	computeThumb,
	findScrollableAncestor,
	scrollsHorizontallyWithin,
} from './scroll-area-utilities'
import type { ScrollbarMode } from './types'

type Orientation = ScrollOrientation

type ScrollbarOptions = {
	orientation: Orientation
	scrollbar: ScrollbarMode
}

type ScrollbarDragContext = {
	viewportRef: { current: HTMLDivElement | null }
	verticalTrackRef: { current: HTMLDivElement | null }
	horizontalTrackRef: { current: HTMLDivElement | null }
	verticalThumb: ThumbState
	horizontalThumb: ThumbState
	dragCleanupRef: { current: (() => void) | null }
}

/**
 * Pointer drag-to-scroll for one scrollbar thumb: maps thumb travel to scroll
 * offset and wires global move / up / cancel listeners until release.
 *
 * @internal
 */
function beginScrollbarDrag(
	axis: 'x' | 'y',
	event: ReactPointerEvent<HTMLDivElement>,
	context: ScrollbarDragContext,
): void {
	// Only the primary button drags, as on a native scrollbar. A secondary press
	// opens the context menu, which can take the release and leave the drag
	// on a pointer with no button held.
	if (event.button !== 0) return

	const viewport = context.viewportRef.current

	const track = axis === 'y' ? context.verticalTrackRef.current : context.horizontalTrackRef.current

	if (!viewport || !track) return

	event.preventDefault()
	event.stopPropagation()

	holdTextSelection(event)

	const startClient = axis === 'y' ? event.clientY : event.clientX
	const startScroll = axis === 'y' ? viewport.scrollTop : viewport.scrollLeft
	const trackSize = axis === 'y' ? track.clientHeight : track.clientWidth
	const viewportSize = axis === 'y' ? viewport.clientHeight : viewport.clientWidth
	const contentSize = axis === 'y' ? viewport.scrollHeight : viewport.scrollWidth
	const thumbSize = axis === 'y' ? context.verticalThumb.size : context.horizontalThumb.size

	const maxOffset = trackSize - thumbSize
	const maxScroll = contentSize - viewportSize

	const scale = maxOffset > 0 ? maxScroll / maxOffset : 0

	// Cleans up any prior drag (defensive; pointerup handles the usual path).
	context.dragCleanupRef.current?.()

	const onMove = (moveEvent: PointerEvent) => {
		const delta = (axis === 'y' ? moveEvent.clientY : moveEvent.clientX) - startClient

		const next = startScroll + delta * scale

		if (axis === 'y') viewport.scrollTop = next
		else viewport.scrollLeft = next
	}

	// One controller for the drag's listener set, so the teardown cannot drift
	// from the add list.
	const controller = new AbortController()

	const { signal } = controller

	// The thumb sets no cursor, so the page holds the default one. A link or a
	// field that the pointer crosses mid-drag then does not change it.
	const releaseCursor = holdDragCursor('default')

	const cleanup = () => {
		controller.abort()

		releaseCursor()

		context.dragCleanupRef.current = null
	}

	window.addEventListener('pointermove', onMove, { signal })
	window.addEventListener('pointerup', cleanup, { signal })
	// A canceled pointer (OS gesture, pen leaving range) never fires pointerup;
	// without this the drag keeps scrolling on buttonless moves.
	window.addEventListener('pointercancel', cleanup, { signal })

	context.dragCleanupRef.current = cleanup
}

/**
 * Sends a shift+wheel over the viewport to the nearest scrollable ancestor,
 * when nothing in the viewport can scroll horizontally.
 *
 * @internal
 */
function forwardShiftWheel(event: WheelEvent, viewport: HTMLElement): void {
	if (!event.shiftKey) return

	// A horizontally scrollable viewport owns shift+wheel natively;
	// forwarding hijacks the gesture from its own content.
	if (viewport.scrollWidth > viewport.clientWidth) return

	// A horizontal scroller inside the viewport owns the gesture in the same way.
	const origin = event.target instanceof Element ? event.target : null

	if (scrollsHorizontallyWithin(origin, viewport)) return

	event.preventDefault()

	const target = findScrollableAncestor(viewport.parentElement)

	const options: ScrollToOptions = { top: event.deltaY, left: event.deltaX, behavior: 'auto' }

	if (target) target.scrollBy(options)
	else window.scrollBy(options)
}

/**
 * Custom scrollbar state: thumb geometry, visibility fade, and drag-to-scroll.
 * Returns viewport/track refs, per-axis thumb state, and event handlers.
 *
 * @remarks
 * Measures when a track attaches, in the commit, so the first paint holds the
 * thumb. Re-measures via a {@link ResizeObserver} on the viewport and its children and
 * a {@link MutationObserver} on child additions/removals. Shift+wheel over a
 * non-horizontally-scrollable viewport forwards to the nearest scrollable
 * ancestor, unless a horizontal scroller inside the viewport gets it.
 *
 * @internal
 */
export function useScrollAreaScrollbar({ orientation, scrollbar }: ScrollbarOptions) {
	const viewportRef = useRef<HTMLDivElement>(null)
	const verticalTrackRef = useRef<HTMLDivElement>(null)
	const horizontalTrackRef = useRef<HTMLDivElement>(null)
	const scrollFade = useTimeout()
	const thumbFrame = useAnimationFrame()

	const [verticalThumb, setVerticalThumb] = useState<ThumbState>(hiddenThumb)
	const [horizontalThumb, setHorizontalThumb] = useState<ThumbState>(hiddenThumb)
	const [isScrolling, setIsScrolling] = useState(false)

	const hasVertical = orientation === 'vertical' || orientation === 'both'
	const hasHorizontal = orientation === 'horizontal' || orientation === 'both'

	const updateThumbs = useCallback(() => {
		const viewport = viewportRef.current

		if (!viewport) return

		if (hasVertical) {
			const trackHeight = verticalTrackRef.current?.clientHeight ?? 0

			setVerticalThumb(
				computeThumb(viewport.scrollTop, viewport.clientHeight, viewport.scrollHeight, trackHeight),
			)
		}

		if (hasHorizontal) {
			const trackWidth = horizontalTrackRef.current?.clientWidth ?? 0

			// In RTL, `scrollLeft` is zero at the start and goes negative toward the
			// end. The thumb sits at the inline start, so it moves left by the same
			// distance.
			const rtl = isRtl(viewport)

			const thumb = computeThumb(
				rtl ? -viewport.scrollLeft : viewport.scrollLeft,
				viewport.clientWidth,
				viewport.scrollWidth,
				trackWidth,
			)

			setHorizontalThumb(rtl ? { ...thumb, offset: -thumb.offset } : thumb)
		}
	}, [hasVertical, hasHorizontal])

	// Scroll events fire faster than frames; coalesce the thumb re-measure (a
	// layout read plus two setStates) into one commit per frame. Resize/mutation
	// re-measures stay synchronous — the browser already batches those per frame.
	const scheduleThumbs = useCallback(() => {
		if (!thumbFrame.pending()) thumbFrame.set(updateThumbs)
	}, [thumbFrame, updateThumbs])

	// A track measures its thumb when it attaches. React attaches refs in the
	// commit, before the paint, so the paint that shows a track also shows its
	// thumb. A track attaches when the area mounts and when the scrollbar or the
	// axis changes. The viewport comes before the tracks in the tree, so React
	// attaches its ref first.
	const verticalTrack = useCallback(
		(node: HTMLDivElement | null) => {
			verticalTrackRef.current = node

			if (node) updateThumbs()
		},
		[updateThumbs],
	)

	const horizontalTrack = useCallback(
		(node: HTMLDivElement | null) => {
			horizontalTrackRef.current = node

			if (node) updateThumbs()
		},
		[updateThumbs],
	)

	// The tracks measure first, so the watch reports only later changes.
	useEffect(() => {
		const viewport = viewportRef.current

		if (!viewport) return

		return observeScrollExtent(viewport, updateThumbs)
	}, [updateThumbs])

	useEffect(() => {
		const viewport = viewportRef.current

		if (!viewport) return

		const handleWheel = (event: WheelEvent) => forwardShiftWheel(event, viewport)

		viewport.addEventListener('wheel', handleWheel, { passive: false })

		return () => {
			viewport.removeEventListener('wheel', handleWheel)
		}
	}, [])

	const handleScroll = useCallback(() => {
		scheduleThumbs()

		if (scrollbar === 'auto') {
			setIsScrolling(true)

			scrollFade.set(() => setIsScrolling(false), SCROLL_FADE_DELAY_MS)
		}
	}, [scrollbar, scheduleThumbs, scrollFade])

	const dragCleanupRef = useRef<(() => void) | null>(null)

	const startDrag = (axis: 'x' | 'y') => (event: ReactPointerEvent<HTMLDivElement>) =>
		beginScrollbarDrag(axis, event, {
			viewportRef,
			verticalTrackRef,
			horizontalTrackRef,
			verticalThumb,
			horizontalThumb,
			dragCleanupRef,
		})

	// Cleans up global listeners when the component unmounts mid-drag
	// (e.g. modal close or route change), when pointerup never fires.
	useEffect(() => () => dragCleanupRef.current?.(), [])

	return {
		viewportRef,
		verticalTrackRef: verticalTrack,
		horizontalTrackRef: horizontalTrack,
		verticalThumb,
		horizontalThumb,
		isScrolling,
		hasVertical,
		hasHorizontal,
		handleScroll,
		startDrag,
	}
}
