'use client'

import { useRouter } from 'next/navigation'
import { Segment, SegmentControl, SegmentItem } from 'ui/segment'
import type { OfficeItem } from '../../utilities/trail'

/**
 * The switch between the overview and the offices of an election. It changes
 * the route and keeps the region, so a national page moves between the
 * national maps, and a state page between the tabs of the state.
 */
export function OfficeSwitch({ items, value }: { items: readonly OfficeItem[]; value: string }) {
	const router = useRouter()

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
