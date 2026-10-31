'use client'

import {
	type KeyboardCoordinateGetter,
	KeyboardSensor,
	type KeyboardSensorOptions,
	type KeyboardSensorProps,
	PointerSensor,
	type PointerSensorOptions,
	type PointerSensorProps,
	type SensorProps,
	useSensor,
	useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { type PointerEvent as ReactPointerEvent, use, useMemo } from 'react'
import { ReducedMotionContext } from '../primitives/reduced-motion/context'
import { registerDismissLayer } from '../utilities/dismiss-layers'
import { holdTextSelection } from '../utilities/hold-text-selection'
import { matchesMediaQuery, REDUCED_MOTION_QUERY } from '../utilities/media-query'
import { isPrimaryPress } from '../utilities/primary-press'

/**
 * Changes the props of a sensor so that the sensor holds the top of the
 * dismiss stack while its drag runs.
 *
 * Each sensor cancels its drag on Escape. Its key listener goes on the
 * document when the press or the drag starts, after the listener of a dialog
 * or a sheet around the list. Without a layer of its own, the surface sees the
 * press first, as the top layer, and closes with the drag. With the layer, the
 * surface lets the press go, and the next Escape closes it.
 *
 * The layer goes when the drag ends or cancels. If the list unmounts during a
 * drag, the sensor still listens, and its next Escape or drop releases the
 * layer.
 *
 * @internal
 */
function layered<T extends SensorProps<unknown>>(props: T): T {
	let release: (() => void) | undefined

	const settle = (then: () => void) => () => {
		release?.()

		release = undefined

		then()
	}

	return {
		...props,
		onStart: (coordinates) => {
			release = registerDismissLayer({})

			props.onStart(coordinates)
		},
		onEnd: settle(props.onEnd),
		onCancel: settle(props.onCancel),
	}
}

/**
 * Pointer sensor that activates a drag only on a genuine primary press.
 *
 * dnd-kit's stock {@link PointerSensor} filters the secondary button
 * (`button !== 0`) but not a Ctrl-click, which on macOS *is* the secondary
 * click and fires `contextmenu`. Left unfiltered, that press starts a drag
 * whose `pointerup` the opening context menu swallows, stranding the item
 * mid-drag as if it were still held. Rejecting `ctrlKey` (alongside the
 * non-primary buttons the stock sensor already drops) keeps any context-menu
 * gesture from ever beginning a drag. While its drag runs, the sensor holds
 * the top of the dismiss stack (see {@link layered}).
 *
 * @internal
 */
class PrimaryPointerSensor extends PointerSensor {
	static activators: typeof PointerSensor.activators = [
		{
			eventName: 'onPointerDown',
			handler: (
				{ nativeEvent: event }: ReactPointerEvent,
				{ onActivation }: PointerSensorOptions,
			) => {
				if (!isPrimaryPress(event)) return false

				holdTextSelection(event)

				onActivation?.({ event })

				return true
			},
		},
	]

	constructor(props: PointerSensorProps) {
		super(layered(props))
	}
}

/**
 * The options of {@link LayeredKeyboardSensor}: the options of dnd-kit, and
 * whether the Motion setting of the app asks for reduced motion.
 *
 * @internal
 */
type LayeredKeyboardOptions = KeyboardSensorOptions & { reducedMotion: boolean }

/**
 * Keyboard sensor of dnd-kit that holds the top of the dismiss stack while its
 * drag runs (see {@link layered}).
 *
 * dnd-kit makes the sensor when a drag starts. The sensor then reads the
 * platform preference for reduced motion, and a keyboard move scrolls the item
 * into view at once when the reader asks for reduced motion.
 *
 * @internal
 */
class LayeredKeyboardSensor extends KeyboardSensor {
	constructor(props: KeyboardSensorProps) {
		const { reducedMotion, ...options } = props.options as LayeredKeyboardOptions

		const still = reducedMotion || matchesMediaQuery(REDUCED_MOTION_QUERY)

		super(layered({ ...props, options: { ...options, scrollBehavior: still ? 'auto' : 'smooth' } }))
	}
}

/**
 * Pointer travel (px) before a drag activates: far enough to survive a click's
 * jitter, near enough to feel immediate. Held as the whole options object, at
 * module scope, because `useSensor` memoizes on option identity. A fresh literal
 * per render misses that memo, and hands `<DndContext>` a new sensor array every
 * time.
 */
const POINTER_ACTIVATION = { activationConstraint: { distance: 3 } }

/** Options for {@link useSortableSensors}: which input sensors the list arms. */
export type SortableSensorsOptions = {
	/** Include dnd-kit's keyboard sensor. Disable when the caller handles keyboard reordering itself. @defaultValue true */
	keyboard?: boolean
	/**
	 * Coordinate getter driving the keyboard sensor's arrow-key reordering.
	 * Override to scope arrow steps when a single `DndContext` hosts more than one
	 * sortable. The group manager is one, with its group and column droppables
	 * sharing a context. The default weighs every droppable in the context.
	 *
	 * @defaultValue `sortableKeyboardCoordinates`
	 */
	keyboardCoordinateGetter?: KeyboardCoordinateGetter
}

/**
 * Standard sensor configuration for dnd-kit powered sortable UIs.
 * Pairs a low-threshold {@link PrimaryPointerSensor} (which ignores
 * context-menu presses, including the macOS Ctrl-click) with a keyboard sensor
 * using `sortableKeyboardCoordinates` for arrow-key reordering. The Escape that
 * cancels a drag does not also close a dialog or a sheet around the list. A
 * keyboard move scrolls the item into view smoothly, and at once when the
 * reader asks for reduced motion.
 *
 * @returns dnd-kit's `SensorDescriptor[]` to pass to `<DndContext sensors>`;
 * the keyboard sensor is omitted when `keyboard` is false.
 *
 * @remarks The array keeps its identity across renders until `keyboard`,
 * `keyboardCoordinateGetter`, or the Motion setting of the app changes. The
 * keyboard sensor reads the platform preference when its drag starts, and not
 * in a render. The server and the hydration render take reduced motion, so a
 * read in the render gives a new array after hydration. That array renders
 * `DndContext` again, and each Suspense boundary under it that did not hydrate
 * yet then hydrates at once, in one long task.
 */
export function useSortableSensors({
	keyboard = true,
	keyboardCoordinateGetter = sortableKeyboardCoordinates,
}: SortableSensorsOptions = {}) {
	const pointer = useSensor(PrimaryPointerSensor, POINTER_ACTIVATION)

	const reducedMotion = use(ReducedMotionContext)

	// Memoized for the same reason as `POINTER_ACTIVATION`: a fresh literal misses the `useSensor` memo.
	const keyboardOptions = useMemo<LayeredKeyboardOptions>(
		() => ({ coordinateGetter: keyboardCoordinateGetter, reducedMotion }),
		[keyboardCoordinateGetter, reducedMotion],
	)

	const keyboardSensor = useSensor(LayeredKeyboardSensor, keyboardOptions)

	return useSensors(pointer, keyboard ? keyboardSensor : null)
}
