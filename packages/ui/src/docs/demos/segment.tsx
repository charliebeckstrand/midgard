'use client'

import { useState } from 'react'
import { Badge } from '../../components/badge'
import { Card, CardBody, CardTitle } from '../../components/card'
import { Grid, GridCell } from '../../components/grid'
import { Segment, SegmentControl, SegmentItem } from '../../components/segment'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'
import { SizeListbox } from '../components/size-listbox'

export const meta = { category: 'Forms' }

const views = ['List', 'Grid', 'Map']

const periods = ['Monthly', 'Annual']

const items = [
	{
		name: 'Analytics',
		description: 'Track user behavior and engagement metrics',
		status: 'Active' as const,
	},
	{
		name: 'Storage',
		description: 'Manage file uploads and cloud storage',
		status: 'Archived' as const,
	},
	{
		name: 'Auth',
		description: 'User authentication and access control',
		status: 'Active' as const,
	},
	{
		name: 'Messaging',
		description: 'Real-time chat and notifications',
		status: 'Archived' as const,
	},
]

const statusColor = { Active: 'green', Archived: 'zinc' } as const

export default function SegmentDemo() {
	const [size, setSize] = useState<'sm' | 'md' | 'lg'>('md')

	const [view, setView] = useState('List')

	const [filter, setFilter] = useState('All')

	return (
		<Stack gap={8}>
			<Example title="View toggle">
				<Stack gap={4}>
					<Segment value={view} onValueChange={(v) => setView(v ?? 'List')}>
						<SegmentControl>
							<SegmentItem value="List">List</SegmentItem>
							<SegmentItem value="Card">Card</SegmentItem>
						</SegmentControl>
					</Segment>

					{view === 'List' ? (
						<Stack gap={2}>
							{items.map((item) => (
								<Card key={item.name}>
									<CardBody className="flex items-center justify-between py-3">
										<span className="font-medium text-sm">{item.name}</span>
										<span className="text-sm text-zinc-500">{item.description}</span>
									</CardBody>
								</Card>
							))}
						</Stack>
					) : (
						<Grid columns={{ initial: 2 }} gap={3}>
							{items.map((item) => (
								<GridCell key={item.name}>
									<Card>
										<CardBody>
											<CardTitle>{item.name}</CardTitle>
											<p className="text-sm text-zinc-500 mt-1">{item.description}</p>
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
										<span className="font-medium text-sm">{item.name}</span>
										<Badge color={statusColor[item.status]} size="sm">
											{item.status}
										</Badge>
									</CardBody>
								</Card>
							))}
					</Stack>
				</Stack>
			</Example>

			<Example title="Two options">
				<Segment defaultValue="Monthly">
					<SegmentControl>
						{periods.map((p) => (
							<SegmentItem key={p} value={p}>
								{p}
							</SegmentItem>
						))}
					</SegmentControl>
				</Segment>
			</Example>

			<Example
				title="Sizes"
				actions={
					<SizeListbox sizes={['sm', 'md', 'lg'] as const} value={size} onChange={setSize} />
				}
			>
				<Segment defaultValue="List" size={size}>
					<SegmentControl>
						{views.map((v) => (
							<SegmentItem key={v} value={v}>
								{v}
							</SegmentItem>
						))}
					</SegmentControl>
				</Segment>
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
