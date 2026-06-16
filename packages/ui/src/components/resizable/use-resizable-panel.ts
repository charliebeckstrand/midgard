'use client'

import {
	type PointerEvent as ReactPointerEvent,
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'
import { clamp } from '../../utilities'
import type { PanelConfig, ResizableOrientation } from './types'

type DragState = {
	handleIndex: number
	startPos: number
	startSizes: number[]
	availableSize: number
}

/**
 * Redistributes a pair of adjacent panel sizes so both stay within their
 * min/max while their sum is preserved. Falls back to the left panel's own
 * bounds when the pair is over-constrained.
 *
 * @internal
 */
function clampPair(
	sizes: number[],
	leftIdx: number,
	rightIdx: number,
	constraints: PanelConfig[],
): number[] {
	const result = [...sizes]

	const total = (sizes[leftIdx] ?? 0) + (sizes[rightIdx] ?? 0)

	const lc = constraints[leftIdx]
	const rc = constraints[rightIdx]

	let left = result[leftIdx] ?? 0

	// Clamp into the interval where BOTH sides' constraints hold: left's own
	// bounds intersected with the complement of right's.
	const lcMin = lc?.minSize ?? 0
	const lcMax = lc?.maxSize ?? Number.POSITIVE_INFINITY
	const rcMin = rc?.minSize ?? 0
	const rcMax = rc?.maxSize ?? Number.POSITIVE_INFINITY

	const feasibleMin = Math.max(lcMin, total - rcMax)
	const feasibleMax = Math.min(lcMax, total - rcMin)

	// Over-constrained pairs have no feasible interval; left's own bounds win.
	left =
		feasibleMin <= feasibleMax ? clamp(left, feasibleMin, feasibleMax) : clamp(left, lcMin, lcMax)

	result[leftIdx] = left
	result[rightIdx] = total - left

	return result
}

type PanelResize = {
	groupRef: RefObject<HTMLDivElement | null>
	orientation: ResizableOrientation
	panelConfigs: PanelConfig[]
	onSizesChange?: (sizes: number[]) => void
}

/**
 * Resize engine for {@link ResizableGroup}: normalized panel sizes, the active
 * drag index, and the pointer/keyboard `startDrag`/`resize` actions. Sizes are
 * percentages summing to 100; pointer drags attach document listeners and
 * redistribute adjacent panels within their min/max via `clampPair`.
 *
 * @internal
 */
export function useResizablePanel({
	groupRef,
	orientation,
	panelConfigs,
	onSizesChange,
}: PanelResize) {
	const dragRef = useRef<DragState | null>(null)
	const cleanupRef = useRef<(() => void) | null>(null)
	const orientationRef = useRef(orientation)

	orientationRef.current = orientation

	const constraintsRef = useRef(panelConfigs)

	constraintsRef.current = panelConfigs

	// Initialize sizes from panel defaults, normalized to 100%.
	const [sizes, setSizes] = useState(() => {
		const raw = panelConfigs.map((c) => c.defaultSize)

		const total = raw.reduce((sum, s) => sum + s, 0)

		return total > 0 ? raw.map((s) => (s / total) * 100) : raw
	})

	const sizesRef = useRef(sizes)

	sizesRef.current = sizes

	// Re-derives sizes when panels are added/removed, keeping the sizes array
	// aligned with the current panel set. State adjusts during render, not in
	// an effect; an effect shows one frame of misaligned layout.
	const prevCountRef = useRef(panelConfigs.length)

	if (prevCountRef.current !== panelConfigs.length) {
		prevCountRef.current = panelConfigs.length

		const raw = panelConfigs.map((c) => c.defaultSize)

		const total = raw.reduce((sum, s) => sum + s, 0)

		const normalized = total > 0 ? raw.map((s) => (s / total) * 100) : raw

		sizesRef.current = normalized

		setSizes(normalized)
	}

	const [dragging, setDragging] = useState<number | null>(null)

	const onSizesChangeRef = useRef(onSizesChange)

	onSizesChangeRef.current = onSizesChange

	const resize = useCallback((handleIndex: number, delta: number) => {
		const leftIdx = handleIndex
		const rightIdx = handleIndex + 1

		const prev = sizesRef.current

		if (prev[leftIdx] === undefined || prev[rightIdx] === undefined) return

		const next = [...prev]

		next[leftIdx] = prev[leftIdx] + delta
		next[rightIdx] = prev[rightIdx] - delta

		const clamped = clampPair(next, leftIdx, rightIdx, constraintsRef.current)

		// Side effects run here, not inside the setSizes updater: StrictMode
		// double-invokes the updater, firing onSizesChange twice per keypress.
		sizesRef.current = clamped

		setSizes(clamped)

		onSizesChangeRef.current?.(clamped)
	}, [])

	const startDrag = useCallback(
		(handleIndex: number, event: ReactPointerEvent) => {
			const group = groupRef.current

			if (!group || event.button !== 0) return

			event.preventDefault()

			const orient = orientationRef.current

			const rect = group.getBoundingClientRect()

			const totalSize = orient === 'horizontal' ? rect.width : rect.height

			// Handle widths don't count toward the draggable size.
			let handleWidth = 0

			group.querySelectorAll<HTMLElement>('[data-slot="resizable-handle"]').forEach((h) => {
				const hr = h.getBoundingClientRect()

				handleWidth += orient === 'horizontal' ? hr.width : hr.height
			})

			const availableSize = totalSize - handleWidth

			if (availableSize <= 0) return

			const startPos = orient === 'horizontal' ? event.clientX : event.clientY

			dragRef.current = {
				handleIndex,
				startPos,
				startSizes: [...sizesRef.current],
				availableSize,
			}

			setDragging(handleIndex)

			const onMove = (event: PointerEvent) => {
				const drag = dragRef.current

				if (!drag) return

				const currentOrient = orientationRef.current

				const currentPos = currentOrient === 'horizontal' ? event.clientX : event.clientY

				const deltaPercent = ((currentPos - drag.startPos) / drag.availableSize) * 100

				const leftIdx = drag.handleIndex
				const rightIdx = drag.handleIndex + 1

				const next = [...drag.startSizes]

				next[leftIdx] = (drag.startSizes[leftIdx] ?? 0) + deltaPercent
				next[rightIdx] = (drag.startSizes[rightIdx] ?? 0) - deltaPercent

				const clamped = clampPair(next, leftIdx, rightIdx, constraintsRef.current)

				sizesRef.current = clamped

				setSizes(clamped)

				onSizesChangeRef.current?.(clamped)
			}

			const onUp = () => {
				dragRef.current = null

				setDragging(null)

				document.removeEventListener('pointermove', onMove)
				document.removeEventListener('pointerup', onUp)
				document.removeEventListener('pointercancel', onUp)
				document.removeEventListener('contextmenu', onUp)

				cleanupRef.current = null
			}

			document.addEventListener('pointermove', onMove)
			document.addEventListener('pointerup', onUp)
			// A cancelled pointer (OS gesture, pen leaving range) never fires
			// pointerup; without this the drag flag stays set and buttonless
			// movement keeps resizing.
			document.addEventListener('pointercancel', onUp)
			document.addEventListener('contextmenu', onUp)

			cleanupRef.current = () => {
				document.removeEventListener('pointermove', onMove)
				document.removeEventListener('pointerup', onUp)
				document.removeEventListener('pointercancel', onUp)
				document.removeEventListener('contextmenu', onUp)
			}
		},
		[groupRef],
	)

	// Clean up document listeners on unmount.
	useEffect(() => {
		return () => cleanupRef.current?.()
	}, [])

	return { sizes, dragging, startDrag, resize }
}
