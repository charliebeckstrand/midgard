'use client'

import type { ReactElement } from 'react'
import {
	Children,
	cloneElement,
	isValidElement,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'
import { cn } from '../../core'
import { type ResizableDirection, ResizableProvider, useResizable } from './context'
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

	const total = sizes[leftIdx] + sizes[rightIdx]

	const lc = constraints[leftIdx]
	const rc = constraints[rightIdx]

	let left = result[leftIdx]
	let right = result[rightIdx]

	left = Math.max(lc.minSize, Math.min(lc.maxSize, left))
	right = total - left

	right = Math.max(rc.minSize, Math.min(rc.maxSize, right))
	left = total - right

	result[leftIdx] = left
	result[rightIdx] = right

	return result
}

// ── ResizableGroup ─────────────────────────────────────

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

	// Initialize sizes from panel defaults, normalized to sum to 100
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

		// Subtract handle widths for accurate delta computation
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

			next[leftIdx] = drag.startSizes[leftIdx] + deltaPercent
			next[rightIdx] = drag.startSizes[rightIdx] - deltaPercent

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

	// Cleanup document listeners on unmount
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
			})
		}

		return child
	})

	return (
		<ResizableProvider value={{ direction, dragging, startDrag, resize }}>
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

// ── ResizablePanel ─────────────────────────────────────

export type ResizablePanelProps = {
	defaultSize?: number
	minSize?: number
	maxSize?: number
	className?: string
	children?: React.ReactNode
}

export function ResizablePanel(props: ResizablePanelProps) {
	const { defaultSize = 50, className, children } = props

	const size = (props as Record<string, unknown>)._size ?? defaultSize

	return (
		<div
			data-slot="resizable-panel"
			className={cn(k.panel, className)}
			style={{ flex: `${size} 0 0px` }}
		>
			{children}
		</div>
	)
}

// ── ResizableHandle ────────────────────────────────────

export type ResizableHandleProps = {
	className?: string
}

export function ResizableHandle(props: ResizableHandleProps) {
	const { className } = props

	const handleIndex: number = ((props as Record<string, unknown>)._handleIndex as number) ?? 0

	const { direction, dragging, startDrag, resize } = useResizable()

	const isHorizontal = direction === 'horizontal'

	const isDragging = dragging === handleIndex

	const onKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			const step = e.shiftKey ? 10 : 5

			let delta = 0

			if (isHorizontal) {
				if (e.key === 'ArrowRight') delta = step
				else if (e.key === 'ArrowLeft') delta = -step
			} else {
				if (e.key === 'ArrowDown') delta = step
				else if (e.key === 'ArrowUp') delta = -step
			}

			if (e.key === 'Home') delta = -100

			if (e.key === 'End') delta = 100

			if (delta !== 0) {
				e.preventDefault()

				resize(handleIndex, delta)
			}
		},
		[handleIndex, isHorizontal, resize],
	)

	return (
		// biome-ignore lint/a11y/useSemanticElements: a focusable separator is the correct role for a resize handle
		<div
			data-slot="resizable-handle"
			data-dragging={isDragging ? '' : undefined}
			role="separator"
			aria-orientation={direction}
			aria-valuenow={Math.round(handleIndex)}
			tabIndex={0}
			onPointerDown={(e) => startDrag(handleIndex, e)}
			onKeyDown={onKeyDown}
			className={cn(k.handle, isHorizontal ? k.handleHorizontal : k.handleVertical, className)}
		>
			<span
				aria-hidden
				className={cn(
					k.grip,
					isHorizontal ? k.gripHorizontal : k.gripVertical,
					isDragging && k.gripDragging,
				)}
			/>
		</div>
	)
}
