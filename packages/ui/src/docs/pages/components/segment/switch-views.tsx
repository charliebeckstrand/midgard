import { useState } from 'react'
import { Card, CardBody, CardDescription, CardTitle } from 'ui/card'
import { List, ListItem, ListLabel } from 'ui/list'
import { Segment, SegmentControl, SegmentItem } from 'ui/segment'
import { Stack } from 'ui/stack'
import { campaigns } from './campaigns.ts'

export default function SwitchViews() {
	const [view, setView] = useState('list')

	return (
		<Stack gap="lg">
			<Segment value={view} onValueChange={(value) => setView(value ?? 'list')}>
				<SegmentControl aria-label="View">
					<SegmentItem value="list">List</SegmentItem>
					<SegmentItem value="cards">Cards</SegmentItem>
				</SegmentControl>
			</Segment>
			{view === 'list' ? (
				<List items={campaigns} getKey={(campaign) => campaign.name} variant="solid">
					{(campaign) => (
						<ListItem>
							<ListLabel>{campaign.name}</ListLabel>
						</ListItem>
					)}
				</List>
			) : (
				<div className="grid grid-cols-2 gap-3">
					{campaigns.map((campaign) => (
						<Card key={campaign.name}>
							<CardBody>
								<CardTitle>{campaign.name}</CardTitle>
								<CardDescription>{campaign.description}</CardDescription>
							</CardBody>
						</Card>
					))}
				</div>
			)}
		</Stack>
	)
}
