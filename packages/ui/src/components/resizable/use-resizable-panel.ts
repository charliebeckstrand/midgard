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
	let right = result[rightIdx] ?? 0

	if (lc) {
		left = clamp(left, lc.minSize, lc.maxSize)
	}

	right = total - left

	if (rc) {
		right = clamp(right, rc.minSize, rc.maxSize)
	}

	left = total - right

	result[leftIdx] = left
	result[rightIdx] = right

	return result
}

type PanelResize = {
	groupRef: RefObject<HTMLDivElement | null>
	orientation: ResizableOrientation
	panelConfigs: PanelConfig[]
	onSizesChange?: (sizes: number[]) => void
}

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
	// aligned with the current panel set. State is adjusted during render, not
	// in an effect, to avoid a frame of misaligned layout.
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

		setSizes((prev) => {
			if (prev[leftIdx] === undefined || prev[rightIdx] === undefined) return prev

			const next = [...prev]

			next[leftIdx] = prev[leftIdx] + delta
			next[rightIdx] = prev[rightIdx] - delta

			const clamped = clampPair(next, leftIdx, rightIdx, constraintsRef.current)

			sizesRef.current = clamped

			onSizesChangeRef.current?.(clamped)

			return clamped
		})
	}, [])

	const startDrag = useCallback(
		(handleIndex: number, e: ReactPointerEvent) => {
			const group = groupRef.current

			if (!group || e.button !== 0) return

			e.preventDefault()

			const orient = orientationRef.current

			const rect = group.getBoundingClientRect()

			const totalSize = orient === 'horizontal' ? rect.width : rect.height

			// Subtract handle widths for accurate deltas.
			let handleWidth = 0

			group.querySelectorAll<HTMLElement>('[data-slot="resizable-handle"]').forEach((h) => {
				const hr = h.getBoundingClientRect()

				handleWidth += orient === 'horizontal' ? hr.width : hr.height
			})

			const availableSize = totalSize - handleWidth

			if (availableSize <= 0) return

			const startPos = orient === 'horizontal' ? e.clientX : e.clientY

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
				document.removeEventListener('contextmenu', onUp)

				cleanupRef.current = null
			}

			document.addEventListener('pointermove', onMove)
			document.addEventListener('pointerup', onUp)
			document.addEventListener('contextmenu', onUp)

			cleanupRef.current = () => {
				document.removeEventListener('pointermove', onMove)
				document.removeEventListener('pointerup', onUp)
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
