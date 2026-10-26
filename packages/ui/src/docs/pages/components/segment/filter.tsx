import { useState } from 'react'
import { Badge } from 'ui/badge'
import { List, ListItem, ListLabel } from 'ui/list'
import { Segment, SegmentControl, SegmentItem } from 'ui/segment'
import { Stack } from 'ui/stack'
import { campaignStatuses, campaigns } from './campaigns.ts'

const colors = { active: 'green', archived: 'zinc' } as const

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
			<List items={matches} getKey={(campaign) => campaign.label} variant="solid" sortable={false}>
				{(campaign) => (
					<ListItem
						suffix={
							<Badge color={colors[campaign.status]}>{campaignStatuses[campaign.status]}</Badge>
						}
					>
						<ListLabel>{campaign.label}</ListLabel>
					</ListItem>
				)}
			</List>
		</Stack>
	)
}
