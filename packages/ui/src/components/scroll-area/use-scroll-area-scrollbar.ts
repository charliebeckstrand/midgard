'use client'

import {
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'
import type { ScrollOrientation } from '../../types'
import { hiddenThumb, SCROLL_FADE_DELAY_MS, type ThumbState } from './scroll-area-constants'
import { computeThumb, findScrollableAncestor } from './scroll-area-utilities'
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

// Pointer drag-to-scroll for one scrollbar thumb: maps thumb travel to scroll
// offset and wires global move/up/cancel listeners until release.
function beginScrollbarDrag(
	axis: 'x' | 'y',
	event: ReactPointerEvent<HTMLDivElement>,
	ctx: ScrollbarDragContext,
): void {
	const el = ctx.viewportRef.current

	const track = axis === 'y' ? ctx.verticalTrackRef.current : ctx.horizontalTrackRef.current

	if (!el || !track) return

	event.preventDefault()
	event.stopPropagation()

	const startClient = axis === 'y' ? event.clientY : event.clientX
	const startScroll = axis === 'y' ? el.scrollTop : el.scrollLeft
	const trackSize = axis === 'y' ? track.clientHeight : track.clientWidth
	const viewportSize = axis === 'y' ? el.clientHeight : el.clientWidth
	const contentSize = axis === 'y' ? el.scrollHeight : el.scrollWidth
	const thumbSize = axis === 'y' ? ctx.verticalThumb.size : ctx.horizontalThumb.size

	const maxOffset = trackSize - thumbSize
	const maxScroll = contentSize - viewportSize

	const scale = maxOffset > 0 ? maxScroll / maxOffset : 0

	// Cleans up any prior drag (defensive; pointerup handles the usual path).
	ctx.dragCleanupRef.current?.()

	const onMove = (ev: PointerEvent) => {
		const delta = (axis === 'y' ? ev.clientY : ev.clientX) - startClient

		const next = startScroll + delta * scale

		if (axis === 'y') el.scrollTop = next
		else el.scrollLeft = next
	}

	const cleanup = () => {
		window.removeEventListener('pointermove', onMove)
		window.removeEventListener('pointerup', onUp)
		window.removeEventListener('pointercancel', onUp)

		ctx.dragCleanupRef.current = null
	}

	const onUp = () => cleanup()

	window.addEventListener('pointermove', onMove)
	window.addEventListener('pointerup', onUp)
	// A cancelled pointer (OS gesture, pen leaving range) never fires pointerup;
	// without this the drag keeps scrolling on buttonless moves.
	window.addEventListener('pointercancel', onUp)

	ctx.dragCleanupRef.current = cleanup
}

/**
 * Custom scrollbar state: thumb geometry, visibility fade, and drag-to-scroll.
 * Returns viewport/track refs, per-axis thumb state, and event handlers.
 */
export function useScrollAreaScrollbar({ orientation, scrollbar }: ScrollbarOptions) {
	const viewportRef = useRef<HTMLDivElement>(null)
	const verticalTrackRef = useRef<HTMLDivElement>(null)
	const horizontalTrackRef = useRef<HTMLDivElement>(null)
	const scrollFadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const [verticalThumb, setVerticalThumb] = useState<ThumbState>(hiddenThumb)
	const [horizontalThumb, setHorizontalThumb] = useState<ThumbState>(hiddenThumb)
	const [isScrolling, setIsScrolling] = useState(false)

	const hasVertical = orientation === 'vertical' || orientation === 'both'
	const hasHorizontal = orientation === 'horizontal' || orientation === 'both'

	const updateThumbs = useCallback(() => {
		const el = viewportRef.current

		if (!el) return

		if (hasVertical) {
			const trackHeight = verticalTrackRef.current?.clientHeight ?? 0

			setVerticalThumb(computeThumb(el.scrollTop, el.clientHeight, el.scrollHeight, trackHeight))
		}

		if (hasHorizontal) {
			const trackWidth = horizontalTrackRef.current?.clientWidth ?? 0

			setHorizontalThumb(computeThumb(el.scrollLeft, el.clientWidth, el.scrollWidth, trackWidth))
		}
	}, [hasVertical, hasHorizontal])

	useEffect(() => {
		const el = viewportRef.current

		if (!el) return

		updateThumbs()

		const observer = new ResizeObserver(updateThumbs)

		const observeChildren = () => {
			observer.disconnect()

			observer.observe(el)

			for (const child of Array.from(el.children)) observer.observe(child)
		}

		observeChildren()

		// Children added or removed after mount change the scroll extent without
		// resizing any observed element; re-seat the observer and re-measure.
		const mutations = new MutationObserver(() => {
			observeChildren()

			updateThumbs()
		})

		mutations.observe(el, { childList: true })

		return () => {
			mutations.disconnect()

			observer.disconnect()
		}
	}, [updateThumbs])

	useEffect(
		() => () => {
			if (scrollFadeTimeoutRef.current) clearTimeout(scrollFadeTimeoutRef.current)
		},
		[],
	)

	useEffect(() => {
		const el = viewportRef.current

		if (!el) return

		const handleWheel = (event: WheelEvent) => {
			if (!event.shiftKey) return

			// A horizontally scrollable viewport owns shift+wheel natively;
			// forwarding hijacks the gesture from its own content.
			if (el.scrollWidth > el.clientWidth) return

			event.preventDefault()

			const target = findScrollableAncestor(el.parentElement)

			const options: ScrollToOptions = { top: event.deltaY, left: event.deltaX, behavior: 'auto' }

			if (target) target.scrollBy(options)
			else window.scrollBy(options)
		}

		el.addEventListener('wheel', handleWheel, { passive: false })

		return () => {
			el.removeEventListener('wheel', handleWheel)
		}
	}, [])

	const handleScroll = useCallback(() => {
		updateThumbs()

		if (scrollbar === 'auto') {
			setIsScrolling(true)

			if (scrollFadeTimeoutRef.current) clearTimeout(scrollFadeTimeoutRef.current)

			scrollFadeTimeoutRef.current = setTimeout(() => setIsScrolling(false), SCROLL_FADE_DELAY_MS)
		}
	}, [scrollbar, updateThumbs])

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
		verticalTrackRef,
		horizontalTrackRef,
		verticalThumb,
		horizontalThumb,
		isScrolling,
		hasVertical,
		hasHorizontal,
		handleScroll,
		startDrag,
	}
}
