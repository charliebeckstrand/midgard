import { useState } from 'react'
import { Badge } from 'ui/badge'
import { List, ListItem, ListLabel } from 'ui/list'
import { Segment, SegmentControl, SegmentItem } from 'ui/segment'
import { Stack } from 'ui/stack'
import { campaigns } from './campaigns.ts'

const badges = {
	active: { color: 'green', label: 'Active' },
	archived: { color: 'zinc', label: 'Archived' },
} as const

export default function Filter() {
	const [status, setStatus] = useState('all')

	const matches =
		status === 'all' ? campaigns : campaigns.filter((campaign) => campaign.status === status)

	return (
		<Stack gap="lg">
			<Segment value={status} onValueChange={(value) => setStatus(value ?? 'all')}>
				<SegmentControl aria-label="Status">
					<SegmentItem value="all">All</SegmentItem>
					<SegmentItem value="active">Active</SegmentItem>
					<SegmentItem value="archived">Archived</SegmentItem>
				</SegmentControl>
			</Segment>
			<List items={matches} getKey={(campaign) => campaign.name} variant="solid">
				{(campaign) => (
					<ListItem
						suffix={
							<Badge color={badges[campaign.status].color}>{badges[campaign.status].label}</Badge>
						}
					>
						<ListLabel>{campaign.name}</ListLabel>
					</ListItem>
				)}
			</List>
		</Stack>
	)
}
