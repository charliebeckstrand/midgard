'use client'

import { useState } from 'react'
import { Segment, SegmentedControl } from '../../components/segmented-control'
import { Example } from '../components/example'
import { SizeListbox } from '../components/size-listbox'

export const meta = { category: 'Forms' }

const views = ['List', 'Grid', 'Map']
const periods = ['Monthly', 'Annual']

export default function SegmentedControlDemo() {
	const [defaultView, setDefaultView] = useState<string | undefined>('List')
	const [period, setPeriod] = useState<string | undefined>('Monthly')
	const [sizeView, setSizeView] = useState<string | undefined>('List')
	const [size, setSize] = useState<'sm' | 'md' | 'lg'>('md')
	const [disabledView, setDisabledView] = useState<string | undefined>('List')

	return (
		<div className="space-y-8">
			<Example title="Default">
				<SegmentedControl value={defaultView} onValueChange={setDefaultView}>
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

			<Example
				title="Sizes"
				actions={
					<SizeListbox sizes={['sm', 'md', 'lg'] as const} value={size} onChange={setSize} />
				}
			>
				<SegmentedControl size={size} value={sizeView} onValueChange={setSizeView}>
					{views.map((v) => (
						<Segment key={v} value={v}>
							{v}
						</Segment>
					))}
				</SegmentedControl>
			</Example>

			<Example title="With disabled segment">
				<SegmentedControl value={disabledView} onValueChange={setDisabledView}>
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
