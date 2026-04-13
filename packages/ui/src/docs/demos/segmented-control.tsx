'use client'

import { useState } from 'react'
import { Segment, SegmentedControl } from '../../components/segmented-control'
import { Example } from '../components/example'
import { SizeListbox } from '../components/size-listbox'

export const meta = { category: 'Forms' }

const views = ['List', 'Grid', 'Map']
const periods = ['Monthly', 'Annual']

export default function SegmentedControlDemo() {
	const [view, setView] = useState('List')
	const [period, setPeriod] = useState('Monthly')
	const [size, setSize] = useState<'sm' | 'md' | 'lg'>('md')

	return (
		<div className="space-y-8">
			<Example title="Default">
				<SegmentedControl value={view} onValueChange={setView}>
					{views.map((v) => (
						<Segment key={v} value={v}>
							{v}
						</Segment>
					))}
				</SegmentedControl>
			</Example>

			<Example title="Two options">
				<SegmentedControl value={period} onValueChange={setPeriod}>
					{periods.map((p) => (
						<Segment key={p} value={p}>
							{p}
						</Segment>
					))}
				</SegmentedControl>
			</Example>

			<Example title="Sizes" actions={<SizeListbox value={size} onChange={setSize} />}>
				<SegmentedControl size={size} value={view} onValueChange={setView}>
					{views.map((v) => (
						<Segment key={v} value={v}>
							{v}
						</Segment>
					))}
				</SegmentedControl>
			</Example>

			<Example title="With disabled segment">
				<SegmentedControl value={view} onValueChange={setView}>
					<Segment value="List">List</Segment>
					<Segment value="Grid">Grid</Segment>
					<Segment value="Map" disabled>
						Map
					</Segment>
				</SegmentedControl>
			</Example>
		</div>
	)
}
