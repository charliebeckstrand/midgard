'use client'

import { useEffect, useRef } from 'react'
import { Segment, SegmentControl, SegmentItem } from 'ui/segment'
import { writeAddress } from '../../hooks/use-address'
import type { OfficeItem } from '../../utilities/trail'

/**
 * Whether the last pick came from a switch that had the focus. Each view of an
 * election has its own switch, and a pick hides the view of the old one, so
 * the focus of the old switch falls to the body. The switch of the view that
 * the pick shows then takes the focus.
 */
let focusOnShow = false

/**
 * The switch between the overview and the page of each office of an
 * election, or of a state on the pages of a state. An office with no race in
 * the state is disabled.
 *
 * A pick writes the address of the item in place, with no navigation. The
 * layout already renders the view of each item, and shows the view of the
 * address at once (`ElectionViews`). Thus a pick reads nothing from the
 * server, and does not wait for a request in flight, such as the refresh of a
 * live count. The router takes the address too, so Back, a reload, and the
 * next refresh go to the page of the item.
 *
 * A pick from a switch that has the focus keeps the focus on the switch, on
 * its selected item.
 */
export function OfficeSwitch({ items, value }: { items: readonly OfficeItem[]; value: string }) {
	const list = useRef<HTMLDivElement>(null)

	// Activity runs the effects of a view again when it shows the view.
	useEffect(() => {
		if (!focusOnShow) return

		focusOnShow = false

		list.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus()
	}, [])

	return (
		<Segment
			value={value}
			onValueChange={(next) => {
				const item = items.find((entry) => entry.value === next)

				if (item === undefined || item.disabled) return

				focusOnShow = list.current?.contains(document.activeElement) ?? false

				writeAddress(item.href, 'push')
			}}
		>
			<SegmentControl ref={list} aria-label="Office">
				{items.map((item) => (
					<SegmentItem key={item.value} value={item.value} disabled={item.disabled}>
						{item.label}
					</SegmentItem>
				))}
			</SegmentControl>
		</Segment>
	)
}
