'use client'

import type { ReactElement } from 'react'
import {
	Children,
	cloneElement,
	isValidElement,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { cn } from '../../core'
import { type ResizableDirection, ResizableProvider } from './context'
import { ResizableHandle } from './resizable-handle'
import { ResizablePanel, type ResizablePanelProps } from './resizable-panel'
import { k } from './variants'

type PanelConfig = {
	defaultSize: number
	minSize: number
	maxSize: number
}

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
		left = Math.max(lc.minSize, Math.min(lc.maxSize, left))
	}

	right = total - left

	if (rc) {
		right = Math.max(rc.minSize, Math.min(rc.maxSize, right))
	}

	left = total - right

	result[leftIdx] = left
	result[rightIdx] = right

	return result
}

export type ResizableGroupProps = {
	direction?: ResizableDirection
	onSizesChange?: (sizes: number[]) => void
	className?: string
	children?: React.ReactNode
}

export function ResizableGroup({
	direction = 'horizontal',
	onSizesChange,
	className,
	children,
}: ResizableGroupProps) {
	const groupRef = useRef<HTMLDivElement>(null)
	const dragRef = useRef<DragState | null>(null)
	const cleanupRef = useRef<(() => void) | null>(null)
	const directionRef = useRef(direction)

	directionRef.current = direction

	// Extract panel configs from children
	const childArray = Children.toArray(children)

	const panelConfigs: PanelConfig[] = []

	for (const child of childArray) {
		if (isValidElement(child) && child.type === ResizablePanel) {
			const p = child.props as ResizablePanelProps

			panelConfigs.push({
				defaultSize: p.defaultSize ?? 50,
				minSize: p.minSize ?? 0,
				maxSize: p.maxSize ?? 100,
			})
		}
	}

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

	const startDrag = useCallback((handleIndex: number, e: React.PointerEvent) => {
		const group = groupRef.current

		if (!group || e.button !== 0) return

		e.preventDefault()

		const dir = directionRef.current

		const rect = group.getBoundingClientRect()

		const totalSize = dir === 'horizontal' ? rect.width : rect.height

		// Subtract handle widths for accurate deltas.
		let handleWidth = 0

		group.querySelectorAll<HTMLElement>('[data-slot="resizable-handle"]').forEach((h) => {
			const hr = h.getBoundingClientRect()

			handleWidth += dir === 'horizontal' ? hr.width : hr.height
		})

		const startPos = dir === 'horizontal' ? e.clientX : e.clientY

		dragRef.current = {
			handleIndex,
			startPos,
			startSizes: [...sizesRef.current],
			availableSize: totalSize - handleWidth,
		}

		setDragging(handleIndex)

		const onMove = (event: PointerEvent) => {
			const drag = dragRef.current

			if (!drag) return

			const currentDir = directionRef.current

			const currentPos = currentDir === 'horizontal' ? event.clientX : event.clientY

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
	}, [])

	// Clean up document listeners on unmount.
	useEffect(() => {
		return () => cleanupRef.current?.()
	}, [])

	// Inject sizes and indices into children
	let panelIdx = 0
	let handleIdx = 0

	const mapped = Children.map(children, (child) => {
		if (!isValidElement(child)) return child

		if (child.type === ResizablePanel) {
			const idx = panelIdx++

			return cloneElement(child as ReactElement<Record<string, unknown>>, {
				_size: sizes[idx],
			})
		}

		if (child.type === ResizableHandle) {
			const idx = handleIdx++

			return cloneElement(child as ReactElement<Record<string, unknown>>, {
				_handleIndex: idx,
				_panelSize: Math.round(sizes[idx] ?? 0),
				_panelMinSize: Math.round(panelConfigs[idx]?.minSize ?? 0),
				_panelMaxSize: Math.round(panelConfigs[idx]?.maxSize ?? 100),
			})
		}

		return child
	})

	const contextValue = useMemo(
		() => ({ direction, dragging, startDrag, resize }),
		[direction, dragging, startDrag, resize],
	)

	return (
		<ResizableProvider value={contextValue}>
			<div
				ref={groupRef}
				data-slot="resizable-group"
				data-direction={direction}
				className={cn(k.group, direction === 'horizontal' ? 'flex-row' : 'flex-col', className)}
			>
				{mapped}
			</div>
		</ResizableProvider>
	)
}
