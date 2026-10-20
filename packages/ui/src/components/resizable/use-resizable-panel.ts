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
import type { Orientation } from '../../types'
import { clamp } from '../../utilities'
import { holdTextSelection } from '../../utilities/hold-text-selection'
import { createPressOwner } from '../../utilities/primary-press'
import type { PanelConfig } from './types'

type DragState = {
	handleIndex: number
	startPos: number
	startSizes: number[]
	availableSize: number
	/** Whether the group lays out right to left. A horizontal drag then mirrors. */
	rtl: boolean
	/** The axis that `startPos` and `availableSize` are measured on. */
	orientation: Orientation
}

/**
 * How far a drag has moved the handle, as a percentage of the group: positive
 * grows the panel before the handle. In a right-to-left row that panel is on
 * the right, so a move to the right shrinks it.
 *
 * @internal
 */
function dragDeltaPercent(drag: DragState, event: PointerEvent): number {
	const horizontal = drag.orientation === 'horizontal'

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
	leftIndex: number,
	constraints: PanelConfig[],
): { min: number; max: number; total: number } {
	const rightIndex = leftIndex + 1

	const total = (sizes[leftIndex] ?? 0) + (sizes[rightIndex] ?? 0)

	const left = constraints[leftIndex]
	const right = constraints[rightIndex]

	// The left panel's own bounds, intersected with the complement of the
	// bounds of the right panel.
	const leftMin = left?.minSize ?? 0
	const leftMax = left?.maxSize ?? Number.POSITIVE_INFINITY
	const rightMin = right?.minSize ?? 0
	const rightMax = right?.maxSize ?? Number.POSITIVE_INFINITY

	const feasibleMin = Math.max(leftMin, total - rightMax)
	const feasibleMax = Math.min(leftMax, total - rightMin)

	return feasibleMin <= feasibleMax
		? { min: feasibleMin, max: feasibleMax, total }
		: { min: leftMin, max: leftMax, total }
}

/**
 * Redistributes a pair of adjacent panel sizes so both stay within their
 * min/max while their sum is preserved. Falls back to the left panel's own
 * bounds when the pair is over-constrained.
 *
 * @internal
 */
function clampPair(sizes: number[], leftIndex: number, constraints: PanelConfig[]): number[] {
	const { min, max, total } = pairRange(sizes, leftIndex, constraints)

	const left = clamp(sizes[leftIndex] ?? 0, min, max)

	const result = [...sizes]

	result[leftIndex] = left
	result[leftIndex + 1] = total - left

	return result
}

/** The tolerance, in percent, for a seed size that is in its bounds or fills the group. */
const SEED_EPSILON = 1e-9

/** Whether each size is in the min/max of its panel, in the tolerance. */
function meetsBounds(sizes: number[], configs: PanelConfig[]): boolean {
	return sizes.every((size, index) => {
		const config = configs[index]

		return (
			size >= (config?.minSize ?? 0) - SEED_EPSILON &&
			size <= (config?.maxSize ?? Number.POSITIVE_INFINITY) + SEED_EPSILON
		)
	})
}

function sum(values: number[]): number {
	return values.reduce((acc, value) => acc + value, 0)
}

/**
 * A global fill of 100% against the min/max of each panel. The free panels
 * share the remainder in proportion to their weights. When a share breaks a
 * bound, the side with the larger break (the minSizes or the maxSizes) goes to
 * its bounds, and the fill repeats. A panel with no weight stays at its
 * minSize.
 *
 * @param base - The normalized weights, as percentages summing to 100.
 * @returns The filled sizes, or `null` when no fill gives a sum of 100.
 * @internal
 */
function fillBounds(base: number[], configs: PanelConfig[]): number[] | null {
	const fixed = configs.map((config, index) => ((base[index] ?? 0) > 0 ? null : config.minSize))

	for (let round = 0; round <= configs.length; round++) {
		let freeWeight = 0
		let remainder = 100

		fixed.forEach((size, index) => {
			if (size === null) freeWeight += base[index] ?? 0
			else remainder -= size
		})

		if (freeWeight <= 0) {
			return Math.abs(remainder) <= SEED_EPSILON ? fixed.map((size) => size ?? 0) : null
		}

		const sizes = fixed.map((size, index) => size ?? (remainder * (base[index] ?? 0)) / freeWeight)

		let under = 0
		let over = 0

		configs.forEach(({ minSize, maxSize }, index) => {
			const size = sizes[index] ?? 0

			if (fixed[index] !== null) return

			under += Math.max(0, minSize - size)
			over += Math.max(0, size - maxSize)
		})

		if (under <= SEED_EPSILON && over <= SEED_EPSILON) return sizes

		configs.forEach(({ minSize, maxSize }, index) => {
			const size = sizes[index] ?? 0

			if (fixed[index] !== null) return

			if (under > over && size < minSize) fixed[index] = minSize
			else if (under <= over && size > maxSize) fixed[index] = maxSize
		})
	}

	return null
}

/**
 * The first sizes of the panels, as percentages summing to 100; identity is
 * not preserved. Each `defaultSize` is a weight, so the sizes keep the ratio
 * of the weights. Then each adjacent pair clamps in order from the start of
 * the group. Thus each panel goes into its min/max, and the next panel takes
 * the difference. The last panel gives the difference to the panel before it.
 *
 * The pairwise pass cannot move slack past a panel at a bound. When its
 * result still breaks a bound, a global fill replaces it: each panel
 * goes into its min/max, and the panels with slack share the remainder in
 * proportion to their weights. When no layout meets every bound, the seed
 * keeps the result of the pairwise pass. That result sums to 100, and one
 * or more panels are not in their min/max.
 *
 * @internal
 */
function seedSizes(configs: PanelConfig[]): number[] {
	const weights = configs.map((config) => config.defaultSize)

	const total = sum(weights)

	const base = total > 0 ? weights.map((weight) => (weight / total) * 100) : weights

	let sizes = base

	for (let leftIndex = 0; leftIndex < sizes.length - 1; leftIndex++) {
		sizes = clampPair(sizes, leftIndex, configs)
	}

	if (meetsBounds(sizes, configs)) return sizes

	const filled = fillBounds(base, configs)

	return filled && meetsBounds(filled, configs) ? filled : sizes
}

type PanelResize = {
	groupRef: RefObject<HTMLDivElement | null>
	orientation: Orientation
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

	// The pointer that drives the drag, on whichever handle it pressed.
	const [press] = useState(createPressOwner)
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
	// each move, not the ones of the render that started it. A changed
	// orientation ends the drag, because its start and length are on the old axis.
	const readLayout = useStableEvent(() => ({ orientation, constraints: panelConfigs }))

	// A discrete event commits before the next one, so each step reads the sizes
	// that the last step committed.
	const resize = useStableEvent((handleIndex: number, delta: number) => {
		const leftIndex = handleIndex
		const rightIndex = handleIndex + 1

		const prev = sizes

		if (prev[leftIndex] === undefined || prev[rightIndex] === undefined) return

		const next = [...prev]

		next[leftIndex] = prev[leftIndex] + delta
		next[rightIndex] = prev[rightIndex] - delta

		const clamped = clampPair(next, leftIndex, panelConfigs)

		// Side effects run here, not inside the setSizes updater: StrictMode
		// double-invokes the updater, firing onSizesChange twice per keypress.
		setSizes(clamped)

		reportSizes(clamped)
	})

	const startDrag = useStableEvent((handleIndex: number, event: ReactPointerEvent) => {
		const group = groupRef.current

		// A palm that lands on any handle mid-drag takes no drag.
		if (!group || !press.claim(event)) return

		holdTextSelection(event)

		event.preventDefault()

		const rect = group.getBoundingClientRect()

		const totalSize = orientation === 'horizontal' ? rect.width : rect.height

		// Handle widths don't count toward the draggable size.
		let handleWidth = 0

		for (const handle of group.querySelectorAll<HTMLElement>('[data-slot="resizable-handle"]')) {
			const box = handle.getBoundingClientRect()

			handleWidth += orientation === 'horizontal' ? box.width : box.height
		}

		const availableSize = totalSize - handleWidth

		if (availableSize <= 0) {
			press.release()

			return
		}

		// Capture holds the handle as the pointer target for the whole drag, so
		// the panel content under the pointer shows no hover. `useDragCursor`
		// holds the resize cursor. The browser releases the capture on pointerup
		// and pointercancel.
		event.currentTarget.setPointerCapture(event.pointerId)

		const startPos = orientation === 'horizontal' ? event.clientX : event.clientY

		dragRef.current = {
			handleIndex,
			startPos,
			startSizes: [...sizes],
			availableSize,
			rtl: isRtl(group),
			orientation,
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

			const { orientation: currentOrientation, constraints } = readLayout()

			// A coordinate on the new axis does not agree with a start and a length
			// on the old one. End the drag at the last sizes, and calculate no delta.
			if (currentOrientation !== drag.orientation) {
				onUp()

				return
			}

			const deltaPercent = dragDeltaPercent(drag, event)

			const leftIndex = drag.handleIndex
			const rightIndex = drag.handleIndex + 1

			const next = [...drag.startSizes]

			next[leftIndex] = (drag.startSizes[leftIndex] ?? 0) + deltaPercent
			next[rightIndex] = (drag.startSizes[rightIndex] ?? 0) - deltaPercent

			pending = clampPair(next, leftIndex, constraints)

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

			press.release()

			cleanupRef.current = null

			/*
			 * Last, and that ordering is what keeps the bracket balanced without a latch.
			 * The abort drops all four listeners, so a canceled pointer that also fires
			 * pointerup cannot re-enter. Clearing `cleanupRef` disarms the unmount exit,
			 * so a consumer starting a fresh drag from inside this
			 * callback gets a clean one. The flush above has already delivered the settled sizes
			 * through `onSizesChange`.
			 */
			reportResizeEnd(handleIndex)
		}

		// One controller for the drag's whole listener set: `onUp` and the
		// unmount path in `cleanupRef` tear down the same four listeners, and
		// a single `abort()` cannot drift from the add list the way two hand-kept
		// removal lists can.
		const controller = new AbortController()

		const { signal } = controller

		// Only the pointer that started the drag moves it or ends it. A second
		// finger on the panel content sends its own events to the document, and
		// they do nothing. `onUp` takes no event, so the filter is here.
		const onOwnMove = (moveEvent: PointerEvent) => {
			if (press.owns(moveEvent)) onMove(moveEvent)
		}

		const onOwnUp = (upEvent: PointerEvent) => {
			if (press.owns(upEvent)) onUp()
		}

		document.addEventListener('pointermove', onOwnMove, { signal })
		document.addEventListener('pointerup', onOwnUp, { signal })
		// A canceled pointer (OS gesture, pen leaving range) never fires
		// pointerup; without this the drag flag stays set and buttonless
		// movement keeps resizing.
		document.addEventListener('pointercancel', onOwnUp, { signal })
		document.addEventListener('contextmenu', onUp, { signal })

		cleanupRef.current = () => {
			if (frame !== null) cancelAnimationFrame(frame)

			controller.abort()

			press.release()

			// The unmount exit closes the bracket too. `onUp` clears
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
