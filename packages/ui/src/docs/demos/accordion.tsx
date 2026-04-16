'use client'

import { useState } from 'react'
import {
	Accordion,
	AccordionButton,
	AccordionItem,
	AccordionPanel,
} from '../../components/accordion'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'
import { VariantListbox } from '../components/variant-listbox'

export const meta = { category: 'Data Display' }

const variants = ['separated', 'bordered', 'plain'] as const

const items = [
	{
		value: 'shipping',
		title: 'Shipping & delivery',
		body: 'Orders ship within one business day. Tracking links are emailed as soon as your package leaves the warehouse.',
	},
	{
		value: 'returns',
		title: 'Returns & refunds',
		body: 'Unworn items can be returned within 30 days for a full refund. Drop them off at any carrier location with the prepaid label.',
	},
	{
		value: 'support',
		title: 'Customer support',
		body: 'Our team is available Monday through Friday, 9am to 6pm. Reach out by email and we will respond within one business day.',
	},
]

export default function AccordionDemo() {
	const [variant, setVariant] = useState<(typeof variants)[number]>('separated')

	return (
		<Stack gap={6}>
			<Example
				title="Default"
				actions={<VariantListbox variants={variants} value={variant} onChange={setVariant} />}
			>
				<Sizer size="md">
					<Accordion variant={variant} defaultValue="shipping">
						{items.map((item) => (
							<AccordionItem key={item.value} value={item.value}>
								<AccordionButton>{item.title}</AccordionButton>
								<AccordionPanel>{item.body}</AccordionPanel>
							</AccordionItem>
						))}
					</Accordion>
				</Sizer>
			</Example>

			<Example title="Multiple">
				<Sizer size="md">
					<Accordion type="multiple" variant="bordered" defaultValue={['shipping', 'returns']}>
						{items.map((item) => (
							<AccordionItem key={item.value} value={item.value}>
								<AccordionButton>{item.title}</AccordionButton>
								<AccordionPanel>{item.body}</AccordionPanel>
							</AccordionItem>
						))}
					</Accordion>
				</Sizer>
			</Example>

			<Example title="Disabled item">
				<Sizer size="md">
					<Accordion variant="plain" defaultValue="shipping">
						{items.map((item) => (
							<AccordionItem
								key={item.value}
								value={item.value}
								disabled={item.value === 'support'}
							>
								<AccordionButton>{item.title}</AccordionButton>
								<AccordionPanel>{item.body}</AccordionPanel>
							</AccordionItem>
						))}
					</Accordion>
				</Sizer>
			</Example>
		</Stack>
	)
}
