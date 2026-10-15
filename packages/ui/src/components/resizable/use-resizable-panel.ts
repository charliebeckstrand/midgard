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
import { holdTextSelection } from '../../utilities/hold-text-selection'
import { isPrimaryPress } from '../../utilities/primary-press'
import type { PanelConfig, ResizableOrientation } from './types'

type DragState = {
	handleIndex: number
	startPos: number
	startSizes: number[]
	availableSize: number
	/** Whether the group lays out right to left. A horizontal drag then mirrors. */
	rtl: boolean
	/** The pointer that started the drag. The events of another pointer do not move or end it. */
	pointerId: number
	/** The axis that `startPos` and `availableSize` are measured on. */
	orientation: ResizableOrientation
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

/** The tolerance, in percent, for a seed size that is stable or in its bounds. */
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

/**
 * Repeats a forward pass and a backward pass of `clampPair` until no size
 * changes, for at most one round for each panel. Each pair keeps its sum, so
 * the sizes keep their sum.
 *
 * @internal
 */
function settlePairs(start: number[], configs: PanelConfig[]): number[] {
	let sizes = start

	for (let round = 0; round < sizes.length; round++) {
		const before = sizes

		for (let leftIndex = 0; leftIndex < sizes.length - 1; leftIndex++) {
			sizes = clampPair(sizes, leftIndex, configs)
		}

		for (let leftIndex = sizes.length - 2; leftIndex >= 0; leftIndex--) {
			sizes = clampPair(sizes, leftIndex, configs)
		}

		if (sizes.every((size, index) => Math.abs(size - (before[index] ?? 0)) <= SEED_EPSILON)) break
	}

	return sizes
}

/** One panel of a global fill: its normalized weight and its bounds. */
type FillPanel = { weight: number; min: number; max: number }

/** The sizes of a global fill at one `scale`. A panel with no weight stays at its minSize. */
function fillAt(panels: FillPanel[], scale: number): number[] {
	return panels.map(({ weight, min, max }) => clamp(weight > 0 ? scale * weight : 0, min, max))
}

function sumOf(sizes: number[]): number {
	return sizes.reduce((acc, size) => acc + size, 0)
}

/**
 * The scales where a panel of a global fill reaches a bound, sorted, from 0.
 * The sum of the fill is linear in the scale between two breakpoints. The
 * last breakpoint is `Infinity`, so the last segment has no upper end.
 */
function fillBreakpoints(panels: FillPanel[]): number[] {
	const breakpoints = [0]

	for (const { weight, min, max } of panels) {
		if (weight <= 0) continue

		for (const bound of [min, max]) {
			if (Number.isFinite(bound) && bound > 0) breakpoints.push(bound / weight)
		}
	}

	breakpoints.sort((a, b) => a - b)

	breakpoints.push(Number.POSITIVE_INFINITY)

	return breakpoints
}

/**
 * Solves a global fill in the open segment from `lower` to `upper`. A panel
 * strictly inside its bounds there is free, and each other panel keeps its
 * bound. The free panels share the remainder in proportion to their weights.
 *
 * @returns The sizes, or `null` when no panel is free.
 */
function fillSegment(panels: FillPanel[], lower: number, upper: number): number[] | null {
	const probe = fillAt(panels, Number.isFinite(upper) ? (lower + upper) / 2 : lower + 1)

	const free = probe.map((size, index) => {
		const { min, max } = panels[index] ?? { min: 0, max: 0 }

		return size > min && size < max
	})

	const freeWeight = panels.reduce(
		(acc, { weight }, index) => (free[index] ? acc + weight : acc),
		0,
	)

	if (freeWeight <= 0) return null

	const remainder = 100 - sumOf(probe.filter((_, index) => !free[index]))

	return probe.map((size, index) =>
		free[index] ? (remainder * (panels[index]?.weight ?? 0)) / freeWeight : size,
	)
}

/**
 * A global fill of 100% against the min/max of each panel. Each panel takes
 * `scale × base` clamped into its own bounds, for the one `scale` that makes
 * the sum 100. Thus each panel at a bound keeps that bound, and the panels with
 * slack share the remainder in proportion to their weights.
 *
 * @param base - The normalized weights, as percentages summing to 100.
 * @returns The filled sizes, or `null` when no scale gives a sum of 100.
 * @internal
 */
function fillBounds(base: number[], configs: PanelConfig[]): number[] | null {
	const panels = configs.map((config, index) => ({
		weight: base[index] ?? 0,
		min: config.minSize,
		max: config.maxSize,
	}))

	const floor = sumOf(fillAt(panels, 0))

	// The minSizes alone fill the group, or more than fill it.
	if (floor >= 100 - SEED_EPSILON) {
		return floor <= 100 + SEED_EPSILON ? fillAt(panels, 0) : null
	}

	const breakpoints = fillBreakpoints(panels)

	for (let index = 1; index < breakpoints.length; index++) {
		const upper = breakpoints[index] ?? 0

		if (sumOf(fillAt(panels, upper)) >= 100 - SEED_EPSILON) {
			return fillSegment(panels, breakpoints[index - 1] ?? 0, upper)
		}
	}

	return null
}

/**
 * The first sizes of the panels, as percentages summing to 100; identity is
 * not preserved. Each `defaultSize` is a weight, so the sizes keep the ratio
 * of the weights. Then a forward pass and a backward pass of adjacent pairs
 * clamp the sizes, and repeat until no size changes. Thus each panel goes into
 * its min/max, and a neighbor panel takes the difference.
 *
 * The pairwise passes cannot move slack past a panel at a bound. When the
 * stable result still breaks a bound, a global fill replaces it: each panel
 * goes into its min/max, and the panels with slack share the remainder in
 * proportion to their weights. When no layout meets every bound, the seed
 * keeps the result of the pairwise passes. That result sums to 100, and one
 * or more panels are not in their min/max.
 *
 * @internal
 */
function seedSizes(configs: PanelConfig[]): number[] {
	const weights = configs.map((config) => config.defaultSize)

	const total = weights.reduce((sum, weight) => sum + weight, 0)

	const base = total > 0 ? weights.map((weight) => (weight / total) * 100) : weights

	const sizes = settlePairs(base, configs)

	if (meetsBounds(sizes, configs)) return sizes

	const filled = fillBounds(base, configs)

	return filled && meetsBounds(filled, configs) ? filled : sizes
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

		if (!group || !isPrimaryPress(event)) return

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

		const startPos = orientation === 'horizontal' ? event.clientX : event.clientY

		dragRef.current = {
			handleIndex,
			startPos,
			startSizes: [...sizes],
			availableSize,
			rtl: isRtl(group),
			pointerId: event.pointerId,
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

		// Only the pointer that started the drag moves it or ends it. A second
		// finger on the panel content sends its own events to the document, and
		// they do nothing. `onUp` takes no event, so the filter is here.
		const { pointerId } = event

		const onOwnMove = (moveEvent: PointerEvent) => {
			if (moveEvent.pointerId === pointerId) onMove(moveEvent)
		}

		const onOwnUp = (upEvent: PointerEvent) => {
			if (upEvent.pointerId === pointerId) onUp()
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
