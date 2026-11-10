'use client'

import { PrefetchKind } from 'next/dist/client/components/router-reducer/router-reducer-types'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { Segment, SegmentControl, SegmentItem } from 'ui/segment'
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
 * the state is disabled. It changes the route.
 *
 * The switch reads the page of each other item that is not disabled before
 * the pick, so a pick waits for no server round trip. A page of an election
 * reads its results on the server (`instant = false`), so the default
 * prefetch reads none of it, and the switch asks for the full page. When a
 * read goes stale, such as after the refresh of a live count, the switch reads
 * that page again.
 *
 * A pick from a switch that has the focus keeps the focus on the switch, on
 * its selected item.
 */
export function OfficeSwitch({ items, value }: { items: readonly OfficeItem[]; value: string }) {
	const router = useRouter()

	const list = useRef<HTMLDivElement>(null)

	// Activity runs the effects of a view again when it shows the view.
	useEffect(() => {
		if (!focusOnShow) return

		focusOnShow = false

		list.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus()
	}, [])

	useEffect(() => {
		// A switch that is gone reads no page again.
		let mounted = true

		const read = (href: string) => {
			router.prefetch(href, {
				kind: PrefetchKind.FULL,
				onInvalidate: () => {
					if (mounted) read(href)
				},
			})
		}

		for (const item of items) {
			if (item.value !== value && !item.disabled) read(item.href)
		}

		return () => {
			mounted = false
		}
	}, [items, value, router])

	return (
		<Segment
			value={value}
			onValueChange={(next) => {
				const item = items.find((entry) => entry.value === next)

				if (item === undefined || item.disabled) return

				focusOnShow = list.current?.contains(document.activeElement) ?? false

				router.push(item.href)
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
