'use client'

import { type RefObject, useRef, useState } from 'react'
import { useStableEvent } from '../../../../hooks/use-stable-event'

/** The emphasis handlers that {@link useLegendEmphasis} gives each switch. @internal */
export type LegendEmphasis<Key> = {
	/** The pointer enters (`key`) or leaves (`null`) a switch. */
	point: (key: Key | null) => void
	/** Focus enters or leaves a switch. The emphasis reads the focused switch again. */
	sync: () => void
}

/**
 * The emphasis of a legend, which the pointer and the keyboard share.
 *
 * @remarks
 * The switch under the pointer wins. Else the switch with `:focus-visible`
 * wins, the same gate as the focus ring. The keyboard side reads the DOM, not a
 * tracked index. Thus a focus that stops being visible emphasizes nothing, with
 * no event to announce it. Examples are the focus of a click, or of a tab that
 * comes back. When the pointer leaves, the emphasis goes back to a switch that
 * keeps the keyboard focus. A key that is not `live` emphasizes nothing, so a
 * pointed switch that is not live yields to the keyboard focus. The handlers
 * keep their identity.
 *
 * @param containers - The boxes that hold the switches, in render order: the
 * legend, and a popover that holds the switches past its cap.
 * @param selector - The switches inside the boxes, in render order.
 * @param keyAt - The key of the switch at a position, or `null` for no emphasis.
 * @param onEmphasis - Receives the emphasized key, or `null`.
 * @param live - Whether a key can take the emphasis. Absent, every key can.
 * @returns The handlers of each switch.
 * @internal
 */
export function useLegendEmphasis<Key>(
	containers: readonly RefObject<HTMLElement | null>[],
	selector: string,
	keyAt: (position: number) => Key | null,
	onEmphasis: (key: Key | null) => void,
	live?: (key: Key) => boolean,
): LegendEmphasis<Key> {
	const pointed = useRef<Key | null>(null)

	const sync = useStableEvent(() => {
		const isLive = (key: Key | null): key is Key => key !== null && (live?.(key) ?? true)

		if (isLive(pointed.current)) {
			onEmphasis(pointed.current)

			return
		}

		const switches = containers.flatMap((container) =>
			Array.from(container.current?.querySelectorAll<HTMLElement>(selector) ?? []),
		)

		const position = switches.findIndex((element) => element.matches(':focus-visible'))

		const focused = position === -1 ? null : keyAt(position)

		onEmphasis(isLive(focused) ? focused : null)
	})

	const point = useStableEvent((key: Key | null) => {
		pointed.current = key

		sync()
	})

	const [handlers] = useState(() => ({ point, sync }))

	return handlers
}
