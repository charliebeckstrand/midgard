'use client'

import { type ComponentProps, type KeyboardEvent, useCallback } from 'react'
import { cn, composeEventHandlers, dataAttr } from '../../core'
import { logicalArrowKey } from '../../hooks/a11y/logical-arrow'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { Splitter } from '../../primitives/splitter/splitter'
import { k } from '../../recipes/kata/resizable'
import { useResizable, useResizableIndex } from './context'
import { pairRange } from './use-resizable-panel'

const messages = defineMessages({
	label: {
		id: 'ui.resizable.label',
		defaultMessage: 'Resize',
		description:
			'The name of the bar between two panels that changes their sizes, by a drag or by the arrow keys.',
	},
})

/**
 * Props for {@link ResizableHandle}: an optional accessible name. The root
 * `<hr>` takes the rest. The handle draws its own grip, and keeps its own
 * `role` and `tabIndex`.
 */
export type ResizableHandleProps = Omit<ComponentProps<'hr'>, 'children' | 'role' | 'tabIndex'> & {
	/**
	 * Accessible name; distinguishes multiple handles ("Resize sidebar").
	 * @defaultValue `'Resize'`, in the language of the reader.
	 */
	'aria-label'?: string
}

/** The drag and the keys are the activation of the handle, so a consumer cannot cancel them. @internal */
const alwaysResize = { checkForDefaultPrevented: false }

/**
 * Resize delta for a key press: arrows move by `step` along the panel axis,
 * Home / End jump to the bounds. Returns 0 for keys that don't resize. A
 * horizontal arrow comes in the reading order, after `logicalArrowKey`.
 *
 * @internal
 */
function resizeDeltaForKey(key: string, isHorizontal: boolean, step: number): number {
	const increase = isHorizontal ? 'ArrowRight' : 'ArrowDown'
	const decrease = isHorizontal ? 'ArrowLeft' : 'ArrowUp'

	if (key === increase) return step

	if (key === decrease) return -step

	if (key === 'Home') return -100

	if (key === 'End') return 100

	return 0
}

/**
 * Draggable divider between two {@link ResizablePanel}s. Renders a focusable
 * `<hr>`, a separator whose `aria-orientation` is perpendicular to the group
 * axis. A drag or the arrow keys adjust the adjacent panel within its min and
 * max bounds. Shift takes a larger step, and Home/End reach the extremes. In a
 * right-to-left group the panels start on the right, so the horizontal arrows
 * and the drag mirror: ArrowLeft and a move to the left grow the panel before
 * the handle. `aria-valuemin` and `aria-valuemax` give the range that this
 * panel can reach while both panels keep their bounds. `aria-controls` names
 * the panel before the handle, which is the primary pane of the APG window
 * splitter.
 */
export function ResizableHandle({
	'aria-label': ariaLabel,
	className,
	onPointerDown,
	onKeyDown: onKeyDownProp,
	...props
}: ResizableHandleProps) {
	const intl = useIntl()

	const { orientation, dragging, sizes, panelConfigs, startDrag, resize, panelId } = useResizable()
	const { handleIndex = 0 } = useResizableIndex()

	// The range is where the left panel can go while both panels of the pair
	// keep their bounds, so each end is one that the handle can reach.
	const range = pairRange(sizes, handleIndex, panelConfigs)

	const panelSize = Math.round(sizes[handleIndex] ?? 0)
	const panelMinSize = Math.round(range.min)
	const panelMaxSize = Math.round(range.max)

	const isHorizontal = orientation === 'horizontal'

	const isDragging = dragging === handleIndex

	const onKeyDown = useCallback(
		(event: KeyboardEvent) => {
			const step = event.shiftKey ? 10 : 5

			// In a right-to-left group the first panel is on the right, so the
			// horizontal arrows swap: ArrowLeft grows it.
			const delta = resizeDeltaForKey(
				logicalArrowKey(event.key, event.currentTarget),
				isHorizontal,
				step,
			)

			if (delta !== 0) {
				event.preventDefault()

				resize(handleIndex, delta)
			}
		},
		[handleIndex, isHorizontal, resize],
	)

	return (
		<Splitter
			{...props}
			label={ariaLabel ?? intl.formatMessage(messages.label)}
			// A separator's orientation is its own, not the group's flex axis: the
			// handle between side-by-side panels is a vertical bar.
			orientation={isHorizontal ? 'vertical' : 'horizontal'}
			value={panelSize}
			min={panelMinSize}
			max={panelMaxSize}
			// The primary pane is the panel before the handle, whose size the value gives.
			controls={handleIndex < panelConfigs.length ? panelId(handleIndex) : undefined}
			// The group finds its handles by this anchor, so a consumer cannot replace it.
			data-slot="resizable-handle"
			data-dragging={dataAttr(isDragging)}
			onPointerDown={composeEventHandlers(
				onPointerDown,
				(event) => startDrag(handleIndex, event),
				alwaysResize,
			)}
			onKeyDown={composeEventHandlers(onKeyDownProp, onKeyDown, alwaysResize)}
			className={cn(
				k.handle.base,
				isHorizontal ? k.handle.horizontal : k.handle.vertical,
				k.grip.base,
				isHorizontal ? k.grip.horizontal : k.grip.vertical,
				className,
			)}
		/>
	)
}
