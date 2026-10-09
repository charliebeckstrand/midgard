'use client'

import {
	type PointerEvent as ReactPointerEvent,
	type RefObject,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
} from 'react'
import { useDragCursor } from '../../hooks'
import { isRtl } from '../../hooks/a11y/logical-arrow'
import { useStableEvent } from '../../hooks/use-stable-event'
import { clamp } from '../../utilities'
import { isPrimaryPress } from '../../utilities/primary-press'
import type { PanelConfig, ResizableOrientation } from './types'

type DragState = {
	handleIndex: number
	startPos: number
	startSizes: number[]
	availableSize: number
	/** Whether the group lays out right to left. A horizontal drag then mirrors. */
	rtl: boolean
}

/**
 * How far a drag has moved the handle, as a percentage of the group: positive
 * grows the panel before the handle. In a right-to-left row that panel is on
 * the right, so a move to the right shrinks it.
 *
 * @internal
 */
function dragDeltaPercent(
	drag: DragState,
	event: PointerEvent,
	orientation: ResizableOrientation,
): number {
	const horizontal = orientation === 'horizontal'

	const pos = horizontal ? event.clientX : event.clientY

	const sign = horizontal && drag.rtl ? -1 : 1

	return ((pos - drag.startPos) / drag.availableSize) * 100 * sign
}

/**
 * The interval where the left panel of a pair can go while both panels keep
 * their min/max and the pair keeps its sum. An over-constrained pair has no
 * such interval, so the left panel's own bounds apply.
 *
 * @returns The `min` and `max` of the left panel, and the `total` of the pair.
 * @internal
 */
export function pairRange(
	sizes: number[],
	leftIdx: number,
	constraints: PanelConfig[],
): { min: number; max: number; total: number } {
	const rightIdx = leftIdx + 1

	const total = (sizes[leftIdx] ?? 0) + (sizes[rightIdx] ?? 0)

	const lc = constraints[leftIdx]
	const rc = constraints[rightIdx]

	// The left panel's own bounds, intersected with the complement of the
	// bounds of the right panel.
	const lcMin = lc?.minSize ?? 0
	const lcMax = lc?.maxSize ?? Number.POSITIVE_INFINITY
	const rcMin = rc?.minSize ?? 0
	const rcMax = rc?.maxSize ?? Number.POSITIVE_INFINITY

	const feasibleMin = Math.max(lcMin, total - rcMax)
	const feasibleMax = Math.min(lcMax, total - rcMin)

	return feasibleMin <= feasibleMax
		? { min: feasibleMin, max: feasibleMax, total }
		: { min: lcMin, max: lcMax, total }
}

/**
 * Redistributes a pair of adjacent panel sizes so both stay within their
 * min/max while their sum is preserved. Falls back to the left panel's own
 * bounds when the pair is over-constrained.
 *
 * @internal
 */
function clampPair(sizes: number[], leftIdx: number, constraints: PanelConfig[]): number[] {
	const { min, max, total } = pairRange(sizes, leftIdx, constraints)

	const left = clamp(sizes[leftIdx] ?? 0, min, max)

	const result = [...sizes]

	result[leftIdx] = left
	result[leftIdx + 1] = total - left

	return result
}

/**
 * The first sizes of the panels, as percentages summing to 100; identity is
 * not preserved. Each `defaultSize` is a weight, so the sizes keep the ratio
 * of the weights. Then each adjacent pair clamps in order from the start of
 * the group. Thus each panel goes into its min/max, and the next panel takes
 * the difference. The last panel gives the difference to the panel before it.
 *
 * @internal
 */
function seedSizes(configs: PanelConfig[]): number[] {
	const raw = configs.map((c) => c.defaultSize)

	const total = raw.reduce((sum, s) => sum + s, 0)

	let sizes = total > 0 ? raw.map((s) => (s / total) * 100) : raw

	for (let leftIdx = 0; leftIdx < sizes.length - 1; leftIdx++) {
		sizes = clampPair(sizes, leftIdx, configs)
	}

	return sizes
}

type PanelResize = {
	groupRef: RefObject<HTMLDivElement | null>
	orientation: ResizableOrientation
	panelConfigs: PanelConfig[]
	onSizesChange?: (sizes: number[]) => void
	onResizeStart?: (handleIndex: number) => void
	onResizeEnd?: (handleIndex: number) => void
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
	onResizeStart,
	onResizeEnd,
}: PanelResize) {
	const dragRef = useRef<DragState | null>(null)
	const cleanupRef = useRef<(() => void) | null>(null)
	// Seed the sizes from the panel defaults: normalized to 100%, then clamped.
	const [sizes, setSizes] = useState(() => seedSizes(panelConfigs))

	// Re-derives sizes when the panel set changes: a panel added, removed, or
	// replaced by another at the same count. The panel keys name the set, so a
	// conditional panel that swaps for another needs a key of its own. State
	// adjusts during render, not in an effect; an effect shows one frame of
	// misaligned layout.
	const panelSet = panelConfigs.map((config) => config.key).join('\u0000')

	const [prevPanelSet, setPrevPanelSet] = useState(panelSet)

	if (prevPanelSet !== panelSet) {
		setPrevPanelSet(panelSet)

		setSizes(seedSizes(panelConfigs))
	}

	const [dragging, setDragging] = useState<number | null>(null)

	useDragCursor(dragging !== null, orientation === 'horizontal' ? 'col-resize' : 'row-resize')

	const reportSizes = useEffectEvent((next: number[]) => onSizesChange?.(next))

	const reportResizeStart = useEffectEvent((handleIndex: number) => onResizeStart?.(handleIndex))

	const reportResizeEnd = useEffectEvent((handleIndex: number) => onResizeEnd?.(handleIndex))

	// A drag reads the orientation and the constraints of the newest render on
	// each move, not the ones of the render that started it.
	const readLayout = useStableEvent(() => ({ orientation, constraints: panelConfigs }))

	// A discrete event commits before the next one, so each step reads the sizes
	// that the last step committed.
	const resize = useStableEvent((handleIndex: number, delta: number) => {
		const leftIdx = handleIndex
		const rightIdx = handleIndex + 1

		const prev = sizes

		if (prev[leftIdx] === undefined || prev[rightIdx] === undefined) return

		const next = [...prev]

		next[leftIdx] = prev[leftIdx] + delta
		next[rightIdx] = prev[rightIdx] - delta

		const clamped = clampPair(next, leftIdx, panelConfigs)

		// Side effects run here, not inside the setSizes updater: StrictMode
		// double-invokes the updater, firing onSizesChange twice per keypress.
		setSizes(clamped)

		reportSizes(clamped)
	})

	const startDrag = useStableEvent((handleIndex: number, event: ReactPointerEvent) => {
		const group = groupRef.current

		if (!group || !isPrimaryPress(event)) return

		event.preventDefault()

		const orient = orientation

		const rect = group.getBoundingClientRect()

		const totalSize = orient === 'horizontal' ? rect.width : rect.height

		// Handle widths don't count toward the draggable size.
		let handleWidth = 0

		for (const handle of group.querySelectorAll<HTMLElement>('[data-slot="resizable-handle"]')) {
			const box = handle.getBoundingClientRect()

			handleWidth += orient === 'horizontal' ? box.width : box.height
		}

		const availableSize = totalSize - handleWidth

		if (availableSize <= 0) return

		// A new drag supersedes any still-active one (a second pointer landing on
		// another handle before the first lifts): tear down the prior drag's
		// listeners first, or they outlive cleanupRef — which holds only the
		// latest — and fire a post-unmount setSizes. Mirrors beginScrollbarDrag.
		// Placed after the guard so a pointerdown that can't start a drag (group
		// collapsed to <= handle size) leaves the still-live drag intact.
		cleanupRef.current?.()

		// Capture holds the handle as the pointer target for the whole drag, so
		// the panel content under the pointer shows no hover. `useDragCursor`
		// holds the resize cursor. The browser releases the capture on pointerup
		// and pointercancel.
		event.currentTarget.setPointerCapture(event.pointerId)

		const startPos = orient === 'horizontal' ? event.clientX : event.clientY

		dragRef.current = {
			handleIndex,
			startPos,
			startSizes: [...sizes],
			availableSize,
			rtl: isRtl(group),
		}

		setDragging(handleIndex)

		reportResizeStart(handleIndex)

		// Pointermove can outpace the frame rate (coalesced move bursts), and each
		// event would otherwise commit React state + fire onSizesChange, forcing a
		// synchronous layout per event. Coalesce to one commit per frame: stash the
		// latest clamped sizes and let a single rAF flush them.
		let frame: number | null = null
		let pending: number[] | null = null

		const commitPending = () => {
			frame = null

			if (!pending) return

			const clamped = pending

			pending = null

			setSizes(clamped)

			reportSizes(clamped)
		}

		const onMove = (event: PointerEvent) => {
			const drag = dragRef.current

			if (!drag) return

			const { orientation: currentOrient, constraints } = readLayout()

			const deltaPercent = dragDeltaPercent(drag, event, currentOrient)

			const leftIdx = drag.handleIndex
			const rightIdx = drag.handleIndex + 1

			const next = [...drag.startSizes]

			next[leftIdx] = (drag.startSizes[leftIdx] ?? 0) + deltaPercent
			next[rightIdx] = (drag.startSizes[rightIdx] ?? 0) - deltaPercent

			pending = clampPair(next, leftIdx, constraints)

			if (frame === null) frame = requestAnimationFrame(commitPending)
		}

		const onUp = () => {
			dragRef.current = null

			setDragging(null)

			// Flush the final position synchronously so the last move isn't dropped
			// when the pointer lifts before the pending frame runs.
			if (frame !== null) {
				cancelAnimationFrame(frame)

				frame = null
			}

			commitPending()

			controller.abort()

			cleanupRef.current = null

			/*
			 * Last, and that ordering is what keeps the bracket balanced without a latch.
			 * The abort drops all four listeners, so a canceled pointer that also fires
			 * pointerup cannot re-enter. Clearing `cleanupRef` disarms the supersede and
			 * unmount exits, so a consumer starting a fresh drag from inside this
			 * callback gets a clean one. The flush above has already delivered the settled sizes
			 * through `onSizesChange`.
			 */
			reportResizeEnd(handleIndex)
		}

		// One controller for the drag's whole listener set: `onUp` and the
		// supersede path in `cleanupRef` tear down the same four listeners, and
		// a single `abort()` cannot drift from the add list the way two hand-kept
		// removal lists can.
		const controller = new AbortController()

		const { signal } = controller

		document.addEventListener('pointermove', onMove, { signal })
		document.addEventListener('pointerup', onUp, { signal })
		// A canceled pointer (OS gesture, pen leaving range) never fires
		// pointerup; without this the drag flag stays set and buttonless
		// movement keeps resizing.
		document.addEventListener('pointercancel', onUp, { signal })
		document.addEventListener('contextmenu', onUp, { signal })

		cleanupRef.current = () => {
			if (frame !== null) cancelAnimationFrame(frame)

			controller.abort()

			// The supersede and unmount exits close the bracket too. `onUp` clears
			// `cleanupRef` before it reports, so a normal lift never reaches here.
			reportResizeEnd(handleIndex)
		}
	})

	// Clean up document listeners on unmount.
	useEffect(() => {
		return () => cleanupRef.current?.()
	}, [])

	return { sizes, dragging, startDrag, resize }
}
