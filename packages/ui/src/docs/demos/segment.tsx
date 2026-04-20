'use client'

import { useState } from 'react'
import { Badge } from '../../components/badge'
import { Card, CardBody, CardDescription, CardTitle } from '../../components/card'
import { Grid, GridCell } from '../../components/grid'
import { List, ListItem, ListLabel } from '../../components/list'
import { Segment, SegmentControl, SegmentItem } from '../../components/segment'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

const items = [
	{
		name: 'Holiday Promo',
		description: 'End-of-year discount campaign',
		status: 'Active' as const,
	},
	{
		name: 'Spring Launch',
		description: 'New product line announcement',
		status: 'Active' as const,
	},
	{
		name: 'Beta Program',
		description: 'Early access invite for select users',
		status: 'Archived' as const,
	},
	{
		name: 'Referral Bonus',
		description: 'Refer a friend and earn rewards',
		status: 'Archived' as const,
	},
]

type Size = 'sm' | 'md' | 'lg'

const sizes: Size[] = ['sm', 'md', 'lg']

const statusColor = { Active: 'green', Archived: 'zinc' } as const

export default function SegmentDemo() {
	const [sizeValues, setSizeValues] = useState<Record<Size, Size>>({ sm: 'sm', md: 'md', lg: 'lg' })

	const [view, setView] = useState('List')

	const [filter, setFilter] = useState('All')

	return (
		<Stack gap={6}>
			<Example title="Default">
				<Stack gap={4}>
					<Segment value={view} onValueChange={(v) => setView(v ?? 'List')}>
						<SegmentControl>
							<SegmentItem value="List">List</SegmentItem>
							<SegmentItem value="Card">Card</SegmentItem>
						</SegmentControl>
					</Segment>

					{view === 'List' ? (
						// <Stack gap={2}>
						// 	{items.map((item) => (
						// 		<Card key={item.name}>
						// 			<CardBody className="flex items-center justify-between">
						// 				<CardTitle>{item.name}</CardTitle>
						// 				<CardDescription>{item.description}</CardDescription>
						// 			</CardBody>
						// 		</Card>
						// 	))}
						// </Stack>
						<List items={items} getKey={(item) => item.name} variant="solid" sortable={false}>
							{(item) => (
								<ListItem>
									<ListLabel>{item.name}</ListLabel>
								</ListItem>
							)}
						</List>
					) : (
						<Grid columns={{ initial: 2 }} gap={3}>
							{items.map((item) => (
								<GridCell key={item.name} className="flex">
									<Card className="grow">
										<CardBody>
											<CardTitle>{item.name}</CardTitle>
											<CardDescription>{item.description}</CardDescription>
										</CardBody>
									</Card>
								</GridCell>
							))}
						</Grid>
					)}
				</Stack>
			</Example>

			<Example title="Filter">
				<Stack gap={4}>
					<Segment value={filter} onValueChange={(v) => setFilter(v ?? 'All')}>
						<SegmentControl>
							<SegmentItem value="All">All</SegmentItem>
							<SegmentItem value="Active">Active</SegmentItem>
							<SegmentItem value="Archived">Archived</SegmentItem>
						</SegmentControl>
					</Segment>

					<Stack gap={2}>
						{items
							.filter((item) => {
								if (filter === 'All') return true
								return item.status === filter
							})
							.map((item) => (
								<Card key={item.name}>
									<CardBody className="flex items-center justify-between py-3">
										<CardTitle>{item.name}</CardTitle>
										<Badge color={statusColor[item.status]} size="sm">
											{item.status}
										</Badge>
									</CardBody>
								</Card>
							))}
					</Stack>
				</Stack>
			</Example>

			<Example title="Sizes">
				{sizes.map((s) => (
					<Segment
						key={s}
						value={sizeValues[s]}
						size={s}
						onValueChange={(v) => setSizeValues((prev) => ({ ...prev, [s]: (v ?? 'md') as Size }))}
					>
						<SegmentControl>
							<SegmentItem value="sm">Small</SegmentItem>
							<SegmentItem value="md">Medium</SegmentItem>
							<SegmentItem value="lg">Large</SegmentItem>
						</SegmentControl>
					</Segment>
				))}
			</Example>

			<Example title="With disabled segment">
				<Segment defaultValue="List">
					<SegmentControl>
						<SegmentItem value="List">List</SegmentItem>
						<SegmentItem value="Grid">Grid</SegmentItem>
						<SegmentItem value="Map" disabled>
							Map
						</SegmentItem>
					</SegmentControl>
				</Segment>
			</Example>
		</Stack>
	)
}
