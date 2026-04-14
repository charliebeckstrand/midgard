'use client'

import { useState } from 'react'
import { Segment, SegmentControl, SegmentItem } from '../../components/segment'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'
import { SizeListbox } from '../components/size-listbox'

export const meta = { category: 'Forms' }

const views = ['List', 'Grid', 'Map']
const periods = ['Monthly', 'Annual']

export default function SegmentDemo() {
	const [size, setSize] = useState<'sm' | 'md' | 'lg'>('md')

	return (
		<Stack gap={8}>
			<Example title="Default">
				<Segment defaultValue="List">
					<SegmentControl>
						{views.map((v) => (
							<SegmentItem key={v} value={v}>
								{v}
							</SegmentItem>
						))}
					</SegmentControl>
				</Segment>
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
