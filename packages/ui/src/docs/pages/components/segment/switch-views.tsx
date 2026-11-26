import { useState } from 'react'
import { Card, CardBody, CardDescription, CardTitle } from 'ui/card'
import { Columns } from 'ui/columns'
import { List, ListItem, ListLabel } from 'ui/list'
import { Segment, SegmentControl, SegmentItem } from 'ui/segment'
import { Stack } from 'ui/stack'
import { campaigns } from './campaigns.ts'

// Each pick shows another view, so an arrow key moves only the focus, and
// Enter or Space selects the item.
export default function SwitchViews() {
	const [view, setView] = useState('list')

	return (
		<Stack gap="lg">
			<Segment activation="manual" value={view} onValueChange={(value) => setView(value ?? 'list')}>
				<SegmentControl aria-label="View">
					<SegmentItem value="list">List</SegmentItem>
					<SegmentItem value="cards">Cards</SegmentItem>
				</SegmentControl>
			</Segment>
			{view === 'list' ? (
				<List items={campaigns} getKey={(campaign) => campaign.label} variant="solid">
					{(campaign) => (
						<ListItem>
							<ListLabel>{campaign.label}</ListLabel>
						</ListItem>
					)}
				</List>
			) : (
				<Columns columns={2} gap="md">
					{campaigns.map((campaign) => (
						<Card key={campaign.label}>
							<CardBody>
								<CardTitle>{campaign.label}</CardTitle>
								<CardDescription>{campaign.description}</CardDescription>
							</CardBody>
						</Card>
					))}
				</Columns>
			)}
		</Stack>
	)
}
