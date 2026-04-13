'use client'

import { useEffect, useRef } from 'react'

type Side = 'top' | 'bottom' | 'left' | 'right'

/** Minimum drag distance (px) before committing to a gesture direction. */
const LOCK_THRESHOLD = 8
/** Drag distance (px) past which release triggers dismiss. */
const DISMISS_THRESHOLD = 80
/** Velocity (px/ms) past which release triggers dismiss regardless of distance. */
const VELOCITY_THRESHOLD = 0.4

// ---------------------------------------------------------------------------
// Scroll-boundary detection
// ---------------------------------------------------------------------------

/**
 * Walks from `target` up to (but not including) `boundary`, returning `true`
 * when an ancestor scroll container still has room to scroll in the direction
 * opposite to the dismiss side.
 *
 * For a bottom drawer (dismiss = swipe down), we check whether any ancestor
 * can still scroll **up** (scrollTop > 0). If so, the touch should scroll
 * content rather than drag-dismiss.
 */
function canContentScroll(target: EventTarget | null, boundary: HTMLElement, side: Side): boolean {
	let node = target as HTMLElement | null
	const isVertical = side === 'top' || side === 'bottom'

	while (node && node !== boundary) {
		const style = window.getComputedStyle(node)
		const overflow = isVertical ? style.overflowY : style.overflowX

		if (overflow === 'auto' || overflow === 'scroll') {
			const hasScroll = isVertical
				? node.scrollHeight > node.clientHeight
				: node.scrollWidth > node.clientWidth

			if (hasScroll) {
				switch (side) {
					case 'bottom':
						if (node.scrollTop > 1) return true
						break
					case 'top':
						if (node.scrollTop + node.clientHeight < node.scrollHeight - 1) return true
						break
					case 'right':
						if (node.scrollLeft > 1) return true
						break
					case 'left':
						if (node.scrollLeft + node.clientWidth < node.scrollWidth - 1) return true
						break
				}
			}
		}

		node = node.parentElement
	}

	return false
}

// ---------------------------------------------------------------------------
// Core drag logic — operates on a guaranteed non-null panel element
// ---------------------------------------------------------------------------

function attachDrag(panel: HTMLDivElement, side: Side, onCloseRef: React.RefObject<() => void>) {
	const isVertical = side === 'top' || side === 'bottom'
	const sign = side === 'bottom' || side === 'right' ? 1 : -1

	let startX = 0
	let startY = 0
	let startTime = 0
	let tracking = false
	let decided = false

	function backdrop(): HTMLElement | null {
		return panel.previousElementSibling as HTMLElement | null
	}

	function setPanel(translate: string, transition: string, visibility = '') {
		panel.style.translate = translate
		panel.style.transition = transition
		panel.style.visibility = visibility
	}

	function setBackdrop(opacity: string, transition = '') {
		const el = backdrop()
		if (!el) return
		el.style.opacity = opacity
		el.style.transition = transition
	}

	// --- touch handlers ---

	function handleTouchStart(e: TouchEvent) {
		const touch = e.touches[0]
		startX = touch.clientX
		startY = touch.clientY
		startTime = Date.now()
		tracking = false
		decided = false

		setPanel('', '', '')
		setBackdrop('')
	}

	function handleTouchMove(e: TouchEvent) {
		const touch = e.touches[0]
		const dx = touch.clientX - startX
		const dy = touch.clientY - startY

		if (!decided) {
			const distance = Math.sqrt(dx * dx + dy * dy)
			if (distance < LOCK_THRESHOLD) return

			decided = true

			const isHorizontal = Math.abs(dx) > Math.abs(dy)
			if (isVertical === isHorizontal) {
				tracking = false
				return
			}

			const delta = isVertical ? dy : dx
			if (delta * sign <= 0) {
				tracking = false
				return
			}

			if (canContentScroll(e.target, panel, side)) {
				tracking = false
				return
			}

			tracking = true
		}

		if (!tracking) return

		e.preventDefault()

		const delta = isVertical ? dy : dx
		const offset = Math.max(0, delta * sign)
		const visual = offset * sign

		setPanel(isVertical ? `0 ${visual}px` : `${visual}px 0`, 'none')

		const size = isVertical ? panel.offsetHeight : panel.offsetWidth
		const progress = Math.min(offset / size, 1)
		setBackdrop(String(1 - progress))
	}

	function handleTouchEnd(e: TouchEvent) {
		if (!tracking) return

		const touch = e.changedTouches[0]
		const delta = isVertical ? touch.clientY - startY : touch.clientX - startX
		const offset = delta * sign
		const elapsed = Date.now() - startTime
		const velocity = offset / Math.max(elapsed, 1)

		if (offset > DISMISS_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
			dismiss()
		} else {
			snapBack()
		}
	}

	function dismiss() {
		let done = false
		const finish = () => {
			if (done) return
			done = true
			setPanel('', '', 'hidden')
			setBackdrop('0')
			onCloseRef.current()
		}

		setPanel(isVertical ? `0 ${sign * 100}dvh` : `${sign * 100}dvw 0`, 'translate 0.15s ease-out')
		setBackdrop('0', 'opacity 0.15s ease-out')

		panel.addEventListener('transitionend', finish, { once: true })
		setTimeout(finish, 200)
	}

	function snapBack() {
		let done = false
		const reset = () => {
			if (done) return
			done = true
			setPanel('', '')
			setBackdrop('')
		}

		setPanel('', 'translate 0.15s ease-out')
		setBackdrop('', 'opacity 0.15s ease-out')

		panel.addEventListener('transitionend', reset, { once: true })
		setTimeout(reset, 200)
	}

	panel.addEventListener('touchstart', handleTouchStart, { passive: true })
	panel.addEventListener('touchmove', handleTouchMove, { passive: false })
	panel.addEventListener('touchend', handleTouchEnd, { passive: true })

	return () => {
		panel.removeEventListener('touchstart', handleTouchStart)
		panel.removeEventListener('touchmove', handleTouchMove)
		panel.removeEventListener('touchend', handleTouchEnd)
	}
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Attaches native touch listeners to a panel element that allow the user to
 * drag it in the `side` direction to dismiss. Returns a ref to attach to the
 * panel's root element.
 *
 * Uses the CSS `translate` property (independent of `transform`) so it doesn't
 * conflict with motion's animation system which manages `transform`.
 *
 * While dragging, the backdrop sibling's opacity is updated to track progress.
 */
export function useSwipeDismiss(side: Side, onClose: () => void) {
	const ref = useRef<HTMLDivElement>(null)
	const onCloseRef = useRef(onClose)
	onCloseRef.current = onClose

	useEffect(() => {
		const panel = ref.current
		if (!panel) return

		return attachDrag(panel, side, onCloseRef)
	}, [side])

	return ref
}
