'use client'

import { PrefetchKind } from 'next/dist/client/components/router-reducer/router-reducer-types'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Segment, SegmentControl, SegmentItem } from 'ui/segment'
import type { OfficeItem } from '../../utilities/trail'

/**
 * The switch between the overview and the national map of each office of an
 * election. It changes the route.
 *
 * The switch reads the page of each other item before the pick, so a pick
 * waits for no server round trip. A page of an election reads its results on
 * the server (`instant = false`), so the default prefetch reads none of it, and
 * the switch asks for the full page. When a read goes stale, such as after the
 * refresh of a live count, the switch reads that page again.
 */
export function OfficeSwitch({ items, value }: { items: readonly OfficeItem[]; value: string }) {
	const router = useRouter()

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

				if (item !== undefined && !item.disabled) router.push(item.href)
			}}
		>
			<SegmentControl aria-label="Office">
				{items.map((item) => (
					<SegmentItem key={item.value} value={item.value} disabled={item.disabled}>
						{item.label}
					</SegmentItem>
				))}
			</SegmentControl>
		</Segment>
	)
}
