'use client'

import {
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'
import {
	computeThumb,
	findScrollableAncestor,
	HIDDEN_THUMB,
	SCROLL_FADE_DELAY_MS,
	type ScrollbarMode,
	type ThumbState,
} from './utilities'

type Orientation = 'vertical' | 'horizontal' | 'both'

type UseScrollbarOptions = {
	orientation: Orientation
	scrollbar: ScrollbarMode
}

/**
 * Custom scrollbar state — thumb geometry, visibility fade, and drag-to-scroll.
 * Returns viewport/track refs, per-axis thumb state, and event handlers.
 */
export function useScrollbar({ orientation, scrollbar }: UseScrollbarOptions) {
	const viewportRef = useRef<HTMLDivElement>(null)
	const verticalTrackRef = useRef<HTMLDivElement>(null)
	const horizontalTrackRef = useRef<HTMLDivElement>(null)
	const scrollFadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const [verticalThumb, setVerticalThumb] = useState<ThumbState>(HIDDEN_THUMB)
	const [horizontalThumb, setHorizontalThumb] = useState<ThumbState>(HIDDEN_THUMB)
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

		observer.observe(el)

		for (const child of Array.from(el.children)) observer.observe(child)

		return () => observer.disconnect()
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

	const startDrag = (axis: 'x' | 'y') => (event: ReactPointerEvent<HTMLDivElement>) => {
		const el = viewportRef.current

		const track = axis === 'y' ? verticalTrackRef.current : horizontalTrackRef.current

		if (!el || !track) return

		event.preventDefault()
		event.stopPropagation()

		const startClient = axis === 'y' ? event.clientY : event.clientX
		const startScroll = axis === 'y' ? el.scrollTop : el.scrollLeft
		const trackSize = axis === 'y' ? track.clientHeight : track.clientWidth
		const viewportSize = axis === 'y' ? el.clientHeight : el.clientWidth
		const contentSize = axis === 'y' ? el.scrollHeight : el.scrollWidth
		const thumbSize = axis === 'y' ? verticalThumb.size : horizontalThumb.size

		const maxOffset = trackSize - thumbSize
		const maxScroll = contentSize - viewportSize

		const scale = maxOffset > 0 ? maxScroll / maxOffset : 0

		// Clean up any prior drag — defensive; pointerup normally clears it.
		dragCleanupRef.current?.()

		const onMove = (ev: PointerEvent) => {
			const delta = (axis === 'y' ? ev.clientY : ev.clientX) - startClient

			const next = startScroll + delta * scale

			if (axis === 'y') el.scrollTop = next
			else el.scrollLeft = next
		}

		const cleanup = () => {
			window.removeEventListener('pointermove', onMove)
			window.removeEventListener('pointerup', onUp)

			dragCleanupRef.current = null
		}

		const onUp = () => cleanup()

		window.addEventListener('pointermove', onMove)
		window.addEventListener('pointerup', onUp)

		dragCleanupRef.current = cleanup
	}

	// If the component unmounts mid-drag (modal closes, route change, etc.)
	// pointerup never fires, so the global listeners would otherwise leak.
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
